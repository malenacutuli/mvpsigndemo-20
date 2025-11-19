import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { projectId, options } = await req.json();

    console.log('[premium-ai-generate] Request received:', { projectId, options });

    // Validate input
    if (!projectId || !options) {
      throw new Error('Missing required parameters: projectId and options are required');
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        video_id: projectId,
        type: 'ai-generate',
        status: 'pending',
        payload: options
      })
      .select()
      .single();

    if (jobError) {
      console.error('[premium-ai-generate] Job creation error:', jobError);
      throw jobError;
    }

    console.log('[premium-ai-generate] Job created successfully:', job.id);

    // TODO: Call actual AI generation service (Runway, Replicate, etc.)
    // For now, return job that will be processed asynchronously
    
    return new Response(
      JSON.stringify({ job }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[premium-ai-generate] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
