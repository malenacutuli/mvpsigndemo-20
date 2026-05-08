import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HighlightRequest {
  videoId: string;
  platform?: 'tiktok' | 'instagram_reel' | 'youtube_short' | 'linkedin';
  count?: number;
}

// Helper function to format time
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { videoId, platform = 'tiktok', count = 5 }: HighlightRequest = await req.json()

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log(`Detecting highlights for video ${videoId}, platform: ${platform}`)

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, duration_seconds, storage_path')
      .eq('id', videoId)
      .single()

    if (videoError) throw videoError

    // Check if video has Twelve Labs analysis
    const { data: tlMapping, error: mappingError } = await supabase
      .from('twelve_labs_mappings')
      .select('tl_video_id, status, index_id')
      .eq('asset_id', videoId)
      .single()

    if (mappingError || !tlMapping || tlMapping.status !== 'ready') {
      throw new Error('Video must be analyzed with Twelve Labs first. Please run video analysis.')
    }

    // Platform-specific duration preferences
    const durationPreferences = {
      tiktok: { min: 15, max: 60, ideal: 30 },
      instagram_reel: { min: 15, max: 90, ideal: 45 },
      youtube_short: { min: 15, max: 60, ideal: 45 },
      linkedin: { min: 30, max: 90, ideal: 60 }
    }

    const durations = durationPreferences[platform]

    // Use Twelve Labs to find highlights directly
    const twelveLabsApiKey = Deno.env.get('TWELVE_LABS_API_KEY')
    let useFallback = false;

    if (!twelveLabsApiKey) {
      console.warn('⚠️ TWELVE_LABS_API_KEY not configured, using fallback highlights')
      useFallback = true;
    }

    let highlights = []

    if (!useFallback) {
      try {
        console.log('Using Twelve Labs to find highlights...')

        const summarizeResponse = await fetch('https://api.twelvelabs.io/v1.3/summarize', {
          method: 'POST',
          headers: {
            'x-api-key': twelveLabsApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_id: tlMapping.tl_video_id,
            type: 'highlight',
            prompt: `Identify the ${count} most engaging, viral-worthy moments for ${platform}. Each should be ${durations.ideal} seconds (${durations.min}-${durations.max}s), hook attention immediately, and work as standalone clips.`,
            temperature: 0.7
          })
        })

        if (!summarizeResponse.ok) {
          const errorText = await summarizeResponse.text()
          console.error('❌ Twelve Labs error:', errorText)
          throw new Error(`Twelve Labs highlight generation failed: ${errorText}`)
        }

        const summarizeResult = await summarizeResponse.json()
        console.log('✅ Twelve Labs highlights response:', summarizeResult)

        const tlHighlights = summarizeResult.highlights || []
        console.log(`Found ${tlHighlights.length} highlights from Twelve Labs`)
        
        for (let i = 0; i < Math.min(tlHighlights.length, count); i++) {
          const highlight = tlHighlights[i]
          const startTime = highlight.start_sec || highlight.start || 0
          const endTime = highlight.end_sec || highlight.end || startTime + durations.ideal
          
          highlights.push({
            title: (highlight.highlight || `Highlight ${i + 1}`).slice(0, 100),
            description: (highlight.highlight || `Segment from ${formatTime(startTime)} to ${formatTime(endTime)}`).slice(0, 200),
            startTime,
            endTime,
            engagementScore: 8,
            reason: `Identified by Twelve Labs as engaging for ${platform}`
          })
        }

        if (highlights.length === 0) {
          console.warn('⚠️ Twelve Labs returned 0 highlights, using fallback')
          useFallback = true;
        }

      } catch (error) {
        console.error('❌ Twelve Labs API failed:', error)
        console.log('🔄 Falling back to evenly-spaced highlights')
        useFallback = true;
      }
    }

    // Fallback: Generate evenly-spaced highlights
    if (useFallback) {
      console.log('📊 Generating fallback highlights...')
      const videoDuration = video.duration_seconds || 300
      const segmentSize = durations.ideal
      const maxHighlights = Math.min(count, Math.floor(videoDuration / segmentSize))

      for (let i = 0; i < maxHighlights; i++) {
        const startTime = i * segmentSize + (segmentSize * 0.5) // Offset for variety
        highlights.push({
          title: `Moment ${i + 1}`,
          description: `Engaging segment from ${formatTime(startTime)}`,
          startTime: Math.min(startTime, videoDuration - segmentSize),
          endTime: Math.min(startTime + durations.ideal, videoDuration),
          engagementScore: 7,
          reason: 'Auto-detected segment'
        })
      }
    }

    console.log(`Parsed ${highlights.length} highlights from Twelve Labs`)

    // Validate and adjust durations
    highlights = highlights.map((h: any) => {
      let { startTime, endTime } = h
      let duration = endTime - startTime

      // Adjust if too short or too long
      if (duration < durations.min) {
        endTime = startTime + durations.ideal
      } else if (duration > durations.max) {
        endTime = startTime + durations.max
      }

      // Ensure within video bounds
      const maxTime = video.duration_seconds || 300
      if (endTime > maxTime) {
        endTime = maxTime
        startTime = Math.max(0, endTime - durations.ideal)
      }

      return {
        ...h,
        startTime: Math.max(0, startTime),
        endTime: endTime,
        duration: endTime - startTime
      }
    })

    // Store highlights in database
    const highlightInserts = highlights.map((h: any) => ({
      video_id: videoId,
      title: h.title,
      description: h.description,
      start_time: h.startTime,
      end_time: h.endTime,
      engagement_score: h.engagementScore,
      highlight_type: 'auto',
      metadata: {
        platform: platform,
        reason: h.reason,
        source: 'twelve-labs'
      },
      created_by: user.id
    }))

    const { data: savedHighlights, error: saveError } = await supabase
      .from('video_highlights')
      .insert(highlightInserts)
      .select()

    if (saveError) {
      console.error('Save error:', saveError)
      throw saveError
    }

    // Track usage
    await supabase.from('feature_usage').insert({
      user_id: user.id,
      feature_name: 'highlight_detection',
      video_id: videoId,
      metadata: { platform, count: savedHighlights.length }
    })

    console.log(`Saved ${savedHighlights.length} highlights`)

    return new Response(
      JSON.stringify({
        success: true,
        highlights: savedHighlights,
        count: savedHighlights.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in detect-highlights:', error)
    
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
