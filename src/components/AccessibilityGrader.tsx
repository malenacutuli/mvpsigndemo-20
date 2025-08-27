import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface AccessibilityGraderProps {
  hasTranscript: boolean;
  hasAudioDescription: boolean;
  hasCaptions: boolean;
  hasASL: boolean;
  hasKeyboardNav: boolean;
  language: string;
  onFixIssue: (issue: string) => void;
}

export const AccessibilityGrader: React.FC<AccessibilityGraderProps> = ({
  hasTranscript,
  hasAudioDescription,
  hasCaptions,
  hasASL,
  hasKeyboardNav
}) => {
  const score = Math.round(
    ((hasTranscript ? 20 : 0) + 
     (hasAudioDescription ? 20 : 0) + 
     (hasCaptions ? 20 : 0) + 
     (hasASL ? 20 : 0) + 
     (hasKeyboardNav ? 20 : 0))
  );

  return (
    <Card className="p-4">
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-green-600">{score}%</div>
        <div className="text-sm text-muted-foreground">WCAG 2.1 AA Compliance</div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`w-4 h-4 ${hasCaptions ? 'text-green-600' : 'text-red-600'}`} />
          <span className="text-sm">Captions Available</span>
          <Badge variant={hasCaptions ? 'default' : 'destructive'}>
            {hasCaptions ? 'Pass' : 'Fail'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`w-4 h-4 ${hasAudioDescription ? 'text-green-600' : 'text-red-600'}`} />
          <span className="text-sm">Audio Description</span>
          <Badge variant={hasAudioDescription ? 'default' : 'destructive'}>
            {hasAudioDescription ? 'Pass' : 'Fail'}
          </Badge>
        </div>
      </div>
    </Card>
  );
};