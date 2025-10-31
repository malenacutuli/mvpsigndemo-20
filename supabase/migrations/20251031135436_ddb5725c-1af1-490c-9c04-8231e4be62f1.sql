-- Drop obsolete functions that reference old schema

-- Drop map_label_to_character function (references non-existent asr_label column)
DROP FUNCTION IF EXISTS public.map_label_to_character(uuid, text, text, uuid);

-- Drop sync_character_properties trigger function (references old transcript_segments table)
DROP FUNCTION IF EXISTS public.sync_character_properties() CASCADE;