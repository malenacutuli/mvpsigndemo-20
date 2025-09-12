import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📊 Export Status Check Request');
  
  try {
    const { processId } = await req.json();
    
    if (!processId) {
      return new Response(
        JSON.stringify({ error: 'Process ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('🔍 Checking status for process:', processId);

    // For this demo implementation, we'll simulate immediate completion
    // In a real implementation, you would check the actual processing status
    // from a database or job queue
    
    const status = {
      processId,
      status: 'complete', // 'pending', 'processing', 'complete', 'failed'
      progress: 100,
      message: 'Export completed successfully',
      downloadUrl: null, // Would contain the actual download URL
      createdAt: new Date().toISOString()
    };

    console.log('✅ Status check result:', status);

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to check export status'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});