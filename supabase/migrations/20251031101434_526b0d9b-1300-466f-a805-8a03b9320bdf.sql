-- Enable pgcrypto extension if not already enabled
create extension if not exists pgcrypto schema extensions;

-- Fix color_slot function with fully qualified pgcrypto functions
create or replace function public.color_slot(p_seed text, p_key text, p_mod int)
returns int 
language sql 
immutable
set search_path = public
as $$
  select (abs(('x'||substr(encode(extensions.digest(coalesce(p_seed,'')||'::'||coalesce(p_key,''), 'sha256'),'hex'),1,8))::bit(32)::int) % nullif(p_mod,0))
$$;

-- Recreate the view with security_invoker
drop view if exists public.v_transcript_segments_resolved;

create view public.v_transcript_segments_resolved 
with (security_invoker = true)
as
with base as (
  select
    t.id, t.video_id, t.language, t.idx,
    t.start_time, t.end_time, t.text,
    t.words, t.character_id, t.speaker, t.speaker_asr_label,
    c.name as character_name, c.type as character_type, c.color as character_color,
    coalesce(c.name, t.speaker_asr_label, 'Unassigned') as display_speaker,
    case when c.type = 'main' then 'main'
         when c.type = 'supporting' then 'supporting'
         when c.type = 'minor' then 'minor'
         else 'supporting' end as display_pool,
    (t.video_id::text || ':' || t.language) as color_seed
  from public.transcript_segments_clean t
  left join public.characters c on c.id = t.character_id
)
, color_idx as (
  select
    b.*,
    case when b.character_color is not null then -1
         else public.color_slot(b.color_seed, coalesce(b.speaker_asr_label,'Unassigned'),
              (select count(*)::int from public.cwi_palette p where p.pool=b.display_pool)) end as slot
  from base b
)
select
  x.*,
  case when x.character_color is not null then x.character_color
       else (select p.hex from public.cwi_palette p where p.pool=x.display_pool and p.idx=x.slot) end as display_color
from color_idx x;