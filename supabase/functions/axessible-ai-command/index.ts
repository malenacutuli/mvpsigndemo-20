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
  model?: 'openai' | 'gemini-lovable' | 'gemini-direct'; // AI provider selection
}

// Rate limiting: 10 commands per minute per user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (userLimit.count >= 10) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId, message, projectId, videoId, currentContext, model = 'gemini-direct' }: CommandRequest = await req.json();

    // Sanitize user input
    const sanitizedMessage = message.trim().slice(0, 1000);
    if (!sanitizedMessage) {
      return new Response(
        JSON.stringify({ 
          error: 'Empty message',
          response: 'Please provide a message.',
          action: null
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          response: 'Too many requests. Please wait a moment and try again.',
          action: null
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to project or video
    if (projectId && projectId.trim()) {
      // Project-based video: verify project access
      const { data: projectAccess } = await supabase
        .from('video_projects')
        .select('id')
        .eq('id', projectId)
        .eq('created_by', user.id)
        .single();

      if (!projectAccess) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to project' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Standalone video: verify video access
      const { data: videoAccess } = await supabase
        .from('videos')
        .select('id')
        .eq('id', videoId)
        .eq('user_id', user.id)
        .single();

      if (!videoAccess) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized access to video' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get project state for context (if project exists)
    let project = null;
    let scenes = null;
    
    if (projectId && projectId.trim()) {
      const { data: projectData } = await supabase
        .from('video_projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      project = projectData;

      const { data: scenesData } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('project_id', projectId);
      
      scenes = scenesData;
    }

    const { data: templates } = await supabase
      .from('caption_templates')
      .select('id, name')
      .eq('template_type', 'preset');

    // Optimized system prompt for Gemini 3
    const systemPrompt = `You are Axessible AI for the Axessible Premium Video Editor. Be concise and direct.

PROJECT: "${project?.name || 'Untitled'}" | ${scenes?.length || 0} scenes | ${project?.duration_seconds || 0}s | Tab: ${currentContext}

TEMPLATES:
${templates?.map(t => `- ${t.name} (id: ${t.id})`).join('\n') || 'None'}

COMMANDS:
1. apply_template - Apply caption template
2. delete_segments - Remove transcript segments  
3. create_scene - Add new scene
4. change_layout - Change scene layout
5. modify_timing - Adjust scene timing
6. generate_clip - Create social media clip

Based on the information above, help with the following request.

IMPORTANT: Always respond with a single JSON object, never plain text. The JSON must match this shape:

{
  "response": "Natural-language answer to the user",
  "action": {
    "action": "apply_template | delete_segments | create_scene | modify_timing | change_layout | update_scene | generate_clip",
    "confidence": 0.0-1.0,
    "parameters": { /* action-specific parameters */ }
  }
}

If no action is needed, set "action" to null. Do NOT include any fields outside this JSON object.`;

    let aiMessage: string;
    let aiData: any;

    // Route to AI providers - both Gemini variants use stable Lovable AI Gateway
    if (model === 'gemini-direct' || model === 'gemini-lovable') {
      // Use Lovable AI with Gemini 2.5 for all Gemini requests
      const lovableResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: sanitizedMessage }
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!lovableResponse.ok) {
        const errorText = await lovableResponse.text();
        console.error('Lovable AI error:', lovableResponse.status, errorText);
        
        if (lovableResponse.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'Rate limit exceeded',
              response: 'AI service is experiencing high demand. Please try again in a moment.',
              action: null
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (lovableResponse.status === 402) {
          return new Response(
            JSON.stringify({ 
              error: 'Payment required',
              response: 'AI credits depleted. Please add credits to continue using the AI assistant.',
              action: null
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // All other errors: return safe 200 with friendly message
        return new Response(
          JSON.stringify({
            error: `Lovable AI error ${lovableResponse.status}`,
            response: 'The AI service had trouble answering your request. Please try again or rephrase.',
            action: null
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      aiData = await lovableResponse.json();
      aiMessage = aiData.choices[0].message.content;

    } else {
      // Use OpenAI GPT-4o-mini
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
            { role: 'user', content: sanitizedMessage }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error('OpenAI API error:', openaiResponse.status, errorData);
        
        if (openaiResponse.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'OpenAI rate limit exceeded',
              response: 'AI service is experiencing high demand. Please try again in a moment.',
              action: null
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // All other errors: return safe 200 with friendly message
        return new Response(
          JSON.stringify({
            error: `OpenAI error ${openaiResponse.status}`,
            response: 'The AI service had trouble answering your request. Please try again or rephrase.',
            action: null
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      aiData = await openaiResponse.json();
      aiMessage = aiData.choices[0].message.content;
    }

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

      // Update session and increment AI credits
      await supabase
        .from('ai_chat_sessions')
        .update({
          messages: newMessages,
          message_count: newMessages.length,
          last_message_at: new Date().toISOString(),
          last_action: parsedResponse.action ? parsedResponse.action.action : null,
          current_context: currentContext,
          ai_credits_used: (session.ai_credits_used || 0) + 1
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
