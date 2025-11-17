import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Scene {
  id: string;
  project_id: string;
  scene_index: number;
  scene_name?: string;
  video_id?: string;
  start_time?: number;
  end_time?: number;
  layout_type: string;
  transition_type: string;
  transition_duration: number;
  caption_template_id?: string;
  scene_config: any;
  created_at: string;
  updated_at: string;
}

export function useProjectScenes(projectId: string) {
  return useQuery({
    queryKey: ['projectScenes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_index');

      if (error) throw error;
      return data as Scene[];
    },
    enabled: !!projectId
  });
}

export function useAddScene() {
  const queryClient = useQueryClient();

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
      // Get current max scene_index
      const { data: scenes } = await supabase
        .from('project_scenes')
        .select('scene_index')
        .eq('project_id', projectId)
        .order('scene_index', { ascending: false })
        .limit(1);

      const nextIndex = (scenes?.[0]?.scene_index ?? -1) + 1;

      const { data, error } = await supabase
        .from('project_scenes')
        .insert({
          project_id: projectId,
          scene_index: nextIndex,
          video_id: videoId,
          start_time: startTime,
          end_time: endTime,
          scene_name: sceneName || `Scene ${nextIndex + 1}`,
          layout_type: layoutType,
          transition_type: 'none',
          transition_duration: 0.5,
          scene_config: {}
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['videoProject'] });
    }
  });
}

export function useUpdateScene() {
  const queryClient = useQueryClient();

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes', data.project_id] });
    }
  });
}

export function useDeleteScene() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sceneId: string) => {
      const { error } = await supabase
        .from('project_scenes')
        .delete()
        .eq('id', sceneId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
    }
  });
}

export function useReorderScenes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      sceneIds
    }: {
      projectId: string;
      sceneIds: string[];
    }) => {
      // Update each scene with new index
      for (let i = 0; i < sceneIds.length; i++) {
        await supabase
          .from('project_scenes')
          .update({ scene_index: i })
          .eq('id', sceneIds[i]);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes', variables.projectId] });
    }
  });
}
