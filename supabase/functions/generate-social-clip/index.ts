import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClipRequest {
  videoId: string;
  highlightId?: string;
  platform: 'tiktok' | 'instagram_reel' | 'youtube_short' | 'linkedin';
  startTime: number;
  endTime: number;
  captionStyle?: 'modern' | 'minimal' | 'bold' | 'viral';
  cropMode?: 'center' | 'smart' | 'face_track';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const requestData: ClipRequest = await req.json()
    const { 
      videoId, 
      highlightId, 
      platform, 
      startTime, 
      endTime,
      captionStyle = 'viral',
      cropMode = 'center'
    } = requestData

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log(`Generating ${platform} clip for video ${videoId}`)

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, storage_path, duration_seconds')
      .eq('id', videoId)
      .single()

    if (videoError) throw videoError

    // Platform configurations
    const platformConfig = {
      tiktok: { aspectRatio: '9:16', resolution: '1080x1920', fps: 30 },
      instagram_reel: { aspectRatio: '9:16', resolution: '1080x1920', fps: 30 },
      youtube_short: { aspectRatio: '9:16', resolution: '1080x1920', fps: 30 },
      linkedin: { aspectRatio: '1:1', resolution: '1080x1080', fps: 30 }
    }

    const config = platformConfig[platform]

    // Get captions for this time range
    const { data: captions } = await supabase
      .from('transcript_segments_clean')
      .select('text, start_time, end_time, speaker, speaker_color')
      .eq('video_id', videoId)
      .gte('start_time', startTime - 1)
      .lte('end_time', endTime + 1)
      .order('start_time')

    // Create clip record in database
    const clipTitle = highlightId 
      ? (await supabase.from('video_highlights').select('title').eq('id', highlightId).single()).data?.title
      : `${platform} clip ${new Date().toISOString().slice(0, 10)}`

    const { data: clipRecord, error: clipError } = await supabase
      .from('social_clips')
      .insert({
        video_id: videoId,
        highlight_id: highlightId,
        platform: platform,
        title: clipTitle || 'Untitled Clip',
        start_time: startTime,
        end_time: endTime,
        aspect_ratio: config.aspectRatio,
        resolution: config.resolution,
        caption_style: captionStyle,
        crop_mode: cropMode,
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        created_by: user.id,
        metadata: {
          has_captions: !!captions?.length,
          caption_count: captions?.length || 0
        }
      })
      .select()
      .single()

    if (clipError) throw clipError

    console.log(`Created clip record ${clipRecord.id}, preparing processing job...`)

    // Return immediately - actual processing happens in browser via FFmpeg
    // The frontend will handle the FFmpeg processing with progress updates

    const response = {
      success: true,
      clipId: clipRecord.id,
      videoUrl: video.url,
      startTime,
      endTime,
      duration: endTime - startTime,
      platform,
      config,
      captions: captions || [],
      message: 'Clip record created. Processing will happen in browser.'
    }

    // Track usage
    await supabase.from('feature_usage').insert({
      user_id: user.id,
      feature_name: 'social_clip_generation',
      video_id: videoId,
      metadata: { platform, duration: endTime - startTime }
    })

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in generate-social-clip:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
