import React, { useState, useRef } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sceneManager } from '@/lib/premium-editor/scene-manager';
import { Plus, Scissors, Trash2, Copy, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TimelineProps {
  projectId: string;
  scenes: any[];
  currentTime: number;
  duration: number;
  onSceneSelect: (sceneId: string) => void;
  onTimeChange: (time: number) => void;
  onScenesReorder: (scenes: any[]) => void;
}

interface SceneBlockProps {
  scene: any;
  isSelected: boolean;
  onClick: () => void;
  onSplit: (time: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  timelineWidth: number;
  totalDuration: number;
}

const SceneBlock: React.FC<SceneBlockProps> = ({
  scene,
  isSelected,
  onClick,
  onSplit,
  onDelete,
  onDuplicate,
  timelineWidth,
  totalDuration
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const sceneStart = (scene.timeline_start / totalDuration) * timelineWidth;
  const sceneWidth = (scene.duration_seconds / totalDuration) * timelineWidth;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        left: `${sceneStart}px`,
        width: `${sceneWidth}px`
      }}
      className={`
        scene-block absolute h-20 rounded-lg border-2 cursor-pointer
        transition-all duration-200
        ${isSelected 
          ? 'border-primary bg-primary/30 shadow-lg shadow-primary/50' 
          : 'border-border bg-muted hover:border-muted-foreground'
        }
      `}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="h-full flex flex-col justify-between p-2">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold truncate flex-1">
            {scene.name}
          </span>
          
          {isSelected && (
            <div className="flex gap-1">
              <button
                className="p-1 hover:bg-accent rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onSplit(scene.timeline_start + scene.duration_seconds / 2);
                }}
              >
                <Scissors className="h-3 w-3" />
              </button>
              <button
                className="p-1 hover:bg-accent rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                className="p-1 hover:bg-destructive rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{scene.layout_type}</span>
          <span>{scene.duration_seconds.toFixed(1)}s</span>
        </div>
      </div>

      {scene.transition_type !== 'none' && (
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-500 rounded-full text-xs flex items-center justify-center">
          ⚡
        </div>
      )}
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({
  projectId,
  scenes,
  currentTime,
  duration,
  onSceneSelect,
  onTimeChange,
  onScenesReorder
}) => {
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  const timelineWidth = Math.max(1000, duration * 50 * zoom);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / timelineWidth) * duration;
    
    onTimeChange(Math.max(0, Math.min(duration, newTime)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = scenes.findIndex(s => s.id === active.id);
      const newIndex = scenes.findIndex(s => s.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newScenes = [...scenes];
        const [movedScene] = newScenes.splice(oldIndex, 1);
        newScenes.splice(newIndex, 0, movedScene);
        
        const reordered = newScenes.map((scene, index) => ({
          ...scene,
          scene_order: index
        }));
        
        onScenesReorder(reordered);
      }
    }
  };

  const handleAddScene = async () => {
    try {
      const result = await sceneManager.createScene(projectId, {
        name: `Scene ${scenes.length + 1}`,
        duration: 5,
        insertAtIndex: scenes.length
      });
      
      if (result.success) {
        toast.success('Scene created!');
      } else {
        toast.error('Failed to create scene', {
          description: result.error?.message
        });
      }
    } catch (error: any) {
      toast.error('Error creating scene', {
        description: error.message
      });
    }
  };

  const playheadPosition = (currentTime / duration) * timelineWidth;

  return (
    <div className="timeline-container flex flex-col h-full bg-background text-foreground border-t">
      <div className="timeline-header flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          <div className="text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Zoom:</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          >
            -
          </Button>
          <span className="text-xs font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
          >
            +
          </Button>

          <Button
            size="sm"
            onClick={handleAddScene}
            className="ml-4"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Scene
          </Button>
        </div>
      </div>

      <div className="timeline-scroll flex-1 overflow-x-auto overflow-y-hidden relative">
        <div
          ref={timelineRef}
          className="timeline-track relative h-full cursor-pointer"
          style={{ width: `${timelineWidth}px`, minHeight: '200px' }}
          onClick={handleTimelineClick}
        >
          <div className="time-ruler h-8 bg-muted/30 border-b flex items-end px-2">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => {
              const position = (i / duration) * timelineWidth;
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${position}px`, transform: 'translateX(-50%)' }}
                >
                  <div className="h-2 w-px bg-border" />
                  <span className="text-xs text-muted-foreground mt-1">{i}s</span>
                </div>
              );
            })}
          </div>

          <div className="scenes-container h-24 relative mt-4">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={scenes.map(s => s.id)}
                strategy={horizontalListSortingStrategy}
              >
                {scenes.map((scene) => (
                  <SceneBlock
                    key={scene.id}
                    scene={scene}
                    isSelected={selectedSceneId === scene.id}
                    onClick={() => {
                      setSelectedSceneId(scene.id);
                      onSceneSelect(scene.id);
                    }}
                    onSplit={async (time) => {
                      try {
                        const result = await sceneManager.splitScene(scene.id, time);
                        if (result.success) {
                          toast.success('Scene split successfully!');
                        } else {
                          toast.error('Failed to split scene', {
                            description: result.error?.message
                          });
                        }
                      } catch (error: any) {
                        toast.error('Error splitting scene', {
                          description: error.message
                        });
                      }
                    }}
                    onDelete={async () => {
                      try {
                        const result = await sceneManager.deleteScene(scene.id);
                        if (result.success) {
                          toast.success('Scene deleted!');
                        } else {
                          toast.error('Failed to delete scene', {
                            description: result.error?.message
                          });
                        }
                      } catch (error: any) {
                        toast.error('Error deleting scene', {
                          description: error.message
                        });
                      }
                    }}
                    onDuplicate={async () => {
                      try {
                        const result = await sceneManager.duplicateScene(scene.id);
                        if (result.success) {
                          toast.success('Scene duplicated!');
                        } else {
                          toast.error('Failed to duplicate scene', {
                            description: result.error?.message
                          });
                        }
                      } catch (error: any) {
                        toast.error('Error duplicating scene', {
                          description: error.message
                        });
                      }
                    }}
                    timelineWidth={timelineWidth}
                    totalDuration={duration}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div
            ref={playheadRef}
            className="playhead absolute top-0 bottom-0 w-0.5 bg-destructive pointer-events-none z-50"
            style={{ left: `${playheadPosition}px` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-destructive rounded-full" />
          </div>
        </div>
      </div>

      <div className="timeline-footer h-8 bg-muted/50 border-t flex items-center px-4 text-xs text-muted-foreground">
        <span>{scenes.length} scenes</span>
        <span className="mx-2">•</span>
        <span>{duration.toFixed(1)}s total</span>
      </div>
    </div>
  );
};

export default Timeline;
