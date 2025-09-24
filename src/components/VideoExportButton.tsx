import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, TestTube } from 'lucide-react';
import { ExportModal } from './ExportModal';
import { ExportOrchestrator } from '@/lib/exportOrchestrator';
import { ExportOptions, RenderProgress } from '@/types/export';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { testFFmpegLoad } from '@/lib/ffmpegLoader';

interface VideoExportButtonProps {
  videoId: string;
  videoTitle: string;
  onExportComplete?: () => void;
}

export function VideoExportButton({ videoId, videoTitle, onExportComplete }: VideoExportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<RenderProgress>();
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const [availableFeatures, setAvailableFeatures] = useState({
    hasTranscript: false,
    hasAudioDescriptions: false,
    hasSignLanguage: false
  });

  const { toast } = useToast();

  useEffect(() => {
    checkAvailableFeatures();
  }, [videoId]);

  const checkAvailableFeatures = async () => {
    try {
      const [transcriptResult, audioDescResult, aslResult] = await Promise.all([
        supabase.from('transcript_segments').select('id').eq('video_id', videoId).limit(1),
        supabase.from('audio_descriptions').select('id').eq('video_id', videoId).limit(1),
        supabase.from('sign_language_clips').select('id').eq('video_id', videoId).limit(1),
      ]);

      setAvailableFeatures({
        hasTranscript: (transcriptResult.data?.length || 0) > 0,
        hasAudioDescriptions: (audioDescResult.data?.length || 0) > 0,
        hasSignLanguage: (aslResult.data?.length || 0) > 0
      });
    } catch (error) {
      console.error('Failed to check available features:', error);
    }
  };

  const handleExport = async (options: ExportOptions) => {
    try {
      console.log('🚀 Export started with options:', options);
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
      
      console.log('⚡ Starting finalize and export process...');
      const result = await orchestrator.finalizeAndExport(
        videoId,
        user.id,
        options,
        setProgress
      );

      setDownloadUrl(result.downloadUrl);
      onExportComplete?.();
      
      toast({
        title: 'Export Complete!',
        description: 'Your accessible video export is ready for download.',
      });

    } catch (error: any) {
      console.error('❌ Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error?.message || 'An error occurred during export.',
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

  const handleClose = () => {
    setIsModalOpen(false);
    setProgress(undefined);
    setDownloadUrl(undefined);
  };
  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Video className="w-4 h-4" />
          Finalize & Export
        </Button>
        <Button onClick={testFFmpegLoad} variant="outline" size="sm" className="gap-1">
          <TestTube className="w-3 h-3" />
          Test FFmpeg
        </Button>
      </div>

      <ExportModal
        open={isModalOpen}
        onClose={handleClose}
        onExport={handleExport}
        videoTitle={videoTitle}
        availableFeatures={availableFeatures}
        progress={progress}
        isProcessing={isProcessing}
        downloadUrl={downloadUrl}
      />
    </>
  );
}