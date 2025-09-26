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
    const { processId, videoId } = await req.json();
    
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

    // Determine status by checking for the expected output file
    let status;

    // Prefer a direct check when videoId is provided
    if (videoId) {
      const fileName = `${videoId}_accessible.mp4`;
      console.log('🔎 Looking for processed file for videoId:', videoId, '->', fileName);

      // First try listing recent files and match by exact name (cheap)
      const { data: recentFiles, error: listError } = await supabase.storage
        .from('processed-videos')
        .list('', { limit: 100, offset: 0, sortBy: { column: 'updated_at', order: 'desc' } });

      if (listError) {
        console.log('⚠️ List error while checking exact file:', listError);
      }

      const matched = recentFiles?.find((f) => f.name === fileName);

      if (matched) {
        const { data: publicUrl } = supabase.storage
          .from('processed-videos')
          .getPublicUrl(fileName);

        status = {
          processId,
          status: 'complete',
          progress: 100,
          message: 'Accessible video ready for download!',
          downloadUrl: publicUrl.publicUrl,
          fileName,
          createdAt: new Date().toISOString()
        };
      } else {
        // Fallback: try creating a short-lived signed URL to test existence without downloading
        const { data: signed, error: signError } = await supabase.storage
          .from('processed-videos')
          .createSignedUrl(fileName, 60);

        if (!signError && signed?.signedUrl) {
          const { data: publicUrl } = supabase.storage
            .from('processed-videos')
            .getPublicUrl(fileName);

          status = {
            processId,
            status: 'complete',
            progress: 100,
            message: 'Accessible video ready for download!',
            downloadUrl: publicUrl.publicUrl,
            fileName,
            createdAt: new Date().toISOString()
          };
        }
      }
    }

    // If we still don't have a status, fall back to checking for any processed files
    if (!status) {
      const { data: files, error } = await supabase.storage
        .from('processed-videos')
        .list('', { limit: 100, offset: 0, sortBy: { column: 'updated_at', order: 'desc' } });

      console.log('📁 Found files in processed-videos:', files?.map(f => f.name) || []);
      console.log('🔍 Storage query error:', error);

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
        const latest = files.find((f) => f.name.endsWith('_accessible.mp4')) || null;
        if (latest) {
          const { data: publicUrl } = supabase.storage
            .from('processed-videos')
            .getPublicUrl(latest.name);

          status = {
            processId,
            status: 'complete',
            progress: 100,
            message: 'Accessible video ready for download!',
            downloadUrl: publicUrl.publicUrl,
            fileName: latest.name,
            createdAt: new Date().toISOString()
          };
        } else {
          status = {
            processId,
            status: 'processing',
            progress: 75,
            message: 'Finalizing video with burned-in captions...',
            downloadUrl: null,
            createdAt: new Date().toISOString()
          };
        }
      } else {
        status = {
          processId,
          status: 'processing',
          progress: 75,
          message: 'Finalizing video with burned-in captions...',
          downloadUrl: null,
          createdAt: new Date().toISOString()
        };
      }
    }

    console.log('✅ Status check result:', status);

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Status check failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to check export status'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});