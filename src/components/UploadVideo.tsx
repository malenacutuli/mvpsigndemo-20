import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Video, FileText, Languages, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VoiceCloningUploader } from '@/components/VoiceCloningUploader';
import { useAuth } from '@/hooks/useAuth';
import { extractVideoFrame } from '@/lib/videoFrameExtractor';
import { Upload as TusUpload } from 'tus-js-client';
import { uploadToR2 } from '@/lib/r2Upload';

interface UploadVideoProps {
  onUploadComplete?: (videoId: string) => void;
}

interface VideoData {
  id: string;
  title: string;
  description: string | null;
  language: string;
  content_type: string;
  status: string;
}

type UploadErrorType = 'AUTHENTICATION' | 'NETWORK' | 'SIZE_LIMIT' | 'SERVICE' | 'UNKNOWN';

interface UploadError {
  type: UploadErrorType;
  message: string;
  originalError: any;
  method: 'S3' | 'R2' | 'TUS';
}

const classifyError = (error: any, method: 'S3' | 'R2' | 'TUS'): UploadError => {
  const message = error?.message || String(error);
  const lowerMsg = message.toLowerCase();
  
  let type: UploadErrorType = 'UNKNOWN';
  
  if (lowerMsg.includes('unauthorized') || lowerMsg.includes('401') || lowerMsg.includes('403')) {
    type = 'AUTHENTICATION';
  } else if (lowerMsg.includes('network') || lowerMsg.includes('timeout') || lowerMsg.includes('fetch')) {
    type = 'NETWORK';
  } else if (lowerMsg.includes('413') || lowerMsg.includes('too large') || lowerMsg.includes('size limit')) {
    type = 'SIZE_LIMIT';
  } else if (lowerMsg.includes('500') || lowerMsg.includes('503') || lowerMsg.includes('service')) {
    type = 'SERVICE';
  }
  
  return { type, message, originalError: error, method };
};

