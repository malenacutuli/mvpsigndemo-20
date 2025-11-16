/**
 * AWS Lambda Video Processing Service
 * Handles social clips generation, full video export, and advanced processing
 */

const LAMBDA_ENDPOINT = 'https://6g6n2tixvt7mmjux5pibgsgseg0jtagd.lambda-url.us-east-1.on.aws/';

export interface CaptionWord {
  text: string;
  startTime: number;  // seconds
  endTime: number;    // seconds
}

export interface CaptionSegment {
  speakerColor: string;  // Hex color (e.g., "#FF5733")
  words: CaptionWord[];
}

export interface SocialClipRequest {
  videoUrl: string;
  startTime: number;
  endTime: number;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'linkedin';
  clipId: string;
  captions: CaptionSegment[];
  customDimensions?: {
    width: number;
    height: number;
    aspectRatio: string;
  };
}

export interface SocialClipResponse {
  success: boolean;
  clipUrl: string;
  fileSize: number;
  duration: number;
  platform: string;
  message: string;
}

export interface FullVideoExportRequest {
  videoUrl: string;
  startTime: number;
  endTime: number;
  platform: string;
  quality: '1080p' | '720p' | '480p';
  format: 'mp4' | 'webm';
  includeWatermark?: boolean;
  captions: CaptionSegment[];
}

/**
 * Video Processing Error with detailed error codes
 */
export class VideoProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VideoProcessingError';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    const errorMessages: Record<string, string> = {
      'DOWNLOAD_FAILED': "Couldn't download the video. Please check the URL.",
      'PROCESSING_FAILED': "Video processing failed. Please try again.",
      'TIMEOUT': "Processing is taking longer than expected. Try a shorter clip.",
      'INVALID_FORMAT': "This video format isn't supported yet.",
      'LAMBDA_ERROR': "Server error occurred. Please try again in a moment.",
      'NETWORK_ERROR': "Network connection failed. Check your internet connection."
    };

    return errorMessages[this.code] || this.message;
  }
}

/**
 * Generate a social media clip using AWS Lambda
 */
export async function generateSocialClip(
  request: SocialClipRequest
): Promise<SocialClipResponse> {
  try {
    console.log('Calling Lambda for social clip:', {
      platform: request.platform,
      duration: request.endTime - request.startTime,
      captionCount: request.captions.length
    });

    const response = await fetch(LAMBDA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('Lambda error response:', response.status, errorText);
      
      throw new VideoProcessingError(
        `Lambda returned status ${response.status}`,
        response.status === 504 ? 'TIMEOUT' : 'LAMBDA_ERROR',
        { status: response.status, body: errorText }
      );
    }

    const result = await response.json();
    
    // Lambda returns { statusCode, body } format
    const responseData = result.body || result;
    
    if (!responseData.success) {
      throw new VideoProcessingError(
        responseData.message || 'Processing failed',
        'PROCESSING_FAILED',
        responseData
      );
    }

    console.log('Lambda processing successful:', responseData);
    return responseData;
  } catch (error) {
    if (error instanceof VideoProcessingError) {
      throw error;
    }

    console.error('Error generating social clip:', error);
    
    // Network or parsing errors
    throw new VideoProcessingError(
      'Failed to generate clip',
      'NETWORK_ERROR',
      error
    );
  }
}

/**
 * Generate social clip with automatic retries
 */
export async function generateSocialClipWithRetry(
  request: SocialClipRequest,
  maxRetries = 2
): Promise<SocialClipResponse> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateSocialClip(request);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on validation errors or timeouts
      if (error instanceof VideoProcessingError && 
          (error.code === 'INVALID_FORMAT' || error.code === 'TIMEOUT')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (i < maxRetries - 1) {
        const delay = 2000 * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new VideoProcessingError(
    'Failed to generate clip after retries',
    'PROCESSING_FAILED',
    lastError
  );
}

/**
 * Export full video with captions and effects
 */
export async function exportFullVideo(
  request: FullVideoExportRequest
): Promise<SocialClipResponse> {
  // Full video export uses the same Lambda endpoint
  // Just with full duration and quality parameters
  const clipRequest: SocialClipRequest = {
    videoUrl: request.videoUrl,
    startTime: request.startTime,
    endTime: request.endTime,
    platform: request.platform as any,
    clipId: `export-${Date.now()}`,
    captions: request.captions,
  };

  return generateSocialClip(clipRequest);
}

/**
 * Generate unique clip ID
 */
export function generateClipId(): string {
  return `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format transcript segments into caption format for Lambda
 */
export function formatCaptionsForLambda(
  segments: Array<{
    text: string;
    start_time: number;
    end_time: number;
    speaker?: string;
    speaker_color?: string;
    words?: any;
  }>,
  startTime: number,
  endTime: number
): CaptionSegment[] {
  // Group segments by speaker
  const speakerGroups = new Map<string, typeof segments>();
  
  segments.forEach(segment => {
    // Only include segments within time range
    if (segment.start_time >= startTime && segment.end_time <= endTime) {
      const speaker = segment.speaker || 'Unknown';
      if (!speakerGroups.has(speaker)) {
        speakerGroups.set(speaker, []);
      }
      speakerGroups.get(speaker)!.push(segment);
    }
  });

  // Convert to caption segments with word-level timing
  const captionSegments: CaptionSegment[] = [];
  
  speakerGroups.forEach((segments, speaker) => {
    const words: CaptionWord[] = [];
    
    segments.forEach(segment => {
      // If segment has word-level timing, use it
      if (segment.words && Array.isArray(segment.words)) {
        segment.words.forEach((word: any) => {
          words.push({
            text: word.text || word.word || '',
            startTime: word.start || word.start_time || segment.start_time,
            endTime: word.end || word.end_time || segment.end_time
          });
        });
      } else {
        // Otherwise, use segment timing for whole text
        const segmentWords = segment.text.split(/\s+/);
        const wordDuration = (segment.end_time - segment.start_time) / segmentWords.length;
        
        segmentWords.forEach((word, index) => {
          words.push({
            text: word,
            startTime: segment.start_time + (wordDuration * index),
            endTime: segment.start_time + (wordDuration * (index + 1))
          });
        });
      }
    });

    const firstSegment = segments[0];
    const speakerColor = firstSegment.speaker_color || '#FFFFFF';

    captionSegments.push({
      speakerColor: speakerColor.startsWith('#') ? speakerColor : `#${speakerColor}`,
      words
    });
  });

  return captionSegments;
}

/**
 * Get video URL from storage path
 */
export function getVideoUrl(storagePath: string): string {
  // If it's already a full URL, return it
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }

  // Otherwise, construct Supabase storage URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/videos/${storagePath}`;
}
