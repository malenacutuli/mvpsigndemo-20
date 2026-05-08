import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    if (!videoId) {
      throw new Error('videoId is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch transcript segments
    const { data: segments, error: segmentsError } = await supabaseClient
      .from('transcript_segments_clean')
      .select('id, start_time, end_time, text')
      .eq('video_id', videoId)
      .order('start_time');

    if (segmentsError) throw segmentsError;
    if (!segments || segments.length === 0) {
      throw new Error('No transcript segments found');
    }

    // Prepare transcript for analysis
    const transcript = segments.map(s => 
      `[${s.start_time.toFixed(2)}s] ${s.text}`
    ).join('\n');

    // Call Google Gemini API
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured');
    }

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a video editing assistant. Identify filler words and phrases (um, uh, like, you know, so, actually, basically, sort of, kind of, I mean, right, okay, well) in transcripts. Return valid JSON only.

Analyze this transcript and identify all filler words. For each filler word, return its timing and context.

Transcript:
${transcript}

Return JSON array: [{"startTime": number, "endTime": number, "text": "filler word", "reason": "explanation", "confidence": 0-1}]`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
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
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse AI response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in AI response');
    }

    const fillers = JSON.parse(jsonMatch[0]);

    // Insert suggestions into database
    const suggestions = fillers.map((filler: any) => ({
      video_id: videoId,
      suggestion_type: 'filler-word',
      start_time: filler.startTime,
      end_time: filler.endTime,
      suggested_action: 'remove',
      confidence: filler.confidence || 0.8,
      reason: filler.reason,
      action_parameters: { text: filler.text },
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
          fillerCount: fillers.length,
          fillers: fillers,
        },
        message: `Detected ${fillers.length} filler words`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-remove-filler-words:', error);
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
