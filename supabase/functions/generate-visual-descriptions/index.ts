import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  timestamp: number;
  gapStart: number;
  gapEnd: number;
  duration: number;
  frameDataUrls?: string[]; // Optional extracted frames for vision analysis
  surroundingText?: string; // Nearby transcript context
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { videoId, analysisRequests, language = 'en', contentType = 'education' } = await req.json();
    
    console.log('🎥 Visual Description Analysis Request:', {
      videoId,
      requestCount: analysisRequests?.length || 0,
      language,
      contentType
    });

    if (!analysisRequests || analysisRequests.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No analysis requests provided',
        descriptions: [] 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not found');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        descriptions: []
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate frame-specific visual descriptions
    const descriptions = [];
    
    for (const request of analysisRequests) {
      try {
        console.log(`🖼️ Analyzing frame at ${request.timestamp}s (gap: ${request.gapStart}s-${request.gapEnd}s)`);
        
        // Create context-aware prompt for visual description
        const prompt = createVisualDescriptionPrompt(request, language, contentType);
        
        let messages;
        
        // If frames are provided, use GPT-5 with vision for accurate analysis
        if (request.frameDataUrls && request.frameDataUrls.length > 0) {
          const imageContents = request.frameDataUrls.map(dataUrl => ({
            type: "image_url",
            image_url: { url: dataUrl }
          }));

          messages = [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageContents
            ]
          }];
          
          console.log(`🖼️ Using GPT-5 vision with ${request.frameDataUrls.length} frames for timestamp ${request.timestamp}s`);
        } else {
          // Text-only mode
          messages = [{
            role: 'user',
            content: prompt
          }];
          
          console.log(`📝 Using text-only mode for timestamp ${request.timestamp}s`);
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: request.frameDataUrls && request.frameDataUrls.length > 0 ? 'gpt-5-2025-08-07' : 'gpt-5-mini-2025-08-07',
            messages,
            max_completion_tokens: 100, // Shorter for more focused descriptions
          }),
        });

        if (!response.ok) {
          console.error(`❌ OpenAI API error for timestamp ${request.timestamp}:`, response.status);
          continue;
        }

        const data = await response.json();
        let description = (data?.choices?.[0]?.message?.content || '').trim();

        // Frame validation: if we have frames, validate the description matches visible content
        if (request.frameDataUrls && request.frameDataUrls.length > 0 && description) {
          const validationResult = await validateDescriptionAgainstFrames(description, request.frameDataUrls, openAIApiKey);
          
          if (!validationResult.isValid) {
            console.log(`⚠️ Description validation failed for ${request.timestamp}s: ${validationResult.reason}`);
            
            // Try to get a corrected description
            if (validationResult.correctedDescription) {
              description = validationResult.correctedDescription;
              console.log(`✅ Using corrected description: "${description}"`);
            } else {
              // Skip this description if we can't validate it
              console.log(`❌ Skipping unvalidated description for ${request.timestamp}s`);
              continue;
            }
          }
        }

        // Fallback: retry with a more reliable model if empty
        if (!description) {
          console.log('⚠️ Empty description from first model, retrying with gpt-4.1-2025-04-14');
          const retryRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4.1-2025-04-14',
              messages: [
                {
                  role: 'system',
                  content: `You are an expert audio description writer creating descriptions for ${contentType} content in ${language}. Generate one concise, vivid sentence only.`
                },
                {
                  role: 'user',
                  content: prompt + '\nReturn only the sentence, no extra text.'
                }
              ],
              temperature: 0.7,
              max_tokens: 120,
            }),
          });

          if (retryRes.ok) {
            const retryData = await retryRes.json();
            description = (retryData?.choices?.[0]?.message?.content || '').trim();
          } else {
            console.error('❌ Retry model error:', retryRes.status);
          }
        }

        // Last-resort non-empty fallback to prevent blanks in UI
        if (!description) {
          description = language === 'es' 
            ? 'Pausa visual breve en pantalla.' 
            : 'Brief visual pause on screen.';
        }

        // Estimate voice style based on content
        const voiceStyle = determineVoiceStyle(description, contentType);
        
        descriptions.push({
          text: description,
          startTime: request.gapStart + 0.3, // Small padding from gap start
          endTime: request.gapEnd - 0.3, // Small padding before gap end
          voiceStyle,
          timestamp: request.timestamp,
          confidence: 0.9 // High confidence for AI-generated descriptions
        });

        console.log(`✅ Generated description for ${request.timestamp}s: "${description.substring(0, 50)}..."`);
      } catch (error) {
        console.error(`❌ Failed to generate description for timestamp ${request.timestamp}:`, error);
      }
    }

    console.log(`🎯 Generated ${descriptions.length} visual descriptions`);

    return new Response(JSON.stringify({ 
      descriptions,
      success: true,
      totalGenerated: descriptions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Generate visual descriptions error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      descriptions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Frame validation function to ensure descriptions match visible content
async function validateDescriptionAgainstFrames(description: string, frameDataUrls: string[], apiKey: string): Promise<{
  isValid: boolean;
  reason?: string;
  correctedDescription?: string;
}> {
  try {
    const imageContents = frameDataUrls.map(dataUrl => ({
      type: "image_url", 
      image_url: { url: dataUrl }
    }));

    const validationPrompt = `You are a critic reviewing an audio description for accuracy against video frames.

Audio description to validate: "${description}"

Your task:
1. Check if EVERY element mentioned in the description is clearly visible in the frames
2. If description is accurate, respond: "VALID"  
3. If inaccurate, respond: "INVALID: [reason]"
4. If mostly accurate but needs minor correction, respond: "CORRECTED: [improved version under 15 words]"

Be strict - reject descriptions that mention things not clearly visible in the frames.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07', // Fast model for validation
        messages: [{
          role: "user",
          content: [
            { type: "text", text: validationPrompt },
            ...imageContents
          ]
        }],
        max_completion_tokens: 60,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const result = (data?.choices?.[0]?.message?.content || '').trim();
      
      if (result.startsWith('VALID')) {
        return { isValid: true };
      } else if (result.startsWith('CORRECTED:')) {
        const corrected = result.replace('CORRECTED:', '').trim();
        return { 
          isValid: true, 
          correctedDescription: corrected
        };
      } else if (result.startsWith('INVALID:')) {
        const reason = result.replace('INVALID:', '').trim();
        return { 
          isValid: false, 
          reason 
        };
      }
    }
    
    // Default to valid if validation fails
    return { isValid: true };
    
  } catch (error) {
    console.error('Validation error:', error);
    return { isValid: true }; // Default to accepting if validation fails
  }
}

function createVisualDescriptionPrompt(request: AnalysisRequest, language: string, contentType: string): string {
  const hasFrames = request.frameDataUrls && request.frameDataUrls.length > 0;
  const contextText = request.surroundingText ? `\n\nNearby dialogue context: "${request.surroundingText}"` : '';
  
  const languageInstructions = {
    es: 'Provide the description in clear, natural Spanish.',
    fr: 'Provide the description in clear, natural French.',
    de: 'Provide the description in clear, natural German.',
    it: 'Provide the description in clear, natural Italian.',
    en: 'Provide the description in clear, natural English.'
  };
  
  if (hasFrames) {
    // Frame-based analysis prompt
    return `You are analyzing video frames from timestamp ${request.timestamp.toFixed(1)} seconds. 

CRITICAL INSTRUCTIONS:
1. ONLY describe what you can clearly see in the provided frames
2. DO NOT make assumptions about content not visible in the frames
3. If frames show unclear/dark/blurred content, generate a brief neutral description
4. Be specific about visible elements: people, objects, actions, settings
5. Keep description under 20 words for ${request.duration.toFixed(1)}s duration
6. ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

Your task: Create a factual audio description based solely on what's visible in these frames.${contextText}

Generate only the description text, no formatting or explanation.`;
  } else {
    // Text-only fallback prompt  
    const contextPrompts = {
      general: `At timestamp ${request.timestamp} seconds, describe general visual elements that would complement the nearby dialogue without making specific assumptions about unseen content.`
    };

    const prompt = contextPrompts.general;
    
    return `${prompt}

Duration available: ${request.duration.toFixed(1)} seconds
Gap timing: ${request.gapStart.toFixed(1)}s to ${request.gapEnd.toFixed(1)}s${contextText}

Requirements:
- Keep description under 20 words for ${request.duration.toFixed(1)}s duration  
- Be general and supportive of the content theme
- Avoid assumptions about specific unseen details
- Focus on atmospheric or transitional elements
- ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.en}

Generate only the audio description text, no additional formatting or explanation.`;
  }
}

function determineVoiceStyle(description: string, contentType: string): 'passionate' | 'warm' | 'authoritative' | 'encouraging' {
  const text = description.toLowerCase();
  
  if (contentType === 'recipe') {
    if (text.includes('sizzl') || text.includes('heat') || text.includes('flame')) return 'passionate';
    if (text.includes('gentle') || text.includes('stir') || text.includes('mix')) return 'warm';
    return 'authoritative';
  }
  
  if (text.includes('learn') || text.includes('practice') || text.includes('try')) return 'encouraging';
  if (text.includes('demonstrate') || text.includes('show') || text.includes('explain')) return 'authoritative';
  if (text.includes('child') || text.includes('student') || text.includes('help')) return 'warm';
  
  return 'authoritative';
}