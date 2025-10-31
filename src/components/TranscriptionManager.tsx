import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVideoStorage } from '@/hooks/useVideoStorage';
import { useToast } from '@/hooks/use-toast';

interface TranscriptionManagerProps {
  videoId?: string;
  videoUrl?: string;
  onTranscriptUpdate?: (segments: any[]) => void;
  onTranscriptionComplete?: (segments: any, language: any) => void;
  contentType?: 'recipe' | 'education';
}

export const TranscriptionManager: React.FC<TranscriptionManagerProps> = ({
  videoId,
  videoUrl,
  onTranscriptUpdate,
  onTranscriptionComplete,
  contentType
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [hasExistingTranscript, setHasExistingTranscript] = useState(false);
  const { loadTranscriptSegments, saveTranscriptSegments } = useVideoStorage(videoId || '');
  const { toast } = useToast();

  // Load existing transcripts on mount
  useEffect(() => {
    if (videoId) {
      loadExistingTranscripts();
    }
  }, [videoId]);

  const loadExistingTranscripts = async () => {
    if (!videoId) return;
    
    try {
      const existingSegments = await loadTranscriptSegments();
      if (existingSegments.length > 0) {
        console.log('✅ Found existing transcript:', existingSegments.length, 'segments');
        const segments = existingSegments.map((seg) => ({
          text: seg.text,
          start_time: seg.startTime,
          end_time: seg.endTime,
          speaker: seg.speaker || 'narrator'
        }));
        setTranscripts(segments);
        setHasExistingTranscript(true);
        onTranscriptUpdate?.(segments);
        onTranscriptionComplete?.(segments, 'en');
      }
    } catch (error) {
      console.error('Failed to load existing transcript:', error);
    }
  };

  const generateTranscript = async () => {
    if (!videoUrl) {
      console.error('No video URL provided');
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('Starting transcription for video:', videoUrl);
      
      // Call Supabase transcribe function
      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: { 
          videoUrl: videoUrl,
          videoId: videoId, // Pass videoId for database saving
          rangeBytes: 15000000, // First 15MB for transcription
          skipQualityCheck: true // Bypass validation for consistency
        }
      });

      if (error) {
        throw new Error(error.message || 'Transcription failed');
      }

      // Handle validation warnings (non-blocking)
      if (data?.validation?.status === 'warn') {
        console.warn('⚠️ Quality warning:', data.validation.reason);
      }

      // Only fail if no segments at all
      if (data?.error && !data?.segments) {
        throw new Error(`${data.error}: ${data.message || 'Transcription failed'}`);
      }

      console.log('Transcription result:', data);

      if (data?.text || data?.segments) {
        let segments: any[] = [];
        
        if (data.segments && Array.isArray(data.segments)) {
          // ✅ FIX: Use provider labels (Speaker A/B/C) instead of generic "Speaker 1/2/3"
          segments = data.segments.map((seg: any) => {
            const asrLabel = seg.speaker || seg.speaker_asr_label;
            const displaySpeaker = asrLabel ? `Speaker ${asrLabel}` : 'Speaker';
            
            return {
              text: seg.text || '',
              start_time: Number(seg.start) || 0,
              end_time: Number(seg.end) || 0,
              speaker: displaySpeaker,
              words: Array.isArray(seg.words)
                ? seg.words.map((w: any) => ({
                    text: w.word || w.text,
                    startTime: Number(w.start || w.startTime),
                    endTime: Number(w.end || w.endTime),
                    confidence: w.confidence
                  }))
                : undefined
            };
          });
        } else if (data.text) {
          // Fallback to simple text
          segments = [
            { 
              text: data.text, 
              start_time: 0, 
              end_time: 10, 
              speaker: 'narrator' 
            }
          ];
        }
        
        setTranscripts(segments);
        setHasExistingTranscript(true);
        
        // ✅ FIX: Poll database to wait for edge function save
        const lang = data.language || 'en';
        let dbSegments: any[] = [];
        
        for (let attempt = 0; attempt < 10; attempt++) {
          await new Promise(r => setTimeout(r, 300));

          dbSegments = await loadTranscriptSegments(lang);
          if (dbSegments.length > 0) break;

          // Also probe base rows directly in case transcript_id path is empty
          const { data: baseRows } = await supabase
            .from('transcript_segments_clean')
            .select('id')
            .eq('video_id', videoId)
            .eq('language', lang)
            .is('transcript_id', null)
            .limit(1);

          if (baseRows?.length) {
            // Force reload via the normal path
            dbSegments = await loadTranscriptSegments(lang);
            if (dbSegments.length > 0) break;
          }
        }

        if (dbSegments.length === 0) {
          toast({
            title: 'Transcription is processing…',
            description: 'Segments will appear shortly. Try refresh in a few seconds.',
            variant: 'destructive'
          });
          return; // 🚫 Don't fallback-save generic segments
        }

        // Convert DB segments to display format
        const displaySegments = dbSegments.map(seg => ({
          text: seg.text,
          start_time: seg.startTime,
          end_time: seg.endTime,
          speaker: seg.speaker || 'Speaker'
        }));
        
        setTranscripts(displaySegments);
        onTranscriptUpdate?.(displaySegments);
        onTranscriptionComplete?.(displaySegments, lang);
        
        toast({
          title: "Transcript saved successfully!",
          description: `Successfully extracted and saved ${dbSegments.length} segments to database`
        });
      }
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportTranscript = () => {
    if (transcripts.length === 0) {
      console.log('No transcripts available to export');
      return;
    }

    const text = transcripts.map(segment => segment.text).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${videoId || 'video'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Auto-Generated Transcripts</h3>
      <div className="space-y-4">
        <Button onClick={generateTranscript} disabled={isGenerating || !videoUrl}>
          <Mic className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : hasExistingTranscript ? 'Re-generate Transcript' : 'Generate Transcript'}
        </Button>
        <Button 
          variant="outline" 
          onClick={exportTranscript} 
          disabled={transcripts.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Transcript
        </Button>
        
        {transcripts.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <h4 className="font-medium mb-2">Generated Transcript:</h4>
            <div className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
              {transcripts.map((segment, index) => (
                <p key={index}>{segment.text}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};