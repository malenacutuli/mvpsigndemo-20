/**
 * AI-powered scene detection and highlight generation
 * Uses Lovable AI to analyze video frames and detect interesting moments
 */

const LOVABLE_API_KEY = import.meta.env.VITE_LOVABLE_API_KEY;
const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export interface DetectedScene {
  id: string;
  startTime: number;
  endTime: number;
  type: 'scene_change' | 'action' | 'dialogue' | 'highlight';
  confidence: number;
  description: string;
  thumbnailUrl?: string;
}

export interface SceneAnalysisResult {
  scenes: DetectedScene[];
  totalScenes: number;
  videoSummary: string;
  suggestedClips: {
    startTime: number;
    endTime: number;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

/**
 * Analyze video frames with AI to detect scenes and highlights
 */
export async function analyzeVideoScenes(
  frames: Array<{ dataUrl: string; timestamp: number }>,
  videoDuration: number
): Promise<SceneAnalysisResult> {
  console.log(`🎬 Analyzing ${frames.length} frames with AI...`);

  // Prepare frame data for AI analysis
  const frameDescriptions = frames.map((frame, idx) => ({
    timestamp: frame.timestamp,
    index: idx
  }));

  // Build prompt for scene detection
  const prompt = `Analyze these ${frames.length} video frames sampled from a ${videoDuration.toFixed(1)}s video.
  
Frame timestamps: ${frameDescriptions.map(f => `${f.timestamp.toFixed(1)}s`).join(', ')}

Tasks:
1. Identify major scene changes (new location, different shot, topic change)
2. Detect action moments (movement, events, transitions)
3. Suggest 3-5 highlight clips worth extracting (5-15 seconds each)
4. Provide a brief video summary

Return a JSON object with this structure:
{
  "scenes": [
    {
      "startTime": 0.0,
      "endTime": 5.2,
      "type": "scene_change",
      "description": "Brief description of what's happening",
      "confidence": 0.9
    }
  ],
  "videoSummary": "Overall description of the video content",
  "suggestedClips": [
    {
      "startTime": 2.0,
      "endTime": 8.0,
      "reason": "Why this clip is interesting",
      "priority": "high"
    }
  ]
}`;

  try {
    // Call AI with frame images
    const messages: any[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          ...frames.slice(0, 20).map(frame => ({ // Limit to 20 frames for API limits
            type: 'image_url',
            image_url: {
              url: frame.dataUrl
            }
          }))
        ]
      }
    ];

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI analysis failed: ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse AI response
    const analysis = JSON.parse(content);

    // Add IDs and thumbnails to scenes
    const scenes: DetectedScene[] = (analysis.scenes || []).map((scene: any, idx: number) => ({
      id: `scene-${idx}`,
      startTime: scene.startTime || 0,
      endTime: scene.endTime || 0,
      type: scene.type || 'scene_change',
      confidence: scene.confidence || 0.5,
      description: scene.description || 'Scene detected',
      thumbnailUrl: findNearestFrameThumbnail(scene.startTime, frames)
    }));

    console.log(`✅ Detected ${scenes.length} scenes and ${analysis.suggestedClips?.length || 0} suggested clips`);

    return {
      scenes,
      totalScenes: scenes.length,
      videoSummary: analysis.videoSummary || 'Video analyzed',
      suggestedClips: analysis.suggestedClips || []
    };
  } catch (error: any) {
    console.error('Scene analysis failed:', error);
    throw new Error(`Failed to analyze scenes: ${error.message}`);
  }
}

/**
 * Find the nearest frame thumbnail for a given timestamp
 */
function findNearestFrameThumbnail(
  targetTime: number,
  frames: Array<{ dataUrl: string; timestamp: number }>
): string | undefined {
  if (frames.length === 0) return undefined;

  let nearest = frames[0];
  let minDiff = Math.abs(frames[0].timestamp - targetTime);

  for (const frame of frames) {
    const diff = Math.abs(frame.timestamp - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = frame;
    }
  }

  return nearest.dataUrl;
}

/**
 * Generate quick scene suggestions based on frame analysis (fallback without AI)
 */
export function generateQuickScenes(
  frameCount: number,
  videoDuration: number
): DetectedScene[] {
  const scenes: DetectedScene[] = [];
  const segmentDuration = videoDuration / Math.max(1, frameCount - 1);

  for (let i = 0; i < frameCount - 1; i++) {
    scenes.push({
      id: `scene-${i}`,
      startTime: i * segmentDuration,
      endTime: (i + 1) * segmentDuration,
      type: 'scene_change',
      confidence: 0.5,
      description: `Segment ${i + 1}`
    });
  }

  return scenes;
}
