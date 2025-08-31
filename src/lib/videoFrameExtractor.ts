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

  console.log(`🎬 Starting frame extraction from video: ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)}MB)`);

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
    video.muted = true; // Ensure autoplay works

    video.addEventListener('loadedmetadata', () => {
      console.log(`📹 Video metadata loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`);
      
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
      console.log(`🎨 Canvas size: ${canvasWidth}x${canvasHeight}`);

      // Set time to extract frame from - use 25% instead of middle for better content
      const extractTime = timeInSeconds !== undefined 
        ? Math.min(timeInSeconds, video.duration) 
        : Math.max(1, video.duration * 0.25); // Use 25% for better content than first frame

      console.log(`⏱️ Extracting frame at ${extractTime.toFixed(2)}s (${((extractTime / video.duration) * 100).toFixed(1)}% of video)`);
      video.currentTime = extractTime;
    });

    video.addEventListener('seeked', () => {
      try {
        console.log(`🖼️ Video seeked to ${video.currentTime}s, drawing to canvas...`);
        
        // Fill canvas with white background first
        ctx!.fillStyle = 'white';
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the video frame to canvas
        ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Check if the canvas has any content (not just black)
        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let hasContent = false;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
            hasContent = true;
            break;
          }
        }
        
        if (!hasContent) {
          console.warn('⚠️ Extracted frame appears to be black/empty, trying different time...');
          // Try middle of video instead
          video.currentTime = video.duration / 2;
          return;
        }
        
        console.log('✅ Frame extracted successfully with content');
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }

            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            
            console.log(`💾 Blob created: ${(blob.size / 1024).toFixed(2)}KB`);
            
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
        console.error('❌ Frame extraction error:', error);
        reject(new Error(`Failed to extract frame: ${error}`));
      }
    });

    video.addEventListener('error', (e) => {
      console.error('❌ Video loading error:', video.error);
      reject(new Error(`Video loading error: ${video.error?.message || 'Unknown error'}`));
    });

    // Start loading the video
    console.log('🎞️ Loading video file...');
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