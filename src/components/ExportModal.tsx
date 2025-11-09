import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download, Video, FileText, Volume2, Hand, CheckCircle2 } from 'lucide-react';
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
    audioDescriptionsReady?: number;
    audioDescriptionsTotal?: number;
  };
  progress?: RenderProgress;
  isProcessing: boolean;
  downloadUrl?: string;
  originalDownloadUrl?: string;
  currentLanguage?: string;
  previousExports?: any[];
  onDownloadPrevious?: (exportItem: any) => void;
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
  originalDownloadUrl,
  currentLanguage = 'en',
  previousExports = [],
  onDownloadPrevious
}: ExportModalProps) {
  const { t } = useTranslation();
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
      const ext = downloadUrl.includes('.mp4') ? 'mp4' : (downloadUrl.includes('.webm') ? 'webm' : 'mp4');
      const suggestedName = `${fileNameSafe || 'export'}-accessible.${ext}`;
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
              className={`text-base font-light ${available ? '' : 'text-muted-foreground'}`}
            >
              {title}
            </Label>
            {!available && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {t('videoDetail.export.notAvailable')}
              </span>
            )}
            {key === 'audioDescription' && available && (availableFeatures as any).audioDescriptionsReady !== undefined && (
              <span className={`text-xs px-2 py-0.5 rounded-md flex items-center gap-1 ${
                (availableFeatures as any).audioDescriptionsReady === (availableFeatures as any).audioDescriptionsTotal
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {(availableFeatures as any).audioDescriptionsReady === (availableFeatures as any).audioDescriptionsTotal ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Audio ready ({(availableFeatures as any).audioDescriptionsReady}/{(availableFeatures as any).audioDescriptionsTotal})
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    {(availableFeatures as any).audioDescriptionsReady}/{(availableFeatures as any).audioDescriptionsTotal} audio files ready
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-base font-light text-muted-foreground mt-1 leading-relaxed">{description}</p>
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-3xl md:text-4xl font-light">
            <Video className="w-5 h-5" />
            {t('videoDetail.export.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Info */}
          <div className="bg-muted/50 p-6 rounded-xl">
            <h3 className="text-base font-light text-muted-foreground mb-1">{t('videoDetail.export.video')}</h3>
            <p className="text-xl font-light">{videoTitle}</p>
            <p className="text-sm font-light text-muted-foreground mt-2">
              {t('videoDetail.export.currentLanguage')}: {currentLanguage.toUpperCase()}
            </p>
          </div>

          {/* Mobile Warning */}
          {isMobile && (
            <Alert className="rounded-xl">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-base font-light leading-relaxed">
                Video processing on mobile devices may be slow or fail for longer videos. 
                For best results, use a desktop computer.
              </AlertDescription>
            </Alert>
          )}

          {/* Previous Exports - Recovery */}
          {previousExports.length > 0 && !isProcessing && !downloadUrl && (
            <div className="space-y-2">
              <h4 className="text-lg font-light">Previously Exported Versions</h4>
              <div className="space-y-2">
                {previousExports.map((exp) => (
                  <Alert key={exp.id} className="rounded-xl">
                    <Download className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-base font-light">
                          {new Date(exp.created_at).toLocaleDateString()} - 
                          {exp.file_size_bytes ? ` ${(exp.file_size_bytes / 1024 / 1024).toFixed(1)}MB` : ''}
                        </p>
                        <p className="text-sm font-light text-muted-foreground">
                          {exp.export_options?.captions && '✓ Captions '}
                          {exp.export_options?.audioDescription && '✓ Audio Description '}
                          {exp.export_options?.signLanguage && '✓ Sign Language'}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => onDownloadPrevious?.(exp)}
                        className="ml-2 font-light"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Always-available original download */}
          {originalDownloadUrl && (
            <Alert className="rounded-xl">
              <Download className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-base font-light">{t('videoDetail.export.originalPrompt')}</span>
                <Button size="sm" variant="outline" onClick={handleForceDownloadOriginal} className="ml-2 font-light">
                  <Download className="w-4 h-4 mr-2" />
                  {t('videoDetail.export.downloadOriginal')}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Export Progress */}
          {isProcessing && progress && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-light">
                  {progress.stage === 'preparing' && 'Preparing...'}
                  {progress.stage === 'processing' && 'Processing Video...'}
                  {progress.stage === 'uploading' && 'Uploading...'}
                  {progress.stage === 'finalizing' && 'Finalizing...'}
                </span>
                <span className="text-base font-light text-muted-foreground">{progress.progress}%</span>
              </div>
              <Progress value={progress.progress} className="w-full" />
              <p className="text-sm font-light text-muted-foreground">{progress.message}</p>
            </div>
          )}

          {/* Download Link */}
          {downloadUrl && (
            <Alert className="rounded-xl">
              <Download className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-base font-light">Your export is ready for download!</span>
                <Button
                  size="sm"
                  onClick={handleForceDownload}
                  className="ml-2 font-light"
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
                <h3 className="text-2xl font-light mb-4">{t('videoDetail.export.selectFeatures')}</h3>
                <div className="space-y-3">
                  {renderFeatureOption(
                    'captions',
                    <FileText className="w-5 h-5" />,
                    t('videoDetail.export.captionsTitle'),
                    t('videoDetail.export.captionsDesc'),
                    availableFeatures.hasTranscript
                  )}
                  
                  {renderFeatureOption(
                    'audioDescription',
                    <Volume2 className="w-5 h-5" />,
                    t('videoDetail.export.audioDescTitle'),
                    t('videoDetail.export.audioDescDesc'),
                    availableFeatures.hasAudioDescriptions
                  )}
                  
                  {renderFeatureOption(
                    'signLanguage',
                    <Hand className="w-5 h-5" />,
                    t('videoDetail.export.signLanguageTitle'),
                    t('videoDetail.export.signLanguageDesc'),
                    availableFeatures.hasSignLanguage
                  )}
                </div>
              </div>

              {/* Export Summary */}
              {getSelectedFeatureCount() > 0 && (
                <div className="bg-primary/5 p-6 rounded-xl">
                  <h4 className="text-lg font-light mb-2">Export Summary</h4>
                  <p className="text-base font-light text-muted-foreground">
                    Your video will be exported with {getSelectedFeatureCount()} accessibility feature{getSelectedFeatureCount() !== 1 ? 's' : ''}:
                  </p>
                  <ul className="text-base font-light text-muted-foreground mt-2 space-y-1">
                    {options.captions && <li>• Burned-in captions</li>}
                    {options.audioDescription && <li>• Mixed audio descriptions</li>}
                    {options.signLanguage && <li>• Sign language picture-in-picture</li>}
                  </ul>
                </div>
              )}

              {/* Validation Messages */}
              {getSelectedFeatureCount() === 0 && (
                <Alert className="rounded-xl">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-base font-light leading-relaxed">
                    {t('videoDetail.export.selectAtLeastOne')}
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
              className="flex-1 font-light"
            >
              {isProcessing ? 'Processing...' : downloadUrl ? t('common.close') : t('common.cancel')}
            </Button>
            
            {!isProcessing && !downloadUrl && (
              <Button 
                onClick={handleExport}
                disabled={getSelectedFeatureCount() === 0}
                className="flex-1 font-light"
              >
                <Video className="w-4 h-4 mr-2" />
                {t('videoDetail.export.startExport')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}