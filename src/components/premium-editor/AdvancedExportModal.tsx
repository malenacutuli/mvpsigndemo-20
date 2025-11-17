import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, FileText, Film } from 'lucide-react';
import { generateTranscriptDOCX } from '@/services/exportFormats/docxExport';
import { generateAAFTimeline } from '@/services/exportFormats/aafExport';
import { generateSRTSubtitles, generateVTTSubtitles } from '@/services/exportFormats/srtExport';
import { toast } from 'sonner';

interface AdvancedExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  videoId: string;
}

export function AdvancedExportModal({
  open,
  onOpenChange,
  projectId,
  videoId
}: AdvancedExportModalProps) {
  const [exportType, setExportType] = useState<string>('transcript_docx');
  const [isExporting, setIsExporting] = useState(false);

  const exportOptions = [
    {
      value: 'transcript_docx',
      label: 'Transcript (Microsoft Word)',
      description: 'Formatted transcript with timestamps and speaker labels',
      icon: FileText,
      format: 'DOCX'
    },
    {
      value: 'timeline_aaf',
      label: 'Timeline (AAF)',
      description: 'Pro Tools / Logic Pro compatible timeline',
      icon: Film,
      format: 'AAF'
    },
    {
      value: 'subtitles_srt',
      label: 'Subtitles (SRT)',
      description: 'Standard subtitle format for video players',
      icon: FileText,
      format: 'SRT'
    },
    {
      value: 'subtitles_vtt',
      label: 'Subtitles (WebVTT)',
      description: 'Web-optimized subtitles with styling support',
      icon: FileText,
      format: 'VTT'
    }
  ];

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let blob: Blob;
      let filename: string;

      switch (exportType) {
        case 'transcript_docx':
          blob = await generateTranscriptDOCX(videoId);
          filename = 'transcript.docx';
          break;
        case 'timeline_aaf':
          blob = await generateAAFTimeline(projectId);
          filename = 'timeline.aaf';
          break;
        case 'subtitles_srt':
          blob = await generateSRTSubtitles(videoId);
          filename = 'subtitles.srt';
          break;
        case 'subtitles_vtt':
          blob = await generateVTTSubtitles(videoId);
          filename = 'subtitles.vtt';
          break;
        default:
          throw new Error('Invalid export type');
      }

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export Complete', {
        description: `${filename} has been downloaded`
      });

      onOpenChange(false);
    } catch (error) {
      toast.error('Export Failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Advanced Export Options
          </DialogTitle>
        </DialogHeader>

        <RadioGroup value={exportType} onValueChange={setExportType}>
          <div className="space-y-3">
            {exportOptions.map((option) => (
              <Label
                key={option.value}
                htmlFor={option.value}
                className="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer hover:bg-muted transition-colors data-[state=checked]:border-primary"
                data-state={exportType === option.value ? 'checked' : 'unchecked'}
              >
                <RadioGroupItem value={option.value} id={option.value} />
                <option.icon className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                      {option.format}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </Label>
            ))}
          </div>
        </RadioGroup>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
