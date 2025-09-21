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
    const { assetId, prompt } = await req.json();
    
    if (!assetId || !prompt) {
      return new Response(
        JSON.stringify({ error: 'assetId and prompt required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const twelveLabsApiKey = Deno.env.get('TWELVELABS_API_KEY');
    if (!twelveLabsApiKey) {
      throw new Error('TWELVELABS_API_KEY not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get mapping from database to find video_id
    const { data: mapping, error: mappingError } = await supabase
      .from('twelve_labs_mappings')
      .select('*')
      .eq('asset_id', assetId)
      .eq('status', 'ready')
      .maybeSingle();

    if (mappingError) throw mappingError;
    
    if (!mapping?.tl_video_id) {
      return new Response(
        JSON.stringify({ error: 'Video not ready for analysis. Please ensure indexing is complete.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎯 Starting analysis for video:', mapping.tl_video_id);

    // Call analyze API
    const analyzeResponse = await fetch(`${TL_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        video_id: mapping.tl_video_id,
        prompt: prompt,
        temperature: 0.2
      })
    });

    const analyzeText = await analyzeResponse.text();
    console.log('📊 Analyze response status:', analyzeResponse.status);
    console.log('📊 Analyze response text:', analyzeText.substring(0, 500));

    if (!analyzeResponse.ok) {
      throw new Error(`Analysis failed ${analyzeResponse.status}: ${analyzeText}`);
    }

    let analyzeResult: any;
    try {
      analyzeResult = JSON.parse(analyzeText);
    } catch {
      throw new Error(`Analysis API returned non-JSON: ${analyzeText}`);
    }

    console.log('✅ Analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        ok: true, 
        result: analyzeResult,
        videoId: mapping.tl_video_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Video analysis error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});