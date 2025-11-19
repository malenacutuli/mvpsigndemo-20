'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PremiumTranscriptEditor } from '../workflow/PremiumTranscriptEditor';
import { PremiumCharacterManager } from '../workflow/PremiumCharacterManager';
import { ScenePropertiesPanel } from './ScenePropertiesPanel';
import { SentimentVisualizer } from '../transcript/SentimentVisualizer';
import { GenerateTranscriptDialog } from '../dialogs/GenerateTranscriptDialog';
import { AutoAssignSpeakersDialog } from '../dialogs/AutoAssignSpeakersDialog';
import { usePremiumTranscript } from '@/hooks/premium-editor/usePremiumTranscript';
import { usePremiumCharacters } from '@/hooks/premium-editor/usePremiumCharacters';
import { FileText, Users, Sliders, BarChart3, Sparkles } from 'lucide-react';

interface PremiumEditorRightSidebarProps {
  projectId: string;
  videoId: string;
  videoUrl: string;
  currentTime: number;
  duration: number;
  selectedSceneId: string | null;
  onSeekToTime: (time: number) => void;
  onSceneUpdate?: () => void;
  onTranscriptChange?: () => void;
}

export function PremiumEditorRightSidebar({
  projectId,
  videoId,
  videoUrl,
  currentTime,
  duration,
  selectedSceneId,
  onSeekToTime,
  onSceneUpdate,
  onTranscriptChange
}: PremiumEditorRightSidebarProps) {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showAutoAssignDialog, setShowAutoAssignDialog] = useState(false);

  const transcript = usePremiumTranscript({
    projectId,
    onTranscriptChange
  });

  const charactersHook = usePremiumCharacters({
    videoId,
    onCharactersChange: onTranscriptChange
  });

  return (
    <>
      <div className="h-full flex flex-col bg-background">
        <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start rounded-none bg-transparent border-b p-0">
            <TabsTrigger
              value="transcript"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
            >
              <FileText className="w-4 h-4" />
              Transcript
            </TabsTrigger>
            <TabsTrigger
              value="characters"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
            >
              <Users className="w-4 h-4" />
              Characters
            </TabsTrigger>
            <TabsTrigger
              value="sentiment"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Sentiment
            </TabsTrigger>
            <TabsTrigger
              value="properties"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary gap-2"
            >
              <Sliders className="w-4 h-4" />
              Properties
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="transcript" className="h-full m-0">
              {transcript.segments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-foreground font-medium mb-2">
                    No Transcript Yet
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a transcript to enable text-based editing
                  </p>
                  <Button onClick={() => setShowGenerateDialog(true)}>
                    Generate Transcript
                  </Button>
                </div>
              ) : (
                <PremiumTranscriptEditor
                  projectId={projectId}
                  currentTime={currentTime}
                  onSeekToTime={onSeekToTime}
                  onTranscriptChange={onTranscriptChange}
                  characters={charactersHook.characters}
                />
              )}
            </TabsContent>

            <TabsContent value="characters" className="h-full m-0">
              <PremiumCharacterManager
                videoId={videoId}
                onCharactersChange={onTranscriptChange}
              />
              
              {transcript.segments.length > 0 && charactersHook.characters.length > 0 && (
                <div className="p-4 border-t">
                  <Button
                    onClick={() => setShowAutoAssignDialog(true)}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <Sparkles className="w-4 h-4" />
                    Auto-Assign Speakers
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sentiment" className="h-full m-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  {transcript.allSegments.length > 0 ? (
                    <SentimentVisualizer
                      segments={transcript.allSegments}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={onSeekToTime}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-foreground font-medium mb-2">
                        No Sentiment Data
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Generate a transcript with sentiment analysis enabled
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="properties" className="h-full m-0">
              <ScenePropertiesPanel
                sceneId={selectedSceneId}
                onSceneUpdate={onSceneUpdate}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Dialogs */}
      <GenerateTranscriptDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        projectId={projectId}
        videoUrl={videoUrl}
        onComplete={() => {
          transcript.reloadTranscript();
          onTranscriptChange?.();
        }}
      />

      <AutoAssignSpeakersDialog
        open={showAutoAssignDialog}
        onOpenChange={setShowAutoAssignDialog}
        projectId={projectId}
        segments={transcript.allSegments}
        characters={charactersHook.characters}
        onComplete={() => {
          transcript.reloadTranscript();
          onTranscriptChange?.();
        }}
      />
    </>
  );
}
