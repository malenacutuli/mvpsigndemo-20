import { supabase } from '@/integrations/supabase/client';
import { VideoExportProcessor } from './videoExportProcessor';
import { runBrowserExport } from './browserExportProcessor';
import { ExportOptions, ExportAssets, VideoExport, ProgressCallback } from '@/types/export';
import { v4 as uuidv4 } from 'uuid';
import { R2MultipartUploader } from '@/lib/r2-upload-enhanced';

export class ExportOrchestrator {
  private processor: VideoExportProcessor;

  constructor(progressCallback?: ProgressCallback) {
    this.processor = new VideoExportProcessor(progressCallback);
  }

  async finalizeAndExport(
    videoId: string,
    userId: string,
    options: ExportOptions,
    progressCallback?: ProgressCallback
  ): Promise<{ exportId: string; downloadUrl?: string }> {
    let exportId: string | null = null;

    try {
      // 1. Generate unique export ID
      exportId = uuidv4();
      
      // 2. Gather all required assets from database
      console.log('📦 Gathering assets for video:', videoId, 'options:', options);
      progressCallback?.({ stage: 'preparing', progress: 0, message: 'Gathering video assets...' });
      const assets = await this.gatherAssets(videoId, options);
      console.log('✅ Assets gathered:', { 
        videoFound: !!assets.video, 
        transcriptSegments: assets.transcriptSegments.length,
        audioDescriptions: assets.audioDescriptions.length,
        signLanguageClips: assets.signLanguageClips.length 
      });

      // 3. Validate assets
      this.validateAssets(assets, options);

      // 4. Create export record
      let storagePath = `exports/${userId}/${videoId}/${exportId}.mp4`;
      
      const { error: insertError } = await supabase
        .from('video_exports')
        .insert({
          id: exportId,
          video_id: videoId,
          user_id: userId,
          export_options: options as any,
          status: 'processing',
          storage_path: storagePath,
        });

      if (insertError) {
        throw new Error(`Failed to create export record: ${insertError.message}`);
      }

      progressCallback?.({ stage: 'preparing', progress: 20, message: 'Starting video processing...' });

      // 5. Get main video URL
      const mainVideoUrl = await this.getVideoUrl(assets.video.id, assets.video.storage_path);

      // 6. Process video with optimized browser export
      console.log('🎬 Starting sequential video processing with options:', options);
      const { blob: resultBlob, meta } = await runBrowserExport(
        mainVideoUrl,
        assets,
        options,
        progressCallback
      );
      console.log('✅ Video processing completed, blob size:', (resultBlob.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Decide final container/extension based on blob MIME
      const isMp4 = (resultBlob.type || '').includes('mp4');
      const decidedExt = isMp4 ? 'mp4' : 'webm';
      if (!storagePath.endsWith(`.${decidedExt}`)) {
        const newPath = `exports/${userId}/${videoId}/${exportId}.${decidedExt}`;
        const { error: pathUpdateError } = await supabase
          .from('video_exports')
          .update({ storage_path: newPath })
          .eq('id', exportId);
        if (pathUpdateError) {
          console.warn('Failed to update storage_path to match container:', pathUpdateError);
        } else {
          storagePath = newPath;
        }
      }
      
      // Log export metadata
      if (meta.warning) {
        console.warn('Export warning:', meta.warning);
      }

      progressCallback?.({ stage: 'uploading', progress: 85, message: 'Uploading processed video...' });

      // Prepare local fallback URL for immediate download
      const localDownloadUrl = URL.createObjectURL(resultBlob);
      let uploadedOk = true;
      let uploadErrMsg: string | null = null;
      let uploadedUrl: string | null = null;

      // 7. Upload to R2 using multipart uploader for large files
      try {
        const uploader = new R2MultipartUploader();
        
        // Convert Blob to File if needed
        const fileToUpload = resultBlob instanceof File 
          ? resultBlob 
          : new File([resultBlob], `${exportId}.${decidedExt}`, { type: resultBlob.type || (isMp4 ? 'video/mp4' : 'video/webm') });
        
        console.log('🚀 Starting R2 multipart upload for export:', exportId);
        
        uploadedUrl = await uploader.uploadLargeFile(
          fileToUpload,
          storagePath,
          (progress) => {
            // Map upload progress to 85-95% range
            const mappedProgress = 85 + Math.round(progress * 0.1);
            progressCallback?.({ 
              stage: 'uploading', 
              progress: mappedProgress, 
              message: `Uploading to cloud storage... ${progress}%` 
            });
          }
        );
        
        console.log('✅ R2 upload completed:', uploadedUrl);
        
      } catch (uploadError) {
        uploadedOk = false;
        uploadErrMsg = uploadError instanceof Error ? uploadError.message : 'Upload failed';
        console.error('⚠️ R2 upload failed, will fallback to local download URL:', uploadErrMsg);
      }

      progressCallback?.({ stage: 'finalizing', progress: 95, message: 'Finalizing export...' });

      // 8. Update export record with completion/failed-upload
      const { error: updateError } = await supabase
        .from('video_exports')
        .update({
          status: uploadedOk ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          file_size_bytes: resultBlob.size,
          duration_seconds: assets.video.duration_seconds,
          error_message: uploadedOk ? null : `Upload failed: ${uploadErrMsg}`
        })
        .eq('id', exportId);

      if (updateError) {
        console.warn('Failed to update export record:', updateError);
      }

      progressCallback?.({ stage: 'finalizing', progress: 100, message: uploadedOk ? 'Export completed successfully!' : 'Export ready locally (cloud upload failed)' });

      // 9. Use uploaded URL or fallback to local
      const downloadUrl = uploadedOk && uploadedUrl ? uploadedUrl : localDownloadUrl;

      return { exportId, downloadUrl };

    } catch (error) {
      console.error('Export failed:', error);
      
      // Update export record with error if we have the ID
      if (exportId) {
        await supabase
          .from('video_exports')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', exportId);
      }

      throw error;
    } finally {
      this.processor.cleanup();
    }
  }

  private async gatherAssets(videoId: string, options: ExportOptions): Promise<ExportAssets> {
    // Get video metadata
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, storage_path, duration_seconds, title, language')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      throw new Error('Video not found');
    }

    // Get transcript segments if captions are requested
    let transcriptSegments: ExportAssets['transcriptSegments'] = [];
    if (options.captions) {
      const { data: segments, error: segmentsError } = await supabase
        .from('transcript_segments')
        .select('id, start_time, end_time, text, speaker, speaker_color, emphasis, words')
        .eq('video_id', videoId)
        .eq('language', options.language || video.language)
        .order('start_time');

      if (segmentsError) {
        console.warn('Failed to load transcript segments:', segmentsError);
      } else {
        transcriptSegments = segments || [];
      }
    }

    // Get audio descriptions if requested
    let audioDescriptions: ExportAssets['audioDescriptions'] = [];
    if (options.audioDescription) {
      const { data: ads, error: adsError } = await supabase
        .from('audio_descriptions')
        .select('start_time, end_time, description')
        .eq('video_id', videoId)
        .order('start_time');

      if (adsError) {
        console.warn('Failed to load audio descriptions:', adsError);
      } else {
        const rawAds = ads || [];
        // Generate TTS audio for each description via Edge Function
        try {
          audioDescriptions = await Promise.all(
            rawAds.map(async (ad) => {
              try {
                const { data, error } = await supabase.functions.invoke('tts', {
                  body: { text: ad.description, language: video.language || 'en' }
                });
                if (error) throw error;
                const blob = data instanceof ArrayBuffer
                  ? new Blob([data], { type: 'audio/mpeg' })
                  : new Blob([data as any], { type: 'audio/mpeg' });
                const url = URL.createObjectURL(blob);
                return {
                  start_time: ad.start_time,
                  end_time: ad.end_time,
                  description: ad.description,
                  audio_url: url
                };
              } catch (ttsErr) {
                console.warn('TTS generation failed for AD segment:', ttsErr);
                return {
                  start_time: ad.start_time,
                  end_time: ad.end_time,
                  description: ad.description,
                  audio_url: undefined
                };
              }
            })
          );
        } catch (e) {
          console.warn('Bulk TTS generation failed, proceeding without audio URLs');
          audioDescriptions = rawAds.map(ad => ({
            start_time: ad.start_time,
            end_time: ad.end_time,
            description: ad.description,
            audio_url: undefined
          }));
        }
      }
    }

    // Get sign language clips if requested
    let signLanguageClips: ExportAssets['signLanguageClips'] = [];
    if (options.signLanguage) {
      const { data: clips, error: clipsError } = await supabase
        .from('sign_language_clips')
        .select('id, start_time_ms, end_time_ms, clip_url')
        .eq('video_id', videoId)
        .order('start_time_ms');

      if (clipsError) {
        console.warn('Failed to load sign language clips:', clipsError);
      } else {
        signLanguageClips = clips || [];
      }
    }

    return {
      video,
      transcriptSegments,
      audioDescriptions,
      signLanguageClips
    };
  }

  private validateAssets(assets: ExportAssets, options: ExportOptions) {
    if (options.captions && assets.transcriptSegments.length === 0) {
      throw new Error('No transcript segments available for captions');
    }

    if (options.audioDescription) {
      const adWithAudio = (assets.audioDescriptions || []).filter(ad => !!ad.audio_url);
      if ((assets.audioDescriptions || []).length === 0) {
        throw new Error('No audio descriptions available');
      }
      if (adWithAudio.length === 0) {
        throw new Error('Audio descriptions selected but no audio files found. Please generate TTS for descriptions first.');
      }
    }

    if (options.signLanguage && assets.signLanguageClips.length === 0) {
      throw new Error('No sign language clips available');
    }

    if (!assets.video.storage_path) {
      throw new Error('Video file not found');
    }
  }

  private async getVideoUrl(videoId: string, storagePath?: string): Promise<string> {
    if (!storagePath) {
      throw new Error('Video storage path not found');
    }

    // Try to get a signed URL for the video
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      throw new Error(`Failed to get video URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async getDownloadUrl(storagePath: string): Promise<string> {
    // For R2 storage paths (exports/user_id/video_id/export_id.mp4)
    if (storagePath.startsWith('exports/')) {
      const { data, error } = await supabase.storage
        .from('videos') // R2 bucket
        .createSignedUrl(storagePath, 7200); // 2 hour expiry for large downloads

      if (error) {
        throw new Error(`Failed to generate download URL: ${error.message}`);
      }

      return data.signedUrl;
    }
    
    // Fallback for legacy paths
    const { data, error } = await supabase.storage
      .from('exports')
      .createSignedUrl(storagePath, 7200);

    if (error) {
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async listExports(userId: string, videoId: string): Promise<VideoExport[]> {
    const { data, error } = await supabase
      .from('video_exports')
      .select('*')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load exports: ${error.message}`);
    }

    return (data || []).map(item => ({
      ...item,
      status: item.status as 'processing' | 'completed' | 'failed',
      export_options: item.export_options as unknown as ExportOptions
    }));
  }

  async deleteExport(exportId: string, userId: string): Promise<void> {
    // Get export record first
    const { data: exportRecord, error: fetchError } = await supabase
      .from('video_exports')
      .select('storage_path')
      .eq('id', exportId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !exportRecord) {
      throw new Error('Export not found');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('exports')
      .remove([exportRecord.storage_path]);

    if (storageError) {
      console.warn('Failed to delete from storage:', storageError);
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('video_exports')
      .delete()
      .eq('id', exportId)
      .eq('user_id', userId);

    if (dbError) {
      throw new Error(`Failed to delete export: ${dbError.message}`);
    }
  }
}