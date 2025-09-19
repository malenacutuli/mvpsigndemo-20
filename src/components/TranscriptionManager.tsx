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

  // Helper: run diarization then apply saved speaker mappings to update names/colors
  const runDiarizationAndApplyMappings = async () => {
    if (!videoId || !videoUrl) return;

    // 1) Run diarization to label segments as Speaker 1..N by time overlap
    const diarize = await supabase.functions.invoke('speaker-diarization', {
      body: {
        videoId,
        videoUrl,
        analysisDepth: 'advanced',
        minSpeakerDuration: 1.5,
        confidenceThreshold: 0.65
      }
    });
    if (diarize.error) {
      console.warn('Speaker diarization failed:', diarize.error.message);
    }

    // 2) Load mappings and characters
    const [{ data: mappingRow }, { data: chars }] = await Promise.all([
      supabase.from('speaker_mappings').select('mappings').eq('video_id', videoId).maybeSingle(),
      supabase.from('characters').select('name,color').eq('video_id', videoId)
    ]);

    const mappings: Record<string, string> = (mappingRow?.mappings as any) || {};
    const colorMap = (chars || []).reduce((acc: Record<string,string>, c: any) => ({ ...acc, [c.name]: c.color }), {});

    // 3) Apply mapping Speaker N -> Character name + color
    const genericKeys = Object.keys(mappings).filter(k => k.startsWith('Speaker'));
    for (const key of genericKeys) {
      const characterName = mappings[key];
      const color = colorMap[characterName] || '#3B82F6';
      const { error } = await supabase
        .from('transcript_segments')
        .update({ speaker: characterName, speaker_color: color })
        .eq('video_id', videoId)
        .eq('speaker', key);
      if (error) console.warn(`Failed to apply mapping for ${key} -> ${characterName}`, error.message);
    }

    // 4) Refresh local cache and UI
    const refreshed = await loadTranscriptSegments();
    setTranscripts(refreshed.map(seg => ({
      text: seg.text,
      start_time: seg.startTime,
      end_time: seg.endTime,
      speaker: seg.speaker
    })));
    onTranscriptUpdate?.(refreshed);
  };

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
          rangeBytes: 15000000 // First 15MB for transcription
        }
      });

      if (error) {
        throw new Error(error.message || 'Transcription failed');
      }

      console.log('Transcription result:', data);

      if (data?.text || data?.segments) {
        let segments: any[] = [];
        
        if (data.segments && Array.isArray(data.segments)) {
          // Use structured segments if available
          segments = data.segments.map((seg: any, index: number) => ({
            text: seg.text || '',
            start_time: Number(seg.start) || 0,
            end_time: Number(seg.end) || 0,
            speaker: `Speaker ${(index % 3) + 1}`
          }));
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
        
        // Save to database/localStorage using useVideoStorage hook
        try {
          const transcriptSegments = segments.map((seg, index) => ({
            text: seg.text,
            startTime: seg.start_time,
            endTime: seg.end_time,
            speaker: seg.speaker,
            speakerColor: '#3B82F6',
            emphasis: 'normal' as const,
            pitch: 'normal' as const
          }));
          
          await saveTranscriptSegments(transcriptSegments, data.language || 'en');
          
          // Immediately run diarization and apply character mappings so UI shows real names/colors
          await runDiarizationAndApplyMappings();
          
          toast({
            title: "Transcript saved",
            description: `Saved ${segments.length} segments and applied speaker mappings`
          });
          
          onTranscriptUpdate?.(segments);
          onTranscriptionComplete?.(segments, data.language || 'en');
        } catch (error) {
          console.error('Failed to save transcript:', error);
        }
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