-- Fix security issues from the linter

-- 1. Enable RLS on new tables
alter table public.cwi_palette enable row level security;
alter table public.transcript_freeze enable row level security;

-- 2. Add RLS policies for cwi_palette (read-only for everyone)
create policy "cwi_palette_public_read"
  on public.cwi_palette for select
  using (true);

-- 3. Add RLS policies for transcript_freeze
create policy "transcript_freeze_users_can_freeze_their_videos"
  on public.transcript_freeze for insert
  with check (
    exists (
      select 1 from public.videos
      where videos.id = transcript_freeze.video_id
      and videos.user_id = auth.uid()
    )
  );

create policy "transcript_freeze_users_can_view_their_freezes"
  on public.transcript_freeze for select
  using (
    exists (
      select 1 from public.videos
      where videos.id = transcript_freeze.video_id
      and videos.user_id = auth.uid()
    )
  );

create policy "transcript_freeze_system_can_manage"
  on public.transcript_freeze for all
  using (current_setting('role') = 'service_role');

-- 4. Fix function search paths
create or replace function public.is_frozen(p_video_id uuid, p_language text)
returns boolean 
language sql 
stable 
security definer
set search_path = public
as $$
  select exists(select 1 from public.transcript_freeze where video_id=p_video_id and language=p_language);
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