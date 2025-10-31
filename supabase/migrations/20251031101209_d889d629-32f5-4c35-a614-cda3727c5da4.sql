-- Step 1: Add ASR label columns to transcript_segments_clean
alter table if exists public.transcript_segments_clean
  add column if not exists speaker_asr_label text,
  add column if not exists speaker_asr_norm text generated always as (
    lower(regexp_replace(coalesce(speaker_asr_label,''), '\s+', '_', 'g'))
  ) stored;

create index if not exists idx_seg_clean_asr_norm
  on public.transcript_segments_clean(video_id, language, speaker_asr_norm);

-- Step 2: Freezing edited transcripts prevents any background overwrite
create table if not exists public.transcript_freeze (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  language text not null default 'en',
  frozen_at timestamptz not null default now(),
  unique (video_id, language)
);

create or replace function public.is_frozen(p_video_id uuid, p_language text)
returns boolean language sql stable as $$
  select exists(select 1 from public.transcript_freeze where video_id=p_video_id and language=p_language);
$$;

create or replace function public.freeze_transcript(p_video_id uuid, p_language text)
returns void language plpgsql as $$
begin
  insert into public.transcript_freeze(video_id, language)
  values (p_video_id, p_language)
  on conflict (video_id, language) do nothing;
end;
$$;

-- Step 3: Words-only update (never change identity/color/character)
create or replace function public.update_words_only(
  p_video_id uuid,
  p_language text,
  p_start_time numeric,
  p_end_time numeric,
  p_text text,
  p_idx integer,
  p_words jsonb
) returns void language plpgsql as $$
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

-- Step 4: Drop existing function and recreate with correct signature
drop function if exists public.apply_specific_mapping(uuid, text, text, uuid);

create or replace function public.apply_specific_mapping(
  p_video_id uuid, 
  p_language text, 
  p_asr_label text, 
  p_character_id uuid
) returns integer language plpgsql security definer set search_path = public as $$
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
  if not found then return 0; end if;

  -- Apply mapping to all matching segments
  update public.transcript_segments_clean t
     set speaker        = v_char.name,
         speaker_color  = v_char.color,
         character_id   = v_char.id
   where t.video_id = p_video_id
     and t.language = p_language
     and t.speaker_asr_label = p_asr_label;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Step 5: Create color palette table
create table if not exists public.cwi_palette (
  pool text not null,  -- 'main'|'supporting'|'minor'
  idx  int  not null,
  hex  text not null,
  primary key(pool, idx)
);

insert into public.cwi_palette(pool, idx, hex)
select * from (values
  -- main 6
  ('main',0,'#E5E517'),('main',1,'#17E5E5'),('main',2,'#E51717'),
  ('main',3,'#E58017'),('main',4,'#17E517'),('main',5,'#E517E5'),
  -- supporting 12
  ('supporting',0,'#E85C2E'),('supporting',1,'#47C2EB'),('supporting',2,'#EBC247'),
  ('supporting',3,'#5E82ED'),('supporting',4,'#C2EB47'),('supporting',5,'#8C6BED'),
  ('supporting',6,'#82ED5E'),('supporting',7,'#CC6BED'),('supporting',8,'#47EB70'),
  ('supporting',9,'#EB47C2'),('supporting',10,'#5EEDC9'),('supporting',11,'#ED5E82'),
  -- minor 24 (example pastels)
  ('minor',0,'#F7E8A1'),('minor',1,'#CFF1F7'),('minor',2,'#F7B3B3'),('minor',3,'#FAD3A1'),
  ('minor',4,'#CFF7CF'),('minor',5,'#F1C2F7'),('minor',6,'#D9F7A1'),('minor',7,'#D1C2F7'),
  ('minor',8,'#B3F7D9'),('minor',9,'#F7A1E1'),('minor',10,'#A1E1F7'),('minor',11,'#F7D9A1'),
  ('minor',12,'#E1F7A1'),('minor',13,'#A1F7E1'),('minor',14,'#D9A1F7'),('minor',15,'#F1F7A1'),
  ('minor',16,'#A1F1F7'),('minor',17,'#F7A1C2'),('minor',18,'#C2F7A1'),('minor',19,'#A1C2F7'),
  ('minor',20,'#F7C2A1'),('minor',21,'#A1F7C2'),('minor',22,'#E1A1F7'),('minor',23,'#F7A1A1')
) as t(pool,idx,hex)
on conflict do nothing;

-- Step 6: Color slot function via hash (stable per video+language+ASR label)
create or replace function public.color_slot(p_seed text, p_key text, p_mod int)
returns int language sql immutable as $$
  select (abs(('x'||substr(encode(digest(coalesce(p_seed,'')||'::'||coalesce(p_key,''), 'sha256'),'hex'),1,8))::bit(32)::int) % nullif(p_mod,0))
$$;

-- Step 7: Create resolved view for consistent speaker+color display
create or replace view public.v_transcript_segments_resolved as
with base as (
  select
    t.id, t.video_id, t.language, t.idx,
    t.start_time, t.end_time, t.text,
    t.words, t.character_id, t.speaker, t.speaker_asr_label,
    c.name as character_name, c.type as character_type, c.color as character_color,
    -- display speaker: prefer character name, else ASR label, else Unassigned
    coalesce(c.name, t.speaker_asr_label, 'Unassigned') as display_speaker,
    -- pool by type (default supporting)
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