// FILE: src/lib/aws-video-processor.ts
// UPDATED: Use YOUR existing Edge Functions

import { supabase } from '@/integrations/supabase/client';

// Your existing S3 buckets (hardcoded non-sensitive values)
const S3_UPLOAD_BUCKET = 'axessible-video-uploads';
const S3_PROCESSED_BUCKET = 'axessible-videos-422482350878';

export interface VideoUploadOptions {
  file: File;
  videoId: string;
  userId: string;
  onProgress?: (progress: number) => void;
}

/**
 * Upload video using YOUR EXISTING generate-upload-url Edge Function
 */
export async function uploadVideoToS3(options: VideoUploadOptions): Promise<{
  s3Key: string;
  s3Url: string;
}> {
  const { file, videoId, userId, onProgress } = options;

  try {
    console.log('🔑 Getting upload URL from YOUR existing Edge Function...');

    // Call YOUR existing generate-upload-url function
    const { data: urlData, error: urlError } = await supabase.functions.invoke('generate-upload-url', {
      body: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        videoId,
        userId
      }
    });

    if (urlError) throw urlError;

    console.log('📤 Uploading to S3...');

    // Upload with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress?.(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));

      xhr.open('PUT', urlData.uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    console.log('✅ Upload complete!');

    return {
      s3Key: urlData.key,
      s3Url: urlData.url
    };

  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Upload large video using YOUR EXISTING multipart upload functions
 */
export async function uploadLargeVideoToS3(options: VideoUploadOptions): Promise<{
  s3Key: string;
  s3Url: string;
}> {
  const { file, videoId, userId, onProgress } = options;
  const CHUNK_SIZE = 25 * 1024 * 1024; // 25MB chunks for better performance

  try {
    console.log('🚀 Starting R2 multipart upload...');

    // Step 1: Initialize multipart upload with R2
    const { data: initData, error: initError } = await supabase.functions.invoke('generate-r2-upload-url', {
      body: {
        fileName: file.name,
        fileType: file.type
      }
    });

    if (initError) throw initError;

    const { uploadId, key } = initData;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadedParts: any[] = [];

    // Step 2: Upload chunks with 2 concurrent uploads
    const uploadChunk = async (chunkIndex: number) => {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const partNumber = chunkIndex + 1;

      console.log(`📦 Uploading part ${partNumber}/${totalChunks}...`);

      // Get pre-signed URL for this part
      const { data: partData, error: partError } = await supabase.functions.invoke('get-r2-part-url', {
        body: {
          uploadId,
          key,
          partNumber
        }
      });

      if (partError) throw partError;

      // Upload chunk with authentication headers
        const response = await fetch(partData.presignedUrl, {
          method: 'PUT',
          body: chunk
        });

      if (!response.ok) {
        throw new Error(`Part ${partNumber} upload failed: ${response.status}`);
      }

      const etag = response.headers.get('ETag');
      uploadedParts.push({ partNumber, etag });

      // Update progress
      const progress = ((partNumber) / totalChunks) * 100;
      onProgress?.(progress);
    };

    // Upload chunks with 2 concurrent uploads
    for (let i = 0; i < totalChunks; i += 2) {
      const batch = [uploadChunk(i)];
      if (i + 1 < totalChunks) {
        batch.push(uploadChunk(i + 1));
      }
      await Promise.all(batch);
    }

    // Step 3: Complete multipart upload
    console.log('🔧 Completing R2 multipart upload...', {
      uploadId,
      key,
      partsCount: uploadedParts.length,
    });

    const { data: completeData, error: completeError } = await supabase.functions.invoke('complete-r2-upload', {
      body: {
        uploadId,
        key,
        parts: uploadedParts.sort((a, b) => a.partNumber - b.partNumber)
      }
    });

    if (completeError) {
      console.error('❌ complete-r2-upload error:', completeError);
      throw completeError;
    }

    console.log('✅ R2 multipart upload completed:', completeData);

    console.log('✅ R2 multipart upload complete!');

    return {
      s3Key: completeData.key,
      s3Url: completeData.url
    };

  } catch (error) {
    console.error('❌ R2 multipart upload failed:', error);
    throw error;
  }
}

/**
 * Export video using YOUR EXISTING queue-export-job function
 */
export async function exportVideo(options: {
  videoId: string;
  format: string;
  resolution: string;
  includeSubtitles: boolean;
  includeAD: boolean;
  includeASL: boolean;
  burnCaptions: boolean;
}): Promise<{ jobId: string; exportUrl: string }> {
  try {
    console.log('🎬 Queueing export job...');

    // Call YOUR existing queue-export-job function
    const { data, error } = await supabase.functions.invoke('queue-export-job', {
      body: {
        videoId: options.videoId,
        exportOptions: {
          format: options.format,
          resolution: options.resolution,
          includeSubtitles: options.includeSubtitles,
          includeAudioDescription: options.includeAD,
          includeSignLanguage: options.includeASL,
          burnCaptions: options.burnCaptions
        }
      }
    });

    if (error) throw error;

    const jobId = data.jobId;

    console.log('⏳ Polling for export completion...');

    // Poll YOUR existing get-export-status function
    const exportUrl = await pollExportStatus(jobId);

    return { jobId, exportUrl };

  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

/**
 * Poll export status using YOUR EXISTING get-export-status function
 */
async function pollExportStatus(jobId: string, maxAttempts = 60): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds

    const { data, error } = await supabase.functions.invoke('get-export-status', {
      body: { jobId }
    });

    if (error) {
      console.error('Error checking export status:', error);
      continue;
    }

    console.log(`⏳ Export status: ${data.status} (${i + 1}/${maxAttempts})`);

    if (data.status === 'completed') {
      return data.exportUrl;
    }

    if (data.status === 'failed') {
      throw new Error(data.error || 'Export failed');
    }
  }

  throw new Error('Export timed out');
}

/**
 * Generate social clip using YOUR EXISTING generate-social-clip function
 */
export async function generateSocialClip(options: {
  videoId: string;
  startTime: number;
  endTime: number;
  platform: string;
  aspectRatio: string;
}): Promise<{ clipUrl: string }> {
  try {
    console.log('📱 Generating social clip...');

    // Call YOUR existing generate-social-clip function
    const { data, error } = await supabase.functions.invoke('generate-social-clip', {
      body: {
        videoId: options.videoId,
        startTime: options.startTime,
        endTime: options.endTime,
        platform: options.platform,
        aspectRatio: options.aspectRatio
      }
    });

    if (error) throw error;

    console.log('✅ Social clip generated:', data.clipUrl);

    return { clipUrl: data.clipUrl };

  } catch (error) {
    console.error('❌ Social clip generation failed:', error);
    throw error;
  }
}
