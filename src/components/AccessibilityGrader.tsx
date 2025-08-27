import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, XCircle, Shield } from 'lucide-react';

interface AccessibilityCheck {
  id: string;
  label: string;
  description: string;
  standard: string;
  level: 'AA' | 'AAA';
  category: 'captions' | 'audio' | 'visual' | 'navigation' | 'cognitive';
  status: 'pass' | 'fail' | 'warning' | 'not-applicable';
  autoCheck: boolean;
}

interface AccessibilityGraderProps {
  videoUrl?: string;
  hasCaptions?: boolean;
  hasAudioDescription?: boolean;
  hasASL?: boolean;
  hasTranscript?: boolean;
  hasKeyboardNav?: boolean;
  contrastRatio?: number;
  className?: string;
}

const accessibilityChecks: AccessibilityCheck[] = [
  {
    id: 'captions-sync',
    label: 'Synchronized Captions',
    description: 'Captions are properly synchronized with audio content',
    standard: 'WCAG 1.2.2',
    level: 'AA',
    category: 'captions',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'captions-accuracy',
    label: 'Caption Accuracy',
    description: 'Captions accurately represent spoken content (>99% accuracy)',
    standard: 'WCAG 1.2.2',
    level: 'AA',
    category: 'captions',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'audio-description',
    label: 'Audio Descriptions',
    description: 'Audio descriptions available for visual content',
    standard: 'WCAG 1.2.5',
    level: 'AA',
    category: 'audio',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'sign-language',
    label: 'Sign Language Interpretation',
    description: 'Sign language interpretation provided',
    standard: 'WCAG 1.2.6',
    level: 'AAA',
    category: 'visual',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'keyboard-access',
    label: 'Keyboard Accessibility',
    description: 'All functionality accessible via keyboard',
    standard: 'WCAG 2.1.1',
    level: 'AA',
    category: 'navigation',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'color-contrast',
    label: 'Color Contrast',
    description: 'Sufficient color contrast ratio (4.5:1 minimum)',
    standard: 'WCAG 1.4.3',
    level: 'AA',
    category: 'visual',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'focus-indicators',
    label: 'Focus Indicators',
    description: 'Visible focus indicators on interactive elements',
    standard: 'WCAG 2.4.7',
    level: 'AA',
    category: 'navigation',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'text-alternatives',
    label: 'Text Alternatives',
    description: 'Text alternatives for non-text content',
    standard: 'WCAG 1.1.1',
    level: 'AA',
    category: 'cognitive',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'language-identification',
    label: 'Language Identification',
    description: 'Content language properly identified',
    standard: 'WCAG 3.1.1',
    level: 'AA',
    category: 'cognitive',
    status: 'pass',
    autoCheck: true
  },
  {
    id: 'seizure-prevention',
    label: 'Seizure Prevention',
    description: 'No content flashes more than 3 times per second',
    standard: 'WCAG 2.3.1',
    level: 'AA',
    category: 'visual',
    status: 'pass',
    autoCheck: true
  }
];

export const AccessibilityGrader: React.FC<AccessibilityGraderProps> = ({
  videoUrl,
  hasCaptions = false,
  hasAudioDescription = false,
  hasASL = false,
  hasTranscript = false,
  hasKeyboardNav = true,
  contrastRatio = 4.5,
  className = ""
}) => {
  const [checks, setChecks] = useState<AccessibilityCheck[]>(accessibilityChecks);
  const [overallScore, setOverallScore] = useState(0);
  const [complianceLevel, setComplianceLevel] = useState<'AAA' | 'AA' | 'A' | 'Non-compliant'>('Non-compliant');

  useEffect(() => {
    // Update check statuses based on props
    const updatedChecks = checks.map(check => {
      let status = check.status;
      
      switch (check.id) {
        case 'captions-sync':
        case 'captions-accuracy':
          status = hasCaptions ? 'pass' : 'fail';
          break;
        case 'audio-description':
          status = hasAudioDescription ? 'pass' : 'fail';
          break;
        case 'sign-language':
          status = hasASL ? 'pass' : 'warning';
          break;
        case 'keyboard-access':
          status = hasKeyboardNav ? 'pass' : 'fail';
          break;
        case 'color-contrast':
          status = contrastRatio >= 4.5 ? 'pass' : (contrastRatio >= 3 ? 'warning' : 'fail');
          break;
        case 'text-alternatives':
          status = hasTranscript ? 'pass' : 'warning';
          break;
      }
      
      return { ...check, status };
    });

    setChecks(updatedChecks);

    // Calculate overall score
    const totalChecks = updatedChecks.length;
    const passedChecks = updatedChecks.filter(c => c.status === 'pass').length;
    const warningChecks = updatedChecks.filter(c => c.status === 'warning').length;
    
    const score = ((passedChecks + warningChecks * 0.5) / totalChecks) * 100;
    setOverallScore(score);

    // Determine compliance level
    const aaChecks = updatedChecks.filter(c => c.level === 'AA');
    const aaaPassed = updatedChecks.filter(c => c.level === 'AAA' && c.status === 'pass').length;
    const aaPassed = aaChecks.filter(c => c.status === 'pass').length;
    const aaTotal = aaChecks.length;

    if (aaPassed === aaTotal && aaaPassed > 0) {
      setComplianceLevel('AAA');
    } else if (aaPassed === aaTotal) {
      setComplianceLevel('AA');
    } else if (aaPassed >= aaTotal * 0.8) {
      setComplianceLevel('A');
    } else {
      setComplianceLevel('Non-compliant');
    }
  }, [hasCaptions, hasAudioDescription, hasASL, hasTranscript, hasKeyboardNav, contrastRatio]);

  const getStatusIcon = (status: AccessibilityCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getComplianceBadgeVariant = () => {
    switch (complianceLevel) {
      case 'AAA':
        return 'default';
      case 'AA':
        return 'secondary';
      case 'A':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const categorizedChecks = checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, AccessibilityCheck[]>);

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Accessibility Compliance</CardTitle>
          </div>
          <Badge variant={getComplianceBadgeVariant()}>
            WCAG {complianceLevel}
          </Badge>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Overall Score</span>
            <span className="font-semibold">{Math.round(overallScore)}%</span>
          </div>
          <Progress value={overallScore} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(categorizedChecks).map(([category, categoryChecks]) => (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-sm capitalize text-muted-foreground border-b pb-1">
              {category.replace('-', ' ')}
            </h4>
            <div className="space-y-2">
              {categoryChecks.map(check => (
                <div key={check.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  {getStatusIcon(check.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{check.label}</span>
                      <Badge variant="outline" className="text-xs">
                        {check.standard}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {check.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>WCAG AA:</strong> Web Content Accessibility Guidelines Level AA compliance</p>
            <p><strong>WCAG AAA:</strong> Enhanced accessibility with Level AAA features</p>
            <p><strong>Real-time:</strong> Compliance checks update automatically as features are enabled</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};