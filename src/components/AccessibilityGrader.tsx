import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface AccessibilityGraderProps {
  videoId?: string;
  videoUrl?: string;
  hasTranscript: boolean;
  hasAudioDescription: boolean;
  hasCaptions: boolean;
  hasSignLanguage: boolean;
  hasKeyboardNav: boolean;
  language: string;
  contrastRatio?: number;
  hasScreenReaderSupport?: boolean;
  hasHighContrast?: boolean;
  hasThumbnailAltText?: boolean;
  hasVisiblePlayButton?: boolean;
  onFixIssue: (issue: string) => void;
}

export const AccessibilityGrader: React.FC<AccessibilityGraderProps> = ({
  videoId,
  videoUrl,
  hasTranscript,
  hasAudioDescription,
  hasCaptions,
  hasSignLanguage,
  hasKeyboardNav,
  contrastRatio,
  hasScreenReaderSupport = true,
  hasHighContrast = true,
  hasThumbnailAltText = true,
  hasVisiblePlayButton = true,
  onFixIssue
}) => {
  const checks = [
    { name: 'Screen Reader Compatible', status: hasScreenReaderSupport, issue: 'enableScreenReader' },
    { name: 'Keyboard Compatible', status: hasKeyboardNav, issue: 'enableKeyboard' },
    { name: 'High Contrast Player', status: hasHighContrast, issue: 'enableHighContrast' },
    { name: 'Thumbnail Alt Text', status: hasThumbnailAltText, issue: 'updateThumbnailAlt' },
    { name: 'Play Button Visible', status: hasVisiblePlayButton, issue: 'showPlayButton' },
    { name: 'Captions Available', status: hasCaptions, issue: 'generateCaptions' },
    { name: 'Audio Description', status: hasAudioDescription, issue: 'generateAudioDescription' },
    { name: 'Sign Language Support', status: hasSignLanguage, issue: 'enableSignLanguage' }
  ];

  const passedChecks = checks.filter(check => check.status).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return (
    <Card className="p-4">
      <div className="text-center mb-6">
        <div className={`text-3xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
          {score}%
        </div>
        <div className="text-sm text-muted-foreground">WCAG 2.1 AA Compliance Score</div>
        <div className="text-xs text-muted-foreground mt-1">
          {passedChecks} of {checks.length} accessibility requirements met
        </div>
      </div>
      
      <div className="space-y-3">
        <h4 className="font-medium text-sm mb-3">8-Point Accessibility Checklist</h4>
        {checks.map((check, index) => (
          <div key={index} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${check.status ? 'text-green-600' : 'text-red-600'}`} />
              <span className="text-sm">{check.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={check.status ? 'default' : 'destructive'} className="text-xs">
                {check.status ? 'Pass' : 'Fail'}
              </Badge>
              {!check.status && (
                <button
                  onClick={() => onFixIssue(check.issue)}
                  className="text-xs text-primary hover:text-primary/80 underline"
                >
                  Fix
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {score < 100 && (
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            {score >= 80 ? 'Great job! Just a few more improvements needed.' : 
             score >= 60 ? 'Good progress! Consider addressing the remaining issues.' :
             'Several accessibility improvements are needed for full compliance.'}
          </p>
        </div>
      )}
    </Card>
  );
};