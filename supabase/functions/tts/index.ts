// Supabase Edge Function: ElevenLabs TTS proxy
// Securely generates audio using ElevenLabs and returns audio/mpeg
// Deployed via Supabase; add ELEVENLABS_API_KEY in Supabase secrets

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
    const { text, voiceId, modelId } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'text'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const XI_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!XI_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resolvedVoiceId = voiceId || "EXAVITQu4vr4xnSDxMaL"; // Default to Sarah
    const resolvedModelId = modelId || "eleven_turbo_v2_5";

    const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`;

    const payload = {
      model_id: resolvedModelId,
      text,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true,
      },
      optimize_streaming_latency: 4,
      output_format: "mp3_44100_128",
    };

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
      return new Response(JSON.stringify({ error: "ElevenLabs error", details: errText }), {
        status: elRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const audioBuffer = await elRes.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
