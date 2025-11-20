/**
 * AI-powered image editing using Nano banana model
 * Features:
 * - Style transfer and artistic effects
 * - Image enhancements and upscaling
 * - Generate variations of frames
 */

const LOVABLE_API_KEY = import.meta.env.VITE_LOVABLE_API_KEY;
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export interface AIEditOptions {
  prompt: string;
  imageUrl: string; // Can be data URL or HTTPS URL
}

export interface AIEditResult {
  imageUrl: string; // Base64 data URL
  prompt: string;
}

/**
 * Edit an image using AI based on a text prompt
 */
export async function editImageWithAI(options: AIEditOptions): Promise<AIEditResult> {
  const { prompt, imageUrl } = options;

  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      modalities: ['image', 'text']
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI editing failed: ${error}`);
  }

  const data = await response.json();
  const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!editedImageUrl) {
    throw new Error('No image returned from AI model');
  }

  return {
    imageUrl: editedImageUrl,
    prompt
  };
}

/**
 * Generate a new image from a text prompt
 */
export async function generateImageWithAI(prompt: string): Promise<string> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      modalities: ['image', 'text']
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI generation failed: ${error}`);
  }

  const data = await response.json();
  const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!generatedImageUrl) {
    throw new Error('No image returned from AI model');
  }

  return generatedImageUrl;
}

// Preset prompts for common editing tasks
export const AI_EDIT_PRESETS = {
  enhance: 'Enhance this image: improve clarity, sharpen details, boost colors naturally',
  artistic: 'Apply artistic style: make it look like a beautiful oil painting',
  cinematic: 'Apply cinematic color grading: add film-like tones and contrast',
  vintage: 'Apply vintage film look: add grain, warm tones, and nostalgic feel',
  bw: 'Convert to stunning black and white with high contrast',
  blur_background: 'Blur the background while keeping the subject sharp',
  remove_noise: 'Remove noise and grain, make it ultra clean and sharp',
  dramatic: 'Make it more dramatic: increase contrast and add moody lighting'
} as const;

export type AIEditPreset = keyof typeof AI_EDIT_PRESETS;
