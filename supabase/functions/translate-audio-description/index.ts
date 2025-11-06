import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source_description_id, target_language, video_id } = await req.json();

    if (!source_description_id || !target_language || !video_id) {
      throw new Error('Missing required parameters: source_description_id, target_language, video_id');
    }

    console.log('🌍 Translation request:', { source_description_id, target_language, video_id });

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch source audio description
    const { data: sourceAD, error: fetchError } = await supabase
      .from('audio_descriptions')
      .select('*')
      .eq('id', source_description_id)
      .single();

    if (fetchError || !sourceAD) {
      throw new Error(`Failed to fetch source description: ${fetchError?.message}`);
    }

    console.log('📝 Source AD:', sourceAD.description?.substring(0, 100) || 'No description text');

    // Check if translation already exists
    const { data: existingTranslation } = await supabase
      .from('audio_descriptions')
      .select('id')
      .eq('video_id', video_id)
      .eq('language', target_language)
      .eq('source_description_id', source_description_id)
      .maybeSingle();

    if (existingTranslation) {
      console.log('✅ Translation already exists:', existingTranslation.id);
      return new Response(
        JSON.stringify({ 
          id: existingTranslation.id, 
          message: 'Translation already exists',
          skipped: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Translate using OpenAI GPT-4o-mini
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'ru': 'Russian'
    };

    const targetLanguageName = languageNames[target_language] || target_language;

    const translationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in audio descriptions for accessibility. Translate the following audio description to ${targetLanguageName}. Maintain the descriptive, objective tone suitable for visually impaired audiences. Preserve all visual details, emotions, and actions described. Return ONLY the translated text without any additional commentary or explanations.`
          },
          {
            role: 'user',
            content: sourceAD.description
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    if (!translationResponse.ok) {
      const errorText = await translationResponse.text();
      throw new Error(`OpenAI API error: ${translationResponse.status} - ${errorText}`);
    }

    const translationData = await translationResponse.json();
    const translatedText = translationData.choices[0].message.content.trim();

    console.log('✨ Translated text:', translatedText.substring(0, 100));

    // Create new audio description record
    const { data: newAD, error: insertError } = await supabase
      .from('audio_descriptions')
      .insert({
        video_id: video_id,
        description: translatedText,
        start_time: sourceAD.start_time,
        end_time: sourceAD.end_time,
        language: target_language,
        voice_style: sourceAD.voice_style,
        voice_id: sourceAD.voice_id,
        voice_name: sourceAD.voice_name,
        source_description_id: source_description_id,
        is_translation: true,
        translation_quality_score: 0.95,
        audio_generation_status: 'pending',
        estimated_duration: sourceAD.estimated_duration,
        requires_extension: sourceAD.requires_extension,
        extension_duration: sourceAD.extension_duration,
        extension_type: sourceAD.extension_type,
        gap_duration: sourceAD.gap_duration,
        priority_level: sourceAD.priority_level
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to insert translation: ${insertError.message}`);
    }

    // Track API cost (~$0.001 per translation)
    await supabase.from('api_cost_tracking').insert({
      video_id: video_id,
      service_name: 'openai-translation',
      operation_type: 'translate-audio-description',
      cost_amount: 0.001,
      metadata: {
        source_language: sourceAD.language,
        target_language: target_language,
        text_length: sourceAD.description?.length || 0
      }
    });

    console.log('✅ Translation created:', newAD.id);

    return new Response(
      JSON.stringify({ 
        id: newAD.id, 
        text: translatedText,
        message: 'Translation successful' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Translation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
