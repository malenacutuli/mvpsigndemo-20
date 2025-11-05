import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const AnalysisRequestSchema = z.object({
  videoId: z.string().uuid(),
  frames: z.array(z.object({
    timestamp: z.number().min(0),
    frameDataUrl: z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/),
    gapStart: z.number().min(0),
    gapEnd: z.number().min(0),
  })).max(10), // Limit to 10 frames max
  transcript: z.array(z.object({
    startTime: z.number(),
    endTime: z.number(),
    text: z.string().max(1000),
    speaker: z.string().max(100),
  })),
  detectedLanguage: z.string().length(2),
});

interface Gap {
  start: number;
  end: number;
  duration: number;
}

interface FrameData {
  timestamp: number;
  frameDataUrl: string;
  gapStart: number;
  gapEnd: number;
}

interface AnalysisRequest {
  videoId: string;
  frames: FrameData[];
  transcript: Array<{
    startTime: number;
    endTime: number;
    text: string;
    speaker: string;
  }>;
  detectedLanguage: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse and validate input
    const rawData = await req.json();
    const validatedData = AnalysisRequestSchema.parse(rawData);
    const { videoId, frames, transcript, detectedLanguage } = validatedData;

    // Verify video ownership
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("user_id")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      throw new Error("Video not found");
    }

    if (video.user_id !== user.id) {
      throw new Error("Unauthorized: You do not own this video");
    }

    console.log(`🎬 Enhanced Analysis: Processing ${frames.length} frames for video ${videoId}`);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const descriptions = [];

    // Process each frame with enhanced contextual analysis
    for (const frame of frames.slice(0, 6)) { // Limit for performance
      try {
        console.log(`📊 Analyzing frame at ${frame.timestamp}s (gap: ${frame.gapStart}s-${frame.gapEnd}s)`);

        // Get context from surrounding dialogue
        const previousDialogue = getPreviousDialogue(frame.gapStart, transcript);
        const sceneContext = getSceneContext(frame.gapStart, transcript);
        const contentType = determineContentType(transcript);
        const gapDuration = frame.gapEnd - frame.gapStart;

        console.log(`🔍 Context - Previous: "${previousDialogue}", Scene: "${sceneContext}", Type: ${contentType}`);

        // Use GPT-5 vision for contextual understanding
        const visualAnalysis = await analyzeFrameWithContext(frame.frameDataUrl, {
          previousDialogue,
          sceneContext,
          contentType,
          detectedLanguage,
          gapDuration
        }, openaiApiKey);

        descriptions.push({
          text: visualAnalysis.text,
          startTime: frame.gapStart,
          endTime: frame.gapEnd,
          voiceStyle: getLanguageNativeVoice(detectedLanguage),
          confidence: visualAnalysis.confidence,
          timestamp: frame.timestamp
        });

        console.log(`✅ Generated: "${visualAnalysis.text}" (confidence: ${visualAnalysis.confidence})`);

      } catch (error) {
        console.error(`❌ Error processing frame at ${frame.timestamp}s:`, error);
        
        // Fallback description
        descriptions.push({
          text: getFallbackDescription(detectedLanguage),
          startTime: frame.gapStart,
          endTime: frame.gapEnd,
          voiceStyle: getLanguageNativeVoice(detectedLanguage),
          confidence: 0.3,
          timestamp: frame.timestamp
        });
      }
    }

    console.log(`🎯 Enhanced Analysis Complete: ${descriptions.length} descriptions generated`);

    return new Response(
      JSON.stringify({
        success: true,
        descriptions,
        model: 'gpt-5-2025-08-07',
        analysisType: 'enhanced-contextual',
        detectedLanguage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Enhanced video analysis failed:', error);
    
    // Return validation errors with 400 status for Zod errors
    const statusCode = error.name === 'ZodError' ? 400 : 
                       error.message.includes('Unauthorized') ? 401 : 500;
    const errorMessage = error.name === 'ZodError' ? 'Invalid input data' :
                        error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        descriptions: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: statusCode
      }
    );
  }
});

