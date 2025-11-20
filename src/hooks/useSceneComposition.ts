import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Scene {
  id: string;
  project_id: string;
  scene_order: number;
  name?: string;
  video_id?: string;
  timeline_start?: number;
  timeline_end?: number;
  duration_seconds?: number;
  layout_type: string;
  transition_type: string;
  transition_duration_ms: number;
  caption_template_id?: string;
  scene_config: any;
  created_at: string;
  updated_at: string;
}

export function useProjectScenes(projectId: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['projectScenes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_scenes')
        .select(`
          *,
          videos:video_id (
            title,
            duration_seconds,
            thumbnail_url,
            url
          )
        `)
        .eq('project_id', projectId)
        .order('timeline_start', { ascending: true });

      if (error) {
        toast({
          title: "Error loading scenes",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }
      return data as Scene[];
    },
    enabled: !!projectId
  });
}

export function useAddScene() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      projectId,
      videoId,
      startTime,
      endTime,
      layoutType,
      sceneName
    }: {
      projectId: string;
      videoId: string;
      startTime: number;
      endTime: number;
      layoutType: string;
      sceneName?: string;
    }) => {
      // Get current max scene_order
      const { data: scenes } = await supabase
        .from('project_scenes')
        .select('scene_order')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: false })
        .limit(1);

      const nextOrder = (scenes?.[0]?.scene_order ?? -1) + 1;
      const duration = endTime - startTime;

      const { data, error } = await supabase
        .from('project_scenes')
        .insert({
          project_id: projectId,
          scene_order: nextOrder,
          video_id: videoId,
          timeline_start: startTime,
          timeline_end: endTime,
          duration_seconds: duration,
          name: sceneName || `Scene ${nextOrder + 1}`,
          layout_type: layoutType,
          background_type: 'solid',
          background_config: { color: '#000000' },
          transition_type: 'none',
          transition_duration_ms: 500,
          media_type: 'video',
          media_start_time: 0,
          scene_config: {}
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['projectScenes', variables.projectId] });
      const previousScenes = queryClient.getQueryData(['projectScenes', variables.projectId]);
      
      // Optimistically add scene
      queryClient.setQueryData(['projectScenes', variables.projectId], (old: Scene[] = []) => [
        ...old,
        {
          id: 'temp-' + Date.now(),
          project_id: variables.projectId,
          scene_order: old.length,
          name: variables.sceneName || `Scene ${old.length + 1}`,
          video_id: variables.videoId,
          timeline_start: variables.startTime,
          timeline_end: variables.endTime,
          duration_seconds: variables.endTime - variables.startTime,
          layout_type: variables.layoutType,
          transition_type: 'none',
          transition_duration_ms: 500,
          scene_config: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as Scene
      ]);

      return { previousScenes };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['projectScenes', variables.projectId], context?.previousScenes);
      toast({
        title: "Error adding scene",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['videoProject'] });
      toast({
        title: "Scene added",
        description: "Scene successfully added to project"
      });
    }
  });
}

export function useUpdateScene() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      sceneId,
      updates
    }: {
      sceneId: string;
      updates: Partial<Scene>;
    }) => {
      const { data, error } = await supabase
        .from('project_scenes')
        .update(updates)
        .eq('id', sceneId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ sceneId, updates }) => {
      const scene = queryClient.getQueriesData<Scene[]>({ queryKey: ['projectScenes'] })
        .flatMap(([, data]) => data || [])
        .find(s => s.id === sceneId);
      
      const projectId = scene?.project_id;
      if (!projectId) return {};

      await queryClient.cancelQueries({ queryKey: ['projectScenes', projectId] });
      const previousScenes = queryClient.getQueryData(['projectScenes', projectId]);
      
      // Optimistically update scene
      queryClient.setQueryData(['projectScenes', projectId], (old: Scene[] = []) =>
        old.map(s => s.id === sceneId ? { ...s, ...updates, updated_at: new Date().toISOString() } : s)
      );

      return { previousScenes, projectId };
    },
    onError: (error, _, context) => {
      if (context?.projectId) {
        queryClient.setQueryData(['projectScenes', context.projectId], context.previousScenes);
      }
      toast({
        title: "Error updating scene",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes', data.project_id] });
    }
  });
}

export function useDeleteScene() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sceneId: string) => {
      const { error } = await supabase
        .from('project_scenes')
        .delete()
        .eq('id', sceneId);

      if (error) throw error;
      return sceneId;
    },
    onMutate: async (sceneId) => {
      const scene = queryClient.getQueriesData<Scene[]>({ queryKey: ['projectScenes'] })
        .flatMap(([, data]) => data || [])
        .find(s => s.id === sceneId);
      
      const projectId = scene?.project_id;
      if (!projectId) return {};

      await queryClient.cancelQueries({ queryKey: ['projectScenes', projectId] });
      const previousScenes = queryClient.getQueryData(['projectScenes', projectId]);
      
      // Optimistically remove scene
      queryClient.setQueryData(['projectScenes', projectId], (old: Scene[] = []) =>
        old.filter(s => s.id !== sceneId)
      );

      return { previousScenes, projectId };
    },
    onError: (error, _, context) => {
      if (context?.projectId) {
        queryClient.setQueryData(['projectScenes', context.projectId], context.previousScenes);
      }
      toast({
        title: "Error deleting scene",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
      toast({
        title: "Scene deleted",
        description: "Scene successfully removed from project"
      });
    }
  });
}

export function useReorderScenes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      projectId,
      sceneIds
    }: {
      projectId: string;
      sceneIds: string[];
    }) => {
      // Update each scene with new order
      for (let i = 0; i < sceneIds.length; i++) {
        const { error } = await supabase
          .from('project_scenes')
          .update({ scene_order: i })
          .eq('id', sceneIds[i]);
        
        if (error) throw error;
      }
    },
    onMutate: async ({ projectId, sceneIds }) => {
      await queryClient.cancelQueries({ queryKey: ['projectScenes', projectId] });
      const previousScenes = queryClient.getQueryData(['projectScenes', projectId]);
      
      // Optimistically reorder scenes
      queryClient.setQueryData(['projectScenes', projectId], (old: Scene[] = []) => {
        const sceneMap = new Map(old.map(s => [s.id, s]));
        return sceneIds.map((id, index) => ({
          ...sceneMap.get(id)!,
          scene_order: index
        }));
      });

      return { previousScenes };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(['projectScenes', variables.projectId], context?.previousScenes);
      toast({
        title: "Error reordering scenes",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes', variables.projectId] });
    }
  });
}
