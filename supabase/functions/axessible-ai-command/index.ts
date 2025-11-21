import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommandRequest {
  sessionId: string;
  message: string;
  projectId: string;
  videoId: string;
  currentContext: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId, message, projectId, videoId, currentContext }: CommandRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get project state for context
    const { data: project } = await supabase
      .from('video_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    const { data: scenes } = await supabase
      .from('project_scenes')
      .select('*')
      .eq('project_id', projectId);

    const { data: templates } = await supabase
      .from('caption_templates')
      .select('id, name')
      .eq('template_type', 'preset');

    // Build AI system prompt with available commands
    const systemPrompt = `You are Axessible AI, a specialized video editing assistant for the Axessible Premium Video Editor.

CURRENT PROJECT STATE:
- Project: "${project?.name || 'Untitled'}"
- Scenes: ${scenes?.length || 0}
- Duration: ${project?.duration_seconds || 0}s
- Current tab: ${currentContext}

AVAILABLE COMMANDS:
You can execute these commands by responding with a JSON action object:

1. apply_template: Apply a caption template
   {"action": "apply_template", "template_name": "Viral TikTok", "scene_id": "optional"}

2. delete_segments: Delete transcript segments
   {"action": "delete_segments", "segment_indices": [2, 5, 7]}

3. create_scene: Add a new scene
   {"action": "create_scene", "layout": "fullscreen|split|pip", "duration": 10}

4. update_scene: Modify a scene
   {"action": "update_scene", "scene_index": 0, "layout": "split"}

5. generate_clip: Create social media clip
   {"action": "generate_clip", "platform": "tiktok|instagram_reel|youtube_short|linkedin", "segments": [0, 1, 2]}

AVAILABLE TEMPLATES:
${templates?.map(t => `- ${t.name} (id: ${t.id})`).join('\n') || 'No templates available'}

RESPONSE FORMAT:
If you understand a command, respond with:
{
  "response": "Human-readable confirmation",
  "action": {...command object...}
}

If you need clarification or just answering a question:
{
  "response": "Your answer here",
  "action": null
}

Be helpful, concise, and proactive in suggesting improvements.`;

    // Call OpenAI GPT-4
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const aiData = await openaiResponse.json();
    const aiMessage = aiData.choices[0].message.content;

    // Try to parse as JSON (for commands)
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiMessage);
    } catch {
      // Not JSON, treat as plain text response
      parsedResponse = {
        response: aiMessage,
        action: null
      };
    }

    // Get current session
    const { data: session } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (session) {
      const newMessages = [
        ...(session.messages || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { 
          role: 'assistant', 
          content: parsedResponse.response, 
          timestamp: new Date().toISOString(), 
          action: parsedResponse.action 
        }
      ];

      // Update session
      await supabase
        .from('ai_chat_sessions')
        .update({
          messages: newMessages,
          message_count: newMessages.length,
          last_message_at: new Date().toISOString(),
          last_action: parsedResponse.action ? parsedResponse.action.action : null,
          current_context: currentContext
        })
        .eq('id', sessionId);
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in axessible-ai-command:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: 'Sorry, I encountered an error processing your request. Please try again.',
        action: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
