import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
          videoId: videoId,
          language: 'auto'
        }
      });

      if (error) {
        console.error('Transcription error:', error);
        throw new Error(error.message || 'Transcription failed');
      }

      console.log('Transcription result:', data);

      if (data && data.segments && data.segments.length > 0) {
        // Use the actual segments from OpenAI Whisper
        const segments = data.segments.map((segment: any) => ({
          text: segment.text,
          start_time: segment.start,
          end_time: segment.end,
          speaker: 'narrator'
        }));
        
        setTranscripts(segments);
        onTranscriptUpdate?.(segments);
        onTranscriptionComplete?.(segments, data.language || 'en');
      } else if (data?.text) {
        // Fallback for simple text response
        const segments = [
          { 
            text: data.text, 
            start_time: 0, 
            end_time: data.duration || 10, 
            speaker: 'narrator' 
          }
        ];
        
        setTranscripts(segments);
        onTranscriptUpdate?.(segments);
        onTranscriptionComplete?.(segments, data.language || 'en');
      } else {
        throw new Error('No transcript data received');
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
          {isGenerating ? 'Generating...' : 'Generate Transcript'}
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