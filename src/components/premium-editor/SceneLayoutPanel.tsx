import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Maximize,
  Columns,
  PictureInPicture2,
  Grid3x3,
  Monitor,
  Users,
  Sparkles,
  Move,
  Palette
} from 'lucide-react';

const layoutPresets = [
  { 
    id: 'fullscreen', 
    name: 'Fullscreen', 
    icon: Maximize,
    description: 'Single video fills entire frame',
    config: { primary: { x: 0, y: 0, width: 1920, height: 1080 } }
  },
  { 
    id: 'split', 
    name: 'Split Screen', 
    icon: Columns,
    description: 'Two videos side by side',
    config: { primary: { x: 0, y: 0, width: 960, height: 1080 } }
  },
  { 
    id: 'pip', 
    name: 'Picture in Picture', 
    icon: PictureInPicture2,
    description: 'Small video over main video',
    config: { primary: { x: 0, y: 0, width: 1920, height: 1080 } }
  },
  { 
    id: 'grid', 
    name: 'Grid', 
    icon: Grid3x3,
    description: 'Multiple videos in grid',
    config: { primary: { x: 0, y: 0, width: 960, height: 540 } }
  },
  { 
    id: 'presenter', 
    name: 'Presenter', 
    icon: Monitor,
    description: 'Screen with camera overlay',
    config: { primary: { x: 240, y: 0, width: 1440, height: 1080 } }
  },
  { 
    id: 'interview', 
    name: 'Interview', 
    icon: Users,
    description: 'Two people conversation',
    config: { primary: { x: 0, y: 180, width: 720, height: 720 } }
  }
];

const transitions = [
  { id: 'cut', name: 'Cut' },
  { id: 'fade', name: 'Fade' },
  { id: 'slide', name: 'Slide' },
  { id: 'wipe', name: 'Wipe' },
  { id: 'zoom', name: 'Zoom' },
  { id: 'dissolve', name: 'Dissolve' },
  { id: 'blur', name: 'Blur' }
];

export function SceneLayoutPanel() {
  const [selectedLayout, setSelectedLayout] = useState('fullscreen');
  const [selectedTransition, setSelectedTransition] = useState('cut');
  
  const store = usePremiumEditor();
  
  // For now, use empty arrays until we integrate with the real store
  const tracks: any[] = [];
  const selectedScenes: string[] = [];
  const updateScene = (id: string, updates: any) => {
    console.log('updateScene', id, updates);
  };

  const applyLayout = (layoutId: string) => {
    if (selectedScenes.length === 0) {
      toast.error('Select a scene first');
      return;
    }

    const preset = layoutPresets.find(p => p.id === layoutId);
    if (!preset) return;
    
    selectedScenes.forEach(sceneId => {
      updateScene(sceneId, {
        layout: layoutId as any,
        position: preset.config.primary
      });
    });

    toast.success(`Applied ${preset.name} layout`);
  };

  const applyTransition = (transitionId: string) => {
    if (selectedScenes.length === 0) {
      toast.error('Select a scene first');
      return;
    }

    selectedScenes.forEach(sceneId => {
      updateScene(sceneId, {
        transitions: {
          in: transitionId as any,
          out: transitionId as any
        }
      });
    });

    toast.success(`Applied ${transitionId} transition`);
  };

  const getSelectedScene = () => {
    if (selectedScenes.length !== 1) return null;
    return tracks.flatMap(t => t.scenes).find(s => s.id === selectedScenes[0]);
  };

  const selectedScene = getSelectedScene();

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Scene Composition
          </CardTitle>
          <CardDescription>
            Configure layouts and transitions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="layout">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="transition">Transition</TabsTrigger>
            </TabsList>

            <TabsContent value="layout" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                {layoutPresets.map((layout) => {
                  const Icon = layout.icon;
                  return (
                    <Card
                      key={layout.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg",
                        selectedLayout === layout.id && "ring-2 ring-primary"
                      )}
                      onClick={() => {
                        setSelectedLayout(layout.id);
                        applyLayout(layout.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <Icon className="w-8 h-8" />
                          <h4 className="font-medium text-sm">{layout.name}</h4>
                          <p className="text-xs text-muted-foreground">{layout.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {selectedScene && (
                <Card className="p-4 bg-muted/30">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Move className="w-4 h-4" />
                    Position & Size
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">X: {selectedScene.position.x}px</Label>
                      <Slider
                        value={[selectedScene.position.x]}
                        min={0}
                        max={1920}
                        step={10}
                        onValueChange={([x]) => {
                          updateScene(selectedScene.id, {
                            position: { ...selectedScene.position, x }
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Y: {selectedScene.position.y}px</Label>
                      <Slider
                        value={[selectedScene.position.y]}
                        min={0}
                        max={1080}
                        step={10}
                        onValueChange={([y]) => {
                          updateScene(selectedScene.id, {
                            position: { ...selectedScene.position, y }
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">W: {selectedScene.position.width}px</Label>
                      <Slider
                        value={[selectedScene.position.width]}
                        min={100}
                        max={1920}
                        step={10}
                        onValueChange={([width]) => {
                          updateScene(selectedScene.id, {
                            position: { ...selectedScene.position, width }
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">H: {selectedScene.position.height}px</Label>
                      <Slider
                        value={[selectedScene.position.height]}
                        min={100}
                        max={1080}
                        step={10}
                        onValueChange={([height]) => {
                          updateScene(selectedScene.id, {
                            position: { ...selectedScene.position, height }
                          });
                        }}
                      />
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="transition" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                {transitions.map((transition) => (
                  <Button
                    key={transition.id}
                    variant={selectedTransition === transition.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => {
                      setSelectedTransition(transition.id);
                      applyTransition(transition.id);
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {transition.name}
                  </Button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
