import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { videoId, videoUrl } = await req.json();

    if (!videoId || !videoUrl) {
      throw new Error('Video ID and URL are required');
    }

    console.log(`🎬 Starting thumbnail generation for video: ${videoId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate a simple SVG thumbnail as placeholder
    // In production, you would use FFmpeg or similar to extract actual video frames
    const svgThumbnail = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#bg)"/>
        <circle cx="640" cy="360" r="60" fill="rgba(255,255,255,0.9)"/>
        <polygon points="620,340 620,380 660,360" fill="#1e3a8a"/>
        <text x="640" y="450" text-anchor="middle" fill="white" font-family="Arial" font-size="24" font-weight="bold">Video Thumbnail</text>
      </svg>
    `;

    // Convert SVG to bytes
    const thumbnailData = new TextEncoder().encode(svgThumbnail);

    // Upload thumbnail to Supabase Storage
    const thumbnailFileName = `${videoId}-thumbnail.svg`;
    
    console.log(`📸 Uploading thumbnail: ${thumbnailFileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailFileName, thumbnailData, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Thumbnail upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(thumbnailFileName);

    console.log(`✅ Thumbnail uploaded: ${publicUrl}`);

    // Update video record with thumbnail URL
    const { error: updateError } = await supabase
      .from('videos')
      .update({ thumbnail_url: publicUrl })
      .eq('id', videoId);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw updateError;
    }

    console.log(`🎯 Thumbnail generation completed for video: ${videoId}`);

    return new Response(JSON.stringify({
      success: true,
      videoId,
      thumbnailUrl: publicUrl,
      message: 'Thumbnail generated and saved successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Thumbnail generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate thumbnail' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});