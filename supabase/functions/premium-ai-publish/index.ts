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

    console.log('[premium-ai-publish] Request received:', { projectId, options });

    if (!projectId || !options) {
      throw new Error('Missing required parameters: projectId and options are required');
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        video_id: projectId,
        type: 'ai-publish',
        status: 'pending',
        payload: options
      })
      .select()
      .single();

    if (jobError) {
      console.error('[premium-ai-publish] Job creation error:', jobError);
      throw jobError;
    }

    console.log('[premium-ai-publish] Job created successfully:', job.id);

    // TODO: Implement platform publishing logic
    // - YouTube API
    // - TikTok API
    // - Instagram API
    // - LinkedIn API
    
    return new Response(
      JSON.stringify({ job }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[premium-ai-publish] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
