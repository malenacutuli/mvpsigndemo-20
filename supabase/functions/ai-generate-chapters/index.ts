import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const { videoId } = await req.json();
    if (!videoId) throw new Error('videoId is required');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch transcript
    const { data: segments, error: segmentsError } = await supabaseClient
      .from('transcript_segments_clean')
      .select('start_time, end_time, text')
      .eq('video_id', videoId)
      .order('start_time');

    if (segmentsError) throw segmentsError;
    if (!segments || segments.length === 0) {
      throw new Error('No transcript found');
    }

    const transcript = segments.map(s => 
      `[${s.start_time.toFixed(2)}s] ${s.text}`
    ).join('\n');

    // Call Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a video editing assistant. Analyze transcripts and identify natural chapter breaks based on topic changes. Return valid JSON only.'
          },
          {
            role: 'user',
            content: `Analyze this video transcript and identify 5-10 natural chapter breaks where the topic or focus changes.\n\nTranscript:\n${transcript}\n\nReturn JSON array: [{"startTime": number, "title": "Chapter title (3-5 words)", "description": "Brief summary (1 sentence)"}]`
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI request failed: ${aiResponse.status} ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in AI response');

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No valid JSON array found');

    const chapters = JSON.parse(jsonMatch[0]);

    // Create AI suggestions for chapters
    const suggestions = chapters.map((chapter: any) => ({
      video_id: videoId,
      suggestion_type: 'chapter',
      start_time: chapter.startTime,
      end_time: chapter.startTime + 0.1, // Marker point
      suggested_action: 'add-chapter-marker',
      confidence: 0.85,
      reason: chapter.description,
      action_parameters: {
        title: chapter.title,
        description: chapter.description,
      },
      status: 'pending',
    }));

    if (suggestions.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('ai_suggestions')
        .insert(suggestions);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          chapters: chapters,
          count: chapters.length,
        },
        message: `Generated ${chapters.length} chapter suggestions`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-generate-chapters:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'AI_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
