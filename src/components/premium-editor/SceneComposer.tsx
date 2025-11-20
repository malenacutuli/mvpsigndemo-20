import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useProjectScenes, useAddScene, useUpdateScene, useDeleteScene, useReorderScenes } from '@/hooks/useSceneComposition';
import { Plus, Trash2, GripVertical, Copy, Layout, Video, Clock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type LayoutType = 
  | 'fullscreen'
  | 'split-horizontal'
  | 'split-vertical'
  | 'pip-corner'
  | 'pip-side'
  | 'grid-2x2';

interface SceneComposerProps {
  projectId?: string;
  videoId?: string;
  onSceneSelect?: (sceneId: string) => void;
}

export function SceneComposer({ projectId, videoId, onSceneSelect }: SceneComposerProps) {
  const { data: scenes = [] } = useProjectScenes(projectId || '');
  const addScene = useAddScene();
  const updateScene = useUpdateScene();
  const deleteScene = useDeleteScene();
  const reorderScenes = useReorderScenes();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  
  // New scene form state
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneLayout, setNewSceneLayout] = useState<LayoutType>('fullscreen');
  const [newSceneStartTime, setNewSceneStartTime] = useState('0');
  const [newSceneEndTime, setNewSceneEndTime] = useState('10');
  const [newSceneTransition, setNewSceneTransition] = useState('fade');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSceneId) return;

      if (e.key === 'Delete') {
        e.preventDefault();
        handleDeleteScene(selectedSceneId);
      } else if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        handleDuplicateScene(selectedSceneId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSceneId]);

  const handleAddScene = () => {
    if (!projectId || !videoId) {
      toast.error('Project ID and Video ID are required');
      return;
    }

    const startTime = parseFloat(newSceneStartTime);
    const endTime = parseFloat(newSceneEndTime);

    if (isNaN(startTime) || isNaN(endTime)) {
      toast.error('Invalid time values');
      return;
    }

    if (startTime >= endTime) {
      toast.error('Start time must be less than end time');
      return;
    }

    addScene.mutate({
      projectId,
      videoId,
      startTime,
      endTime,
      layoutType: newSceneLayout,
      sceneName: newSceneName || `Scene ${scenes.length + 1}`
    }, {
      onSuccess: () => {
        toast.success('Scene added successfully');
        setCreateDialogOpen(false);
        setNewSceneName('');
        setNewSceneStartTime('0');
        setNewSceneEndTime('10');
        setNewSceneLayout('fullscreen');
      },
      onError: (error) => {
        toast.error('Failed to add scene', {
          description: error.message
        });
      }
    });
  };

  const handleLayoutChange = (sceneId: string, layoutType: LayoutType) => {
    updateScene.mutate({
      sceneId,
      updates: { layout_type: layoutType }
    }, {
      onSuccess: () => {
        toast.success('Layout updated');
      }
    });
  };

  const handleSceneTiming = (sceneId: string, field: 'start' | 'end', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const updates = field === 'start' 
      ? { timeline_start: numValue }
      : { timeline_end: numValue };

    updateScene.mutate({
      sceneId,
      updates
    });
  };

  const handleSceneTransition = (sceneId: string, transitionType: string) => {
    updateScene.mutate({
      sceneId,
      updates: { transition_type: transitionType }
    });
  };

  const handleSceneName = (sceneId: string, name: string) => {
    updateScene.mutate({
      sceneId,
      updates: { name }
    });
  };

  const handleDeleteScene = (sceneId: string) => {
    deleteScene.mutate(sceneId, {
      onSuccess: () => {
        toast.success('Scene deleted');
        if (selectedSceneId === sceneId) {
          setSelectedSceneId(null);
        }
      },
      onError: (error) => {
        toast.error('Failed to delete scene', {
          description: error.message
        });
      }
    });
  };

  const handleDuplicateScene = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !projectId || !videoId) return;

    addScene.mutate({
      projectId,
      videoId,
      startTime: scene.timeline_start || 0,
      endTime: scene.timeline_end || 10,
      layoutType: scene.layout_type,
      sceneName: `${scene.name || 'Scene'} (Copy)`
    }, {
      onSuccess: () => {
        toast.success('Scene duplicated');
      }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !projectId) return;

    const items = Array.from(scenes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const sceneIds = items.map(scene => scene.id);

    reorderScenes.mutate({
      projectId,
      sceneIds
    }, {
      onSuccess: () => {
        toast.success('Scenes reordered');
      },
      onError: (error) => {
        toast.error('Failed to reorder scenes', {
          description: error.message
        });
      }
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLayoutIcon = (layoutType: string) => {
    const icons: Record<string, string> = {
      'fullscreen': '⬜',
      'split-horizontal': '⬛⬛',
      'split-vertical': '⬆️⬇️',
      'pip-corner': '📺',
      'pip-side': '▫️▪️',
      'grid-2x2': '⊞'
    };
    return icons[layoutType] || '⬜';
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scene Composition</h3>
          <p className="text-sm text-muted-foreground">
            Arrange your video with different layouts and transitions
          </p>
        </div>
        
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!projectId || !videoId}>
              <Plus className="w-4 h-4 mr-2" />
              Add Scene
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Scene</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Scene Name</Label>
                <Input
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder={`Scene ${scenes.length + 1}`}
                />
              </div>

              <div className="space-y-2">
                <Label>Layout Type</Label>
                <Select value={newSceneLayout} onValueChange={(v) => setNewSceneLayout(v as LayoutType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fullscreen">
                      <span className="flex items-center gap-2">
                        {getLayoutIcon('fullscreen')} Fullscreen
                      </span>
                    </SelectItem>
                    <SelectItem value="split-horizontal">
                      <span className="flex items-center gap-2">
                        {getLayoutIcon('split-horizontal')} Split Horizontal
                      </span>
                    </SelectItem>
                    <SelectItem value="split-vertical">
                      <span className="flex items-center gap-2">
                        {getLayoutIcon('split-vertical')} Split Vertical
                      </span>
                    </SelectItem>
                    <SelectItem value="pip-corner">
                      <span className="flex items-center gap-2">
                        {getLayoutIcon('pip-corner')} Picture-in-Picture (Corner)
                      </span>
                    </SelectItem>
                    <SelectItem value="pip-side">
                      <span className="flex items-center gap-2">
                        {getLayoutIcon('pip-side')} Picture-in-Picture (Side)
                      </span>
                    </SelectItem>
                    <SelectItem value="grid-2x2">
                      <span className="flex items-center gap-2">
                        {getLayoutIcon('grid-2x2')} Grid 2x2
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <LayoutPreview layoutType={newSceneLayout} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newSceneStartTime}
                    onChange={(e) => setNewSceneStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={newSceneEndTime}
                    onChange={(e) => setNewSceneEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Transition</Label>
                <Select value={newSceneTransition} onValueChange={setNewSceneTransition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Transition</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="crossfade">Crossfade</SelectItem>
                    <SelectItem value="wipe">Wipe</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAddScene} 
                disabled={addScene.isPending}
                className="w-full"
              >
                {addScene.isPending ? 'Creating...' : 'Create Scene'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {scenes.length === 0 ? (
        <Card className="p-8 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="font-medium mb-2">No scenes yet</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first scene to start composing your video
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={!projectId || !videoId}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Scene
          </Button>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="scenes">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={cn(
                  "space-y-2",
                  snapshot.isDraggingOver && "bg-accent/20 rounded-lg p-2"
                )}
              >
                {scenes.map((scene, index) => (
                  <Draggable key={scene.id} draggableId={scene.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "transition-all",
                          snapshot.isDragging && "shadow-lg rotate-2",
                          selectedSceneId === scene.id && "ring-2 ring-primary"
                        )}
                        onClick={() => {
                          setSelectedSceneId(scene.id);
                          onSceneSelect?.(scene.id);
                        }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing mt-1"
                            >
                              <GripVertical className="w-5 h-5 text-muted-foreground" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Input
                                  value={scene.name || `Scene ${index + 1}`}
                                  onChange={(e) => handleSceneName(scene.id, e.target.value)}
                                  className="h-8 font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                
                                <Badge variant="secondary" className="shrink-0">
                                  <Layout className="w-3 h-3 mr-1" />
                                  {scene.layout_type}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {formatDuration(scene.duration_seconds)}
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <div className="rounded-lg overflow-hidden border">
                            <LayoutPreview layoutType={scene.layout_type as LayoutType} />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Layout</Label>
                            <Select
                              value={scene.layout_type}
                              onValueChange={(v) => handleLayoutChange(scene.id, v as LayoutType)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fullscreen">Fullscreen</SelectItem>
                                <SelectItem value="split-horizontal">Split Horizontal</SelectItem>
                                <SelectItem value="split-vertical">Split Vertical</SelectItem>
                                <SelectItem value="pip-corner">PIP Corner</SelectItem>
                                <SelectItem value="pip-side">PIP Side</SelectItem>
                                <SelectItem value="grid-2x2">Grid 2x2</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Start (s)</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={scene.timeline_start || 0}
                                onChange={(e) => handleSceneTiming(scene.id, 'start', e.target.value)}
                                step="0.1"
                                min="0"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">End (s)</Label>
                              <Input
                                type="number"
                                className="h-8"
                                value={scene.timeline_end || 0}
                                onChange={(e) => handleSceneTiming(scene.id, 'end', e.target.value)}
                                step="0.1"
                                min="0"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Transition</Label>
                            <Select
                              value={scene.transition_type}
                              onValueChange={(v) => handleSceneTransition(scene.id, v)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Transition</SelectItem>
                                <SelectItem value="fade">Fade</SelectItem>
                                <SelectItem value="crossfade">Crossfade</SelectItem>
                                <SelectItem value="wipe">Wipe</SelectItem>
                                <SelectItem value="slide">Slide</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>

                        <CardFooter className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateScene(scene.id);
                            }}
                            className="flex-1"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Duplicate
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScene(scene.id);
                            }}
                            className="flex-1"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Keyboard shortcuts:</strong> Delete = Delete scene, Ctrl+D = Duplicate scene
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LayoutPreview({ layoutType }: { layoutType: LayoutType }) {
  const layouts: Record<LayoutType, JSX.Element> = {
    fullscreen: (
      <div className="w-full h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white font-medium">
        Fullscreen
      </div>
    ),
    'split-horizontal': (
      <div className="flex gap-1 h-32">
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-sm">
          Left
        </div>
        <div className="flex-1 bg-gradient-to-br from-green-500 to-green-600 rounded flex items-center justify-center text-white text-sm">
          Right
        </div>
      </div>
    ),
    'split-vertical': (
      <div className="flex flex-col gap-1 h-32">
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-sm">
          Top
        </div>
        <div className="flex-1 bg-gradient-to-br from-green-500 to-green-600 rounded flex items-center justify-center text-white text-sm">
          Bottom
        </div>
      </div>
    ),
    'pip-corner': (
      <div className="relative h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded">
        <div className="absolute bottom-2 right-2 w-16 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded border-2 border-white" />
        <div className="absolute inset-0 flex items-center justify-center text-white font-medium">
          Main
        </div>
      </div>
    ),
    'pip-side': (
      <div className="flex gap-1 h-32">
        <div className="flex-[2] bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white">
          Main
        </div>
        <div className="flex-1 bg-gradient-to-br from-green-500 to-green-600 rounded flex items-center justify-center text-white text-sm">
          Side
        </div>
      </div>
    ),
    'grid-2x2': (
      <div className="grid grid-cols-2 gap-1 h-32">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white text-xs">1</div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded flex items-center justify-center text-white text-xs">2</div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded flex items-center justify-center text-white text-xs">3</div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded flex items-center justify-center text-white text-xs">4</div>
      </div>
    )
  };

  return layouts[layoutType] || layouts.fullscreen;
}
