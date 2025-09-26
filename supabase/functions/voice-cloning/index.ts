import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, voiceName, language } = await req.json();

    if (!audioBase64 || !voiceName) {
      throw new Error('Audio data and voice name are required');
    }

    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!elevenlabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log('Cloning voice:', voiceName, 'Language:', language);

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    // Create form data for ElevenLabs voice cloning API
    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('description', `AI cloned voice for ${language} content`);
    
    // Create audio blob and append to form
    const audioBlob = new Blob([binaryAudio], { type: 'audio/mpeg' });
    formData.append('files', audioBlob, 'voice_sample.mp3');

    // ElevenLabs voice cloning endpoint
    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenlabsApiKey,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`Voice cloning failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Voice cloning result:', result);

    return new Response(JSON.stringify({
      voiceId: result.voice_id,
      voiceName: voiceName,
      language: language,
      status: 'success'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in voice-cloning function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Voice cloning failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});