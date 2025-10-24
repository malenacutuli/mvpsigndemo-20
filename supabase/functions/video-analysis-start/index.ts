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
    const { assetId, playbackUrl, videoId } = await req.json();
    
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

    // Check video duration BEFORE attempting indexing (60 minutes = 3600 seconds max)
    if (videoId) {
      const { data: videoData } = await supabase
        .from('videos')
        .select('duration')
        .eq('id', videoId)
        .single();
      
      if (videoData?.duration && videoData.duration > 3600) {
        const durationMinutes = Math.round(videoData.duration / 60);
        return new Response(
          JSON.stringify({ 
            error: 'Video exceeds maximum duration',
            details: `Video is ${durationMinutes} minutes long. Maximum supported duration is 60 minutes for video analysis. Transcription will still work for the first 60 minutes.`,
            duration_seconds: videoData.duration,
            max_duration_seconds: 3600
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
    const indexId = existingMapping?.index_id || await createIndex(supabase);
    
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
    
    // Extract detailed error from Twelve Labs API response
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (errorMessage.includes('video_duration_too_long')) {
      statusCode = 400;
      errorMessage = 'Video exceeds the 60-minute duration limit for indexing';
    } else if (errorMessage.includes('Failed to create indexing task')) {
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message 
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createIndex(supabase: any) {
  const twelveLabsApiKey = Deno.env.get('TWELVELABS_API_KEY');
  if (!twelveLabsApiKey) throw new Error('TWELVELABS_API_KEY not configured');

  // Helper to list and find existing index (try with large page size first)
  const tryList = async (suffix: string) => {
    const resp = await fetch(`${TL_BASE}/indexes${suffix}`, {
      headers: { 'x-api-key': `${twelveLabsApiKey}`, 'Accept': 'application/json' }
    });
    if (!resp.ok) return { ok: false, text: await resp.text() };
    const json = await resp.json();
    const list = Array.isArray(json?.data)
      ? json.data
      : (Array.isArray(json?.items)
        ? json.items
        : (Array.isArray(json) ? json : []));
    const existing = list.find((i: any) => {
      const names = [i.index_name, i.name, i.indexName].filter(Boolean);
      if (names.includes('axessible-video-analysis')) return true;
      // Fallback: scan any string fields
      for (const k of Object.keys(i)) {
        const v = (i as any)[k];
        if (typeof v === 'string' && v === 'axessible-video-analysis') return true;
      }
      return false;
    });
    if (existing) {
      const indexId = existing._id || existing.id || existing.index_id;
      console.log(`✅ Reusing existing index: ${indexId}`);
      return { ok: true, id: indexId };
    }
    return { ok: true, id: null };
  };

  // First, try to find existing index via API
  const viaApiLarge = await tryList('?page_limit=1000');
  if (viaApiLarge.ok && viaApiLarge.id) return viaApiLarge.id;
  const viaApi = await tryList('');
  if (viaApi.ok && viaApi.id) return viaApi.id;

  // Fallback: reuse last known index_id from database mappings
  try {
    const { data: recent } = await supabase
      .from('twelve_labs_mappings')
      .select('index_id')
      .not('index_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent?.index_id) {
      console.log(`♻️ Reusing index from DB mappings: ${recent.index_id}`);
      return recent.index_id as string;
    }
  } catch (e) {
    console.warn('⚠️ Could not query DB for existing index_id', e);
  }

  // Try to create new index
  try {
    console.log('📝 Creating new index: axessible-video-analysis');
    return await createNewIndex(TL_BASE, twelveLabsApiKey);
  } catch (error: any) {
    // Handle 409 conflict - index already exists
    if (error.message.includes('409') || error.message.includes('index_name_already_exists')) {
      console.log('⚠️ Index creation returned 409 - falling back to existing index');
      const retry = await tryList('?page_limit=1000');
      if (retry.ok && retry.id) return retry.id;
      const fallback = await tryList('');
      if (fallback.ok && fallback.id) return fallback.id;
      throw new Error('Index exists but could not be retrieved');
    }
    throw error;
  }
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

  // Validate video URL format early
  if (!/(\.mp4|\.mov|\.webm|\.mkv)(\?|$)/i.test(videoUrl)) {
    console.log('⚠️ Warning: videoUrl may not be a direct file URL (HLS/pages will fail):', videoUrl);
  }

  const formData = new FormData();
  formData.append('index_id', indexId);
  formData.append('video_url', videoUrl);

  console.log(`📤 Submitting indexing task for index: ${indexId}`);

  const response = await fetch(`${TL_BASE}/tasks`, {
    method: 'POST',
    headers: { 'x-api-key': `${twelveLabsApiKey}` }, // Don't set Content-Type - let browser set it for FormData
    body: formData
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`❌ Task creation failed (${response.status}):`, text);
    throw new Error(`Failed to create indexing task: ${response.status}: ${text}`);
  }

  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    console.error('❌ Failed to parse response as JSON:', text);
    throw new Error(`Failed to parse task response as JSON: ${text}`);
  }
  
  console.log('✅ Task created successfully:', {
    taskId: result._id || result.id || result.task_id,
    videoId: result.video_id
  });
  
  return result;
}