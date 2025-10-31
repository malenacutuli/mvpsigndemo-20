import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { video_id, language = 'en' } = await req.json();

    if (!video_id) {
      return new Response(
        JSON.stringify({ error: 'video_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load characters for this video (type='minor' for speakers)
    const { data: chars, error: charsError } = await supabase
      .from('characters')
      .select('id, name, type')
      .eq('video_id', video_id)
      .eq('type', 'minor')
      .order('created_at');

    if (charsError) throw charsError;

    if (!chars || chars.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No characters found for this video' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build mapping: assume order matches A, B, C, etc.
    const asrLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const canonicalMappings: Record<string, string> = {};

    chars.forEach((char, i) => {
      if (i < asrLabels.length) {
        const label = asrLabels[i];
        // Store both ASR label and full "Speaker X" format
        canonicalMappings[label] = char.id;
        canonicalMappings[`Speaker ${label}`] = char.id;
      }
    });

    // Save to speaker_mappings
    const { error: upsertError } = await supabase
      .from('speaker_mappings')
      .upsert({
        video_id,
        language,
        mappings: canonicalMappings
      }, {
        onConflict: 'video_id,language'
      });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        mappings: canonicalMappings,
        characters: chars.map(c => ({ id: c.id, name: c.name }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fixing speaker mappings:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
