import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks for better performance
const MAX_CONCURRENT_UPLOADS = 3; // Upload 3 parts simultaneously
const UPLOAD_TIMEOUT = 60000; // 60 seconds per part
const MAX_RETRIES = 3;

/**
 * Fetch with timeout to prevent infinite hangs
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = UPLOAD_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Upload timeout after ${timeout}ms - please try again`);
    }
    throw error;
  }
}

/**
 * Upload a single part with retry logic
 * Retries up to MAX_RETRIES times with exponential backoff
 */
async function uploadPartToR2WithRetry(
  partNumber: number,
  chunk: Blob,
  uploadUrl: string,
  headers: Record<string, string>,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  let lastError: Error | null = null;
  
  // Retry up to MAX_RETRIES times
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `⬆️ Part ${partNumber}: attempt ${attempt}/${MAX_RETRIES} ` +
        `(${(chunk.size / 1024 / 1024).toFixed(2)} MB)`
      );
      
      const response = await fetchWithTimeout(uploadUrl, {
        method: 'PUT',
        body: chunk,
        headers: {
          ...headers,
          'Content-Type': 'application/octet-stream',
          'Content-Length': chunk.size.toString()
        },
      }, UPLOAD_TIMEOUT);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        throw new Error(
          `Upload failed with status ${response.status}: ${errorText}`
        );
      }
      
      const etag = response.headers.get('ETag')?.replace(/"/g, '') || '';
      if (!etag) {
        throw new Error('No ETag in response - upload may have failed');
      }
      
      // Report progress
      if (onProgress) {
        onProgress(chunk.size, chunk.size);
      }
      
      console.log(`✅ Part ${partNumber} uploaded successfully`);
      return etag;
      
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Part ${partNumber} attempt ${attempt} failed:`, error.message);
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`⏳ Retrying part ${partNumber} in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All retries failed
  throw new Error(
    `Part ${partNumber} failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

interface UploadPart {
  partNumber: number;
  etag: string;
}

export async function uploadToR2(file: File, onProgress?: (progress: number) => void): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    console.log('Starting R2 upload:', file.name, 'Size:', file.size);
    
    // Step 1: Initiate upload
    const { data: initData, error: initError } = await supabase.functions.invoke('generate-r2-upload-url', { 
      body: { 
        fileName: file.name, 
        fileType: file.type 
      } 
    });
    
    if (initError) {
      console.error('Initiate error:', initError);
      throw new Error(initError.message);
    }
    
    if (!initData || !initData.uploadId || !initData.key) {
      console.error('Invalid init response:', initData);
      throw new Error('Failed to initiate upload - missing uploadId or key');
    }
    
    const { uploadId, key } = initData;
    console.log('Upload initiated - uploadId:', uploadId, 'key:', key);
    
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const uploadedParts: UploadPart[] = [];
    
    // Step 2: Upload parts in parallel batches
    const uploadPart = async (partIndex: number) => {
      const start = partIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const partNumber = partIndex + 1;
      
      console.log(`Uploading part ${partNumber}/${totalParts} (${chunk.size} bytes)`);
      
      // Get presigned URL for this part
      const requestBody = {
        key: key,
        uploadId: uploadId,
        partNumber: partNumber
      };
      
      const { data: urlData, error: urlError } = await supabase.functions.invoke('get-r2-part-url', { 
        body: requestBody
      });
      
      if (urlError) {
        console.error('Get URL error:', urlError);
        throw new Error(`Failed to get upload URL for part ${partNumber}: ${urlError.message}`);
      }
      
      if (!urlData || !urlData.presignedUrl) {
        console.error('Invalid URL response:', urlData);
        throw new Error(`No presigned URL returned for part ${partNumber}`);
      }
      
      console.log('Got presigned URL for part', partNumber);
      
      // Upload the chunk with retry logic
      const etag = await uploadPartToR2WithRetry(
        partNumber,
        chunk,
        urlData.presignedUrl,
        urlData.headers,
        onProgress
      );
      
      return { partNumber, etag };
    };
    
    // Process uploads in batches with concurrency limit
    for (let i = 0; i < totalParts; i += MAX_CONCURRENT_UPLOADS) {
      const batch = Array.from(
        { length: Math.min(MAX_CONCURRENT_UPLOADS, totalParts - i) },
        (_, j) => i + j
      );
      
      console.log(`Uploading batch: parts ${batch.map(b => b + 1).join(', ')}`);
      const batchResults = await Promise.all(batch.map(partIndex => uploadPart(partIndex)));
      uploadedParts.push(...batchResults);
      
      // Update progress
      const progress = ((i + batch.length) / totalParts) * 95;
      onProgress?.(Math.round(progress));
    }
    
    console.log('All parts uploaded, completing multipart upload...');
    
    // Step 3: Complete upload
    const { data: completeData, error: completeError } = await supabase.functions.invoke('complete-r2-upload', { 
      body: { 
        key: key,
        uploadId: uploadId,
        parts: uploadedParts, 
        fileName: file.name, 
        fileSize: file.size 
      } 
    });
    
    if (completeError) {
      console.error('Complete error:', completeError);
      throw new Error(completeError.message);
    }
    
    onProgress?.(100);
    console.log('Upload completed successfully:', completeData.url);
    
    return { success: true, url: completeData.url };
    
  } catch (error) {
    console.error('R2 upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
