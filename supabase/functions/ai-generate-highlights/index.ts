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
    const { videoId, projectId, criteria = 'key-points' } = await req.json();
    if (!videoId) throw new Error('videoId is required');
    if (!projectId) throw new Error('projectId is required');

    const validCriteria = ['humor', 'insights', 'action', 'key-points'];
    if (!validCriteria.includes(criteria)) {
      throw new Error(`Invalid criteria. Must be one of: ${validCriteria.join(', ')}`);
    }

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
      `[${s.start_time.toFixed(2)}s-${s.end_time.toFixed(2)}s] ${s.text}`
    ).join('\n');

    // Call Google Gemini API
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error('GOOGLE_GEMINI_API_KEY not configured');

    const criteriaDescriptions = {
      'humor': 'funny, entertaining, or comedic moments',
      'insights': 'valuable insights, key learnings, or important information',
      'action': 'exciting, dynamic, or action-packed moments',
      'key-points': 'most important points and key takeaways'
    };

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a video editing assistant specializing in creating highlight reels. Identify the best moments for clips. Return valid JSON only.

Analyze this video transcript and identify the 3-5 best moments for ${criteriaDescriptions[criteria]}. Each clip should be 10-30 seconds long.

Transcript:
${transcript}

Return JSON array: [{"startTime": number, "endTime": number, "score": 0-100, "reason": "why this is great", "title": "clip title (4-6 words)"}]`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          topK: 10,
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`AI request failed: ${aiResponse.status} ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No content in AI response');

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No valid JSON array found');

    const highlights = JSON.parse(jsonMatch[0]);

    // Get next scene order
    const { data: existingScenes } = await supabaseClient
      .from('project_scenes')
      .select('scene_order')
      .eq('project_id', projectId)
      .order('scene_order', { ascending: false })
      .limit(1);

    let nextOrder = (existingScenes?.[0]?.scene_order ?? -1) + 1;

    // Create scenes for each highlight
    const scenesToCreate = highlights.map((highlight: any, index: number) => {
      const duration = highlight.endTime - highlight.startTime;
      return {
        project_id: projectId,
        video_id: videoId,
        scene_order: nextOrder + index,
        name: highlight.title,
        duration_seconds: duration,
        timeline_start: highlight.startTime,
        timeline_end: highlight.endTime,
        layout_type: 'fullscreen',
        background_type: 'solid',
        background_config: { color: '#000000' },
        transition_type: 'fade',
        transition_duration_ms: 500,
        media_type: 'video',
        media_start_time: highlight.startTime,
        media_end_time: highlight.endTime,
        scene_config: { 
          isHighlight: true,
          criteria: criteria,
          score: highlight.score,
          aiReason: highlight.reason 
        },
      };
    });

    const { data: createdScenes, error: createError } = await supabaseClient
      .from('project_scenes')
      .insert(scenesToCreate)
      .select();

    if (createError) throw createError;

    // Create AI suggestions
    const suggestions = highlights.map((highlight: any) => ({
      video_id: videoId,
      project_id: projectId,
      suggestion_type: 'highlight',
      start_time: highlight.startTime,
      end_time: highlight.endTime,
      suggested_action: 'create-scene',
      confidence: highlight.score / 100,
      reason: highlight.reason,
      action_parameters: {
        title: highlight.title,
        criteria: criteria,
      },
      status: 'applied',
    }));

    if (suggestions.length > 0) {
      await supabaseClient.from('ai_suggestions').insert(suggestions);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          scenes: createdScenes,
          highlights: highlights,
        },
        message: `Created ${highlights.length} highlight scenes`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-generate-highlights:', error);
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
