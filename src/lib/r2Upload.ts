import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 10 * 1024 * 1024;

interface UploadPart {
  partNumber: number;
  etag: string;
}

export async function uploadToR2(file: File, onProgress?: (progress: number) => void): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    console.log('Starting R2 upload:', file.name, file.size);
    const { data: initData, error: initError } = await supabase.functions.invoke('generate-r2-upload-url', { body: { fileName: file.name, fileType: file.type } });
    if (initError) throw new Error(initError.message);
    const { uploadId, key } = initData;
    console.log('Upload initiated:', uploadId, key);
    const totalParts = Math.ceil(file.size / CHUNK_SIZE);
    const uploadedParts: UploadPart[] = [];
    for (let i = 0; i < totalParts; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const partNumber = i + 1;
      const { data: urlData, error: urlError } = await supabase.functions.invoke('get-r2-part-url', { body: { key, uploadId, partNumber } });
      if (urlError) throw new Error(urlError.message);
      const uploadResponse = await fetch(urlData.presignedUrl, { method: 'PUT', body: chunk, headers: urlData.headers });
      if (!uploadResponse.ok) throw new Error(`Failed part ${partNumber}: ${uploadResponse.status}`);
      const etag = uploadResponse.headers.get('ETag')?.replace(/"/g, '') || '';
      if (!etag) throw new Error(`No ETag for part ${partNumber}`);
      uploadedParts.push({ partNumber, etag });
      onProgress?.(Math.round(((i + 1) / totalParts) * 95));
    }
    const { data: completeData, error: completeError } = await supabase.functions.invoke('complete-r2-upload', { body: { key, uploadId, parts: uploadedParts, fileName: file.name, fileSize: file.size } });
    if (completeError) throw new Error(completeError.message);
    onProgress?.(100);
    return { success: true, url: completeData.url };
  } catch (error) {
    console.error('R2 error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
