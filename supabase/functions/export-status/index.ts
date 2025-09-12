import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // Initialize Supabase client to check for completed files
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if processed video exists in storage
    const { data: files, error } = await supabase.storage
      .from('processed-videos')
      .list('', { search: `${processId.split('-')[0]}_accessible.mp4` });

    let status;
    if (error) {
      status = {
        processId,
        status: 'processing',
        progress: 50,
        message: 'Video rendering in progress...',
        downloadUrl: null,
        createdAt: new Date().toISOString()
      };
    } else if (files && files.length > 0) {
      // File exists, video is ready
      const { data: videoUrl } = supabase.storage
        .from('processed-videos')
        .getPublicUrl(files[0].name);
        
      status = {
        processId,
        status: 'complete',
        progress: 100,
        message: 'Accessible video ready for download!',
        downloadUrl: videoUrl.publicUrl,
        fileName: files[0].name,
        createdAt: new Date().toISOString()
      };
    } else {
      // Still processing
      status = {
        processId,
        status: 'processing',
        progress: 75,
        message: 'Finalizing video with burned-in captions...',
        downloadUrl: null,
        createdAt: new Date().toISOString()
      };
    }

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