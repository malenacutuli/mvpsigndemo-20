import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Palette, 
  Video, 
  Volume2,
  Sparkles,
  Clock,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface ScenePropertiesPanelProps {
  selectedSceneId: string | null;
  projectId?: string;
}

export function ScenePropertiesPanel({ selectedSceneId, projectId }: ScenePropertiesPanelProps) {
  const queryClient = useQueryClient();

  const { data: scene, isLoading } = useQuery({
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

  const { data: templates = [] } = useQuery({
    queryKey: ['captionTemplates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('caption_templates')
        .select('*')
        .order('use_count', { ascending: false });
      return data || [];
    }
  });

  const updateSceneMutation = useMutation({
    mutationFn: async ({ sceneId, updates }: { sceneId: string; updates: any }) => {
      const { data, error } = await supabase
        .from('project_scenes')
        .update(updates)
        .eq('id', sceneId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
      queryClient.invalidateQueries({ queryKey: ['scene', selectedSceneId] });
      toast.success('Scene updated');
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update scene');
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

  const handleUpdate = (updates: any) => {
    if (!selectedSceneId) return;
    updateSceneMutation.mutate({ sceneId: selectedSceneId, updates });
  };

  const handleDelete = () => {
    if (!selectedSceneId) return;
    if (confirm('Are you sure you want to delete this scene?')) {
      deleteSceneMutation.mutate(selectedSceneId);
    }
  };

  if (!selectedSceneId) {
    return (
      <div className="p-6 text-center space-y-4">
        <Settings className="w-12 h-12 mx-auto text-muted-foreground opacity-30" />
        <div>
          <h3 className="font-semibold text-sm mb-1">No Scene Selected</h3>
          <p className="text-xs text-muted-foreground">
            Select a scene from the timeline to edit its properties
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !scene) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-8 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const duration = scene.duration_seconds ?? 0;
  const sceneConfig = (scene.scene_config || {}) as Record<string, any>;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Scene Properties</h3>
            <p className="text-xs text-muted-foreground">
              {scene.name || 'Untitled Scene'}
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {duration.toFixed(1)}s
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Basic Settings</h4>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="scene-name" className="text-xs">Scene Name</Label>
              <Input
                id="scene-name"
                value={scene.name || ''}
                onChange={(e) => handleUpdate({ name: e.target.value })}
                placeholder="Enter scene name"
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label htmlFor="layout-type" className="text-xs">Layout Type</Label>
              <Select
                value={scene.layout_type || 'fullscreen'}
                onValueChange={(value) => handleUpdate({ layout_type: value })}
              >
                <SelectTrigger id="layout-type" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fullscreen">
                    <div className="flex items-center gap-2">
                      <Video className="w-3 h-3" />
                      Fullscreen
                    </div>
                  </SelectItem>
                  <SelectItem value="camera">Camera</SelectItem>
                  <SelectItem value="screen">Screen Share</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="multicam">Multicam</SelectItem>
                  <SelectItem value="intro">Intro/Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Timing</h4>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start-time" className="text-xs">Start (s)</Label>
                <Input
                  id="start-time"
                  type="number"
                  step="0.1"
                  value={scene.timeline_start ?? 0}
                  onChange={(e) => handleUpdate({ timeline_start: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="text-xs">End (s)</Label>
                <Input
                  id="end-time"
                  type="number"
                  step="0.1"
                  value={scene.timeline_end ?? 0}
                  onChange={(e) => handleUpdate({ timeline_end: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="p-2 bg-muted rounded text-xs text-center">
              Duration: <span className="font-semibold">{duration.toFixed(2)}s</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Transitions</h4>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="transition-type" className="text-xs">Transition Type</Label>
              <Select
                value={scene.transition_type || 'none'}
                onValueChange={(value) => handleUpdate({ transition_type: value })}
              >
                <SelectTrigger id="transition-type" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="crossfade">Crossfade</SelectItem>
                  <SelectItem value="wipe">Wipe</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scene.transition_type !== 'none' && (
              <div>
                <Label htmlFor="transition-duration" className="text-xs">
                  Duration: {scene.transition_duration || 0.5}s
                </Label>
                <Slider
                  id="transition-duration"
                  value={[scene.transition_duration || 0.5]}
                  onValueChange={([value]) => handleUpdate({ transition_duration: value })}
                  min={0.1}
                  max={2}
                  step={0.1}
                  className="mt-2"
                />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Caption Style</h4>
          </div>

          <div>
            <Label htmlFor="caption-template" className="text-xs">Template</Label>
            <Select
              value={scene.caption_template_id || 'none'}
              onValueChange={(value) => handleUpdate({ 
                caption_template_id: value === 'none' ? null : value 
              })}
            >
              <SelectTrigger id="caption-template" className="h-8 text-sm">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Template</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4" />
            <h4 className="font-semibold text-sm">Audio & Visual</h4>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="volume" className="text-xs">
                Volume: {Math.round((sceneConfig.volume || 1) * 100)}%
              </Label>
              <Slider
                id="volume"
                value={[(sceneConfig.volume || 1) * 100]}
                onValueChange={([value]) => handleUpdate({ 
                  scene_config: { 
                    ...sceneConfig, 
                    volume: value / 100 
                  }
                })}
                min={0}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-captions" className="text-xs">Show Captions</Label>
                <Switch
                  id="show-captions"
                  checked={sceneConfig.show_captions !== false}
                  onCheckedChange={(checked) => handleUpdate({ 
                    scene_config: { 
                      ...sceneConfig, 
                      show_captions: checked 
                    }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enable-audio" className="text-xs">Enable Audio</Label>
                <Switch
                  id="enable-audio"
                  checked={sceneConfig.enable_audio !== false}
                  onCheckedChange={(checked) => handleUpdate({ 
                    scene_config: { 
                      ...sceneConfig, 
                      enable_audio: checked 
                    }
                  })}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-muted/30">
          <h4 className="font-semibold text-xs mb-2 text-muted-foreground">Scene Info</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scene Index:</span>
              <span className="font-mono">{scene.scene_index}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{new Date(scene.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </Card>

        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={handleDelete}
          disabled={deleteSceneMutation.isPending}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleteSceneMutation.isPending ? 'Deleting...' : 'Delete Scene'}
        </Button>
      </div>
    </div>
  );
}
