import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId, metadataTypes } = await req.json();
    
    if (!videoId || !Array.isArray(metadataTypes) || metadataTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'videoId and metadataTypes array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify video ownership
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title, description, duration_seconds, user_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video || video.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Video not found or unauthorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get transcript data
    const { data: segments, error: segmentsError } = await supabase
      .from('transcript_segments_clean')
      .select('text, start_time, end_time, speaker')
      .eq('video_id', videoId)
      .eq('language', 'en')
      .order('start_time', { ascending: true });

    if (segmentsError) {
      console.error('Failed to fetch transcript:', segmentsError);
    }

    const transcript = segments?.map(s => `${s.speaker}: ${s.text}`).join('\n') || '';

    // Get Twelve Labs video analysis for visual context
    const { data: tlMapping } = await supabase
      .from('twelve_labs_mappings')
      .select('tl_video_id')
      .eq('asset_id', videoId)
      .eq('status', 'ready')
      .maybeSingle();

    let videoContext = '';
    if (tlMapping?.tl_video_id) {
      const tlApiKey = Deno.env.get('TWELVELABS_API_KEY');
      if (tlApiKey) {
        try {
          const tlResponse = await fetch('https://api.twelvelabs.io/v1.3/analyze', {
            method: 'POST',
            headers: {
              'x-api-key': tlApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              video_id: tlMapping.tl_video_id,
              prompt: 'Describe the key visual elements, scenes, and overall theme of this video in 2-3 sentences.',
              temperature: 0.3,
            })
          });

          if (tlResponse.ok) {
            const tlData = await tlResponse.json();
            videoContext = tlData.data || '';
          }
        } catch (e) {
          console.log('Twelve Labs analysis unavailable:', e);
        }
      }
    }

    // Generate content using Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const type of metadataTypes) {
      const systemPrompt = getSystemPrompt(type);
      const userPrompt = buildUserPrompt(type, video, transcript, videoContext);

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
        })
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error(`AI generation failed for ${type}:`, errorText);
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || '';

      // Store in database
      const { data: metadata, error: insertError } = await supabase
        .from('generated_metadata')
        .insert({
          video_id: videoId,
          type,
          content,
          created_by: user.id,
          metadata: {
            model: 'google/gemini-2.5-flash',
            has_twelve_labs_context: !!videoContext,
            transcript_length: transcript.length,
          }
        })
        .select()
        .single();

      if (insertError) {
        console.error(`Failed to save ${type}:`, insertError);
        continue;
      }

      results.push(metadata);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        generated: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    console.error('Error:', e);
    return new Response(
      JSON.stringify({ error: e.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
