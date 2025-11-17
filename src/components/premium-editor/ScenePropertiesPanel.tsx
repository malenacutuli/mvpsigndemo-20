import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

interface ScenePropertiesPanelProps {
  selectedSceneId: string | null;
  projectId?: string;
}

export function ScenePropertiesPanel({ selectedSceneId, projectId }: ScenePropertiesPanelProps) {
  const queryClient = useQueryClient();

  const { data: scene } = useQuery({
    queryKey: ['scene', selectedSceneId],
    queryFn: async () => {
      if (!selectedSceneId) return null;
      const { data } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('id', selectedSceneId)
        .single();
      return data;
    },
    enabled: !!selectedSceneId
  });

  const updateSceneMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!selectedSceneId) return;
      const { error } = await supabase
        .from('project_scenes')
        .update(updates)
        .eq('id', selectedSceneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
      queryClient.invalidateQueries({ queryKey: ['scene', selectedSceneId] });
      toast.success('Scene updated');
    },
    onError: () => {
      toast.error('Failed to update scene');
    }
  });

  if (!selectedSceneId || !scene) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Settings className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
        <h3 className="font-semibold mb-2">Scene Properties</h3>
        <p className="text-sm text-muted-foreground">
          Select a scene to view and edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Scene Properties</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {scene.scene_name || 'Untitled Scene'}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <div className="space-y-3">
          <Label htmlFor="scene-name-edit">Scene Name</Label>
          <Input
            id="scene-name-edit"
            value={scene.scene_name || ''}
            onChange={(e) => updateSceneMutation.mutate({ scene_name: e.target.value })}
            placeholder="Scene name..."
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Timing</h4>
          
          <div>
            <Label htmlFor="start-time-edit">Start Time (s)</Label>
            <Input
              id="start-time-edit"
              type="number"
              step="0.1"
              value={scene.start_time || 0}
              onChange={(e) => updateSceneMutation.mutate({ start_time: Number(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="end-time-edit">End Time (s)</Label>
            <Input
              id="end-time-edit"
              type="number"
              step="0.1"
              value={scene.end_time || 0}
              onChange={(e) => updateSceneMutation.mutate({ end_time: Number(e.target.value) })}
            />
          </div>

          <div className="text-xs text-muted-foreground pt-1">
            Duration: {((scene.end_time || 0) - (scene.start_time || 0)).toFixed(1)}s
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Layout</h4>
          
          <div>
            <Label htmlFor="layout-type-edit">Layout Type</Label>
            <Select
              value={scene.layout_type || 'fullscreen'}
              onValueChange={(value) => updateSceneMutation.mutate({ layout_type: value })}
            >
              <SelectTrigger id="layout-type-edit">
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
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Transition</h4>
          
          <div>
            <Label htmlFor="transition-type-edit">Transition Type</Label>
            <Select
              value={scene.transition_type || 'none'}
              onValueChange={(value) => updateSceneMutation.mutate({ transition_type: value })}
            >
              <SelectTrigger id="transition-type-edit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fade">Fade</SelectItem>
                <SelectItem value="dissolve">Dissolve</SelectItem>
                <SelectItem value="wipe">Wipe</SelectItem>
                <SelectItem value="slide">Slide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transition-duration-edit">Duration (s)</Label>
            <Input
              id="transition-duration-edit"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={scene.transition_duration || 0}
              onChange={(e) => updateSceneMutation.mutate({ transition_duration: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
