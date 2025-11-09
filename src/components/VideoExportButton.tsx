import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';
import { ExportModal } from './ExportModal';
import { ExportOrchestrator } from '@/lib/exportOrchestrator';
import { ExportOptions, RenderProgress } from '@/types/export';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoExportButtonProps {
  videoId: string;
  videoTitle: string;
  currentLanguage: string;
  onExportComplete?: () => void;
}

export function VideoExportButton({ videoId, videoTitle, currentLanguage, onExportComplete }: VideoExportButtonProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<RenderProgress>();
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const [originalUrl, setOriginalUrl] = useState<string>();
  const [previousExports, setPreviousExports] = useState<any[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState({
    hasTranscript: false,
    hasAudioDescriptions: false,
    hasSignLanguage: false
  });

  const { toast } = useToast();

  useEffect(() => {
    checkAvailableFeatures();
    checkPreviousExports();
  }, [videoId]);

  useEffect(() => {
    const fetchOriginal = async () => {
      try {
        const { data: video, error: videoErr } = await supabase
          .from('videos')
          .select('storage_path')
          .eq('id', videoId)
          .single();
        if (!videoErr && video?.storage_path) {
          const { data: signed, error: urlErr } = await supabase.storage
            .from('videos')
            .createSignedUrl(video.storage_path, 3600);
          if (!urlErr && signed?.signedUrl) {
            setOriginalUrl(signed.signedUrl);
          }
        }
      } catch (e) {
        console.warn('Failed to load original video URL', e);
      }
    };
    if (isModalOpen) fetchOriginal();
  }, [isModalOpen, videoId]);

  const checkPreviousExports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: exports, error } = await supabase
        .from('video_exports')
        .select('*')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && exports) {
        setPreviousExports(exports);
        console.log('Found previous exports:', exports.length);
      }
    } catch (error) {
      console.error('Failed to check previous exports:', error);
    }
  };

  const checkAvailableFeatures = async () => {
    try {
      const [transcriptResult, audioDescResult, aslResult] = await Promise.all([
        supabase.from('transcript_segments_clean').select('id').eq('video_id', videoId).limit(1),
        supabase.from('audio_descriptions').select('id, audio_generation_status, audio_url').eq('video_id', videoId),
        supabase.from('sign_language_clips').select('id').eq('video_id', videoId).limit(1),
      ]);

      const audioDescs = audioDescResult.data || [];
      const audioReady = audioDescs.filter(ad => ad.audio_generation_status === 'completed' && ad.audio_url).length;

      setAvailableFeatures({
        hasTranscript: (transcriptResult.data?.length || 0) > 0,
        hasAudioDescriptions: audioDescs.length > 0,
        hasSignLanguage: (aslResult.data?.length || 0) > 0,
        audioDescriptionsReady: audioReady,
        audioDescriptionsTotal: audioDescs.length
      } as any);
    } catch (error) {
      console.error('Failed to check available features:', error);
    }
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      console.log('🚀 Export started with options:', options);
      console.log('🌍 Exporting with language:', currentLanguage);
      setIsProcessing(true);
      setProgress({ stage: 'preparing', progress: 0, message: 'Starting export...' });

      console.log('🔐 Getting user authentication...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.id);

      console.log('🎬 Creating export orchestrator...');
      const orchestrator = new ExportOrchestrator(setProgress);
      
      const exportOptionsWithLanguage = {
        ...options,
        language: currentLanguage
      };
      
      console.log('⚡ Starting finalize and export process with language:', exportOptionsWithLanguage);
      const result = await orchestrator.finalizeAndExport(
        videoId,
        user.id,
        exportOptionsWithLanguage,
        setProgress
      );

      setDownloadUrl(result.downloadUrl);
      onExportComplete?.();
      
      toast({
        title: 'Export Complete!',
        description: `Your video with ${currentLanguage.toUpperCase()} captions is ready for download.`,
      });

    } catch (error: any) {
      console.error('❌ Export failed:', error);
      
      // Provide specific error messages and guidance
      let userMessage = error?.message || 'An error occurred during export.';
      
      if (error.message?.includes('audio description')) {
        userMessage = 'Some audio descriptions are missing audio files. ' +
                      'Please open the Audio Description Editor and click "Generate Audio" ' +
                      'for all descriptions before exporting.';
      } else if (error.message?.includes('sign language clip')) {
        userMessage = 'Failed to access sign language clips. ' +
                      'Please verify all clips are uploaded correctly in the Transcript Editor.';
      } else if (error.message?.includes('network') || error.message?.includes('Failed to download')) {
        userMessage = 'Network error during export. Please check your connection and try again.';
      }
      
      toast({
        title: 'Export Failed',
        description: userMessage,
        variant: 'destructive',
      });

      // Fallback: provide original video for download so the user always has something
      try {
        const { data: video, error: videoErr } = await supabase
          .from('videos')
          .select('storage_path')
          .eq('id', videoId)
          .single();
        if (!videoErr && video?.storage_path) {
          const { data: signed, error: urlErr } = await supabase.storage
            .from('videos')
            .createSignedUrl(video.storage_path, 3600);
          if (!urlErr && signed?.signedUrl) {
            setDownloadUrl(signed.signedUrl);
            toast({
              title: 'Fallback Ready',
              description: 'Could not export, but you can download the original video.',
            });
          }
        }
      } catch (fallbackErr) {
        console.warn('Fallback original download failed:', fallbackErr);
      }
    } finally {
      console.log('🔄 Export process finished, resetting state...');
      setIsProcessing(false);
    }
  };

  const handleDownloadPrevious = async (exportItem: any) => {
    try {
      const orchestrator = new ExportOrchestrator();
      const downloadUrl = await orchestrator.getDownloadUrl(exportItem.storage_path);
      
      // Force download with proper streaming
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${videoTitle}-export-${new Date(exportItem.created_at).toLocaleDateString()}.mp4`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: 'Download Started',
        description: 'Your previously exported video is downloading...',
      });
    } catch (error) {
      console.error('Failed to download previous export:', error);
      toast({
        title: 'Download Failed',
        description: 'Could not retrieve the exported video.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setProgress(undefined);
    setDownloadUrl(undefined);
  };
  
  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} className="gap-2 font-light">
        <Video className="w-4 h-4" />
        {t('videoDetail.export.finalizeExport')}
      </Button>

      <ExportModal
        open={isModalOpen}
        onClose={handleClose}
        onExport={handleExport}
        videoTitle={videoTitle}
        availableFeatures={availableFeatures}
        progress={progress}
        isProcessing={isProcessing}
        downloadUrl={downloadUrl}
        originalDownloadUrl={originalUrl}
        currentLanguage={currentLanguage}
        previousExports={previousExports}
        onDownloadPrevious={handleDownloadPrevious}
      />
    </>
  );
}