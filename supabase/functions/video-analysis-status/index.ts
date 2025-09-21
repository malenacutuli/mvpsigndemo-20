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
    const { assetId } = await req.json();
    
    if (!assetId) {
      return new Response(
        JSON.stringify({ error: 'assetId required' }), 
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
    
    if (!mapping?.task_id) {
      return new Response(
        JSON.stringify({ error: 'No indexing task found for this asset' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check task status with Twelve Labs
    const taskResponse = await fetch(`${TL_BASE}/tasks/${mapping.task_id}`, {
      headers: { 'Authorization': `Bearer ${twelveLabsApiKey}` }
    });

    const taskData = await taskResponse.json();
    console.log('Task status response:', taskData);

    // Extract video ID from task response
    const tlVideoId = taskData.video_id || 
                      taskData.result?.video_id || 
                      taskData.data?.video_id || 
                      taskData.metadata?.video_id || 
                      mapping.tl_video_id;

    const status = taskData.status || mapping.status || 'processing';

    // Update mapping in database
    const updatedMapping = {
      ...mapping,
      status: status as string,
      tl_video_id: tlVideoId,
      updated_at: new Date().toISOString(),
      error_message: taskData.error || null
    };

    const { error: updateError } = await supabase
      .from('twelve_labs_mappings')
      .update(updatedMapping)
      .eq('asset_id', assetId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        ok: true, 
        mapping: updatedMapping, 
        raw: taskData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Video analysis status error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});