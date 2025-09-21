import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TL_BASE = "https://api.twelvelabs.io/v1";

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

    // Get mapping from database
    const { data: mapping, error: mappingError } = await supabase
      .from('twelve_labs_mappings')
      .select('*')
      .eq('asset_id', assetId)
      .maybeSingle();

    if (mappingError) throw mappingError;
    
    if (!mapping?.index_id || !mapping?.tl_video_id || mapping.status !== 'ready') {
      return new Response(
        JSON.stringify({ error: 'Asset not ready for analysis. Please ensure indexing is complete.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform analysis with Pegasus 1.2
    const analysisResponse = await fetch(`${TL_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${twelveLabsApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'pegasus-1.2',
        input_videos: [{
          index_id: mapping.index_id,
          video_id: mapping.tl_video_id
        }],
        prompt: prompt,
        response_format: { type: 'json_object' }
      })
    });

    const analysisResult = await analysisResponse.json();
    console.log('Analysis result:', analysisResult);

    // Parse the result if it's a string
    let parsedResult = analysisResult;
    try {
      const content = analysisResult?.choices?.[0]?.message?.content || analysisResult?.content;
      if (typeof content === 'string') {
        parsedResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.log('Could not parse result as JSON, using raw result');
    }

    // Save analysis result to database
    const { error: saveError } = await supabase
      .from('video_analysis_results')
      .insert({
        asset_id: assetId,
        prompt: prompt,
        result: parsedResult,
        language: 'en'
      });

    if (saveError) {
      console.error('Failed to save analysis result:', saveError);
      // Don't throw error here, still return the analysis result
    }

    return new Response(
      JSON.stringify(parsedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Video analysis analyze error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});