function getPreviousDialogue(gapStart: number, transcript: any[]): string {
  const beforeGap = transcript
    .filter(seg => seg.endTime <= gapStart)
    .slice(-2) // Last 2 segments before gap
    .map(seg => seg.text)
    .join(' ');
  
  return beforeGap || 'Beginning of video';
}

function getSceneContext(gapStart: number, transcript: any[]): string {
  // Analyze transcript around the gap for scene understanding
  const contextWindow = transcript.filter(seg => 
    Math.abs(seg.startTime - gapStart) < 20 // Within 20 seconds
  );
  
  const contextText = contextWindow.map(seg => seg.text).join(' ').toLowerCase();
  
  // Identify scene markers
  if (contextText.includes('verano') || contextText.includes('summer')) {
    return 'summer/vacation theme';
  }
  if (contextText.includes('realidad') || contextText.includes('reality')) {
    return 'aspirational/reality theme';
  }
  if (contextText.includes('imagina') || contextText.includes('imagine')) {
    return 'imaginative/dreamy sequence';
  }
  
  return 'general narrative';
}

function determineContentType(transcript: any[]): string {
  const fullText = transcript.map(seg => seg.text).join(' ').toLowerCase();
  
  if (fullText.includes('cocina') || fullText.includes('cook')) return 'cooking';
  if (fullText.includes('aprend') || fullText.includes('learn')) return 'education';
  if (fullText.includes('verano') || fullText.includes('realidad')) return 'advertising';
  
  return 'general';
}

async function analyzeFrameWithContext(
  frameDataUrl: string,
  context: {
    previousDialogue: string;
    sceneContext: string;
    contentType: string;
    detectedLanguage: string;
    gapDuration: number;
  },
  apiKey: string
): Promise<{ text: string; confidence: number }> {

  const { previousDialogue, sceneContext, contentType, detectedLanguage, gapDuration } = context;

  const systemPrompt = `You are an expert at creating concise, contextually appropriate audio descriptions for ${detectedLanguage === 'es' ? 'Spanish' : 'English'} videos. 

CONTEXT:
- Previous dialogue: "${previousDialogue}"
- Scene context: ${sceneContext}
- Content type: ${contentType}
- Gap duration: ${gapDuration} seconds
- Language: ${detectedLanguage}

REQUIREMENTS:
1. Create ONE brief audio description (max 12 words) that describes what's visually happening
2. Focus on visual elements that complement the dialogue context
3. Use ${detectedLanguage === 'es' ? 'Spanish' : 'English'} language
4. Be specific and contextually relevant
5. Avoid describing obvious things mentioned in dialogue

Return ONLY the description text, nothing else.`;

  const userPrompt = `Based on this frame from a ${gapDuration}-second gap, create a contextual audio description:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        max_completion_tokens: 50,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: frameDataUrl
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const description = data.choices[0]?.message?.content?.trim() || 'Scene continues';
    
    return {
      text: description,
      confidence: 0.9 // High confidence for GPT-5 vision analysis
    };

  } catch (error) {
    console.error('❌ GPT-5 Vision analysis failed:', error);
    return {
      text: getFallbackDescription(detectedLanguage),
      confidence: 0.3
    };
  }
}


function getLanguageNativeVoice(language: string): string {
  const languageVoices = {
    'en': 'EXAVITQu4vr4xnSDxMaL', // Sarah - English
    'es': 'VR6AewLTigWG4xSOukaG', // Pablo - Spanish  
    'fr': 'ThT5KcBeYPX3keUQqHPh', // Alain - French
    'de': 'TxGEqnHWrfWFTfGW9XjX', // Klaus - German
    'it': 'XrExE9yKIg1WjnnlVkGX', // Matilda - Italian
  };
  return (languageVoices as Record<string, string>)[language] || languageVoices['en'];
}

function getFallbackDescription(language: string): string {
  const fallbacks = {
    'en': 'Visual scene continues',
    'es': 'La escena visual continúa',
    'fr': 'La scène visuelle continue',
    'de': 'Die visuelle Szene geht weiter',
    'it': 'La scena visuale continua'
  };
  return (fallbacks as Record<string, string>)[language] || fallbacks['en'];
}