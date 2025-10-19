import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks for better performance
const MAX_CONCURRENT_UPLOADS = 3; // Upload 3 parts simultaneously

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
      
      // Upload the chunk
      const uploadResponse = await fetch(urlData.presignedUrl, { 
        method: 'PUT', 
        body: chunk, 
        headers: urlData.headers 
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`Upload part ${partNumber} failed:`, uploadResponse.status, errorText);
        throw new Error(`Failed to upload part ${partNumber}: ${uploadResponse.status}`);
      }
      
      const etag = uploadResponse.headers.get('ETag')?.replace(/"/g, '') || '';
      if (!etag) {
        console.error(`No ETag returned for part ${partNumber}`);
        throw new Error(`No ETag for part ${partNumber}`);
      }
      
      console.log(`Part ${partNumber} uploaded successfully, ETag:`, etag);
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
