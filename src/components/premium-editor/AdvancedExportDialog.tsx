import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Film, Subtitles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateAAF, downloadAAF } from '@/lib/exports/aafExporter';
import { generateDOCX, downloadDOCX } from '@/lib/exports/docxExporter';
import { generateSRT, generateVTT, downloadSubtitle } from '@/lib/exports/subtitleExporter';

interface AdvancedExportDialogProps {
  projectId: string;
  videoId: string;
}

export function AdvancedExportDialog({ projectId, videoId }: AdvancedExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeSpeakers, setIncludeSpeakers] = useState(true);

  const { data: project } = useQuery({
    queryKey: ['videoProject', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const { data: segments } = useQuery({
    queryKey: ['transcriptSegments', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transcript_segments_clean')
        .select('*')
        .eq('video_id', videoId)
        .order('idx');

      if (error) throw error;
      return data;
    },
    enabled: open
  });

  const handleExportAAF = async () => {
    if (!project || !segments) return;

    try {
      setExporting(true);

      const aafContent = generateAAF({
        projectName: project.name || 'Untitled Project',
        frameRate: 30, // Default framerate
        segments: segments.map(s => ({
          start_time: s.start_time,
          end_time: s.end_time,
          text: s.text,
          speaker: s.speaker || undefined
        }))
      });

      downloadAAF(aafContent, project.name || 'project');
      
      toast.success('AAF Export Complete', {
        description: 'Timeline exported successfully for Pro Tools'
      });
    } catch (error) {
      toast.error('Export Failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    if (!project || !segments) return;

    try {
      setExporting(true);

      const docxBlob = await generateDOCX({
        projectName: project.name || 'Untitled Project',
        segments: segments.map(s => ({
          start_time: s.start_time,
          end_time: s.end_time,
          text: s.text,
          speaker: s.speaker || undefined,
          speaker_color: s.speaker_color || undefined
        })),
        includeTimestamps,
        includeSpeakers
      });

      await downloadDOCX(docxBlob, project.name || 'transcript');
      
      toast.success('DOCX Export Complete', {
        description: 'Transcript exported successfully'
      });
    } catch (error) {
      toast.error('Export Failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportSRT = async () => {
    if (!project || !segments) return;

    try {
      setExporting(true);

      const srtContent = generateSRT({
        segments: segments.map(s => ({
          start_time: s.start_time,
          end_time: s.end_time,
          text: s.text,
          speaker: s.speaker || undefined
        })),
        includeSpeakers
      });

      downloadSubtitle(srtContent, project.name || 'subtitles', 'srt');
      
      toast.success('SRT Export Complete', {
        description: 'Subtitles exported successfully'
      });
    } catch (error) {
      toast.error('Export Failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportVTT = async () => {
    if (!project || !segments) return;

    try {
      setExporting(true);

      const vttContent = generateVTT({
        segments: segments.map(s => ({
          start_time: s.start_time,
          end_time: s.end_time,
          text: s.text,
          speaker: s.speaker || undefined
        })),
        includeSpeakers
      });

      downloadSubtitle(vttContent, project.name || 'subtitles', 'vtt');
      
      toast.success('VTT Export Complete', {
        description: 'Subtitles exported successfully'
      });
    } catch (error) {
      toast.error('Export Failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Advanced Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Advanced Export Options</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Options */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="timestamps"
                  checked={includeTimestamps}
                  onCheckedChange={(checked) => setIncludeTimestamps(checked as boolean)}
                />
                <Label htmlFor="timestamps">Include Timestamps</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="speakers"
                  checked={includeSpeakers}
                  onCheckedChange={(checked) => setIncludeSpeakers(checked as boolean)}
                />
                <Label htmlFor="speakers">Include Speaker Names</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* AAF Export */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">AAF Timeline (Pro Tools)</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Export timeline with markers for professional audio editing in Pro Tools, Logic Pro, or other DAW software.
            </p>
            <Button
              onClick={handleExportAAF}
              disabled={exporting || !segments}
              className="w-full"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Film className="w-4 h-4 mr-2" />
              )}
              Export AAF
            </Button>
          </div>

          <Separator />

          {/* DOCX Export */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Word Document (DOCX)</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Export formatted transcript with timestamps and speaker labels for documentation and review.
            </p>
            <Button
              onClick={handleExportDOCX}
              disabled={exporting || !segments}
              className="w-full"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Export DOCX
            </Button>
          </div>

          <Separator />

          {/* Subtitle Exports */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Subtitles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Subtitle Files</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Export subtitles in standard formats for video players and streaming platforms.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleExportSRT}
                disabled={exporting || !segments}
                variant="outline"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Subtitles className="w-4 h-4 mr-2" />
                )}
                Export SRT
              </Button>
              <Button
                onClick={handleExportVTT}
                disabled={exporting || !segments}
                variant="outline"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Subtitles className="w-4 h-4 mr-2" />
                )}
                Export VTT
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
