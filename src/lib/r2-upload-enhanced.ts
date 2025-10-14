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
  private PART_SIZE = 10 * 1024 * 1024; // 10MB parts for better reliability
  private MAX_CONCURRENT = 2; // Reduced for stability
  private MAX_RETRIES = 5;
  private RETRY_DELAY = 2000; // Start with 2 seconds
  private PART_TIMEOUT = 300000; // 5 minutes per part for large files
  
  async uploadLargeFile(
    file: File,
    key: string,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    console.log(`Starting upload for ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    
    // ALWAYS use session recovery for resumability
    const sessionKey = `upload_session_${key}`;
    let session = this.loadSession(sessionKey);
    
    try {
      // Check for existing session
      if (!session || !session.uploadId) {
        console.log('No existing session, initiating new upload...');
        const uploadId = await this.initiateUpload(key, file.type);
        session = {
          uploadId,
          key,
          fileSize: file.size,
          completedParts: [],
          uploadedBytes: 0,
          startTime: Date.now()
        };
        this.saveSession(sessionKey, session);
      } else {
        console.log(`Resuming upload from ${session.completedParts.length} completed parts`);
      }
      
      // Calculate all parts
      const allParts = this.calculateParts(file);
      const remainingParts = allParts.filter(part => 
        !session.completedParts.some((cp: any) => cp.PartNumber === part.partNumber)
      );
      
      console.log(`Total parts: ${allParts.length}, Remaining: ${remainingParts.length}`);
      
      // Upload remaining parts with controlled concurrency
      for (let i = 0; i < remainingParts.length; i += this.MAX_CONCURRENT) {
        const batch = remainingParts.slice(i, i + this.MAX_CONCURRENT);
        
        const results = await Promise.all(
          batch.map(part => this.uploadPartWithRetry(file, key, session.uploadId, part))
        );
        
        session.completedParts.push(...results);
        session.uploadedBytes += batch.reduce((sum, part) => sum + part.size, 0);
        this.saveSession(sessionKey, session);
        
        if (onProgress) {
          const progress = Math.round((session.uploadedBytes / file.size) * 100);
          onProgress(progress);
        }
        
        // Small delay between batches
        await this.delay(300);
      }
      
      // Complete upload
      const location = await this.completeUpload(key, session.uploadId, session.completedParts);
      console.log('Upload completed:', location);
      
      // Clear session on success
      this.clearSession(sessionKey);
      return location;
      
    } catch (error) {
      console.error('Upload failed:', error);
      // Keep session for retry - don't clear it
      console.log('Session preserved for retry. Use same key to resume.');
      throw error;
    }
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
        // Get fresh signed URL for each attempt
        const uploadUrl = await this.getSignedUploadUrl(key, uploadId, part.partNumber);
        
        // Extract part data
        const partData = file instanceof File 
          ? file.slice(part.startByte, part.endByte)
          : file;
        
        // Upload with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.PART_TIMEOUT);
        
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: partData,
          signal: controller.signal,
          headers: {
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
        console.error(`Part ${part.partNumber} attempt ${attempt + 1} failed:`, error);
        
        // Exponential backoff
        const delay = this.RETRY_DELAY * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
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
  
  private async initiateUpload(key: string, contentType: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('r2-multipart-init', {
      body: { key, contentType }
    });
    
    if (error) throw error;
    return data.uploadId;
  }
  
  private async getSignedUploadUrl(key: string, uploadId: string, partNumber: number): Promise<string> {
    const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
      body: { key, uploadId, partNumber }
    });
    
    if (error) throw error;
    return data.url;
  }
  
  private async completeUpload(key: string, uploadId: string, parts: any[]): Promise<string> {
    const { data, error } = await supabase.functions.invoke('r2-multipart-complete', {
      body: { key, uploadId, parts }
    });
    
    if (error) throw error;
    return data.location;
  }
  
  private async abortUpload(key: string, uploadId: string): Promise<void> {
    await supabase.functions.invoke('r2-multipart-abort', {
      body: { key, uploadId }
    }).catch(console.error);
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
