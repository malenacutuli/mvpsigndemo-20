'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SpeakerDiarizationService } from '@/lib/premium/speakerDiarization';
import { PremiumTranscript, PremiumCharacter } from '@/types/premium-transcript';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface AutoAssignSpeakersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  segments: PremiumTranscript[];
  characters: PremiumCharacter[];
  onComplete: () => void;
}

export function AutoAssignSpeakersDialog({
  open,
  onOpenChange,
  projectId,
  segments,
  characters,
  onComplete
}: AutoAssignSpeakersDialogProps) {
  const [step, setStep] = useState<'analyze' | 'review' | 'processing' | 'complete'>('analyze');
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedMappings, setSelectedMappings] = useState<Record<string, string>>({});
  const [createNewCharacters, setCreateNewCharacters] = useState(true);

  useEffect(() => {
    if (open && step === 'analyze') {
      analyzePatterns();
    }
  }, [open, segments]);

  const analyzePatterns = () => {
    const patterns = SpeakerDiarizationService.analyzeSpeakerPatterns(segments);
    
    const suggestions: Record<string, {
      speaker: string;
      stats: any;
      suggestedCharacter: PremiumCharacter | null;
      suggestedType: string;
    }> = {};

    Object.entries(patterns).forEach(([speaker, stats]) => {
      const exactMatch = characters.find(
        c => c.name.toLowerCase() === speaker.toLowerCase()
      );

      const similarMatch = !exactMatch && characters.find(
        c => c.name.toLowerCase().includes(speaker.toLowerCase()) ||
             speaker.toLowerCase().includes(c.name.toLowerCase())
      );

      suggestions[speaker] = {
        speaker,
        stats,
        suggestedCharacter: exactMatch || similarMatch || null,
        suggestedType: SpeakerDiarizationService.suggestCharacterType(speaker, patterns)
      };

      if (exactMatch) {
        setSelectedMappings(prev => ({ ...prev, [speaker]: exactMatch.id }));
      }
    });

    setAnalysis(suggestions);
    setStep('review');
  };

  const handleAssign = async () => {
    try {
      setStep('processing');

      if (createNewCharacters) {
        const unmappedSpeakers = Object.keys(analysis).filter(
          speaker => !selectedMappings[speaker]
        );

        if (unmappedSpeakers.length > 0) {
          const unmappedSegments = segments.filter(
            seg => unmappedSpeakers.includes(seg.speaker_normalized || seg.speaker || '')
          );

          const newCharacters = await SpeakerDiarizationService.createCharactersFromSpeakers(
            projectId,
            unmappedSegments,
            characters
          );

          newCharacters.forEach(char => {
            const speaker = Object.keys(analysis).find(
              s => s.toLowerCase() === char.name.toLowerCase()
            );
            if (speaker) {
              selectedMappings[speaker] = char.id;
            }
          });
        }
      }

      for (const [speaker, characterId] of Object.entries(selectedMappings)) {
        const speakerSegments = segments.filter(
          seg => (seg.speaker_normalized || seg.speaker) === speaker
        );

        if (speakerSegments.length > 0 && characterId) {
          const character = characters.find(c => c.id === characterId);
          if (character) {
            await SpeakerDiarizationService.autoAssignSpeakers(
              projectId,
              speakerSegments,
              [character]
            );
          }
        }
      }

      setStep('complete');
      
      setTimeout(() => {
        onComplete();
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to auto-assign:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Auto-Assign Speakers</DialogTitle>
          <DialogDescription>
            Automatically assign transcript speakers to characters
          </DialogDescription>
        </DialogHeader>

        {step === 'analyze' && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {step === 'review' && analysis && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Review Assignments</p>
                <p>
                  {Object.keys(analysis).length} speakers detected. 
                  Review and adjust character assignments below.
                </p>
              </div>
            </div>

            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {Object.values(analysis).map((item: any) => (
                  <SpeakerMappingItem
                    key={item.speaker}
                    speaker={item.speaker}
                    stats={item.stats}
                    suggestedCharacter={item.suggestedCharacter}
                    suggestedType={item.suggestedType}
                    characters={characters}
                    selectedCharacterId={selectedMappings[item.speaker]}
                    onSelectCharacter={(characterId) =>
                      setSelectedMappings(prev => ({ ...prev, [item.speaker]: characterId }))
                    }
                  />
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 pt-3 border-t">
              <input
                type="checkbox"
                id="create-new"
                checked={createNewCharacters}
                onChange={(e) => setCreateNewCharacters(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="create-new" className="text-sm text-muted-foreground">
                Automatically create characters for unmapped speakers
              </label>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="font-medium">Assigning speakers...</p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="font-medium mb-2">Assignment Complete!</p>
              <p className="text-sm text-muted-foreground">
                Speakers have been assigned to characters
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssign}>
                Assign Speakers
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SpeakerMappingItemProps {
  speaker: string;
  stats: any;
  suggestedCharacter: PremiumCharacter | null;
  suggestedType: string;
  characters: PremiumCharacter[];
  selectedCharacterId: string | undefined;
  onSelectCharacter: (characterId: string) => void;
}

function SpeakerMappingItem({
  speaker,
  stats,
  suggestedCharacter,
  suggestedType,
  characters,
  selectedCharacterId,
  onSelectCharacter
}: SpeakerMappingItemProps) {
  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{speaker}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {stats.segmentCount} segments
            </Badge>
            <Badge variant="outline" className="text-xs">
              {Math.round(stats.totalDuration)}s
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {suggestedType}
            </Badge>
          </div>
        </div>

        {suggestedCharacter && (
          <Badge className="gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: suggestedCharacter.color }}
            />
            Suggested
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Assign to Character:</label>
        <select
          value={selectedCharacterId || ''}
          onChange={(e) => onSelectCharacter(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm bg-background"
        >
          <option value="">-- Create New Character --</option>
          {characters.map((char) => (
            <option key={char.id} value={char.id}>
              {char.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
