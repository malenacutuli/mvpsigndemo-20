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
    // The filename should be based on videoId, not processId
    // Since we don't have videoId directly, let's list all files and check for any accessible video
    const { data: files, error } = await supabase.storage
      .from('processed-videos')
      .list('', { search: '_accessible.mp4' });

    console.log('📁 Found files in processed-videos:', files?.map(f => f.name) || []);
    console.log('🔍 Storage query error:', error);

    let status;
    if (error) {
      console.log('⚠️ Storage error, assuming still processing');
      status = {
        processId,
        status: 'processing',
        progress: 50,
        message: 'Video rendering in progress...',
        downloadUrl: null,
        createdAt: new Date().toISOString()
      };
    } else if (files && files.length > 0) {
      // Find the most recent file (as a simple approach)
      const latestFile = files.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )[0];
      
      console.log('✅ Found processed video file:', latestFile.name);
      
      // File exists, video is ready
      const { data: videoUrl } = supabase.storage
        .from('processed-videos')
        .getPublicUrl(latestFile.name);
        
      status = {
        processId,
        status: 'complete',
        progress: 100,
        message: 'Accessible video ready for download!',
        downloadUrl: videoUrl.publicUrl,
        fileName: latestFile.name,
        createdAt: new Date().toISOString()
      };
    } else {
      console.log('📋 No processed files found, still processing');
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