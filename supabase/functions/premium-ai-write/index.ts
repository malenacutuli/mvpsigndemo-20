import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, context, options } = await req.json();

    console.log('[premium-ai-write] Request received:', { projectId, options });

    if (!projectId || !context || !options) {
      throw new Error('Missing required parameters: projectId, context, and options are required');
    }

    // TODO: Call OpenAI/Claude API to generate text
    // For now, return mock response with structured content
    const contentMap: Record<string, string> = {
      description: `A compelling video description based on the content:\n\n${context.slice(0, 200)}...\n\nThis video showcases exceptional ${options.tone || 'professional'} content that will engage your audience.`,
      title: `${options.tone === 'formal' ? 'Professional' : 'Engaging'} Video Title - [Generated]`,
      script: `Scene 1:\n${context.slice(0, 100)}...\n\nScene 2:\n[Continue the narrative]\n\nConclusion:\n[Wrap up the story]`,
      caption: `🎬 Check out this ${options.tone || 'amazing'} content! #video #content #${options.tone || 'professional'}`,
      hashtags: '#video #content #ai #generated #professional #creative'
    };

    const text = contentMap[options.type] || contentMap.description;
    
    console.log('[premium-ai-write] Generated text:', text.slice(0, 100));
    
    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[premium-ai-write] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
