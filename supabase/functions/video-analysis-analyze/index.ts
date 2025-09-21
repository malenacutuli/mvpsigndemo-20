import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TL_BASE = "https://api.twelvelabs.io/v1.3";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    // Accept either { videoId, prompt } or { assetId, prompt }
    const body = await req.json();
    let { videoId, assetId, prompt } = body || {};

    if (!videoId && !assetId) {
      return new Response(
        JSON.stringify({ error: 'videoId or assetId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (prompt === undefined || prompt === null) {
      return new Response(
        JSON.stringify({ error: 'prompt required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('TWELVELABS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing TWELVELABS_API_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve videoId from assetId if needed
    if (!videoId && assetId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: mapping, error: mappingError } = await supabase
        .from('twelve_labs_mappings')
        .select('*')
        .eq('asset_id', assetId)
        .eq('status', 'ready')
        .maybeSingle();

      if (mappingError) {
        return new Response(
          JSON.stringify({ error: `Lookup failed: ${mappingError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!mapping?.tl_video_id) {
        return new Response(
          JSON.stringify({ error: 'Video not ready for analysis. Please wait for indexing to complete.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      videoId = mapping.tl_video_id;
    }

    // Ensure the prompt we send is a STRING and wrap it in a strict, structured schema
    const USER_HINT = typeof prompt === 'string' ? prompt : (() => { try { return JSON.stringify(prompt); } catch { return String(prompt); } })();

    const STRUCTURED_PROMPT = JSON.stringify({
      task: "Find dialogue-free gaps and write ad-style audio descriptions that fit each gap.",
      definitions: {
        silence: "No SPOKEN dialogue or narration by characters. Background music or SFX may exist and should NOT block a gap from being considered silent.",
      },
      instructions: [
        "Scan the entire video and detect every segment with no spoken dialogue.",
        "Return precise timestamps as HH:MM:SS.mmm for start and end.",
        "Return duration_ms for each gap.",
        "Write a concise creative narration that fits the gap at ~160 WPM; keep 0.3s buffer.",
        "Tone: creative advertising copywriter; cinematic podcast; no camera directions.",
        "Language: English.",
        "Output STRICT JSON only, matching the schema.",
      ],
      user_hint: USER_HINT,
      output_schema: {
        video_id: "string",
        silences: [
          { start: "HH:MM:SS.mmm", end: "HH:MM:SS.mmm", duration_ms: 0, max_words_allowed: 0, narration: "string" },
        ],
      },
    });

    // Call analysis endpoint
    const url = `${TL_BASE}/analyze`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        video_id: videoId,
        prompt: STRUCTURED_PROMPT, // enforce schema
        temperature: 0.2,
        stream: false, // Disable streaming to get a single JSON response
      }),
    });

    const raw = await res.text();

    // If not 2xx, bubble up the exact upstream body for easier debugging
    if (!res.ok) {
      console.log('Analyze failed', res.status, raw?.slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'Analyze request failed', status: res.status, url, body: raw }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let envelope: any;
    try {
      envelope = JSON.parse(raw);
    } catch {
      // TL sometimes returns non-JSON when misconfigured
      return new Response(
        JSON.stringify({ error: 'Analyze returned non-JSON', url, body: raw }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize: TL often returns { id, data: \"{...}\" }
    let normalized: any = envelope;
    if (typeof envelope?.data === 'string') {
      try {
        const parsed = JSON.parse(envelope.data);
        if (parsed && typeof parsed === 'object') {
          normalized = parsed;
        }
      } catch (e) {
        // keep envelope if parsing fails
      }
    } else if (envelope?.result && typeof envelope.result === 'object') {
      normalized = envelope.result;
    }

    // Ensure video_id present
    if (normalized && typeof normalized === 'object' && !normalized.video_id) {
      normalized.video_id = videoId;
    }

    // Return the normalized analysis result directly to match UI expectations
    return new Response(
      JSON.stringify(normalized),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `Video analysis analyze error: ${String(e?.message || e)}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
