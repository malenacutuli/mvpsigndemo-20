import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
const MAX_CONCURRENT_UPLOADS = 2; // Reduced from 3 for stability
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds per part

interface UploadPart {
  partNumber: number;
  etag: string;
}

interface PartUploadResult {
  partNumber: number;
  etag: string;
  retries: number;
}

/**
 * Enhanced R2 upload with retry logic, timeouts, and better error handling
 */
export async function uploadToR2Enhanced(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    console.log('Starting enhanced R2 upload:', file.name, 'Size:', file.size);
    
    // Step 1: Initiate multipart upload
    const { uploadId, key } = await initiateUpload(file);
    console.log('Upload initiated - uploadId:', uploadId, 'key:', key);
    
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const uploadedParts: UploadPart[] = [];
    
    // Step 2: Upload parts in parallel batches with retry logic
    for (let i = 0; i < totalParts; i += MAX_CONCURRENT_UPLOADS) {
      const batch = Array.from(
        { length: Math.min(MAX_CONCURRENT_UPLOADS, totalParts - i) },
        (_, j) => i + j
      );
      
      console.log(`Uploading batch: parts ${batch.map(b => b + 1).join(', ')}`);
      
      const batchResults = await Promise.all(
        batch.map(partIndex => uploadPartWithRetry(file, key, uploadId, partIndex))
      );
      
      uploadedParts.push(...batchResults.map(r => ({ 
        partNumber: r.partNumber, 
        etag: r.etag 
      })));
      
      // Update progress (reserve last 5% for completion)
      const progress = ((i + batch.length) / totalParts) * 95;
      onProgress?.(Math.round(progress));
    }
    
    console.log('All parts uploaded, completing multipart upload...');
    
    // Step 3: Complete multipart upload
    const url = await completeUpload(key, uploadId, uploadedParts, file);
    
    onProgress?.(100);
    console.log('Upload completed successfully:', url);
    
    return { success: true, url };
    
  } catch (error) {
    console.error('Enhanced R2 upload error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Initiate multipart upload
 */
async function initiateUpload(file: File): Promise<{ uploadId: string; key: string }> {
  const { data, error } = await supabase.functions.invoke('generate-r2-upload-url', { 
    body: { 
      fileName: file.name, 
      fileType: file.type 
    } 
  });
  
  if (error) {
    throw new Error(`Failed to initiate upload: ${error.message}`);
  }
  
  if (!data?.uploadId || !data?.key) {
    throw new Error('Invalid response from upload initiation');
  }
  
  return { uploadId: data.uploadId, key: data.key };
}

/**
 * Upload a single part with retry logic and timeout
 */
async function uploadPartWithRetry(
  file: File,
  key: string,
  uploadId: string,
  partIndex: number
): Promise<PartUploadResult> {
  const partNumber = partIndex + 1;
  const start = partIndex * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  const chunk = file.slice(start, end);
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Uploading part ${partNumber}, attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      
      // Get fresh presigned URL for each attempt
      const presignedUrl = await getPresignedUrl(key, uploadId, partNumber);
      
      // Upload with timeout
      const etag = await uploadChunkWithTimeout(presignedUrl, chunk, partNumber);
      
      console.log(`Part ${partNumber} uploaded successfully, ETag:`, etag);
      return { partNumber, etag, retries: attempt };
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Part ${partNumber} failed, attempt ${attempt + 1}:`, lastError.message);
      
      if (attempt < MAX_RETRIES) {
        // Exponential backoff with jitter
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Retrying part ${partNumber} after ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw new Error(`Part ${partNumber} failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
}

/**
 * Get presigned URL for a part
 */
async function getPresignedUrl(key: string, uploadId: string, partNumber: number): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-r2-part-url', { 
    body: { key, uploadId, partNumber }
  });
  
  if (error) {
    throw new Error(`Failed to get presigned URL for part ${partNumber}: ${error.message}`);
  }
  
  if (!data?.presignedUrl) {
    throw new Error(`No presigned URL returned for part ${partNumber}`);
  }
  
  return data.presignedUrl;
}

/**
 * Upload chunk with timeout
 */
async function uploadChunkWithTimeout(
  presignedUrl: string,
  chunk: Blob,
  partNumber: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: chunk,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const etag = response.headers.get('ETag')?.replace(/"/g, '');
    if (!etag) {
      throw new Error('No ETag in response');
    }
    
    return etag;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Upload timeout after ${REQUEST_TIMEOUT}ms`);
    }
    
    throw error;
  }
}

/**
 * Complete multipart upload
 */
async function completeUpload(
  key: string,
  uploadId: string,
  parts: UploadPart[],
  file: File
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('complete-r2-upload', { 
    body: { 
      key,
      uploadId,
      parts, 
      fileName: file.name, 
      fileSize: file.size 
    } 
  });
  
  if (error) {
    throw new Error(`Failed to complete upload: ${error.message}`);
  }
  
  if (!data?.url) {
    throw new Error('No URL returned from completion');
  }
  
  return data.url;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
