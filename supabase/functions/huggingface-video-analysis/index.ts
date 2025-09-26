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
      detectedLanguage = 'en'
    } = await req.json()

    console.log(`Processing ${analysisRequests.length} analysis requests for video ${videoId} in language: ${detectedLanguage}`)

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

        // Use BLIP-2 for image captioning - pure scene understanding
        const result = await hf.imageToText({
          data: imageBlob,
          model: 'Salesforce/blip-image-captioning-large'
        })

        let description = result.generated_text || 'Scene content not detected'

        // Clean and format for audio description (no content assumptions)
        description = cleanDescription(description)

        // Get appropriate voice for detected language
        const voiceId = getLanguageNativeVoice(detectedLanguage)

        descriptions.push({
          text: description,
          startTime: request.timestamp,
          endTime: request.timestamp + request.duration,
          voiceStyle: 'warm' as const
        })

        console.log(`Generated description: "${description}" (voice: ${voiceId})`)

      } catch (error) {
        console.error(`Error analyzing frame at ${request.timestamp}s:`, error)
        
        // Provide fallback description
        descriptions.push({
          text: getFallbackDescription(detectedLanguage),
          startTime: request.timestamp,
          endTime: request.timestamp + request.duration,
          voiceStyle: 'warm' as const
        })
      }
    }

    console.log(`Successfully generated ${descriptions.length} descriptions`)

    return new Response(
      JSON.stringify({
        success: true,
        descriptions,
        model: 'Salesforce/blip-image-captioning-large',
        detectedLanguage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in huggingface-video-analysis:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        descriptions: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    )
  }
})

function cleanDescription(rawDescription: string): string {
  // Clean up the raw description for audio accessibility
  let cleaned = rawDescription
    .replace(/^(a |an |the )/i, '') // Remove leading articles
    .replace(/\.$/, '') // Remove trailing period
    .trim()

  // Ensure it's concise for audio description (max ~15 words)
  const words = cleaned.split(' ')
  if (words.length > 15) {
    cleaned = words.slice(0, 15).join(' ') + '...'
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

function getLanguageNativeVoice(language: string): string {
  // ElevenLabs native voices by language
  const languageVoices = {
    'en': 'EXAVITQu4vr4xnSDxMaL', // Sarah - English
    'es': 'VR6AewLTigWG4xSOukaG', // Pablo - Spanish
    'fr': 'ThT5KcBeYPX3keUQqHPh', // Alain - French
    'de': 'TxGEqnHWrfWFTfGW9XjX', // Klaus - German
    'it': 'XrExE9yKIg1WjnnlVkGX', // Matilda - Italian
    'pt': 'TxGEqnHWrfWFTfGW9XjX', // Portuguese variant
    'nl': 'bVMeCyTHy58xNoL34h3p', // Dutch
    'pl': 'EXAVITQu4vr4xnSDxMaL', // Polish (fallback to English)
    'zh': 'onwK4e9ZLuTAKqWW03F9', // Chinese
    'ja': 'pNInz6obpgDQGcFmaJgB', // Japanese
    'ko': 'pFZP5JQG7iQjIQuC4Bku'  // Korean
  }

  return (languageVoices as Record<string, string>)[language] || languageVoices['en'] // Default to English
}

function getFallbackDescription(language: string): string {
  const fallbacks = {
    'en': 'Scene continues',
    'es': 'La escena continúa',
    'fr': 'La scène continue',
    'de': 'Die Szene geht weiter',
    'it': 'La scena continua',
    'pt': 'A cena continua',
    'nl': 'Scène gaat door',
    'pl': 'Scena trwa',
    'zh': '场景继续',
    'ja': 'シーンが続きます',
    'ko': '장면이 계속됩니다'
  }

  return (fallbacks as Record<string, string>)[language] || fallbacks['en']
}