const logUploadAttempt = (
  method: string,
  status: 'started' | 'success' | 'failed',
  fileName: string,
  fileSize: number,
  videoId: string,
  details?: any
) => {
  console.log(`[UPLOAD-${method.toUpperCase()}] ${status}:`, {
    timestamp: new Date().toISOString(),
    fileName,
    fileSize,
    fileSizeGB: (fileSize / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
    videoId,
    ...details
  });
};

export const UploadVideo: React.FC<UploadVideoProps> = ({ onUploadComplete }) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en'); // Default to English
  const [contentType, setContentType] = useState<string>('education');
  const [knownSpeakers, setKnownSpeakers] = useState<string[]>([]);
  const [newSpeaker, setNewSpeaker] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Selected file:', {
        name: file.name,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type
      });
      
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a video file (MP4, MOV, etc.)",
          variant: "destructive"
        });
      }
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      console.log('Dropped file:', {
        name: file.name,
        size: file.size,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        type: file.type
      });
      
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    }
  }, [title, toast]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const attemptR2Upload = async (
    file: File,
    videoId: string,
    onProgress: (pct: number) => void
  ): Promise<{ success: boolean; url?: string; storagePath?: string; error?: UploadError }> => {
    logUploadAttempt('R2', 'started', file.name, file.size, videoId);
    
    try {
      const result = await uploadToR2(file, (progress) => {
        onProgress(progress * 0.9);
      });
      
      if (!result.success) {
        const error = classifyError(result.error || 'R2 upload failed', 'R2');
        logUploadAttempt('R2', 'failed', file.name, file.size, videoId, { error });
        return { success: false, error };
      }
      
      logUploadAttempt('R2', 'success', file.name, file.size, videoId, { url: result.url });
      
      return {
        success: true,
        url: result.url!,
        storagePath: `r2:${result.url}`
      };
    } catch (error) {
      const uploadError = classifyError(error, 'R2');
      logUploadAttempt('R2', 'failed', file.name, file.size, videoId, { error: uploadError });
      return { success: false, error: uploadError };
    }
  };

  const attemptSupabaseTUSUpload = async (
    file: File,
    videoId: string,
    onProgress: (pct: number) => void
  ): Promise<{ success: boolean; path?: string; error?: UploadError }> => {
    logUploadAttempt('TUS', 'started', file.name, file.size, videoId);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${videoId}.${fileExt}`;
    const objectPath = `originals/${fileName}`;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        throw new Error('You must be signed in to upload.');
      }

      const supabaseUrl = 'https://faeyekynudyzeotbjfsj.supabase.co';
      const storageUrl = supabaseUrl.replace('.supabase.co', '.storage.supabase.co');
      const endpoint = `${storageUrl}/storage/v1/upload/resumable`;

      let retryCount = 0;
      const maxRetries = 3;

      await new Promise<void>((resolve, reject) => {
        const upload = new TusUpload(file, {
          endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          parallelUploads: 1,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'videos',
            objectName: objectPath,
            contentType: file.type,
            cacheControl: '3600',
          },
          headers: {
            authorization: `Bearer ${accessToken}`,
            'x-upsert': 'true',
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (err) => {
            if (retryCount < maxRetries && !err.message?.includes('401') && !err.message?.includes('403')) {
              retryCount++;
              setTimeout(() => upload.start(), 1000 * retryCount);
            } else {
              reject(err);
            }
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.min(90, Math.round((bytesUploaded / bytesTotal) * 90));
            onProgress(pct);
          },
          onSuccess: () => resolve(),
        });

        upload.findPreviousUploads().then((previous) => {
          if (previous.length) {
            upload.resumeFromPreviousUpload(previous[0]);
          }
          upload.start();
        }).catch(() => {
          upload.start();
        });
      });

      logUploadAttempt('TUS', 'success', file.name, file.size, videoId, { path: objectPath });
      return { success: true, path: objectPath };
      
    } catch (error) {
      const uploadError = classifyError(error, 'TUS');
      logUploadAttempt('TUS', 'failed', file.name, file.size, videoId, { error: uploadError });
      return { success: false, error: uploadError };
    }
  };

  const uploadVideo = async () => {
    if (!videoFile || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a video file and enter a title",
        variant: "destructive"
      });
      return;
    }

    // Storage validation removed - no file size restrictions

    // Use authenticated user ID or demo UUID if not authenticated
    const userId = user?.id || crypto.randomUUID();
    const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024 * 1024; // 5GB - use R2 for very large files
    const S3_DIRECT_THRESHOLD = 100 * 1024 * 1024; // 100MB - use S3 direct (was 1GB)
    const TUS_THRESHOLD = 6 * 1024 * 1024; // 6MB - use TUS for Supabase
    const isLargeFile = videoFile.size > LARGE_FILE_THRESHOLD;
    const useS3Direct = videoFile.size > S3_DIRECT_THRESHOLD && videoFile.size <= LARGE_FILE_THRESHOLD;

    let video: VideoData | null = null;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Create video record first with explicit typing and better error handling
      const insertData = {
        title: title.trim(),
        description: description.trim() || null,
        language,
        content_type: contentType,
        status: 'uploading' as const,
        user_id: userId,
        metadata: knownSpeakers.length > 0 ? { knownSpeakers } : null
      };
      
      console.log('Creating video record...', insertData);

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert(insertData)
        .select()
        .maybeSingle() as { data: VideoData | null, error: any };

      if (videoError || !videoData) {
        console.error('Database error:', videoError);
        throw videoError || new Error('Failed to create video record');
      }

      video = videoData;
      console.log('Video record created:', video);

      let storagePath = '';
      let publicUrl = '';

      if (useS3Direct) {
        logUploadAttempt('S3', 'started', videoFile.name, videoFile.size, video.id);
        
        toast({
          title: "Large file detected",
          description: "Using optimized S3 upload...",
        });

        try {
          // Ensure auth token for function call
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) {
            throw new Error('You must be signed in to upload via S3.');
          }
          // Step 1: Initiate multipart upload
          const { data: initData, error: initError } = await supabase.functions.invoke('s3-multipart-upload', {
            body: {
              action: 'initiate',
              fileName: videoFile.name,
              fileSize: videoFile.size,
            },
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
          });

          if (initError || !initData?.uploadId) {
            throw new Error('Failed to initiate S3 upload');
          }

          const { uploadId, key } = initData;
          console.log('S3 upload initiated:', { uploadId, key });

          // Step 2: Get presigned URLs for all parts
          const { data: urlsData, error: urlsError } = await supabase.functions.invoke('s3-multipart-upload', {
            body: {
              action: 'getPresignedUrls',
              uploadId,
              key,
              fileSize: videoFile.size,
            },
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
          });

          if (urlsError || !urlsData?.presignedUrls) {
            throw new Error('Failed to get presigned URLs');
          }

          const { presignedUrls } = urlsData;
          console.log(`Got ${presignedUrls.length} presigned URLs`);

          // Step 3: Upload parts with concurrency control
          const PART_SIZE = 10 * 1024 * 1024; // 10MB
          const MAX_CONCURRENT = 10;
          const uploadedParts: Array<{ PartNumber: number; ETag: string }> = [];
          
          let uploadedBytes = 0;
          const totalBytes = videoFile.size;

          const uploadPart = async (partInfo: { partNumber: number; url: string }) => {
            const start = (partInfo.partNumber - 1) * PART_SIZE;
            const end = Math.min(start + PART_SIZE, videoFile.size);
            const chunk = videoFile.slice(start, end);

            const response = await fetch(partInfo.url, {
              method: 'PUT',
              body: chunk,
              headers: {
                'Content-Type': 'application/octet-stream',
              },
            });

            if (!response.ok) {
              throw new Error(`Failed to upload part ${partInfo.partNumber}`);
            }

            const etag = response.headers.get('ETag');
            if (!etag) {
              throw new Error(`No ETag received for part ${partInfo.partNumber}`);
            }

            uploadedBytes += chunk.size;
            const progress = Math.round((uploadedBytes / totalBytes) * 90); // Reserve 10% for finalization
            setUploadProgress(progress);
            console.log(`Part ${partInfo.partNumber} uploaded (${progress}%)`);

            return {
              PartNumber: partInfo.partNumber,
              ETag: etag.replace(/"/g, ''), // Remove quotes
            };
          };

          // Upload parts with concurrency control
          for (let i = 0; i < presignedUrls.length; i += MAX_CONCURRENT) {
            const batch = presignedUrls.slice(i, i + MAX_CONCURRENT);
            const results = await Promise.all(batch.map(uploadPart));
            uploadedParts.push(...results);
          }

          // Sort parts by part number
          uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

          // Step 4: Complete multipart upload
          setUploadProgress(90);
          const { data: completeData, error: completeError } = await supabase.functions.invoke('s3-multipart-upload', {
            body: {
              action: 'complete',
              uploadId,
              key,
              parts: uploadedParts,
            },
            headers: {
              authorization: `Bearer ${accessToken}`,
            },
          });

          if (completeError || !completeData?.url) {
            throw new Error('Failed to complete S3 upload');
          }

          publicUrl = completeData.url;
          storagePath = `s3:${publicUrl}`;
          console.log('S3 direct upload complete:', publicUrl);
          
          // Update video record immediately
          setUploadProgress(95);
          const { error: updateError } = await supabase
            .from('videos')
            .update({
              storage_path: storagePath,
              status: 'uploaded' as const,
            })
            .eq('id', video.id);

          if (updateError) throw updateError;
          
          setUploadProgress(100);
          toast({
            title: "Upload successful",
            description: "Your video has been uploaded successfully"
          });
          
          // Extract thumbnail in background (non-blocking)
          extractVideoFrame(videoFile, {
            quality: 0.9,
            maxWidth: 1280,
            maxHeight: 720
          }).then(async (extractedFrame) => {
            const thumbnailFileName = `${video.id}-thumbnail.jpg`;
            const { error: thumbnailUploadError } = await supabase.storage
              .from('thumbnails')
              .upload(thumbnailFileName, extractedFrame.blob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (!thumbnailUploadError) {
              const { data: { publicUrl: thumbUrl } } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(thumbnailFileName);
              
              await supabase
                .from('videos')
                .update({ thumbnail_url: thumbUrl })
                .eq('id', video.id);
              
              console.log('✅ Thumbnail uploaded:', thumbUrl);
            }
          }).catch((err) => console.warn('⚠️ Thumbnail upload failed:', err));
          
          logUploadAttempt('S3', 'success', videoFile.name, videoFile.size, video.id, { storagePath });
          setUploadProgress(100);
          toast({
            title: "Upload successful",
            description: "Your video has been uploaded successfully"
          });
          
        } catch (s3Error) {
          const error = classifyError(s3Error, 'S3');
          logUploadAttempt('S3', 'failed', videoFile.name, videoFile.size, video.id, { error });
          
          toast({
            title: "S3 upload failed",
            description: "Trying alternative upload method...",
            variant: "default"
          });
          
          // Fallback 1: Try R2 upload
          console.log('[FALLBACK] Attempting R2 upload...');
          setUploadProgress(0);
          
          const r2Result = await attemptR2Upload(videoFile, video.id, setUploadProgress);
          
          if (r2Result.success) {
            publicUrl = r2Result.url!;
            storagePath = r2Result.storagePath!;
            
            toast({
              title: "Upload successful via R2",
              description: "Your video was uploaded using an alternative method",
            });
            
            // Extract thumbnail
            setUploadProgress(90);
            let thumbnailUrl: string | null = null;
            
            try {
              const extractedFrame = await extractVideoFrame(videoFile, {
                quality: 0.9,
                maxWidth: 1280,
                maxHeight: 720
              });

              const thumbnailFileName = `${video.id}-thumbnail.jpg`;
              const { error: thumbnailUploadError } = await supabase.storage
                .from('thumbnails')
                .upload(thumbnailFileName, extractedFrame.blob, {
                  contentType: 'image/jpeg',
                  upsert: true
                });

              if (!thumbnailUploadError) {
                const { data: { publicUrl: thumbUrl } } = supabase.storage
                  .from('thumbnails')
                  .getPublicUrl(thumbnailFileName);
                
                thumbnailUrl = thumbUrl;
              }
            } catch (frameError) {
              console.warn('⚠️ Frame extraction failed:', frameError);
            }
            
            // Update video record
            const { error: updateError } = await supabase
              .from('videos')
              .update({
                storage_path: storagePath,
                status: 'uploaded' as const,
                ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
              })
              .eq('id', video.id);

            if (updateError) throw updateError;
            
            setUploadProgress(100);
            
          } else {
            // Fallback 2: Try Supabase TUS upload
            console.log('[FALLBACK] R2 failed, attempting Supabase TUS...');
            console.error('[FALLBACK] R2 error:', r2Result.error);
            
            toast({
              title: "Trying final upload method",
              description: "Using Supabase Storage...",
            });
            
            setUploadProgress(0);
            
            const tusResult = await attemptSupabaseTUSUpload(videoFile, video.id, setUploadProgress);
            
            if (tusResult.success) {
              storagePath = tusResult.path!;
              
              toast({
                title: "Upload successful via Supabase",
                description: "Your video was uploaded successfully",
              });
              
              // Extract thumbnail
              setUploadProgress(90);
              let thumbnailUrl: string | null = null;
              
              try {
                const extractedFrame = await extractVideoFrame(videoFile, {
                  quality: 0.9,
                  maxWidth: 1280,
                  maxHeight: 720
                });

                const thumbnailFileName = `${video.id}-thumbnail.jpg`;
                const { error: thumbnailUploadError } = await supabase.storage
                  .from('thumbnails')
                  .upload(thumbnailFileName, extractedFrame.blob, {
                    contentType: 'image/jpeg',
                    upsert: true
                  });

                if (!thumbnailUploadError) {
                  const { data: { publicUrl: thumbUrl } } = supabase.storage
                    .from('thumbnails')
                    .getPublicUrl(thumbnailFileName);
                  
                  thumbnailUrl = thumbUrl;
                }
              } catch (frameError) {
                console.warn('⚠️ Frame extraction failed:', frameError);
              }
              
              // Update video record
              const { error: updateError } = await supabase
                .from('videos')
                .update({
                  storage_path: storagePath,
                  status: 'uploaded' as const,
                  ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
                })
                .eq('id', video.id);

              if (updateError) throw updateError;
              
              setUploadProgress(100);
              
            } else {
              // All methods failed
              console.error('[FALLBACK] All upload methods failed:', {
                s3: error,
                r2: r2Result.error,
                tus: tusResult.error
              });
              
              throw new Error(
                `Upload failed after trying multiple methods. ` +
                `S3: ${error.type}, R2: ${r2Result.error?.type}, TUS: ${tusResult.error?.type}. ` +
                `Please try again or contact support.`
              );
            }
          }
        }
      } else if (isLargeFile) {
        // Use R2 for large files (>5GB)
        console.log('Using R2 for large file upload');
        console.log('File details:', {
          name: videoFile.name,
          size: videoFile.size,
          sizeGB: (videoFile.size / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
          type: videoFile.type
        });
        
        toast({
          title: "Large file detected",
          description: "Using optimized upload for large files...",
        });

        try {
          const result = await uploadToR2(videoFile, (progress) => {
            console.log('Upload progress:', progress + '%');
            setUploadProgress(progress * 0.9); // Reserve 10% for thumbnail
          });
          
          if (!result.success) {
            console.error('R2 upload failed:', result.error);
            throw new Error(result.error || 'Upload failed');
          }
          
          publicUrl = result.url!;
          storagePath = `r2:${publicUrl}`;
          console.log('R2 upload complete:', publicUrl);
          
          // Extract thumbnail
          setUploadProgress(90);
          console.log('🎬 Extracting video frame for thumbnail...');
          let thumbnailUrl: string | null = null;
          
          try {
            const extractedFrame = await extractVideoFrame(videoFile, {
              quality: 0.9,
              maxWidth: 1280,
              maxHeight: 720
            });

            const thumbnailFileName = `${video.id}-thumbnail.jpg`;
            const { data: thumbnailUpload, error: thumbnailUploadError } = await supabase.storage
              .from('thumbnails')
              .upload(thumbnailFileName, extractedFrame.blob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (!thumbnailUploadError) {
              const { data: { publicUrl: thumbUrl } } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(thumbnailFileName);
              
              thumbnailUrl = thumbUrl;
              console.log('✅ Thumbnail uploaded:', thumbnailUrl);
            }
          } catch (frameError) {
            console.warn('⚠️ Frame extraction failed:', frameError);
          }
          
          // Update video record
          const { error: updateError } = await supabase
            .from('videos')
            .update({
              storage_path: storagePath,
              status: 'uploaded' as const,
              ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
            })
            .eq('id', video.id);

          if (updateError) throw updateError;
          
          setUploadProgress(100);
          toast({
            title: "Upload successful",
            description: "Your large video has been uploaded successfully"
          });
          
        } catch (error) {
          console.error('R2 upload failed:', error);
          throw new Error('Failed to upload large file. Please try again.');
        }
      } else {
        // Use Supabase Storage with TUS for smaller files (<5GB)
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${video.id}.${fileExt}`;
        
        console.log('Uploading file to Supabase Storage...');
        
        // For files larger than 6MB, use resumable upload
        let uploadData, uploadError;
        
        if (videoFile.size > 6 * 1024 * 1024) { // 6MB threshold
        console.log('Using resumable upload for large file...');
        
        const objectPath = `originals/${fileName}`;
        
        try {
          // Get authentication token
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) {
            throw new Error('You must be signed in to upload large files.');
          }

          // Construct dynamic TUS endpoint from Supabase URL
          const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://faeyekynudyzeotbjfsj.supabase.co';
          const storageUrl = supabaseUrl.replace('.supabase.co', '.storage.supabase.co');
          const endpoint = `${storageUrl}/storage/v1/upload/resumable`;
          
          console.log('TUS endpoint:', endpoint);

          let retryCount = 0;
          const maxRetries = 3;

          await new Promise<void>((resolve, reject) => {
            const upload = new TusUpload(videoFile, {
              endpoint,
              retryDelays: [0, 3000, 5000, 10000, 20000],
              parallelUploads: 1,
              removeFingerprintOnSuccess: true,
              metadata: {
                bucketName: 'videos',
                objectName: objectPath,
                contentType: videoFile.type,
                cacheControl: '3600',
              },
              headers: {
                authorization: `Bearer ${accessToken}`,
                'x-upsert': 'true',
              },
              chunkSize: 6 * 1024 * 1024, // 6MB chunks as required by Supabase TUS
              onError: (err) => {
                console.error('TUS upload error:', err);
                console.error('Error details:', {
                  message: err.message,
                  endpoint,
                  objectPath,
                  fileSize: videoFile.size,
                  fileName: videoFile.name,
                  retryCount
                });

                // Provide user-friendly error messages
                const errorMsg = err.message?.toLowerCase().includes('cors') 
                  ? 'Upload blocked by browser security. Please try again or contact support.'
                  : err.message?.includes('401') || err.message?.includes('403')
                  ? 'Authentication expired. Please refresh the page and try again.'
                  : `Upload failed: ${err.message || 'Network error'}`;

                // Retry for transient errors (but not auth errors)
                if (retryCount < maxRetries && !err.message?.includes('401') && !err.message?.includes('403')) {
                  retryCount++;
                  console.log(`Retrying TUS upload (attempt ${retryCount}/${maxRetries})...`);
                  setTimeout(() => {
                    upload.start();
                  }, 1000 * retryCount); // Exponential backoff
                } else {
                  reject(new Error(errorMsg));
                }
              },
              onProgress: (bytesUploaded, bytesTotal) => {
                const pct = Math.min(60, Math.round((bytesUploaded / bytesTotal) * 60)); // cap at 60% until post-processing
                setUploadProgress(pct);
              },
              onSuccess: () => {
                console.log('TUS upload completed successfully');
                resolve();
              },
            });

            upload.findPreviousUploads().then((previous) => {
              if (previous.length) {
                console.log('Resuming from previous upload');
                upload.resumeFromPreviousUpload(previous[0]);
              }
              upload.start();
            }).catch((err) => {
              console.error('Failed to check previous uploads:', err);
              // Continue with new upload even if resume check fails
              upload.start();
            });
          });
        } catch (tusError) {
          console.warn('TUS upload failed, falling back to standard upload:', tusError);
          
          // Fallback to standard Supabase upload
          const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(objectPath, videoFile, {
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }
          
          console.log('Standard upload completed successfully');
        }

        // Mimic Supabase upload response
        uploadData = { path: objectPath } as any;
        uploadError = null;
      } else {
        console.log('Using standard upload for small file...');
        
        // Use standard upload for small files
        const { data, error } = await supabase.storage
          .from('videos')
          .upload(`originals/${fileName}`, videoFile, {
            contentType: videoFile.type,
            upsert: false
          });
          
        uploadData = data;
        uploadError = error;
      }

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      // Extract video frame for thumbnail
      setUploadProgress(75);
      console.log('🎬 Extracting video frame for thumbnail...');
      let thumbnailUrl: string | null = null;
      
      try {
        const extractedFrame = await extractVideoFrame(videoFile, {
          quality: 0.9,
          maxWidth: 1280,
          maxHeight: 720
        });

        const thumbnailFileName = `${video.id}-thumbnail.jpg`;
        const { data: thumbnailUpload, error: thumbnailUploadError } = await supabase.storage
          .from('thumbnails')
          .upload(thumbnailFileName, extractedFrame.blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (thumbnailUploadError) {
          console.warn('⚠️ Thumbnail upload failed:', thumbnailUploadError);
        } else {
          const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(thumbnailFileName);
          
          thumbnailUrl = thumbUrl;
          console.log('✅ Thumbnail extracted and uploaded:', thumbnailUrl);
        }
      } catch (frameError) {
        console.warn('⚠️ Frame extraction failed:', frameError);
      }

      setUploadProgress(90);

      // Update video record with storage path and thumbnail URL
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          storage_path: uploadData.path,
          status: 'uploaded' as const,
          ...(thumbnailUrl && { thumbnail_url: thumbnailUrl })
        })
        .eq('id', video.id);

      if (updateError) throw updateError;

      setUploadProgress(100);

      toast({
        title: "Upload successful",
        description: thumbnailUrl ? 
          "Your video and thumbnail have been uploaded successfully" :
          "Your video has been uploaded successfully"
      });
      } // Close the else block for Supabase Storage

      // Reset form
      setVideoFile(null);
      setTitle('');
      setDescription('');
      setKnownSpeakers([]);
      setNewSpeaker('');
      setUploadProgress(0);

      if (onUploadComplete) {
        onUploadComplete(video.id);
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      // Clean up failed video record
      if (video?.id) {
        const { error: deleteError } = await supabase
          .from('videos')
          .delete()
          .eq('id', video.id);
        
        if (deleteError) {
          console.error('Failed to clean up video record:', deleteError);
        }
      }
      
      let desc = error instanceof Error ? (error.message || 'An error occurred during upload') : 'An error occurred during upload';
      const lower = desc.toLowerCase();
      if (lower.includes('413') || lower.includes('maximum size') || lower.includes('payload too large')) {
        desc = "Your Supabase project's Storage file size limit is below this file's size. Increase it in Storage > Settings (or compress the file).";
      }
      toast({
        title: "Upload failed",
        description: desc,
        variant: "destructive"
      });
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-light">
          <Video className="w-5 h-5" />
          {t('upload.cardTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('video-upload')?.click()}
        >
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          
          {videoFile ? (
            <div>
              <p className="text-sm font-medium">{videoFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium font-light">{t('upload.dropZone')}</p>
              <p className="text-xs text-muted-foreground mt-1 font-light">
                {t('upload.supportedFormats')}
              </p>
            </div>
          )}
        </div>

        {/* Video Metadata */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="font-light">{t('upload.title')} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('upload.titlePlaceholder')}
              disabled={uploading}
              className="font-light"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-light">{t('upload.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('upload.descriptionPlaceholder')}
              disabled={uploading}
              rows={3}
              className="font-light"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm text-blue-700 mb-2 font-light">{t('upload.transcriptOptions.title')}</h4>
            <p className="text-xs text-blue-600 mb-3 font-light">
              {t('upload.transcriptOptions.description')}
            </p>
            <div className="text-xs text-muted-foreground space-y-1 font-light">
              <p>• {t('upload.transcriptOptions.autoExtract')}</p>
              <p>• {t('upload.transcriptOptions.uploadTranscript')}</p>
              <p>• {t('upload.transcriptOptions.editIntonation')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language" className="font-light">{t('upload.language')}</Label>
              <Select value={language} onValueChange={setLanguage} disabled={uploading}>
                <SelectTrigger className="font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en" className="font-light">English</SelectItem>
                  <SelectItem value="es" className="font-light">Spanish</SelectItem>
                  <SelectItem value="fr" className="font-light">French</SelectItem>
                  <SelectItem value="de" className="font-light">German</SelectItem>
                  <SelectItem value="it" className="font-light">Italian</SelectItem>
                  <SelectItem value="pt" className="font-light">Portuguese</SelectItem>
                  <SelectItem value="nl" className="font-light">Dutch</SelectItem>
                  <SelectItem value="ru" className="font-light">Russian</SelectItem>
                  <SelectItem value="ja" className="font-light">Japanese</SelectItem>
                  <SelectItem value="ko" className="font-light">Korean</SelectItem>
                  <SelectItem value="zh" className="font-light">Chinese (Mandarin)</SelectItem>
                  <SelectItem value="ar" className="font-light">Arabic</SelectItem>
                  <SelectItem value="hi" className="font-light">Hindi</SelectItem>
                  <SelectItem value="tr" className="font-light">Turkish</SelectItem>
                  <SelectItem value="pl" className="font-light">Polish</SelectItem>
                  <SelectItem value="sv" className="font-light">Swedish</SelectItem>
                  <SelectItem value="no" className="font-light">Norwegian</SelectItem>
                  <SelectItem value="da" className="font-light">Danish</SelectItem>
                  <SelectItem value="fi" className="font-light">Finnish</SelectItem>
                  <SelectItem value="cs" className="font-light">Czech</SelectItem>
                  <SelectItem value="hu" className="font-light">Hungarian</SelectItem>
                  <SelectItem value="ro" className="font-light">Romanian</SelectItem>
                  <SelectItem value="uk" className="font-light">Ukrainian</SelectItem>
                  <SelectItem value="bg" className="font-light">Bulgarian</SelectItem>
                  <SelectItem value="hr" className="font-light">Croatian</SelectItem>
                  <SelectItem value="sk" className="font-light">Slovak</SelectItem>
                  <SelectItem value="sl" className="font-light">Slovenian</SelectItem>
                  <SelectItem value="et" className="font-light">Estonian</SelectItem>
                  <SelectItem value="lv" className="font-light">Latvian</SelectItem>
                  <SelectItem value="lt" className="font-light">Lithuanian</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1 font-light">
                {t('upload.languageHelp')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-type" className="font-light">{t('upload.contentType')}</Label>
              <Select value={contentType} onValueChange={setContentType} disabled={uploading}>
                <SelectTrigger className="font-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advertising" className="font-light">Advertising</SelectItem>
                  <SelectItem value="film" className="font-light">Film</SelectItem>
                  <SelectItem value="branded-content" className="font-light">Branded Content</SelectItem>
                  <SelectItem value="webinar" className="font-light">Webinar</SelectItem>
                  <SelectItem value="podcast" className="font-light">Podcast</SelectItem>
                  <SelectItem value="social-media" className="font-light">Social Media</SelectItem>
                  <SelectItem value="tutorial" className="font-light">Tutorial</SelectItem>
                  <SelectItem value="stand-up" className="font-light">Stand Up</SelectItem>
                  <SelectItem value="product-demo" className="font-light">Product Demo</SelectItem>
                  <SelectItem value="children" className="font-light">Children</SelectItem>
                  <SelectItem value="music-video" className="font-light">Music Video</SelectItem>
                  <SelectItem value="tv-show" className="font-light">TV Show</SelectItem>
                  <SelectItem value="education" className="font-light">Educational</SelectItem>
                  <SelectItem value="recipe" className="font-light">Cooking/Recipe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Speaker & Emotion Detection */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base font-light">{t('speakerEmotionDetection.title')}</CardTitle>
            <CardDescription className="font-light">
              {t('speakerEmotionDetection.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-light">{t('speakerEmotionDetection.knownSpeakers')}</Label>
              <p className="text-sm text-muted-foreground font-light">
                {t('speakerEmotionDetection.knownSpeakersHelp')}
              </p>
              
              <div className="flex gap-2">
                <Input
                  placeholder={t('speakerEmotionDetection.speakerPlaceholder')}
                  value={newSpeaker}
                  onChange={(e) => setNewSpeaker(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newSpeaker.trim() && !knownSpeakers.includes(newSpeaker.trim())) {
                        setKnownSpeakers([...knownSpeakers, newSpeaker.trim()]);
                        setNewSpeaker('');
                      }
                    }
                  }}
                  disabled={uploading}
                  className="font-light"
                />
                <Button 
                  type="button" 
                  onClick={() => {
                    if (newSpeaker.trim() && !knownSpeakers.includes(newSpeaker.trim())) {
                      setKnownSpeakers([...knownSpeakers, newSpeaker.trim()]);
                      setNewSpeaker('');
                    }
                  }}
                  variant="secondary"
                  disabled={uploading}
                  className="font-light"
                >
                  {t('speakerEmotionDetection.add')}
                </Button>
              </div>
              
              {knownSpeakers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {knownSpeakers.map((speaker, idx) => (
                    <Badge key={idx} variant="secondary" className="font-light">
                      {speaker}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => setKnownSpeakers(knownSpeakers.filter((_, i) => i !== idx))}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium font-light">{t('speakerEmotionDetection.automaticFeatures')}</span>
              </div>
              <ul className="text-xs text-muted-foreground pl-4 space-y-0.5 font-light">
                <li>{t('speakerEmotionDetection.feature1')}</li>
                <li>{t('speakerEmotionDetection.feature2')}</li>
                <li>{t('speakerEmotionDetection.feature3')}</li>
                <li>{t('speakerEmotionDetection.feature4')}</li>
                <li>{t('speakerEmotionDetection.feature5')}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-light">
              <span>{t('upload.uploading')}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={uploadVideo}
          disabled={!videoFile || !title.trim() || uploading}
          className="w-full font-light"
        >
          {uploading ? t('upload.uploading') : t('upload.uploadButton')}
        </Button>

        {/* Info Text */}
        <div className="text-xs text-muted-foreground space-y-1 font-light">
          <p>• {t('upload.uploadInfo.line1')}</p>
          <p>• {t('upload.uploadInfo.line2')}</p>
          <p>• {t('upload.uploadInfo.line3')}</p>
        </div>
      </CardContent>
    </Card>
  );
};