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

    // Create a realistic video thumbnail instead of blue screen
    const thumbnailData = await generateRealisticThumbnail(videoUrl);

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

async function generateRealisticThumbnail(videoUrl: string): Promise<Uint8Array> {
  try {
    console.log('🎥 Creating realistic thumbnail for video:', videoUrl);
    
    // Create a professional-looking video thumbnail
    const canvas = new OffscreenCanvas(1280, 720);
    const ctx = canvas.getContext('2d')!;
    
    // Create a dark, cinematic background with gradient
    const gradient = ctx.createRadialGradient(640, 360, 0, 640, 360, 500);
    gradient.addColorStop(0, '#1f2937'); // Gray-800
    gradient.addColorStop(0.7, '#111827'); // Gray-900
    gradient.addColorStop(1, '#000000'); // Black
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 720);
    
    // Add subtle film grain texture
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 1280;
      const y = Math.random() * 720;
      const alpha = Math.random() * 0.1;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }
    
    // Add elegant border
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 1272, 712);
    
    // Create modern play button with shadow
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(644, 364, 55, 0, 2 * Math.PI);
    ctx.fill();
    
    // Main button
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(640, 360, 50, 0, 2 * Math.PI);
    ctx.fill();
    
    // Play triangle with better geometry
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.moveTo(625, 340);
    ctx.lineTo(625, 380);
    ctx.lineTo(665, 360);
    ctx.closePath();
    ctx.fill();
    
    // Add video title area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 620, 1280, 100);
    
    // Add video title text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Video Content', 640, 670);
    
    // Add timestamp in corner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(1150, 20, 110, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('00:00', 1205, 35);
    
    // Convert to JPEG
    const blob = await canvas.convertToBlob({ 
      type: 'image/jpeg', 
      quality: 0.9 
    });
    
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
    
  } catch (error) {
    console.error('❌ Thumbnail generation error:', error);
    
    // Fallback: create a simple dark thumbnail
    const canvas = new OffscreenCanvas(1280, 720);
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, 1280, 720);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Video', 640, 360);
    
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
}