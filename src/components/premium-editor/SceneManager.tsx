import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit2, GripVertical, Play } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface Scene {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnail?: string;
  mediaUrl?: string;
  order: number;
}

interface SceneManagerProps {
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  onSceneSelect?: (sceneId: string) => void;
  videoDuration: number;
}

function SortableScene({ 
  scene, 
  onEdit, 
  onDelete, 
  onSelect,
  isSelected 
}: { 
  scene: Scene; 
  onEdit: () => void; 
  onDelete: () => void; 
  onSelect: () => void;
  isSelected: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        isSelected ? "bg-primary/10 border-primary" : "bg-card border-border hover:bg-muted/50"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {scene.thumbnail && (
        <img
          src={scene.thumbnail}
          alt={scene.name}
          className="w-16 h-10 object-cover rounded"
        />
      )}

      <div className="flex-1 min-w-0" onClick={onSelect}>
        <div className="font-medium truncate">{scene.name}</div>
        <div className="text-sm text-muted-foreground">
          {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
          <Badge variant="secondary" className="ml-2">
            {scene.duration.toFixed(1)}s
          </Badge>
        </div>
      </div>

      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onSelect}
          title="Preview scene"
        >
          <Play className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onEdit}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export const SceneManager: React.FC<SceneManagerProps> = ({
  scenes,
  onScenesChange,
  onSceneSelect,
  videoDuration,
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneStart, setNewSceneStart] = useState(0);
  const [newSceneEnd, setNewSceneEnd] = useState(5);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = scenes.findIndex((s) => s.id === active.id);
      const newIndex = scenes.findIndex((s) => s.id === over.id);
      
      const reorderedScenes = arrayMove(scenes, oldIndex, newIndex).map((scene, index) => ({
        ...scene,
        order: index,
      }));
      
      onScenesChange(reorderedScenes);
    }
  };

  const handleAddScene = () => {
    if (!newSceneName.trim()) return;

    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: newSceneName,
      startTime: Math.max(0, Math.min(newSceneStart, videoDuration)),
      endTime: Math.max(0, Math.min(newSceneEnd, videoDuration)),
      duration: Math.abs(newSceneEnd - newSceneStart),
      order: scenes.length,
    };

    onScenesChange([...scenes, newScene]);
    setNewSceneName('');
    setNewSceneStart(0);
    setNewSceneEnd(5);
    setIsAddingScene(false);
  };

  const handleDeleteScene = (sceneId: string) => {
    const updatedScenes = scenes
      .filter((s) => s.id !== sceneId)
      .map((scene, index) => ({ ...scene, order: index }));
    
    onScenesChange(updatedScenes);
    
    if (selectedSceneId === sceneId) {
      setSelectedSceneId(null);
    }
  };

  const handleSelectScene = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    onSceneSelect?.(sceneId);
  };

  const getTotalDuration = () => {
    return scenes.reduce((total, scene) => total + scene.duration, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scenes</CardTitle>
            <CardDescription>
              {scenes.length} scene{scenes.length !== 1 ? 's' : ''} · {getTotalDuration().toFixed(1)}s total
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddingScene(!isAddingScene)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Scene
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Scene Form */}
        {isAddingScene && (
          <Card className="p-4 bg-muted/30">
            <div className="space-y-3">
              <div>
                <Label htmlFor="scene-name">Scene Name</Label>
                <Input
                  id="scene-name"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder="Enter scene name..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start-time">Start Time (s)</Label>
                  <Input
                    id="start-time"
                    type="number"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={newSceneStart}
                    onChange={(e) => setNewSceneStart(parseFloat(e.target.value) || 0)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="end-time">End Time (s)</Label>
                  <Input
                    id="end-time"
                    type="number"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={newSceneEnd}
                    onChange={(e) => setNewSceneEnd(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddScene} className="flex-1">
                  Add Scene
                </Button>
                <Button onClick={() => setIsAddingScene(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Scenes List */}
        {scenes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No scenes yet. Add your first scene to get started.
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={scenes.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {scenes.map((scene) => (
                    <SortableScene
                      key={scene.id}
                      scene={scene}
                      isSelected={selectedSceneId === scene.id}
                      onEdit={() => {
                        // TODO: Implement edit functionality
                        console.log('Edit scene:', scene.id);
                      }}
                      onDelete={() => handleDeleteScene(scene.id)}
                      onSelect={() => handleSelectScene(scene.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
