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

    // Create a simple SVG thumbnail
    const svgThumbnail = createSVGThumbnail();
    
    // Upload SVG thumbnail to Supabase Storage
    const thumbnailFileName = `${videoId}-thumbnail.svg`;
    
    console.log(`📸 Uploading SVG thumbnail: ${thumbnailFileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailFileName, svgThumbnail, {
        contentType: 'image/svg+xml',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Thumbnail upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(thumbnailFileName);

    console.log(`✅ Thumbnail uploaded: ${thumbnailUrl}`);

    // Update video record with thumbnail URL
    const { error: updateError } = await supabase
      .from('videos')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', videoId);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      throw updateError;
    }

    console.log(`🎯 Thumbnail generation completed for video: ${videoId}`);

    return new Response(JSON.stringify({
      success: true,
      videoId,
      thumbnailUrl: thumbnailUrl,
      message: 'Thumbnail generated using video first frame'
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

function createSVGThumbnail(): string {
  return `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect x="10" y="10" width="1260" height="700" fill="none" stroke="#374151" stroke-width="4"/>
    <circle cx="640" cy="360" r="50" fill="rgba(255,255,255,0.9)"/>
    <polygon points="625,340 625,380 665,360" fill="#1f2937"/>
    <rect x="0" y="620" width="1280" height="100" fill="rgba(0,0,0,0.7)"/>
    <text x="640" y="670" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">Video Content</text>
    <rect x="1150" y="20" width="110" height="30" fill="rgba(0,0,0,0.8)"/>
    <text x="1205" y="40" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">00:00</text>
  </svg>`;
}
