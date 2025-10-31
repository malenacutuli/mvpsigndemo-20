-- Safe speaker mapping that blocks generic labels
create or replace function public.apply_specific_mapping(
  p_video_id uuid, 
  p_language text, 
  p_speaker text, 
  p_character_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_generic boolean;
  v_count integer;
begin
  -- Block generic speaker labels from being mapped
  v_is_generic := p_speaker ~* '^(speaker(\s*\d+)?|speaker\s*[A-Z]|unknown|unassigned)$';
  if v_is_generic then
    return 0;
  end if;

  -- Apply mapping only to specific speaker labels
  update public.transcript_segments_clean t
     set speaker = c.name,
         speaker_color = c.color,
         character_id = p_character_id
    from public.characters c
   where c.id = p_character_id
     and t.video_id = p_video_id
     and t.language = p_language
     and t.speaker = p_speaker;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;