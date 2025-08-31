/**
 * Utility for extracting frames from video files on the client side
 */

export interface FrameExtractionOptions {
  /**
   * Time in seconds from which to extract the frame
   * If not provided, will use the middle of the video
   */
  timeInSeconds?: number;
  /**
   * Quality of the extracted frame (0.0 to 1.0)
   * Default: 0.8
   */
  quality?: number;
  /**
   * Maximum width for the thumbnail
   * Default: 1280
   */
  maxWidth?: number;
  /**
   * Maximum height for the thumbnail  
   * Default: 720
   */
  maxHeight?: number;
}

export interface ExtractedFrame {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Extracts a frame from a video file
 */
export async function extractVideoFrame(
  videoFile: File, 
  options: FrameExtractionOptions = {}
): Promise<ExtractedFrame> {
  const {
    timeInSeconds,
    quality = 0.8,
    maxWidth = 1280,
    maxHeight = 720
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Cannot create canvas context'));
      return;
    }

    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    video.addEventListener('loadedmetadata', () => {
      // Calculate aspect ratio and resize canvas
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      let canvasWidth = Math.min(video.videoWidth, maxWidth);
      let canvasHeight = Math.min(video.videoHeight, maxHeight);

      // Maintain aspect ratio
      if (canvasWidth / canvasHeight > videoAspectRatio) {
        canvasWidth = canvasHeight * videoAspectRatio;
      } else {
        canvasHeight = canvasWidth / videoAspectRatio;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Set time to extract frame from
      const extractTime = timeInSeconds !== undefined 
        ? Math.min(timeInSeconds, video.duration) 
        : video.duration / 2; // Use middle of video by default

      video.currentTime = extractTime;
    });

    video.addEventListener('seeked', () => {
      try {
        // Draw the video frame to canvas
        ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            
            resolve({
              blob,
              dataUrl,
              width: canvas.width,
              height: canvas.height
            });

            // Clean up
            URL.revokeObjectURL(video.src);
          },
          'image/jpeg',
          quality
        );
      } catch (error) {
        reject(new Error(`Failed to extract frame: ${error}`));
      }
    });

    video.addEventListener('error', (e) => {
      reject(new Error(`Video loading error: ${video.error?.message || 'Unknown error'}`));
    });

    // Start loading the video
    video.src = URL.createObjectURL(videoFile);
  });
}

/**
 * Extracts multiple frames from a video at different time intervals
 */
export async function extractMultipleFrames(
  videoFile: File,
  frameCount: number = 3,
  options: Omit<FrameExtractionOptions, 'timeInSeconds'> = {}
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    video.addEventListener('loadedmetadata', async () => {
      const frames: ExtractedFrame[] = [];
      const duration = video.duration;
      
      // Extract frames at evenly spaced intervals
      for (let i = 0; i < frameCount; i++) {
        const timeInSeconds = (duration / (frameCount + 1)) * (i + 1);
        
        try {
          const frame = await extractVideoFrame(videoFile, {
            ...options,
            timeInSeconds
          });
          frames.push(frame);
        } catch (error) {
          console.warn(`Failed to extract frame at ${timeInSeconds}s:`, error);
        }
      }

      if (frames.length === 0) {
        reject(new Error('Failed to extract any frames'));
      } else {
        resolve(frames);
      }
    });

    video.addEventListener('error', (e) => {
      reject(new Error(`Video loading error: ${video.error?.message || 'Unknown error'}`));
    });

    video.src = URL.createObjectURL(videoFile);
  });
}