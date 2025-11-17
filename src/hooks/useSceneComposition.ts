import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Scene {
  id: string;
  project_id: string;
  scene_index: number;
  video_id: string;
  source_start_time: number;
  source_end_time: number;
  timeline_start: number;
  timeline_duration: number;
  layout_type: 'fullscreen' | 'split' | 'pip';
  layout_config: Record<string, any>;
  transition_in: string;
  transition_out: string;
  transition_duration: number;
  caption_template_id?: string;
  show_captions: boolean;
  audio_fade_in: boolean;
  audio_fade_out: boolean;
  audio_volume: number;
}

export function useProjectScenes(projectId: string) {
  return useQuery({
    queryKey: ['projectScenes', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_scenes')
        .select(`
          *,
          video:videos(*)
        `)
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
      layoutType
    }: {
      projectId: string;
      videoId: string;
      startTime: number;
      endTime: number;
      layoutType: string;
    }) => {
      // Get current max scene_index
      const { data: scenes } = await supabase
        .from('project_scenes')
        .select('scene_index')
        .eq('project_id', projectId)
        .order('scene_index', { ascending: false })
        .limit(1);

      const nextIndex = (scenes?.[0]?.scene_index ?? -1) + 1;

      // Get timeline_start (end of last scene)
      const { data: lastScene } = await supabase
        .from('project_scenes')
        .select('timeline_start, timeline_duration')
        .eq('project_id', projectId)
        .order('scene_index', { ascending: false })
        .limit(1)
        .single();

      const timelineStart = lastScene
        ? lastScene.timeline_start + lastScene.timeline_duration
        : 0;

      const duration = endTime - startTime;

      const { data, error } = await supabase
        .from('project_scenes')
        .insert({
          project_id: projectId,
          scene_index: nextIndex,
          video_id: videoId,
          source_start_time: startTime,
          source_end_time: endTime,
          timeline_start: timelineStart,
          timeline_duration: duration,
          layout_type: layoutType,
          layout_config: {},
          transition_in: 'none',
          transition_out: 'none',
          transition_duration: 0.5,
          show_captions: true,
          audio_fade_in: false,
          audio_fade_out: false,
          audio_volume: 1.0
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
      // Update each scene with new index and recalculate timeline positions
      let currentTimelineStart = 0;

      for (let i = 0; i < sceneIds.length; i++) {
        const { data: scene } = await supabase
          .from('project_scenes')
          .select('timeline_duration')
          .eq('id', sceneIds[i])
          .single();

        await supabase
          .from('project_scenes')
          .update({
            scene_index: i,
            timeline_start: currentTimelineStart
          })
          .eq('id', sceneIds[i]);

        currentTimelineStart += scene?.timeline_duration || 0;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes', variables.projectId] });
    }
  });
}
