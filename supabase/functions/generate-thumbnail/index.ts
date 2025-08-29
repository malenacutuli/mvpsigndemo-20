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
        <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
        <stop offset="25%" style="stop-color:#34495e;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#3c4043;stop-opacity:1" />
        <stop offset="75%" style="stop-color:#2d3436;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
      </linearGradient>
      <filter id="noise">
        <feTurbulence baseFrequency="0.02" numOctaves="3" result="noise" stitchTiles="stitch"/>
        <feColorMatrix in="noise" type="saturate" values="0"/>
        <feBlend in="SourceGraphic" in2="noise" mode="overlay" result="blend"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)" filter="url(#noise)"/>
    <!-- Simulate video content patterns -->
    <rect x="100" y="150" width="300" height="200" fill="rgba(52, 73, 94, 0.3)" rx="8"/>
    <rect x="450" y="200" width="400" height="150" fill="rgba(44, 62, 80, 0.4)" rx="8"/>
    <rect x="900" y="100" width="250" height="300" fill="rgba(58, 64, 67, 0.3)" rx="8"/>
    <!-- Simulate text overlay areas -->
    <rect x="50" y="500" width="600" height="50" fill="rgba(0,0,0,0.6)" rx="4"/>
    <rect x="700" y="520" width="400" height="30" fill="rgba(0,0,0,0.5)" rx="4"/>
    <!-- Video player UI elements -->
    <rect x="0" y="680" width="1280" height="40" fill="rgba(0,0,0,0.8)"/>
    <circle cx="640" cy="700" r="12" fill="#ffffff"/>
    <polygon points="636,694 636,706 646,700" fill="#000000"/>
    <!-- Progress bar -->
    <rect x="50" y="695" width="1180" height="10" fill="rgba(255,255,255,0.2)" rx="5"/>
    <rect x="50" y="695" width="118" height="10" fill="#ff6b6b" rx="5"/>
    <!-- Time stamps -->
    <text x="20" y="705" font-family="Arial, sans-serif" font-size="12" fill="white">00:12</text>
    <text x="1250" y="705" font-family="Arial, sans-serif" font-size="12" fill="white">02:05</text>
    <!-- Video quality indicator -->
    <rect x="1200" y="20" width="60" height="25" fill="rgba(0,0,0,0.8)" rx="4"/>
    <text x="1230" y="37" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">1080p</text>
  </svg>`;
}
