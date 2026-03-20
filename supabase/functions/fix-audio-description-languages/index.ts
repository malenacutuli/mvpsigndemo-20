import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { franc } from "npm:franc-min@6.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_id } = await req.json();

    if (!video_id) {
      throw new Error('Missing required parameter: video_id');
    }

    console.log('🔍 Fixing language labels for video:', video_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all audio descriptions for this video
    const { data: allDescriptions, error: fetchError } = await supabase
      .from('audio_descriptions')
      .select('*')
      .eq('video_id', video_id);

    if (fetchError) {
      throw new Error(`Failed to fetch descriptions: ${fetchError.message}`);
    }

    if (!allDescriptions || allDescriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No audio descriptions found', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Language mapping from franc codes to ISO codes
    const langMap: Record<string, string> = {
      'eng': 'en', 'spa': 'es', 'fra': 'fr', 
      'deu': 'de', 'ita': 'it', 'por': 'pt', 
      'ara': 'ar', 'jpn': 'ja', 'kor': 'ko', 
      'cmn': 'zh', 'rus': 'ru', 'tur': 'tr'
    };

    const updates: Array<{ id: string; oldLang: string; newLang: string; text: string }> = [];
    let updatedCount = 0;

    // Analyze each description
    for (const desc of allDescriptions) {
      if (!desc.description || desc.description.length < 10) {
        console.log(`⚠️ Skipping description ${desc.id}: text too short`);
        continue;
      }

      const detectedLang = franc(desc.description);
      const mappedLang = langMap[detectedLang];

      if (mappedLang && mappedLang !== desc.language) {
        console.log(`🔄 Detected language mismatch:`, {
          id: desc.id,
          currentLabel: desc.language,
          detectedLanguage: mappedLang,
          text: desc.description.substring(0, 50) + '...'
        });

        // Update the language field
        const { error: updateError } = await supabase
          .from('audio_descriptions')
          .update({ language: mappedLang })
          .eq('id', desc.id);

        if (updateError) {
          console.error(`❌ Failed to update description ${desc.id}:`, updateError);
        } else {
          updates.push({
            id: desc.id,
            oldLang: desc.language,
            newLang: mappedLang,
            text: desc.description.substring(0, 100)
          });
          updatedCount++;
        }
      }
    }

    console.log(`✅ Language fix complete. Updated ${updatedCount} descriptions.`);

    return new Response(
      JSON.stringify({ 
        message: 'Language labels fixed successfully',
        updated: updatedCount,
        changes: updates,
        total: allDescriptions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Language fix error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
