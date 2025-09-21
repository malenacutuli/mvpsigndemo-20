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
    const { assetId, playbackUrl } = await req.json();
    
    if (!assetId || !playbackUrl) {
      return new Response(
        JSON.stringify({ error: 'assetId and playbackUrl required' }), 
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

    // Check if we already have a mapping for this asset
    const { data: existingMapping } = await supabase
      .from('twelve_labs_mappings')
      .select('*')
      .eq('asset_id', assetId)
      .maybeSingle();

    if (existingMapping?.status === 'ready' && existingMapping.index_id && existingMapping.tl_video_id) {
      return new Response(
        JSON.stringify({ ok: true, reused: true, mapping: existingMapping }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or get index
    const indexId = existingMapping?.index_id || await createIndex();
    
    // Create indexing task
    const task = await createIndexingTask(indexId, playbackUrl);
    const taskId = task.id || task.task_id || task.data?.id;
    
    if (!taskId) {
      throw new Error('Failed to create indexing task');
    }

    // Upsert mapping in database
    const mappingData = {
      asset_id: assetId,
      index_id: indexId,
      task_id: taskId,
      status: 'processing',
      updated_at: new Date().toISOString()
    };

    const { data: mapping, error: mappingError } = await supabase
      .from('twelve_labs_mappings')
      .upsert(mappingData)
      .select()
      .single();

    if (mappingError) throw mappingError;

    return new Response(
      JSON.stringify({ ok: true, mapping }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Video analysis start error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createIndex() {
  const twelveLabsApiKey = Deno.env.get('TWELVELABS_API_KEY');
  
  // Check for existing index
  const listResponse = await fetch(`${TL_BASE}/indexes`, {
    headers: { 'Authorization': `Bearer ${twelveLabsApiKey}` }
  });
  
  if (!listResponse.ok) {
    const errorText = await listResponse.text();
    console.error('Failed to list indexes:', errorText);
    throw new Error(`Failed to list indexes: ${listResponse.status} - ${errorText}`);
  }
  
  const indexList = await listResponse.json();
  const existingIndex = indexList?.data?.find((i: any) => i.name === 'axessible-video-analysis');
  
  if (existingIndex) {
    return existingIndex.id;
  }

  // Create new index
  const createResponse = await fetch(`${TL_BASE}/indexes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${twelveLabsApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'axessible-video-analysis',
      engines: [{
        model: 'pegasus-1.2',
        modalities: ['video', 'audio', 'text']
      }]
    })
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Failed to create index:', errorText);
    throw new Error(`Failed to create index: ${createResponse.status} - ${errorText}`);
  }

  const newIndex = await createResponse.json();
  return newIndex.id;
}

async function createIndexingTask(indexId: string, videoUrl: string) {
  const twelveLabsApiKey = Deno.env.get('TWELVELABS_API_KEY');

  const formData = new FormData();
  formData.append('index_id', indexId);
  formData.append('video_url', videoUrl);

  const response = await fetch(`${TL_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${twelveLabsApiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to create indexing task:', errorText);
    throw new Error(`Failed to create indexing task: ${response.status} - ${errorText}`);
  }

  return await response.json();
}