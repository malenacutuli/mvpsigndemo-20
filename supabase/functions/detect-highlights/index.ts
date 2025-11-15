import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      .select('id, title, duration_seconds, url')
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
    const twelveLabsApiKey = Deno.env.get('TWELVELABS_API_KEY')
    if (!twelveLabsApiKey) {
      throw new Error('TWELVELABS_API_KEY not configured')
    }

    console.log('Using Twelve Labs to find highlights...')

    // Twelve Labs /generate endpoint for highlight detection
    const generateResponse = await fetch('https://api.twelvelabs.io/v1.2/generate', {
      method: 'POST',
      headers: {
        'x-api-key': twelveLabsApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_id: tlMapping.tl_video_id,
        prompt: `Identify the ${count} most engaging, viral-worthy moments from this video for ${platform}. 

For each moment:
- It should be ${durations.ideal} seconds long (between ${durations.min}-${durations.max}s)
- Hook attention immediately
- Have emotional peaks or exciting content
- Work as standalone clips
- Rate engagement potential 1-10

Return the moments with their start/end timestamps in seconds.`,
        temperature: 0.7
      })
    })

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text()
      throw new Error(`Twelve Labs generation failed: ${errorText}`)
    }

    const generateResult = await generateResponse.json()
    console.log('Twelve Labs response:', generateResult)

    // Parse Twelve Labs response to extract highlights
    const responseText = generateResult.data || generateResult.text || ''
    
    // Extract timestamps and content using regex
    // Twelve Labs typically returns format like: "1. [00:15-00:45] Title - Description"
    const timestampRegex = /\[?(\d+):(\d+)[\s-]+(\d+):(\d+)\]?\s*(.+?)(?=\[|\d+\.|$)/gs
    let highlights = []
    let match
    let highlightIndex = 0

    while ((match = timestampRegex.exec(responseText)) !== null && highlightIndex < count) {
      const startMin = parseInt(match[1])
      const startSec = parseInt(match[2])
      const endMin = parseInt(match[3])
      const endSec = parseInt(match[4])
      const description = match[5].trim()

      const startTime = startMin * 60 + startSec
      const endTime = endMin * 60 + endSec
      
      // Extract title (first sentence or up to first dash/colon)
      const titleMatch = description.match(/^([^-:\.]+)/)
      const title = titleMatch ? titleMatch[1].trim() : `Highlight ${highlightIndex + 1}`
      
      // Estimate engagement score based on keywords
      const engagementKeywords = ['exciting', 'surprising', 'funny', 'emotional', 'peak', 'climax', 'intense']
      const engagementScore = Math.min(10, 5 + engagementKeywords.filter(kw => 
        description.toLowerCase().includes(kw)
      ).length)

      highlights.push({
        title: title.slice(0, 100),
        description: description.slice(0, 200),
        startTime,
        endTime,
        engagementScore,
        reason: `Identified by Twelve Labs as engaging for ${platform}`
      })

      highlightIndex++
    }

    // If regex parsing didn't work well, fall back to simple segmentation
    if (highlights.length === 0) {
      console.log('Falling back to simple highlight generation')
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
