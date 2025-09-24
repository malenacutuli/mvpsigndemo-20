import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download, Video, FileText, Volume2, Hand } from 'lucide-react';
import { ExportOptions, RenderProgress } from '@/types/export';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  videoTitle: string;
  availableFeatures: {
    hasTranscript: boolean;
    hasAudioDescriptions: boolean;
    hasSignLanguage: boolean;
  };
  progress?: RenderProgress;
  isProcessing: boolean;
  downloadUrl?: string;
  originalDownloadUrl?: string;
}

export function ExportModal({
  open,
  onClose,
  onExport,
  videoTitle,
  availableFeatures,
  progress,
  isProcessing,
  downloadUrl,
  originalDownloadUrl
}: ExportModalProps) {
  console.log('🎭 ExportModal rendered with:', { open, isProcessing, availableFeatures });
  
  const [options, setOptions] = useState<ExportOptions>({
    captions: availableFeatures.hasTranscript,
    audioDescription: availableFeatures.hasAudioDescriptions,
    signLanguage: availableFeatures.hasSignLanguage
  });

  const [isMobile] = useState(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

  const handleExport = async () => {
    try {
      console.log('🎯 ExportModal handleExport called with options:', options);
      await onExport(options);
      console.log('✅ ExportModal onExport completed successfully');
    } catch (error) {
      console.error('❌ ExportModal export failed:', error);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  const handleForceDownload = () => {
    if (!downloadUrl) return;
    try {
      const fileNameSafe = (videoTitle || 'export')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const suggestedName = `${fileNameSafe || 'export'}-accessible.mp4`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = suggestedName;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Optionally revoke blob URLs after some time to free memory
      if (downloadUrl.startsWith('blob:')) {
        setTimeout(() => {
          try { URL.revokeObjectURL(downloadUrl); } catch {}
        }, 60_000);
      }
    } catch (e) {
      // Fallback to opening in a new tab if direct download fails
      window.open(downloadUrl, '_blank');
    }
};

  const handleForceDownloadOriginal = () => {
    if (!originalDownloadUrl) return;
    try {
      const fileNameSafe = (videoTitle || 'video')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const suggestedName = `${fileNameSafe || 'video'}-original.mp4`;
      const a = document.createElement('a');
      a.href = originalDownloadUrl;
      a.download = suggestedName;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      window.open(originalDownloadUrl, '_blank');
    }
  };

  const getSelectedFeatureCount = () => {
    return Object.values(options).filter(Boolean).length;
  };
  const renderFeatureOption = (
    key: keyof ExportOptions,
    icon: React.ReactNode,
    title: string,
    description: string,
    available: boolean
  ) => (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${
      available ? 'border-border' : 'border-border bg-muted/50'
    }`}>
      <div className="flex items-start space-x-3">
        <div className={`mt-0.5 ${available ? 'text-primary' : 'text-muted-foreground'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Label 
              htmlFor={key}
              className={`font-medium ${available ? '' : 'text-muted-foreground'}`}
            >
              {title}
            </Label>
            {!available && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                Not available
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <Switch
        id={key}
        checked={options[key] && available}
        onCheckedChange={(checked) => setOptions(prev => ({ ...prev, [key]: checked }))}
        disabled={!available || isProcessing}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Finalize & Export Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Info */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium text-sm text-muted-foreground mb-1">Video</h3>
            <p className="font-medium">{videoTitle}</p>
          </div>

          {/* Mobile Warning */}
          {isMobile && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Video processing on mobile devices may be slow or fail for longer videos. 
                For best results, use a desktop computer.
              </AlertDescription>
            </Alert>
          )}

          {/* Always-available original download */}
          {originalDownloadUrl && (
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Need a copy now? Download the original video.</span>
                <Button size="sm" variant="outline" onClick={handleForceDownloadOriginal} className="ml-2">
                  <Download className="w-4 h-4 mr-2" />
                  Download original
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Export Progress */}
          {isProcessing && progress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {progress.stage === 'preparing' && 'Preparing...'}
                  {progress.stage === 'processing' && 'Processing Video...'}
                  {progress.stage === 'uploading' && 'Uploading...'}
                  {progress.stage === 'finalizing' && 'Finalizing...'}
                </span>
                <span className="text-sm text-muted-foreground">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="w-full" />
              <p className="text-xs text-muted-foreground">{progress.message}</p>
            </div>
          )}

          {/* Download Link */}
          {downloadUrl && (
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Your export is ready for download!</span>
                <Button
                  size="sm"
                  onClick={handleForceDownload}
                  className="ml-2"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Feature Selection */}
          {!isProcessing && !downloadUrl && (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Accessibility Features</h3>
                <div className="space-y-3">
                  {renderFeatureOption(
                    'captions',
                    <FileText className="w-5 h-5" />,
                    'Captions with Intention',
                    'Burn-in word-by-word captions with character colors',
                    availableFeatures.hasTranscript
                  )}
                  
                  {renderFeatureOption(
                    'audioDescription',
                    <Volume2 className="w-5 h-5" />,
                    'Audio Description',
                    'Mix audio descriptions with ducked program audio',
                    availableFeatures.hasAudioDescriptions
                  )}
                  
                  {renderFeatureOption(
                    'signLanguage',
                    <Hand className="w-5 h-5" />,
                    'Sign Language Interpretation',
                    'Picture-in-picture sign language overlay',
                    availableFeatures.hasSignLanguage
                  )}
                </div>
              </div>

              {/* Export Summary */}
              {getSelectedFeatureCount() > 0 && (
                <div className="bg-primary/5 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Export Summary</h4>
                  <p className="text-sm text-muted-foreground">
                    Your video will be exported with {getSelectedFeatureCount()} accessibility feature{getSelectedFeatureCount() !== 1 ? 's' : ''}:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    {options.captions && <li>• Burned-in captions</li>}
                    {options.audioDescription && <li>• Mixed audio descriptions</li>}
                    {options.signLanguage && <li>• Sign language picture-in-picture</li>}
                  </ul>
                </div>
              )}

              {/* Validation Messages */}
              {getSelectedFeatureCount() === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Please select at least one accessibility feature to export.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : downloadUrl ? 'Close' : 'Cancel'}
            </Button>
            
            {!isProcessing && !downloadUrl && (
              <Button 
                onClick={handleExport}
                disabled={getSelectedFeatureCount() === 0}
                className="flex-1"
              >
                <Video className="w-4 h-4 mr-2" />
                Start Export
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}