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

    // For now, we'll use a simple approach to generate thumbnails
    // In production, you might want to use FFmpeg or similar video processing tools
    // This is a mock implementation that would work with actual video processing

    // Create a canvas-based thumbnail generation
    const canvas = new OffscreenCanvas(1280, 720);
    const ctx = canvas.getContext('2d');
    
    // Create a simple gradient background as placeholder
    // In production, this would extract actual frame from video
    const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
    gradient.addColorStop(0, '#1e3a8a');
    gradient.addColorStop(1, '#3b82f6');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);
    
    // Add play button icon
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(640, 360, 60, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw play triangle
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(620, 340);
    ctx.lineTo(620, 380);
    ctx.lineTo(660, 360);
    ctx.closePath();
    ctx.fill();

    // Convert canvas to blob
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
    const arrayBuffer = await blob.arrayBuffer();
    const thumbnailData = new Uint8Array(arrayBuffer);

    // Upload thumbnail to Supabase Storage
    const thumbnailFileName = `${videoId}-thumbnail.jpg`;
    
    console.log(`📸 Uploading thumbnail: ${thumbnailFileName}`);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('thumbnails')
      .upload(thumbnailFileName, thumbnailData, {
        contentType: 'image/jpeg',
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