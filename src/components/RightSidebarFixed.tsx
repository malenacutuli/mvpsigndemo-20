import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TranscriptEditor } from './TranscriptEditor';
import { CharacterManager } from './CharacterManager';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';

interface RightSidebarFixedProps {
  videoId: string;
  videoUrl: string;
  onTranscriptUpdate?: (segments: any[], language: string) => void;
  onCharactersUpdate?: (characters: any[]) => void;
  onAudioDescriptionsUpdate?: (descriptions: any[]) => void;
}

export function RightSidebarFixed({ 
  videoId,
  videoUrl,
  onTranscriptUpdate,
  onCharactersUpdate,
  onAudioDescriptionsUpdate 
}: RightSidebarFixedProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="transcript" className="flex-1 flex flex-col">
        {/* Tab navigation - fixed at top */}
        <div className="flex-shrink-0 border-b border-border">
          <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-12">
            <TabsTrigger 
              value="transcript"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Transcript
            </TabsTrigger>
            <TabsTrigger 
              value="characters"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Characters
            </TabsTrigger>
            <TabsTrigger 
              value="accessibility"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              Accessibility
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Tab content - scrollable */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="transcript" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                <TranscriptEditor 
                  videoUrl={videoUrl}
                  videoId={videoId}
                  onTranscriptUpdate={onTranscriptUpdate}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="characters" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                <CharacterManager 
                  videoId={videoId}
                  onCharactersUpdate={onCharactersUpdate}
                />
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="accessibility" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4">
                <AudioDescriptionEditor 
                  videoUrl={videoUrl}
                  videoId={videoId}
                  onDescriptionsUpdate={onAudioDescriptionsUpdate}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
