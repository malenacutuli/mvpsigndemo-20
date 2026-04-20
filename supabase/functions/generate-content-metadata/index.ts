import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContentRequest {
  videoId: string;
  type: 'youtube' | 'tiktok' | 'instagram' | 'linkedin' | 'shownotes' | 'hashtags' | 'quotes' | 'custom';
  customPrompt?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get request data
    const { videoId, type, customPrompt }: ContentRequest = await req.json()

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    console.log(`Generating ${type} content for video ${videoId}`)

    // Fetch video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, description, duration_seconds, language')
      .eq('id', videoId)
      .single()

    if (videoError) throw videoError

    // Fetch transcript
    const { data: segments, error: transcriptError } = await supabase
      .from('transcript_segments_clean')
      .select('text, start_time, end_time')
      .eq('video_id', videoId)
      .eq('language', video.language || 'en')
      .order('start_time')
      .limit(100) // Get first 100 segments for context

    if (transcriptError) {
      console.error('Transcript error:', transcriptError)
    }

    // Combine transcript (limit to 3000 chars for API efficiency)
    const fullTranscript = segments
      ? segments.map(s => s.text).join(' ').slice(0, 3000)
      : 'No transcript available'

    // Check if we have Twelve Labs analysis
    let videoAnalysis = ''
    const { data: tlMapping } = await supabase
      .from('twelve_labs_mappings')
      .select('tl_video_id, status')
      .eq('asset_id', videoId)
      .single()

    if (tlMapping?.status === 'ready' && tlMapping.tl_video_id) {
      // We have Twelve Labs analysis available
      const { data: cachedAnalysis } = await supabase
        .from('content_generation_cache')
        .select('result_data')
        .eq('video_id', videoId)
        .eq('content_type', 'twelve_labs_summary')
        .single()

      if (cachedAnalysis?.result_data) {
        videoAnalysis = JSON.stringify(cachedAnalysis.result_data).slice(0, 1000)
      }
    }

    // Define prompts for each content type
    const prompts = {
      youtube: `Create a YouTube description for this video:

Title: ${video.title}
Duration: ${Math.floor((video.duration_seconds || 0) / 60)} minutes
Transcript excerpt: ${fullTranscript}
${videoAnalysis ? `Video analysis: ${videoAnalysis}` : ''}

Include:
- Engaging hook (2-3 sentences that make people want to watch)
- Key topics covered (5-7 bullet points with emojis)
- Timestamps for major sections (format: 00:00 Introduction)
- 10-15 relevant hashtags
- Clear call to action

Keep under 5000 characters. Make it engaging and SEO-optimized.`,

      tiktok: `Generate a viral TikTok caption for this video:

Title: ${video.title}
Content: ${fullTranscript.slice(0, 500)}

Create a caption that:
- Opens with a HOOK in the first 5 words
- Includes the main value proposition
- Has 3-5 trending hashtags
- Ends with a question or CTA
- Uses strategic emojis
- Maximum 150 characters

Make it punchy, engaging, and scroll-stopping!`,

      instagram: `Create an Instagram post caption:

Title: ${video.title}
Content: ${fullTranscript.slice(0, 800)}

Format:
- Attention-grabbing first line (use emoji)
- Story or context (3-4 sentences, use line breaks)
- Key value or takeaway
- 10-15 relevant hashtags (mix of popular and niche)
- Engaging question to encourage comments

Maximum 2200 characters. Use emojis strategically. Be authentic and relatable.`,

      linkedin: `Create a professional LinkedIn post:

Title: ${video.title}
Content: ${fullTranscript.slice(0, 1000)}

Professional format:
- Strong professional hook
- Key insights (3-4 paragraphs with value)
- Business lesson or takeaway
- 2-3 professional hashtags
- Professional call to action

Maximum 1300 characters. Professional tone but personable. Focus on value and insights.`,

      shownotes: `Create detailed show notes:

Title: ${video.title}
Duration: ${Math.floor((video.duration_seconds || 0) / 60)} minutes
Transcript: ${fullTranscript}

Include:
- Episode summary (3-4 sentences)
- Key takeaways (5-7 numbered items)
- Timestamp-linked topics (format: [MM:SS] Topic name)
- Resources or links mentioned (if any)
- Notable quotes (2-3)

Format in Markdown. Be comprehensive and useful for viewers.`,

      hashtags: `Analyze this video and generate hashtags:

Title: ${video.title}
Content: ${fullTranscript.slice(0, 1000)}

Generate three lists:
1. 10 SPECIFIC hashtags about the actual content
2. 5 TRENDING hashtags in this niche
3. 5 LONG-TAIL hashtags for discoverability

Return as plain text list, one hashtag per line with #`,

      quotes: `Extract the 5 most impactful quotes from this video:

Title: ${video.title}
Transcript: ${fullTranscript}

For each quote provide:
- The exact quote
- Approximate timestamp (based on position in transcript)
- Speaker name (if identifiable)
- Why it's significant (1 sentence)

Format as numbered list. Choose quotes that are:
- Self-contained and understandable
- Impactful or insightful
- Shareable on social media`,

      custom: customPrompt || 'Analyze this video content and provide insights.'
    }

    const prompt = prompts[type] || prompts.custom

    // Call Google Gemini API directly
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured')
    }

    console.log('Calling Google Gemini API...')

    const systemInstruction = 'You are an expert content marketing specialist. Create engaging, platform-optimized content that drives engagement and views.'

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    )

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('Gemini API error:', errorText)

      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.')
      }

      throw new Error(`AI generation failed: ${aiResponse.status}`)
    }

    const aiResult = await aiResponse.json()
    const generatedContent = aiResult?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!generatedContent) {
      throw new Error('Gemini returned empty response')
    }

    console.log('Content generated successfully')

    // Store in database
    const { data: savedMetadata, error: saveError } = await supabase
      .from('generated_metadata')
      .insert({
        video_id: videoId,
        type: type,
        content: generatedContent,
        created_by: user.id,
        metadata: {
          model: 'google/gemini-2.5-flash',
          prompt_length: prompt.length,
          response_length: generatedContent.length,
          has_transcript: !!segments?.length,
          has_twelve_labs: !!videoAnalysis
        }
      })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      throw saveError
    }

    // Track usage
    await supabase.from('feature_usage').insert({
      user_id: user.id,
      feature_name: 'content_generator',
      video_id: videoId,
      metadata: { type }
    })

    console.log('Metadata saved, returning result')

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        metadata: savedMetadata,
        characterCount: generatedContent.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in generate-content-metadata:', error)
    
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

