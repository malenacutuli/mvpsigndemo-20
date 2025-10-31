-- Fix security warnings from previous migration

-- Enable RLS on transcript_freeze table
alter table public.transcript_freeze enable row level security;

-- RLS policies for transcript_freeze
create policy "System can manage transcript freeze"
  on public.transcript_freeze
  for all
  using (current_setting('role') = 'service_role');

create policy "Users can view freeze status for their videos"
  on public.transcript_freeze
  for select
  using (
    exists (
      select 1 from public.videos
      where videos.id = transcript_freeze.video_id
        and videos.user_id = auth.uid()
    )
  );

create policy "Users can freeze their own transcripts"
  on public.transcript_freeze
  for insert
  with check (
    exists (
      select 1 from public.videos
      where videos.id = transcript_freeze.video_id
        and videos.user_id = auth.uid()
    )
  );

-- Recreate functions with SET search_path for security
create or replace function public.is_frozen(p_video_id uuid, p_language text)
returns boolean 
language sql 
stable 
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.transcript_freeze
    where video_id = p_video_id and language = p_language
  );
$$;

create or replace function public.update_words_only(
  p_video_id uuid,
  p_language text,
  p_start_time numeric,
  p_end_time numeric,
  p_text text,
  p_idx integer,
  p_words jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If transcript is frozen, do nothing (no more background writes).
  if public.is_frozen(p_video_id, p_language) then
    return;
  end if;

  update public.transcript_segments_clean
     set words = p_words,
         idx   = coalesce(p_idx, idx)
   where video_id   = p_video_id
     and language   = p_language
     and start_time = p_start_time
     and end_time   = p_end_time
     and text       = p_text;
end;
$$;

create or replace function public.freeze_transcript(p_video_id uuid, p_language text)
returns void 
language plpgsql 
security definer
set search_path = public
as $$
begin
  insert into public.transcript_freeze(video_id, language)
  values (p_video_id, p_language)
  on conflict (video_id, language) do nothing;
end;
$$;