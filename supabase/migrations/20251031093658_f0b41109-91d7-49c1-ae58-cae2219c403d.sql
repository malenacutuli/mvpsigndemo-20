-- Prevent identity clobbering from the player and avoid writes after finalization.
create table if not exists public.transcript_freeze (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  language text not null default 'en',
  frozen_at timestamptz not null default now(),
  unique (video_id, language)
);

create or replace function public.is_frozen(p_video_id uuid, p_language text)
returns boolean language sql stable as $$
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

-- Freeze RPC for the UI to call after the user saves an edited version.
create or replace function public.freeze_transcript(p_video_id uuid, p_language text)
returns void language plpgsql as $$
begin
  insert into public.transcript_freeze(video_id, language)
  values (p_video_id, p_language)
  on conflict (video_id, language) do nothing;
end;
$$;