function getSystemPrompt(type: string): string {
  const prompts: Record<string, string> = {
    'youtube_description': 'You are an expert YouTube content strategist. Create engaging, SEO-optimized video descriptions that drive clicks and watch time.',
    'youtube_title': 'You are an expert at crafting viral YouTube titles that are compelling, accurate, and click-worthy while avoiding clickbait.',
    'tiktok_caption': 'You are a TikTok content expert. Write short, punchy captions with trending hashtags that maximize engagement.',
    'instagram_caption': 'You are an Instagram content creator. Write engaging captions with relevant hashtags and emoji that drive likes and comments.',
    'twitter_thread': 'You are a Twitter/X content strategist. Create compelling tweet threads that are informative and shareable.',
    'linkedin_post': 'You are a LinkedIn content expert. Write professional, value-driven posts that engage your network.',
    'show_notes': 'You are a podcast producer. Create comprehensive show notes with timestamps, key topics, and resources mentioned.',
    'blog_post': 'You are a content writer. Transform video content into engaging blog posts that are SEO-friendly and reader-friendly.',
  };
  return prompts[type] || 'You are a content creation expert.';
}

function buildUserPrompt(type: string, video: any, transcript: string, videoContext: string): string {
  const base = `
Video Title: ${video.title}
${video.description ? `Current Description: ${video.description}` : ''}
Duration: ${Math.floor((video.duration_seconds || 0) / 60)} minutes

${videoContext ? `Visual Context: ${videoContext}\n` : ''}

Transcript:
${transcript.slice(0, 3000)}${transcript.length > 3000 ? '\n...(truncated)' : ''}
`;

  const instructions: Record<string, string> = {
    'youtube_description': 'Write a compelling 2-3 paragraph YouTube description. Include timestamps for key moments. Add relevant hashtags and links placeholders.',
    'youtube_title': 'Write 3 alternative YouTube titles (max 60 chars each). Make them engaging but accurate.',
    'tiktok_caption': 'Write a punchy TikTok caption (max 150 chars) with 5-8 trending hashtags.',
    'instagram_caption': 'Write an Instagram caption with storytelling, line breaks, and 10-15 relevant hashtags.',
    'twitter_thread': 'Create a 5-7 tweet thread summarizing the key points. Each tweet max 280 chars.',
    'linkedin_post': 'Write a professional LinkedIn post (1200-1500 chars) with business insights and a clear CTA.',
    'show_notes': 'Create detailed show notes with: Summary, Key Topics (with timestamps), Quotes, Resources/Links mentioned.',
    'blog_post': 'Write a 500-800 word blog post with: catchy headline, introduction, 3-4 main sections, conclusion with CTA.',
  };

  return base + '\n\n' + (instructions[type] || 'Generate appropriate content for this video.');
}
