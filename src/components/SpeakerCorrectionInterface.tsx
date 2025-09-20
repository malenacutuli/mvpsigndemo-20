import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Users, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SpeakerSegment {
  id: string;
  text: string;
  start_time: number;
  end_time: number;
  speaker: string;
  speaker_color: string;
  confidence: number;
}

interface Character {
  id: string;
  name: string;
  color: string;
}

interface SpeakerCorrectionInterfaceProps {
  videoId: string;
  segments: SpeakerSegment[];
  characters: Character[];
  onCorrection: (corrections: Record<string, string>) => void;
}

export const SpeakerCorrectionInterface: React.FC<SpeakerCorrectionInterfaceProps> = ({
  videoId,
  segments,
  characters,
  onCorrection
}) => {
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [lowConfidenceSegments, setLowConfidenceSegments] = useState<SpeakerSegment[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Find segments with low confidence or suspicious speaker changes
    const suspicious = segments.filter(seg => 
      seg.confidence < 0.8 || 
      isFrequentSpeakerSwitch(seg, segments)
    ).slice(0, 20); // Show top 20 suspicious segments
    
    setLowConfidenceSegments(suspicious);
  }, [segments]);

  const isFrequentSpeakerSwitch = (segment: SpeakerSegment, allSegments: SpeakerSegment[]): boolean => {
    const segmentIndex = allSegments.findIndex(s => s.id === segment.id);
    if (segmentIndex === -1) return false;
    
    const prevSegment = allSegments[segmentIndex - 1];
    const nextSegment = allSegments[segmentIndex + 1];
    
    // Flag if speaker changes rapidly (within 5 seconds)
    return (
      (prevSegment && prevSegment.speaker !== segment.speaker && (segment.start_time - prevSegment.end_time) < 5) ||
      (nextSegment && nextSegment.speaker !== segment.speaker && (nextSegment.start_time - segment.end_time) < 5)
    );
  };

  const handleSpeakerChange = (segmentId: string, newSpeaker: string) => {
    setCorrections(prev => ({
      ...prev,
      [segmentId]: newSpeaker
    }));
  };

  const applyCorrections = async () => {
    if (Object.keys(corrections).length === 0) {
      toast({
        title: "No corrections to apply",
        description: "Please select speakers to correct first"
      });
      return;
    }

    setIsApplying(true);
    try {
      // Update segments in database
      for (const [segmentId, newSpeaker] of Object.entries(corrections)) {
        const character = characters.find(c => c.name === newSpeaker);
        
        await supabase
          .from('transcript_segments')
          .update({ 
            speaker: newSpeaker,
            speaker_color: character?.color || '#3B82F6'
          })
          .eq('id', segmentId);
      }

      toast({
        title: "Speaker corrections applied",
        description: `Updated ${Object.keys(corrections).length} segments`
      });

      onCorrection(corrections);
      setCorrections({});
    } catch (error) {
      console.error('Failed to apply corrections:', error);
      toast({
        title: "Failed to apply corrections",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsApplying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (lowConfidenceSegments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Speaker Identification Looks Good
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All speaker identifications have high confidence scores. No corrections needed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Speaker Identification Review
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Review and correct speaker assignments for segments with low confidence or suspicious changes
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowConfidenceSegments.map((segment) => (
          <div key={segment.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="font-medium">{formatTime(segment.start_time)} - {formatTime(segment.end_time)}</span>
                <Badge variant={segment.confidence < 0.6 ? 'destructive' : 'secondary'}>
                  {Math.round(segment.confidence * 100)}% confidence
                </Badge>
              </div>
              <Select
                value={corrections[segment.id] || segment.speaker}
                onValueChange={(value) => handleSpeakerChange(segment.id, value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((character) => (
                    <SelectItem key={character.id} value={character.name}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: character.color }}
                        />
                        {character.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm bg-muted p-2 rounded italic">
              "{segment.text}"
            </p>
          </div>
        ))}
        
        {Object.keys(corrections).length > 0 && (
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={applyCorrections}
              disabled={isApplying}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              {isApplying ? 'Applying...' : `Apply ${Object.keys(corrections).length} Corrections`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};