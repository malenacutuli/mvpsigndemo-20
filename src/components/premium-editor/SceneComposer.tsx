import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectScenes, useAddScene, useUpdateScene, useDeleteScene, useReorderScenes } from '@/hooks/useSceneComposition';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';

interface SceneComposerProps {
  projectId: string;
  videoId: string;
}

export function SceneComposer({ projectId, videoId }: SceneComposerProps) {
  const { data: scenes = [] } = useProjectScenes(projectId);
  const addScene = useAddScene();
  const updateScene = useUpdateScene();
  const deleteScene = useDeleteScene();
  const reorderScenes = useReorderScenes();

  const [newSceneLayout, setNewSceneLayout] = useState<string>('fullscreen');

  const handleAddScene = () => {
    addScene.mutate({
      projectId,
      videoId,
      startTime: 0,
      endTime: 10, // Default 10 seconds
      layoutType: newSceneLayout
    }, {
      onSuccess: () => {
        toast.success('Scene added successfully');
      },
      onError: (error) => {
        toast.error('Failed to add scene', {
          description: error.message
        });
      }
    });
  };

  const handleLayoutChange = (sceneId: string, layoutType: string) => {
    updateScene.mutate({
      sceneId,
      updates: { layout_type: layoutType as any }
    }, {
      onSuccess: () => {
        toast.success('Layout updated');
      }
    });
  };

  const handleDeleteScene = (sceneId: string) => {
    deleteScene.mutate(sceneId, {
      onSuccess: () => {
        toast.success('Scene deleted');
      },
      onError: (error) => {
        toast.error('Failed to delete scene', {
          description: error.message
        });
      }
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scene Composition</h3>
          <p className="text-sm text-muted-foreground">
            Arrange your video with different layouts and transitions
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={newSceneLayout} onValueChange={setNewSceneLayout}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fullscreen">Fullscreen</SelectItem>
              <SelectItem value="split">Split Screen</SelectItem>
              <SelectItem value="pip">Picture-in-Picture</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddScene} disabled={addScene.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Add Scene
          </Button>
        </div>
      </div>

      {/* Scene List with Drag and Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="scenes">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {scenes.map((scene, index) => (
                <Draggable key={scene.id} draggableId={scene.id} index={index}>
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`p-4 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <div {...provided.dragHandleProps}>
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        </div>
                        
                          <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">Scene {index + 1}</span>
                            <span className="text-sm text-muted-foreground">
                              {(scene.duration_seconds || 0).toFixed(1)}s
                            </span>
                          </div>
                          
                          <Select 
                            value={scene.layout_type}
                            onValueChange={(value) => handleLayoutChange(scene.id, value)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fullscreen">Fullscreen</SelectItem>
                              <SelectItem value="split">Split Screen</SelectItem>
                              <SelectItem value="pip">Picture-in-Picture</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteScene(scene.id)}
                          disabled={deleteScene.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {scenes.length === 0 && (
                <Card className="p-12 text-center text-muted-foreground">
                  <p>No scenes yet. Add your first scene to start composing.</p>
                </Card>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
