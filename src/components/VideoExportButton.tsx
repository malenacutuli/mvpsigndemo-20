import React, { useState, useEffect } from 'react';
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
      setIsProcessing(true);
      setProgress({ stage: 'preparing', progress: 0, message: 'Starting export...' });

      const { user } = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const orchestrator = new ExportOrchestrator(setProgress);
      const result = await orchestrator.finalizeAndExport(
        videoId,
        user.data.user.id,
        options,
        setProgress
      );

      setDownloadUrl(result.downloadUrl);
      onExportComplete?.();
      
      toast({
        title: 'Export Complete!',
        description: 'Your accessible video export is ready for download.',
      });

    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'An error occurred during export.',
        variant: 'destructive',
      });
    } finally {
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
      <Button onClick={() => setIsModalOpen(true)} className="gap-2">
        <Video className="w-4 h-4" />
        Finalize & Export
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
      />
    </>
  );
}