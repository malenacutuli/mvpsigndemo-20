import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description_id, video_id, text, language, voice_id } = await req.json();
    
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

    // Generate TTS via ElevenLabs
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Default voice IDs by language
    const defaultVoices: Record<string, string> = {
      'en': '9BWtsMINqrJLrRacOk9x', // Aria
      'es': 'XB0fDUnXU5powFXDhCwa', // Charlotte
      'fr': 'XB0fDUnXU5powFXDhCwa',
      'de': 'IKne3meq5aSn9XLyUdCD',
      'it': 'pFZP5JQG7iQjIQuC4Bku',
      'pt': 'TX3LPaxmHKxFdv7VOQHJ'
    };

    const selectedVoiceId = voice_id || defaultVoices[language] || defaultVoices['en'];
    
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

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('❌ [Generate AD Audio] ElevenLabs error:', errorText);
      throw new Error(`TTS generation failed: ${ttsResponse.status} - ${errorText}`);
    }

    console.log('✅ [Generate AD Audio] TTS generated successfully');

    // Get audio buffer
    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBuffer = new Uint8Array(audioArrayBuffer);

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

    // Update database with audio_url and status
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

    console.log('✅ [Generate AD Audio] Generation complete!', {
      audio_url: publicUrl,
      voice_id: selectedVoiceId
    });

    return new Response(
      JSON.stringify({
        success: true,
        audio_url: publicUrl,
        voice_id: selectedVoiceId,
        description_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Generate AD Audio] Error:', error);
    
    // Try to update error status in database if we have the description_id
    try {
      const { description_id } = await req.json();
      if (description_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('audio_descriptions')
          .update({
            audio_generation_status: 'failed',
            audio_error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', description_id);
      }
    } catch (dbError) {
      console.error('Failed to update error status:', dbError);
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
