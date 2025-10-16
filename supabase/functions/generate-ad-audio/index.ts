import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice ID mapping: friendly slugs -> ElevenLabs IDs
const VOICE_ID_MAP: Record<string, string> = {
  'gordon-ramsay': 'nPczCjzI2devNBz1zQrb',
  'julia-child': '9BWtsMINqrJLrRacOk9x',
  'anthony-bourdain': 'JBFqnCBsd6RMkjVDRZzb',
  'jamie-oliver': 'CwhRBWXzGAHq8TQ4Fs17',
  'ina-garten': 'EXAVITQu4vr4xnSDxMaL',
  'emeril-style': 'TX3LPaxmHKxFdv7VOQHJ',
  'rachael-ray-style': 'cgSgspJ2msm6clMCkdW9',
  'professional-male': 'onwK4e9ZLuTAKqWW03F9',
  'professional-female': 'pFZP5JQG7iQjIQuC4Bku',
  'documentary-male': 'IKne3meq5aSn9XLyUdCD',
  'documentary-female': 'XB0fDUnXU5powFXDhCwa',
  'news-anchor-male': 'bIHbv24MWmeRgasZH58o',
  'news-anchor-female': 'XrExE9yKIg1WjnnlVkGX',
  'teacher-female': 'cgSgspJ2msm6clMCkdW9',
  'teacher-male': 'TX3LPaxmHKxFdv7VOQHJ',
  'storyteller-female': 'XrExE9yKIg1WjnnlVkGX',
  'storyteller-male': 'bIHbv24MWmeRgasZH58o',
  'children-host-female': 'pFZP5JQG7iQjIQuC4Bku',
  'children-host-male': 'onwK4e9ZLuTAKqWW03F9',
  'spanish-narrator-female': 'pFZP5JQG7iQjIQuC4Bku',
  'spanish-narrator-male': 'JBFqnCBsd6RMkjVDRZzb',
  'spanish-warm-female': 'cgSgspJ2msm6clMCkdW9',
  'spanish-energetic': 'XrExE9yKIg1WjnnlVkGX',
  'spanish-chef-male': 'CwhRBWXzGAHq8TQ4Fs17',
  'spanish-chef-female': 'EXAVITQu4vr4xnSDxMaL',
  'premium-aria': '9BWtsMINqrJLrRacOk9x',
  'premium-roger': 'CwhRBWXzGAHq8TQ4Fs17',
  'premium-sarah': 'EXAVITQu4vr4xnSDxMaL',
  'premium-charlie': 'IKne3meq5aSn9XLyUdCD',
  'premium-emma': 'XB0fDUnXU5powFXDhCwa',
  'premium-daniel': 'onwK4e9ZLuTAKqWW03F9',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: any;
  try {
    requestBody = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { description_id, video_id, text, language, voice_id } = requestBody;
    
    console.log('🎙️ [Generate AD Audio] Starting generation:', {
      description_id,
      video_id,
      textLength: text?.length,
      language,
      voice_id
    });

    // Validate required fields
    if (!description_id || !video_id || !text) {
      throw new Error('Missing required fields: description_id, video_id, or text');
    }

    // Get Supabase client for authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user owns the video
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized: User not authenticated');
    }

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('user_id')
      .eq('id', video_id)
      .single();

    if (videoError || !video || video.user_id !== user.id) {
      throw new Error('Unauthorized: You do not own this video');
    }

    // Update status to 'processing'
    await supabase
      .from('audio_descriptions')
      .update({ audio_generation_status: 'processing' })
      .eq('id', description_id);

    console.log('✅ [Generate AD Audio] User verified, generating TTS...');

    // Map friendly voice ID to ElevenLabs ID if needed
    const mappedVoiceId = VOICE_ID_MAP[voice_id] || voice_id;

    // Default voice IDs by language
    const defaultVoices: Record<string, string> = {
      'en': '9BWtsMINqrJLrRacOk9x', // Aria
      'es': 'XB0fDUnXU5powFXDhCwa', // Charlotte
      'fr': 'XB0fDUnXU5powFXDhCwa',
      'de': 'IKne3meq5aSn9XLyUdCD',
      'it': 'pFZP5JQG7iQjIQuC4Bku',
      'pt': 'TX3LPaxmHKxFdv7VOQHJ'
    };

    const selectedVoiceId = mappedVoiceId || defaultVoices[language] || defaultVoices['en'];
    
    console.log(`🎙️ [Generate AD Audio] Using voice: ${selectedVoiceId} (original: ${voice_id || 'none'})`);

    let audioBuffer: Uint8Array | null = null;
    let usedProvider = '';
    let lastError: Error | null = null;

    // Try ElevenLabs first
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (ELEVENLABS_API_KEY) {
      try {
        console.log('🔊 [ElevenLabs] Attempting TTS generation...');
        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.5,
                use_speaker_boost: true
              }
            }),
          }
        );

        if (ttsResponse.ok) {
          const audioArrayBuffer = await ttsResponse.arrayBuffer();
          audioBuffer = new Uint8Array(audioArrayBuffer);
          usedProvider = 'ElevenLabs';
          console.log('✅ [ElevenLabs] TTS generated successfully');
        } else {
          const errorText = await ttsResponse.text();
          lastError = new Error(`ElevenLabs failed: ${ttsResponse.status} - ${errorText}`);
          console.warn('⚠️ [ElevenLabs] Failed:', lastError.message);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn('⚠️ [ElevenLabs] Exception:', lastError.message);
      }
    } else {
      console.warn('⚠️ [ElevenLabs] API key not configured, skipping');
    }

    // Fallback to Hume AI if ElevenLabs failed
    if (!audioBuffer) {
      const HUME_API_KEY = Deno.env.get('HUME_API_KEY');
      if (HUME_API_KEY) {
        try {
          console.log('🔊 [Hume AI] Attempting fallback TTS generation...');
          
          // Voice names by language for Hume AI
          const voiceNames: Record<string, string> = {
            'en': 'Calm English Narrator',
            'es': 'Spanish Professional Narrator',
            'fr': 'French Professional Narrator',
            'de': 'German Professional Narrator',
            'it': 'Italian Professional Narrator',
            'pt': 'Portuguese Professional Narrator'
          };

          const humeTtsResponse = await fetch('https://api.hume.ai/v0/tts/stream/file', {
            method: 'POST',
            headers: {
              'X-Hume-Api-Key': HUME_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              utterances: [{
                text: text,
                voice: {
                  name: voiceNames[language] || voiceNames['en'],
                  provider: 'HUME_AI'
                }
              }],
              format: {
                type: 'mp3'
              },
              strip_headers: true
            }),
          });

          if (humeTtsResponse.ok) {
            const audioArrayBuffer = await humeTtsResponse.arrayBuffer();
            audioBuffer = new Uint8Array(audioArrayBuffer);
            usedProvider = 'Hume AI';
            console.log('✅ [Hume AI] TTS generated successfully (fallback)');
          } else {
            const errorText = await humeTtsResponse.text();
            lastError = new Error(`Hume AI failed: ${humeTtsResponse.status} - ${errorText}`);
            console.error('❌ [Hume AI] Failed:', lastError.message);
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error('❌ [Hume AI] Exception:', lastError.message);
        }
      } else {
        console.warn('⚠️ [Hume AI] API key not configured, no fallback available');
      }
    }

    // If both providers failed, throw error
    if (!audioBuffer) {
      throw new Error(`All TTS providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    console.log(`✅ [Generate AD Audio] Audio generated using ${usedProvider}`);

    // Upload to Supabase Storage
    const audioPath = `${video_id}/${description_id}.mp3`;
    const { error: uploadError } = await supabase
      .storage
      .from('audio-descriptions')
      .upload(audioPath, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ [Generate AD Audio] Storage upload error:', uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    console.log('✅ [Generate AD Audio] Audio uploaded to storage');

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('audio-descriptions')
      .getPublicUrl(audioPath);

    const publicUrl = urlData.publicUrl;

    // Update database with audio_url, status, and provider info
    const { error: updateError } = await supabase
      .from('audio_descriptions')
      .update({
        audio_url: publicUrl,
        audio_generated_at: new Date().toISOString(),
        audio_generation_status: 'completed',
        voice_id: selectedVoiceId,
        audio_error_message: null
      })
      .eq('id', description_id);

    if (updateError) {
      console.error('❌ [Generate AD Audio] Database update error:', updateError);
      throw new Error(`Failed to update database: ${updateError.message}`);
    }

    console.log(`✅ [Generate AD Audio] Generation complete! Provider: ${usedProvider}`, {
      audio_url: publicUrl,
      voice_id: selectedVoiceId
    });

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: publicUrl,
        voice_id: selectedVoiceId,
        description_id,
        provider: usedProvider
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Generate AD Audio] Error:', error);
    
    // Update error status in database if we have the description_id
    if (requestBody?.description_id) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('audio_descriptions')
          .update({
            audio_generation_status: 'failed',
            audio_error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', requestBody.description_id);
      } catch (dbError) {
        console.error('Failed to update error status:', dbError);
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate audio description'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
