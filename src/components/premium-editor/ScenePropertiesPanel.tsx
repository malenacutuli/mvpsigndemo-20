/**
 * Scene Properties Panel
 * 
 * Comprehensive editor for scene properties that integrates:
 * - Scene settings (name, layout, duration)
 * - Transcript editing
 * - Character management
 * - Audio descriptions
 * - Sign language clips
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TranscriptEditor } from '@/components/TranscriptEditor';
import { CharacterManager } from '@/components/CharacterManager';
import { AudioDescriptionEditor } from '@/components/AudioDescriptionEditor';
import { SignLanguageUploader } from '@/components/SignLanguageUploader';
import { Scene } from '@/lib/premium-editor/scene-manager';
import { cn } from '@/lib/utils';

interface ScenePropertiesPanelProps {
  scene: Scene;
  videoId: string;
  videoUrl: string;
  videoData?: any;
  onSceneUpdate: (updatedScene: Partial<Scene>) => void;
  onTranscriptUpdate: (segments: any[]) => void;
  onCharactersUpdate: (characters: any[]) => void;
  onAudioDescriptionsUpdate: (descriptions: any[]) => void;
}

const SCENE_LAYOUTS = [
  {
    id: 'fullscreen',
    name: 'Fullscreen',
    description: 'Video fills entire frame',
    icon: '🖼️',
  },
  {
    id: 'pip',
    name: 'Picture-in-Picture',
    description: 'Main video with overlay',
    icon: '📺',
  },
  {
    id: 'split',
    name: 'Split Screen',
    description: 'Two videos side-by-side',
    icon: '⚡',
  },
  {
    id: 'multicam',
    name: 'Multi-camera',
    description: 'Multiple camera angles',
    icon: '📹',
  },
  {
    id: 'intro',
    name: 'Intro',
    description: 'Opening scene template',
    icon: '🎬',
  },
] as const;

export function ScenePropertiesPanel({
  scene,
  videoId,
  videoUrl,
  videoData,
  onSceneUpdate,
  onTranscriptUpdate,
  onCharactersUpdate,
  onAudioDescriptionsUpdate,
}: ScenePropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState('layout');
  const [backgroundType, setBackgroundType] = useState('none');

  const sceneDuration = scene.endTime - scene.startTime;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Scene Header */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-light text-foreground">Scene Properties</h3>
          <Badge variant="outline" className="font-mono font-light">
            {sceneDuration.toFixed(1)}s
          </Badge>
        </div>
        
        {/* Scene Name Input */}
        <div className="space-y-2">
          <Label htmlFor="scene-name" className="text-sm font-light">
            Scene Name
          </Label>
          <Input
            id="scene-name"
            value={scene.name}
            onChange={(e) => onSceneUpdate({ name: e.target.value })}
            placeholder="Enter scene name..."
            className="h-9 font-light"
          />
        </div>

        {/* Scene Order Badge */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-light">
          <span>Order:</span>
          <Badge variant="secondary" className="font-mono font-light">
            #{scene.order + 1}
          </Badge>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full justify-start border-b rounded-none px-4 h-12 bg-muted/30 font-light">
          <TabsTrigger value="layout" className="text-xs">
            Layout
          </TabsTrigger>
          <TabsTrigger value="transcript" className="text-xs">
            Transcript
          </TabsTrigger>
          <TabsTrigger value="characters" className="text-xs">
            Characters
          </TabsTrigger>
          <TabsTrigger value="audio-description" className="text-xs">
            Audio Description
          </TabsTrigger>
          <TabsTrigger value="sign-language" className="text-xs">
            Sign Language
          </TabsTrigger>
        </TabsList>

        {/* LAYOUT TAB */}
        <TabsContent 
          value="layout" 
          className="flex-1 overflow-y-auto p-4 m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="space-y-6">
            {/* Scene Layout Selection */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Scene Layout</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose how this scene is displayed
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {SCENE_LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => onSceneUpdate({ layout: layout.id })}
                    className={cn(
                      'p-3 border-2 rounded-lg text-left transition-all hover:border-primary hover:shadow-sm',
                      scene.layout === layout.id 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border'
                    )}
                  >
                    <div className="text-2xl mb-2">{layout.icon}</div>
                    <div className="font-medium text-sm">{layout.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {layout.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Options (if not fullscreen) */}
            {scene.layout !== 'fullscreen' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Background</Label>
                <Select
                  value={backgroundType}
                  onValueChange={(value) => {
                    setBackgroundType(value);
                    onSceneUpdate({ background: value } as any);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select background" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="blur">Blur</SelectItem>
                    <SelectItem value="color">Solid Color</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Custom Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Timing Controls */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Timing</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="text-xs text-muted-foreground">
                    Start Time (s)
                  </Label>
                  <Input
                    id="start-time"
                    type="number"
                    step="0.1"
                    min="0"
                    value={scene.startTime.toFixed(1)}
                    onChange={(e) => {
                      const newStart = parseFloat(e.target.value);
                      if (!isNaN(newStart) && newStart < scene.endTime) {
                        onSceneUpdate({ 
                          startTime: newStart,
                          duration: scene.endTime - newStart
                        });
                      }
                    }}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time" className="text-xs text-muted-foreground">
                    End Time (s)
                  </Label>
                  <Input
                    id="end-time"
                    type="number"
                    step="0.1"
                    min={scene.startTime + 0.1}
                    value={scene.endTime.toFixed(1)}
                    onChange={(e) => {
                      const newEnd = parseFloat(e.target.value);
                      if (!isNaN(newEnd) && newEnd > scene.startTime) {
                        onSceneUpdate({ 
                          endTime: newEnd,
                          duration: newEnd - scene.startTime
                        });
                      }
                    }}
                    className="h-9 font-mono"
                  />
                </div>
              </div>
              
              {/* Duration Display */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-mono font-medium">{sceneDuration.toFixed(2)}s</span>
                </div>
              </div>
            </div>

            {/* Speaker Info */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Speaker</Label>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: scene.speakerColor }}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm">{scene.speaker || 'Unknown'}</div>
                  {scene.characterType && (
                    <div className="text-xs text-muted-foreground capitalize">
                      {scene.characterType}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TRANSCRIPT TAB */}
        <TabsContent 
          value="transcript" 
          className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 overflow-y-auto">
            <TranscriptEditor
              videoUrl={videoUrl}
              videoId={videoId}
              onTranscriptUpdate={(segments) => {
                onTranscriptUpdate(segments);
              }}
            />
          </div>
        </TabsContent>

        {/* CHARACTERS TAB */}
        <TabsContent 
          value="characters" 
          className="flex-1 overflow-hidden m-0 p-4 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 overflow-y-auto">
            <CharacterManager
              videoId={videoId}
              onCharactersUpdate={(characters) => {
                onCharactersUpdate(characters);
                // Update scene speaker color if changed
                const sceneCharacter = characters.find(c => c.name === scene.speaker);
                if (sceneCharacter) {
                  onSceneUpdate({ 
                    speakerColor: sceneCharacter.color,
                    characterType: sceneCharacter.type as any
                  });
                }
              }}
            />
          </div>
        </TabsContent>

        {/* AUDIO DESCRIPTION TAB */}
        <TabsContent 
          value="audio-description" 
          className="flex-1 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 overflow-y-auto">
            <AudioDescriptionEditor
              videoUrl={videoUrl}
              videoId={videoId}
              videoData={videoData}
              onDescriptionsUpdate={(descriptions) => {
                // Convert to proper format and update parent
                const formatted = descriptions.map(d => ({
                  id: d.id || '',
                  video_id: videoId,
                  start_time: d.startTime,
                  end_time: d.endTime,
                  description: d.text,
                  audio_url: d.audio_url
                }));
                onAudioDescriptionsUpdate(formatted);
                onSceneUpdate({
                  audioDescriptions: formatted,
                  hasAudioDescription: formatted.length > 0
                });
              }}
            />
          </div>
        </TabsContent>

        {/* SIGN LANGUAGE TAB - Use existing component */}
        <TabsContent 
          value="sign-language" 
          className="flex-1 overflow-hidden m-0 p-4 data-[state=active]:flex data-[state=active]:flex-col"
        >
          <div className="flex-1 overflow-y-auto">
            <SignLanguageUploader
              videoId={videoId}
              segmentId={scene.transcriptSegmentId}
              startTimeMs={scene.startTime * 1000}
              endTimeMs={scene.endTime * 1000}
              existingClipUrl={scene.signLanguageClipUrl}
              onUploadComplete={(clipUrl) => {
                onSceneUpdate({
                  signLanguageClipUrl: clipUrl,
                  hasSignLanguage: !!clipUrl
                });
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
