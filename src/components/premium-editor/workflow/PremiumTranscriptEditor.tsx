import { TranscriptEditor } from '@/components/TranscriptEditor';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface PremiumTranscriptEditorProps {
  videoUrl: string;
  videoId: string;
  currentTime: number;
  language: string;
  onTimeUpdate: (time: number) => void;
  onLanguageChange: (language: string) => void;
  onTranscriptUpdate: (segments: any[]) => void;
}

export function PremiumTranscriptEditor({
  videoUrl,
  videoId,
  language,
  onLanguageChange,
  onTranscriptUpdate
}: PremiumTranscriptEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Transcript Extraction & Editing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TranscriptEditor
          videoUrl={videoUrl}
          videoId={videoId}
          initialLanguage={language}
          onTranscriptUpdate={onTranscriptUpdate}
          onContentGenerated={() => {}}
          onLanguageChange={onLanguageChange}
        />
      </CardContent>
    </Card>
  );
}
