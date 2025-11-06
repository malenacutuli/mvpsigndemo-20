import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { text, voiceId, modelId, language } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'text'" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Get API key with debugging
    const XI_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    console.log("TTS Function - Environment check:");
    console.log("- ELEVENLABS_API_KEY present:", !!XI_API_KEY);
    console.log("- Request payload:", { text: text.substring(0, 50) + "...", voiceId, modelId, language });
    
    if (!XI_API_KEY) {
      console.error("ELEVENLABS_API_KEY not found in environment");
      return new Response(JSON.stringify({ 
        error: "ELEVENLABS_API_KEY not configured",
        debug: "Environment variable not accessible to edge function"
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Smart voice selection based on language and content
    const getOptimalVoice = (language?: string, voice?: string) => {
      // Native Spanish voices optimized for accessibility
      const spanishVoices = {
        female: "pFZP5JQG7iQjIQuC4Bku", // Lily - clear Spanish
        warm: "cgSgspJ2msm6clMCkdW9",   // Jessica - warm Spanish  
        energetic: "XrExE9yKIg1WjnnlVkGX" // Matilda - animated Spanish
      };
      
      const englishVoices = {
        default: "EXAVITQu4vr4xnSDxMaL", // Sarah
        male: "nPczCjzI2devNBz1zQrb"    // Brian
      };
      
      if (voice) return voice; // Use provided voice if specified
      
      if (language === 'es' || language === 'spanish') {
        return spanishVoices.female; // Default to clear Spanish voice
      }
      
      return englishVoices.default;
    };

    const resolvedVoiceId = getOptimalVoice(language, voiceId);
    const resolvedModelId = modelId || (language === 'es' ? "eleven_multilingual_v2" : "eleven_turbo_v2_5");

    const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`;

    const payload = {
      model_id: resolvedModelId,
      text,
      voice_settings: {
        stability: language === 'es' ? 0.6 : 0.5,        // Slightly more stable for Spanish
        similarity_boost: language === 'es' ? 0.8 : 0.75, // Higher boost for Spanish clarity  
        style: language === 'es' ? 0.3 : 0.5,            // Less style variation for Spanish
        use_speaker_boost: true,
      },
      optimize_streaming_latency: 3, // Slightly less aggressive for better quality
      output_format: "mp3_44100_128",
    };

    console.log("Making request to ElevenLabs API...");
    
    // NO RETRY LOGIC - Fail fast and let client-side queue handle retries
    // This prevents concurrent request buildup
    const elRes = await fetch(elevenUrl, {
      method: "POST",
      headers: {
        "xi-api-key": XI_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(payload),
    });

    if (!elRes.ok) {
      const errText = await elRes.text();
      console.error("ElevenLabs API error:", elRes.status, errText);
      
      // Return error immediately - client queue will handle retry logic
      return new Response(JSON.stringify({ 
        error: "ElevenLabs API error", 
        status: elRes.status,
        details: errText 
      }), {
        status: elRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("TTS generation successful");
    const audioBuffer = await elRes.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("TTS function error:", err);
    return new Response(JSON.stringify({ 
      error: "Unexpected error", 
      details: String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});