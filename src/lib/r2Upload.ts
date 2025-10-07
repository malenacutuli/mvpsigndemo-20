import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks

export async function uploadLargeVideoToR2(
  file: File,
  onProgress: (progress: number) => void
): Promise<string> {
  try {
    // Initialize multipart upload
    const { data: initData, error: initError } = await supabase.functions.invoke(
      'generate-r2-upload-url',
      {
        body: {
          fileName: file.name,
          fileType: file.type,
        },
      }
    );

    if (initError) throw initError;
    if (!initData) throw new Error('No upload URL received');

    const { uploadId, key, bucket, endpoint } = initData;

    // Split file into chunks and upload
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadedParts = [];

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      // Upload chunk using fetch to R2
      const partNumber = i + 1;
      const uploadUrl = `${endpoint}/${bucket}/${key}?partNumber=${partNumber}&uploadId=${uploadId}`;

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to upload chunk ${partNumber}`);
      }

      const etag = response.headers.get('ETag');
      uploadedParts.push({ PartNumber: partNumber, ETag: etag });

      // Update progress
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      onProgress(progress);
    }

    // Complete multipart upload
    const { data: completeData, error: completeError } = await supabase.functions.invoke(
      'complete-r2-upload',
      {
        body: {
          uploadId,
          key,
          parts: uploadedParts,
        },
      }
    );

    if (completeError) throw completeError;

    // Return the R2 public URL
    return `${endpoint}/${bucket}/${key}`;
  } catch (error) {
    console.error('R2 upload error:', error);
    throw error;
  }
}
