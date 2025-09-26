import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
const taskId = task._id || task.id || task.task_id || task.data?.id || task.video_id;

if (!taskId) {
  throw new Error(`Failed to create indexing task: unexpected response ${JSON.stringify(task)}`);
}

    // Update or insert mapping in database
const mappingData = {
  asset_id: assetId,
  index_id: indexId,
  task_id: taskId,
  tl_video_id: task.video_id ?? null,
  status: 'processing',
  updated_at: new Date().toISOString()
};

    let mapping;
    if (existingMapping) {
      // Update existing mapping
      const { data: updatedMapping, error: updateError } = await supabase
        .from('twelve_labs_mappings')
        .update(mappingData)
        .eq('asset_id', assetId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      mapping = updatedMapping;
    } else {
      // Insert new mapping
      const { data: newMapping, error: insertError } = await supabase
        .from('twelve_labs_mappings')
        .insert(mappingData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      mapping = newMapping;
    }

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
  if (!twelveLabsApiKey) throw new Error('TWELVELABS_API_KEY not configured');

  // List indexes on a single, stable base (v1.3)
  const listResponse = await fetch(`${TL_BASE}/indexes`, {
    headers: { 'x-api-key': `${twelveLabsApiKey}`, 'Accept': 'application/json' }
  });

  if (listResponse.ok) {
    const indexList = await listResponse.json();
    const list = Array.isArray(indexList?.data)
      ? indexList.data
      : (Array.isArray(indexList?.items)
        ? indexList.items
        : (Array.isArray(indexList) ? indexList : []));

    const existingIndex = list.find((i: any) => (
      i.index_name === 'axessible-video-analysis' || i.name === 'axessible-video-analysis'
    ));

    if (existingIndex) {
      return existingIndex._id || existingIndex.id;
    }
  } else {
    const errorText = await listResponse.text();
    console.log('List indexes failed:', errorText);
  }

  // Create new index on v1.3
  return await createNewIndex(TL_BASE, twelveLabsApiKey);
}

async function createNewIndex(endpoint: string, apiKey: string) {
  const payload = {
    index_name: 'axessible-video-analysis',
    models: [
      { model_name: 'marengo2.7', model_options: ['visual', 'audio'] },
      { model_name: 'pegasus1.2', model_options: ['visual', 'audio'] },
    ],
  };

  const createResponse = await fetch(`${endpoint}/indexes`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create index: ${createResponse.status} - ${errorText}`);
  }

  const newIndex = await createResponse.json();
  return newIndex._id || newIndex.id;
}

async function createIndexingTask(indexId: string, videoUrl: string) {
  const twelveLabsApiKey = Deno.env.get('TWELVELABS_API_KEY');

  const formData = new FormData();
  formData.append('index_id', indexId);
  formData.append('video_url', videoUrl);

  // Warn if the URL doesn't look like a direct file URL
  if (!/(\.mp4|\.mov|\.webm|\.mkv)(\?|$)/i.test(videoUrl)) {
    console.log('Warning: videoUrl may not be a direct file URL (HLS/pages will fail):', videoUrl);
  }

  const response = await fetch(`${TL_BASE}/tasks`, {
    method: 'POST',
    headers: { 'x-api-key': `${twelveLabsApiKey}` }, // Don't set Content-Type for FormData
    body: formData
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to create indexing task: ${response.status}: ${text}`);
  }

  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse task response as JSON: ${text}`);
  }
  console.log('Task created successfully:', result);
  return result;
}