import { supabase } from '@/integrations/supabase/client';

interface UploadPart {
  partNumber: number;
  startByte: number;
  endByte: number;
  size: number;
  etag?: string;
  attempts: number;
}

export class R2MultipartUploader {
  private PART_SIZE = 100 * 1024 * 1024; // 100MB parts per request
  private MAX_CONCURRENT = 10; // Increased concurrency for throughput
  private MAX_RETRIES = 5;
  private RETRY_DELAY = 2000; // Start with 2 seconds
  private PART_TIMEOUT = 180000; // 180 seconds (3 minutes) per part
  
  async uploadLargeFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; key: string }> {
    console.log(`Starting upload for ${file.name}, size: ${(file.size / 1024 / 1024 / 1024).toFixed(2)}GB`);

    if (file.size > 5 * 1024 * 1024 * 1024) {
      return this.uploadVeryLargeFile(file, onProgress);
    }

    // Initiate multipart upload via Edge Function (R2)
    const { uploadId, key } = await this.initiateUploadViaGenerate(file.name, file.type);

    // Calculate parts
    const parts = this.calculateParts(file);
    const completedParts: any[] = [];
    let uploadedBytes = 0;

    try {
      // Upload parts with controlled concurrency
      for (let i = 0; i < parts.length; i += this.MAX_CONCURRENT) {
        const batch = parts.slice(i, i + this.MAX_CONCURRENT);

        const results = await Promise.all(
          batch.map(part => this.uploadPartWithRetry(file, key, uploadId, part))
        );

        completedParts.push(...results);
        uploadedBytes += batch.reduce((sum, part) => sum + part.size, 0);

        if (onProgress) {
          onProgress(Math.round((uploadedBytes / file.size) * 100));
        }

        // Small delay between batches
        await this.delay(200);
      }

      // Complete upload
      const result = await this.completeUpload(key, uploadId, completedParts);
      console.log('Upload completed:', result);
      return result;

    } catch (error) {
      console.error('Upload failed, aborting:', error);
      await this.abortUpload(key, uploadId);
      throw error;
    }
  }
  
  private async uploadVeryLargeFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ url: string; key: string }> {
    // For 5GB+ files, use chunked approach with session recovery
    const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks
    const sessionKey = `upload_session_${file.name}_${file.size}`;

    // Check for existing session
    let session = this.loadSession(sessionKey);
    if (!session) {
      const { uploadId, key } = await this.initiateUploadViaGenerate(file.name, file.type);
      session = {
        key,
        uploadId,
        completedParts: [],
        uploadedBytes: 0
      };
      this.saveSession(sessionKey, session);
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = session.completedParts.length; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const part = await this.uploadPartWithRetry(
        chunk,
        session.key,
        session.uploadId,
        { partNumber: i + 1, startByte: start, endByte: end, size: end - start, attempts: 0 }
      );

      session.completedParts.push(part);
      session.uploadedBytes = end;
      this.saveSession(sessionKey, session);

      if (onProgress) {
        onProgress(Math.round((session.uploadedBytes / file.size) * 100));
      }
    }

    // Complete and cleanup
    const result = await this.completeUpload(session.key, session.uploadId, session.completedParts);
    this.clearSession(sessionKey);
    return result;
  }
  
  private async uploadPartWithRetry(
    file: File | Blob,
    key: string,
    uploadId: string,
    part: UploadPart
  ): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        // Get fresh signed URL and headers for each attempt
        const { url, headers } = await this.getSignedUploadUrl(key, uploadId, part.partNumber);

        // Extract part data
        const partData = file instanceof File
          ? file.slice(part.startByte, part.endByte)
          : file;

        // Upload with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.PART_TIMEOUT);

        const response = await fetch(url, {
          method: 'PUT',
          body: partData,
          signal: controller.signal,
          headers: {
            ...(headers || {}),
            'Content-Length': part.size.toString(),
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const etag = response.headers.get('etag') || `"part-${part.partNumber}"`;

        console.log(`Part ${part.partNumber} uploaded successfully`);
        return {
          PartNumber: part.partNumber,
          ETag: etag
        };

      } catch (error: any) {
        lastError = error;
        console.error('Part upload failed:', {
          partNumber: part.partNumber,
          attempt: attempt + 1,
          size: part.size,
          range: `${part.startByte}-${part.endByte}`,
          message: error?.message || String(error)
        });

        // Exponential backoff
        const delay = this.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Retrying part ${part.partNumber} in ${delay}ms...`);
        await this.delay(delay);

        // On timeout or network error, try with smaller part
        if (attempt === 2 && part.size > 5 * 1024 * 1024) {
          console.log('Reducing part size for retry...');
          part.size = Math.floor(part.size / 2);
        }
      }
    }

    throw new Error(`Failed to upload part ${part.partNumber} after ${this.MAX_RETRIES} attempts: ${lastError?.message}`);
  }
  
  private calculateParts(file: File): UploadPart[] {
    const parts: UploadPart[] = [];
    const numParts = Math.ceil(file.size / this.PART_SIZE);
    
    for (let i = 0; i < numParts; i++) {
      const startByte = i * this.PART_SIZE;
      const endByte = Math.min(startByte + this.PART_SIZE, file.size);
      
      parts.push({
        partNumber: i + 1,
        startByte,
        endByte,
        size: endByte - startByte,
        attempts: 0
      });
    }
    
    return parts;
  }
  
  private async initiateUploadViaGenerate(fileName: string, fileType: string): Promise<{ uploadId: string; key: string }> {
    const { data, error } = await supabase.functions.invoke('generate-r2-upload-url', {
      body: { fileName, fileType }
    });

    if (error) throw error;
    return { uploadId: data.uploadId, key: data.key };
  }
  
  private async getSignedUploadUrl(key: string, uploadId: string, partNumber: number): Promise<{ url: string; headers?: Record<string, string> }> {
    const { data, error } = await supabase.functions.invoke('get-r2-part-url', {
      body: { key, uploadId, partNumber }
    });

    if (error) throw error;
    return { url: data.url, headers: data.headers };
  }
  
  private async completeUpload(key: string, uploadId: string, parts: any[]): Promise<{ url: string; key: string }> {
    const { data, error } = await supabase.functions.invoke('complete-r2-upload', {
      body: { key, uploadId, parts: parts.map((p: any) => ({ partNumber: p.PartNumber, etag: p.ETag })) }
    });

    if (error) throw error;
    return { url: data.url, key: data.key };
  }
  
  private async abortUpload(_key: string, _uploadId: string): Promise<void> {
    // Optional: implement an abort edge function. For now, just log.
    console.warn('Abort requested for upload. No abort function implemented.');
  }
  
  private loadSession(key: string): any {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
  
  private saveSession(key: string, session: any): void {
    localStorage.setItem(key, JSON.stringify(session));
  }
  
  private clearSession(key: string): void {
    localStorage.removeItem(key);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
