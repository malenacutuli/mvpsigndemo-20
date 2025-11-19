import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePremiumScene } from '@/hooks/premium-editor/usePremiumScene';
import { LayoutSelector } from './LayoutSelector';
import { BackgroundEditor } from './BackgroundEditor';
import { Loader2 } from 'lucide-react';

interface ScenePropertiesPanelProps {
  sceneId: string | null;
  onSceneUpdate?: () => void;
}

export function ScenePropertiesPanel({ sceneId, onSceneUpdate }: ScenePropertiesPanelProps) {
  const {
    scene,
    loading,
    saving,
    updateScene,
    updateLayout,
    updateBackground,
    updateDuration
  } = usePremiumScene({ sceneId, onSceneUpdate });

  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');

  // Sync local state with scene
  React.useEffect(() => {
    if (scene) {
      setLocalName(scene.name || '');
      setLocalDescription(scene.visual_description || '');
    }
  }, [scene]);

  if (!sceneId) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-muted-foreground mb-2">No scene selected</p>
          <p className="text-sm text-muted-foreground">Select a scene from the timeline to edit its properties</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-muted-foreground">Scene not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="basic" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none bg-transparent border-b p-0">
          <TabsTrigger value="basic" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Basic
          </TabsTrigger>
          <TabsTrigger value="layout" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Layout
          </TabsTrigger>
          <TabsTrigger value="background" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
            Background
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Basic Properties */}
          <TabsContent value="basic" className="p-4 space-y-4 m-0">
            <div className="space-y-2">
              <Label htmlFor="scene-name">Scene Name</Label>
              <Input
                id="scene-name"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                onBlur={() => updateScene({ name: localName })}
                placeholder="Enter scene name..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scene-description">Description</Label>
              <Textarea
                id="scene-description"
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                onBlur={() => updateScene({ visual_description: localDescription })}
                placeholder="Enter scene description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scene-duration">Duration (seconds)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="scene-duration"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={scene.duration_seconds || 0}
                  onChange={(e) => updateDuration(parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {formatTime(scene.duration_seconds || 0)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label>Timeline Position</Label>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-mono">{formatTime(scene.timeline_start || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-mono">{formatTime(scene.timeline_end || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order:</span>
                  <span className="font-mono">#{scene.scene_order + 1}</span>
                </div>
              </div>
            </div>

            {scene.media_url && (
              <div className="pt-4 border-t">
                <Label className="mb-2 block">Media Trim</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trim Start:</span>
                    <span className="font-mono">{formatTime(scene.media_start_time || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trim End:</span>
                    <span className="font-mono">{formatTime(scene.media_end_time || (scene.duration_seconds || 0))}</span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Layout */}
          <TabsContent value="layout" className="p-4 m-0">
            <LayoutSelector
              currentLayout={scene.layout_type}
              onLayoutChange={(layout) => updateLayout(layout)}
            />
          </TabsContent>

          {/* Background */}
          <TabsContent value="background" className="p-4 m-0">
            <BackgroundEditor
              backgroundType={scene.background_type}
              backgroundConfig={scene.background_config || {}}
              onBackgroundChange={(type, config) => updateBackground(type, config)}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Save indicator */}
      {saving && (
        <div className="flex-shrink-0 bg-primary/10 border-t border-primary/20 p-2 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-primary">Saving...</span>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00.0';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}
