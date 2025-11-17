// src/components/premium-editor/Timeline.tsx
// REPLACE entire file with this

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Trash2,
  GripVertical,
  Film,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { CaptionTemplateGallery } from './CaptionTemplateGallery';

interface TimelineProps {
  videoId: string;
  onSceneSelect?: (sceneId: string) => void;
  selectedSceneId?: string | null;
}

export function Timeline({ videoId, onSceneSelect, selectedSceneId }: TimelineProps) {
  const queryClient = useQueryClient();
  
  const [zoom, setZoom] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [newScene, setNewScene] = useState({
    name: '',
    startTime: 0,
    endTime: 10,
    layoutType: 'fullscreen'
  });

  const { data: project } = useQuery({
    queryKey: ['videoProject', videoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('video_projects')
        .select('*')
        .eq('id', videoId)
        .single();
      return data;
    }
  });

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ['projectScenes', project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('project_id', project.id)
        .order('scene_index', { ascending: true });
      return data || [];
    },
    enabled: !!project?.id
  });

  const addSceneMutation = useMutation({
    mutationFn: async (sceneData: any) => {
      if (!project?.id) throw new Error('No project');
      
      const { data, error } = await supabase
        .from('project_scenes')
        .insert({
          project_id: project.id,
          scene_index: scenes.length,
          scene_name: sceneData.name || `Scene ${scenes.length + 1}`,
          video_id: videoId,
          start_time: sceneData.startTime,
          end_time: sceneData.endTime,
          layout_type: sceneData.layoutType,
          transition_type: 'none',
          scene_config: {}
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
      toast.success('Scene added successfully');
      setShowAddDialog(false);
      setNewScene({ name: '', startTime: 0, endTime: 10, layoutType: 'fullscreen' });
    },
    onError: (error) => {
      console.error('Add scene error:', error);
      toast.error('Failed to add scene');
    }
  });

  const deleteSceneMutation = useMutation({
    mutationFn: async (sceneId: string) => {
      const { error } = await supabase
        .from('project_scenes')
        .delete()
        .eq('id', sceneId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
      toast.success('Scene deleted');
    },
    onError: () => {
      toast.error('Failed to delete scene');
    }
  });

  const reorderScenesMutation = useMutation({
    mutationFn: async (reorderedScenes: any[]) => {
      const updates = reorderedScenes.map((scene, index) => 
        supabase
          .from('project_scenes')
          .update({ scene_index: index })
          .eq('id', scene.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
      toast.success('Scenes reordered');
    },
    onError: () => {
      toast.error('Failed to reorder scenes');
    }
  });

  const handleAddScene = () => {
    addSceneMutation.mutate(newScene);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(4, prev + 0.25));
    toast.success(`Zoom: ${Math.round((zoom + 0.25) * 100)}%`);
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, prev - 0.25));
    toast.success(`Zoom: ${Math.round((zoom - 0.25) * 100)}%`);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(scenes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderScenesMutation.mutate(items);
  };

  const handleSceneClick = (sceneId: string) => {
    onSceneSelect?.(sceneId);
  };

  const pixelsPerSecond = 100 * zoom;
  const totalDuration = scenes.reduce((max, scene) => 
    Math.max(max, scene.end_time || 0), 60
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={() => setShowAddDialog(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Scene
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTemplateGallery(!showTemplateGallery)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Caption Templates
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {scenes.length} scenes
          </span>
          
          <div className="flex items-center gap-1 border-l pl-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleZoomIn}
              disabled={zoom >= 4}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {showTemplateGallery && (
        <div className="border-b">
          <CaptionTemplateGallery
            onTemplateApply={(templateId) => {
              if (selectedSceneId) {
                supabase
                  .from('project_scenes')
                  .update({ caption_template_id: templateId })
                  .eq('id', selectedSceneId)
                  .then(() => {
                    queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
                    toast.success('Template applied');
                  });
              } else {
                toast.info('Select a scene first');
              }
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {scenes.length === 0 ? (
          <Card className="p-8 text-center">
            <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No scenes yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first scene to start composing your video
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Scene
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="relative h-8 border-b">
              {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }).map((_, i) => {
                const time = i * 10;
                return (
                  <div
                    key={time}
                    className="absolute text-xs text-muted-foreground"
                    style={{ left: time * pixelsPerSecond }}
                  >
                    {time}s
                  </div>
                );
              })}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="scenes">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {scenes.map((scene, index) => (
                      <Draggable 
                        key={scene.id} 
                        draggableId={scene.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`
                              relative flex items-center gap-2 p-3 border rounded-lg
                              transition-all cursor-pointer
                              ${selectedSceneId === scene.id 
                                ? 'border-primary bg-primary/5 shadow-md' 
                                : 'border-border hover:border-primary/50 bg-card'
                              }
                              ${snapshot.isDragging ? 'shadow-lg scale-105' : ''}
                            `}
                            onClick={() => handleSceneClick(scene.id)}
                          >
                            <div 
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {scene.scene_name || `Scene ${index + 1}`}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {scene.layout_type}
                                </span>
                              </div>
                              
                              <div className="relative h-6 bg-muted rounded overflow-hidden">
                                <div
                                  className="absolute h-full bg-primary/30 border-2 border-primary rounded"
                                  style={{
                                    left: 0,
                                    width: `${((scene.end_time - scene.start_time) * pixelsPerSecond) / 2}px`
                                  }}
                                />
                                <span className="absolute left-2 top-0.5 text-xs text-foreground/70">
                                  {scene.start_time}s - {scene.end_time}s
                                  {' '}
                                  ({(scene.end_time - scene.start_time).toFixed(1)}s)
                                </span>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this scene?')) {
                                  deleteSceneMutation.mutate(scene.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Scene</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="scene-name">Scene Name</Label>
              <Input
                id="scene-name"
                placeholder="My Scene"
                value={newScene.name}
                onChange={(e) => setNewScene({ ...newScene, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time (seconds)</Label>
                <Input
                  id="start-time"
                  type="number"
                  min="0"
                  step="0.1"
                  value={newScene.startTime}
                  onChange={(e) => setNewScene({ ...newScene, startTime: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="end-time">End Time (seconds)</Label>
                <Input
                  id="end-time"
                  type="number"
                  min="0"
                  step="0.1"
                  value={newScene.endTime}
                  onChange={(e) => setNewScene({ ...newScene, endTime: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="layout">Layout Type</Label>
              <Select
                value={newScene.layoutType}
                onValueChange={(value) => setNewScene({ ...newScene, layoutType: value })}
              >
                <SelectTrigger id="layout">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullscreen">Fullscreen</SelectItem>
                  <SelectItem value="camera">Camera</SelectItem>
                  <SelectItem value="screen">Screen Share</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="multicam">Multicam</SelectItem>
                  <SelectItem value="intro">Intro/Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              Duration: {(newScene.endTime - newScene.startTime).toFixed(1)} seconds
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddScene}
              disabled={newScene.endTime <= newScene.startTime || addSceneMutation.isPending}
            >
              {addSceneMutation.isPending ? 'Adding...' : 'Add Scene'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
