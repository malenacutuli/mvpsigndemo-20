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

    // Ensure the prompt we send is a STRING
    if (typeof prompt !== 'string') {
      try { prompt = JSON.stringify(prompt); } catch { prompt = String(prompt); }
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

    console.log('🎬 Starting video analysis for:', videoId);
    console.log('📝 Prompt length:', prompt.length, 'characters');
    
    // Call analysis endpoint
    const url = `${TL_BASE}/analyze`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        video_id: videoId,
        prompt,
        temperature: 0.2,
        stream: false,  // Disable streaming to get a single JSON response
        // Force analysis of complete video duration
        include_clips: true,
        clip_search_options: {
          filter: {
            duration: {
              gte: 0,  // Start from beginning
              lte: 3600  // Up to 1 hour (3600 seconds)
            }
          }
        }
      })
    });

    const raw = await res.text();
    console.log('📊 Analysis response status:', res.status);
    console.log('📊 Analysis response length:', raw.length, 'characters');

    // If not 2xx, bubble up the exact upstream body for easier debugging
    if (!res.ok) {
      console.error('❌ Analysis failed:', res.status, raw);
      return new Response(
        JSON.stringify({ error: 'Analyze request failed', status: res.status, body: raw }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data: any;
    try {
      data = JSON.parse(raw);
      console.log('✅ Analysis parsed successfully');
      
      // Log analysis coverage for debugging
      if (data?.silences?.length) {
        const lastSegment = data.silences[data.silences.length - 1];
        console.log('📈 Found', data.silences.length, 'silent segments');
        console.log('⏰ Last segment ends at:', lastSegment?.end || 'unknown');
      }
    } catch {
      console.error('❌ Failed to parse analysis response as JSON');
      return new Response(
        JSON.stringify({ error: 'Analyze returned non-JSON', body: raw }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure video_id present for UI convenience
    if (data && typeof data === 'object' && !data.video_id) {
      data.video_id = videoId;
    }

    // Return the analysis result directly to match UI expectations
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `Video analysis analyze error: ${String(e?.message || e)}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});