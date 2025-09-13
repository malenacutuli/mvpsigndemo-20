import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  timestamp: number;
  frameDataUrl: string;
  duration: number;
  context?: string;
}

interface AudioDescriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { 
      videoId, 
      analysisRequests, 
      language = 'en', 
      contentType = 'general' 
    } = await req.json()

    console.log(`Processing ${analysisRequests.length} analysis requests for video ${videoId}`)

    if (!analysisRequests || analysisRequests.length === 0) {
      throw new Error('No analysis requests provided')
    }

    const hfToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN')
    if (!hfToken) {
      throw new Error('Hugging Face API token not configured')
    }

    const hf = new HfInference(hfToken)
    const descriptions: AudioDescriptionSegment[] = []

    // Process each frame analysis request
    for (const request of analysisRequests) {
      try {
        console.log(`Analyzing frame at ${request.timestamp}s`)

        // Convert data URL to blob for Hugging Face
        const base64Data = request.frameDataUrl.split(',')[1]
        const binaryData = atob(base64Data)
        const bytes = new Uint8Array(binaryData.length)
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i)
        }
        const imageBlob = new Blob([bytes], { type: 'image/jpeg' })

        // Use BLIP-2 for image captioning - great for scene understanding
        const result = await hf.imageToText({
          data: imageBlob,
          model: 'Salesforce/blip-image-captioning-large'
        })

        let rawDescription = result.generated_text || 'Scene content not detected'

        // Enhance description based on content type and language
        const enhancedDescription = enhanceDescription(
          rawDescription, 
          contentType, 
          language,
          request.context
        )

        // Determine voice style based on content
        const voiceStyle = determineVoiceStyle(enhancedDescription, contentType)

        descriptions.push({
          text: enhancedDescription,
          startTime: request.timestamp,
          endTime: request.timestamp + request.duration,
          voiceStyle
        })

        console.log(`Generated description: "${enhancedDescription}" (${voiceStyle})`)

      } catch (error) {
        console.error(`Error analyzing frame at ${request.timestamp}s:`, error)
        
        // Provide fallback description
        descriptions.push({
          text: generateFallbackDescription(contentType, language),
          startTime: request.timestamp,
          endTime: request.timestamp + request.duration,
          voiceStyle: 'warm'
        })
      }
    }

    console.log(`Successfully generated ${descriptions.length} descriptions`)

    return new Response(
      JSON.stringify({
        success: true,
        descriptions,
        model: 'Salesforce/blip-image-captioning-large',
        language,
        contentType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in huggingface-video-analysis:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        descriptions: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

function enhanceDescription(
  rawDescription: string, 
  contentType: string, 
  language: string,
  context?: string
): string {
  // Clean up the raw description
  let enhanced = rawDescription
    .replace(/^(a |an |the )/i, '') // Remove leading articles
    .replace(/\.$/, '') // Remove trailing period
    .trim()

  // Add context-specific enhancements
  if (contentType === 'recipe') {
    enhanced = enhanceRecipeDescription(enhanced, context)
  } else if (contentType === 'education') {
    enhanced = enhanceEducationDescription(enhanced, context)
  }

  // Add language-specific formatting
  if (language === 'es') {
    enhanced = translateToSpanish(enhanced)
  }

  // Ensure it's concise for audio description (max ~15 words)
  const words = enhanced.split(' ')
  if (words.length > 15) {
    enhanced = words.slice(0, 15).join(' ') + '...'
  }

  return enhanced.charAt(0).toUpperCase() + enhanced.slice(1)
}

function enhanceRecipeDescription(description: string, context?: string): string {
  const recipeKeywords = {
    'bowl': 'mixing bowl',
    'pan': 'cooking pan',
    'pot': 'cooking pot',
    'knife': 'chef\'s knife',
    'cutting': 'chopping ingredients',
    'cooking': 'preparing the dish',
    'stirring': 'mixing ingredients',
    'food': 'ingredients'
  }

  let enhanced = description
  for (const [key, value] of Object.entries(recipeKeywords)) {
    enhanced = enhanced.replace(new RegExp(key, 'gi'), value)
  }

  return enhanced
}

function enhanceEducationDescription(description: string, context?: string): string {
  const educationKeywords = {
    'person': 'instructor',
    'people': 'students',
    'book': 'educational materials',
    'writing': 'taking notes',
    'reading': 'studying content'
  }

  let enhanced = description
  for (const [key, value] of Object.entries(educationKeywords)) {
    enhanced = enhanced.replace(new RegExp(key, 'gi'), value)
  }

  return enhanced
}

function translateToSpanish(text: string): string {
  // Basic translation for common terms (in production, use a proper translation service)
  const translations = {
    'mixing bowl': 'tazón de mezcla',
    'cooking pan': 'sartén',
    'cooking pot': 'olla',
    'ingredients': 'ingredientes',
    'preparing': 'preparando',
    'cooking': 'cocinando',
    'instructor': 'instructor',
    'students': 'estudiantes'
  }

  let translated = text
  for (const [english, spanish] of Object.entries(translations)) {
    translated = translated.replace(new RegExp(english, 'gi'), spanish)
  }

  return translated
}

function determineVoiceStyle(
  description: string, 
  contentType: string
): 'passionate' | 'warm' | 'authoritative' | 'encouraging' {
  const lowerDesc = description.toLowerCase()

  if (contentType === 'recipe') {
    if (lowerDesc.includes('cooking') || lowerDesc.includes('preparing')) {
      return 'passionate'
    }
    return 'warm'
  } else if (contentType === 'education') {
    if (lowerDesc.includes('instructor') || lowerDesc.includes('teaching')) {
      return 'authoritative'
    }
    return 'encouraging'
  }

  // Default based on content emotion
  if (lowerDesc.includes('action') || lowerDesc.includes('moving')) {
    return 'passionate'
  } else if (lowerDesc.includes('calm') || lowerDesc.includes('peaceful')) {
    return 'warm'
  } else {
    return 'encouraging'
  }
}

function generateFallbackDescription(contentType: string, language: string): string {
  const fallbacks = {
    en: {
      recipe: 'Cooking process continues',
      education: 'Learning activity in progress',
      general: 'Scene continues'
    },
    es: {
      recipe: 'El proceso de cocina continúa',
      education: 'Actividad de aprendizaje en progreso',
      general: 'La escena continúa'
    }
  }

  return fallbacks[language]?.[contentType] || fallbacks.en.general
}