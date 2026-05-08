import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, voiceId, translateOnly, videoId, sourceLanguage = 'en' } = await req.json();

    if (!text || !targetLanguage) {
      throw new Error('Text and target language are required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!openaiKey || !elevenlabsKey) {
      throw new Error('API keys not configured');
    }

    // Initialize Supabase client with user's auth
    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Check for cached dubbing if videoId provided
    if (videoId && !translateOnly) {
      const { data: existing } = await supabase
        .from('video_dubbing')
        .select('*')
        .eq('video_id', videoId)
        .eq('target_language', targetLanguage)
        .eq('audio_generation_status', 'completed')
        .maybeSingle();

      if (existing && existing.audio_url) {
        console.log('✅ Returning cached dubbing');
        return new Response(JSON.stringify({
          originalText: existing.original_text,
          translatedText: existing.translated_text,
          audioUrl: existing.audio_url,
          language: targetLanguage,
          cached: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Translating text to ${targetLanguage}:`, text.substring(0, 100));

    // Step 1: Translate text using OpenAI
    const translationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text to ${getLanguageName(targetLanguage)}. Preserve the exact structure, line breaks, and separators (like ---). Keep the meaning and tone accurate. Return ONLY the translated text with the same structure, nothing else.`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    if (!translationResponse.ok) {
      const error = await translationResponse.text();
      throw new Error(`Translation failed: ${error}`);
    }

    const translationData = await translationResponse.json();
    const translatedText = translationData.choices[0].message.content.trim();

    console.log('Translation completed:', translatedText.substring(0, 100));

    // If translateOnly mode, return just the translation
    if (translateOnly) {
      return new Response(JSON.stringify({
        originalText: text,
        translatedText,
        language: targetLanguage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Generate speech using ElevenLabs
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || 'EXAVITQu4vr4xnSDxMaL'}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsKey,
      },
      body: JSON.stringify({
        text: translatedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        }
      }),
    });

    if (!ttsResponse.ok) {
      const error = await ttsResponse.text();
      throw new Error(`TTS failed: ${error}`);
    }

    const audioBuffer = new Uint8Array(await ttsResponse.arrayBuffer());

    // Step 3: Save to storage and database if videoId provided
    if (videoId) {
      const dubbingId = crypto.randomUUID();
      const audioPath = `${videoId}/${targetLanguage}/${dubbingId}.mp3`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('dubbed-audio')
        .upload(audioPath, audioBuffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('dubbed-audio')
        .getPublicUrl(audioPath);

      const audioUrl = urlData.publicUrl;

      // Save to database
      const { error: dbError } = await supabase
        .from('video_dubbing')
        .upsert({
          video_id: videoId,
          target_language: targetLanguage,
          source_language: sourceLanguage,
          original_text: text,
          translated_text: translatedText,
          audio_url: audioUrl,
          audio_generation_status: 'completed',
          audio_generated_at: new Date().toISOString(),
          voice_id: voiceId,
          voice_name: getLanguageName(targetLanguage),
          generation_params: { model: 'gpt-4o-mini', tts_model: 'eleven_multilingual_v2' }
        }, {
          onConflict: 'video_id,target_language'
        });

      if (dbError) {
        console.error('Database save error:', dbError);
      }

      console.log('✅ Dubbing saved to database and storage');

      return new Response(JSON.stringify({
        originalText: text,
        translatedText,
        audioUrl,
        language: targetLanguage,
        cached: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback: return base64 for preview/testing without videoId
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < audioBuffer.length; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const audioBase64 = btoa(binaryString);

    console.log('Dubbing generated (preview mode)');

    return new Response(JSON.stringify({
      originalText: text,
      translatedText,
      audioBase64,
      language: targetLanguage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Dubbing error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate dubbing' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'tr': 'Turkish'
  };
  return languages[code] || 'English';
}