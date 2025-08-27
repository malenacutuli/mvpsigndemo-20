import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, Download } from 'lucide-react';

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

  const generateTranscript = async () => {
    setIsGenerating(true);
    // Simulate transcript generation
    setTimeout(() => {
      const mockSegments = [
        { text: 'Sample transcript segment', start_time: 0, end_time: 2, speaker: 'narrator' }
      ];
      onTranscriptUpdate?.(mockSegments);
      onTranscriptionComplete?.(mockSegments, 'en');
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Auto-Generated Transcripts</h3>
      <div className="space-y-4">
        <Button onClick={generateTranscript} disabled={isGenerating || !videoUrl}>
          <Mic className="w-4 h-4 mr-2" />
          {isGenerating ? 'Generating...' : 'Generate Transcript'}
        </Button>
        <Button variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Export Transcript
        </Button>
      </div>
    </Card>
  );
};