-- Stable ASR-label → character mapping with normalization
alter table if exists public.transcript_segments_clean
add column if not exists speaker_norm text
generated always as (lower(regexp_replace(coalesce(speaker,''), '\s+', '_', 'g'))) stored;

create index if not exists idx_seg_clean_speaker_norm
on public.transcript_segments_clean(video_id, language, speaker_norm);

create table if not exists public.speaker_mappings (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  language text not null default 'en',
  asr_label text not null,
  asr_label_norm text generated always as (lower(regexp_replace(trim(asr_label), '\s+', '_', 'g'))) stored,
  character_id uuid not null references public.characters(id) on delete cascade,
  unique (video_id, language, asr_label_norm)
);

-- Enable RLS on speaker_mappings
alter table public.speaker_mappings enable row level security;

-- RLS policies for speaker_mappings
create policy "System can manage speaker mappings"
  on public.speaker_mappings
  for all
  using (current_setting('role') = 'service_role');

create policy "Users can manage mappings for their videos"
  on public.speaker_mappings
  for all
  using (
    exists (
      select 1 from public.videos
      where videos.id = speaker_mappings.video_id
        and videos.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.videos
      where videos.id = speaker_mappings.video_id
        and videos.user_id = auth.uid()
    )
  );

create or replace function public.map_label_to_character(
  p_video_id uuid, 
  p_language text, 
  p_asr_label text, 
  p_character_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_generic boolean;
  v_char record;
  v_count integer;
begin
  -- Block generic speaker labels
  v_generic := p_asr_label ~* '^(speaker(\s*\d+)?|speaker\s*[A-Z]|unknown|unassigned)$';
  if v_generic then return 0; end if;

  -- Get character details
  select id, name, color into v_char from public.characters where id = p_character_id;

  -- Upsert mapping
  insert into public.speaker_mappings (video_id, language, asr_label, character_id)
  values (p_video_id, p_language, p_asr_label, p_character_id)
  on conflict (video_id, language, asr_label_norm) do update
  set character_id = excluded.character_id;

  -- Apply mapping to all matching segments
  update public.transcript_segments_clean t
     set speaker = v_char.name,
         speaker_color = v_char.color,
         character_id = v_char.id
   where t.video_id = p_video_id
     and t.language = p_language
     and t.speaker = p_asr_label;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;