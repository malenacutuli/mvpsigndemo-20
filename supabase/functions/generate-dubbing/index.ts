import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLanguage, voiceId, translateOnly } = await req.json();

    if (!text || !targetLanguage) {
      throw new Error('Text and target language are required');
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const elevenlabsKey = Deno.env.get('ELEVENLABS_API_KEY');

    if (!openaiKey || !elevenlabsKey) {
      throw new Error('API keys not configured');
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
            content: `You are a professional translator. Translate the following text to ${getLanguageName(targetLanguage)}. Keep the meaning and tone accurate. Only return the translation, nothing else.`
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

    // Convert audio to base64 (handle large files in chunks)
    const audioBuffer = await ttsResponse.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    
    // Process in chunks to avoid stack overflow
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    
    const audioBase64 = btoa(binaryString);

    console.log('Dubbing generated successfully');

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
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese'
  };
  return languages[code] || 'English';
}