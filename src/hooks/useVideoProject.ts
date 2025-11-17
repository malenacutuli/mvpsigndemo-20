import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useVideoProject(videoId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Auto-create project if it doesn't exist
  const { data: project, isLoading } = useQuery({
    queryKey: ['videoProject', videoId],
    queryFn: async () => {
      // First, try to find existing project
      const { data: existingProject } = await supabase
        .from('video_projects')
        .select('*')
        .eq('user_id', user!.id)
        .limit(1)
        .single();

      if (existingProject) return existingProject;

      // Get video details for default name
      const { data: video } = await supabase
        .from('videos')
        .select('title, duration_seconds')
        .eq('id', videoId)
        .single();

      // Create new project
      const { data: newProject } = await supabase
        .from('video_projects')
        .insert({
          user_id: user!.id,
          name: video?.title || 'Untitled Project',
          metadata: { source_video_id: videoId }
        })
        .select()
        .single();

      return newProject;
    },
    enabled: !!user && !!videoId
  });

  // Query scenes
  const { data: scenes = [] } = useQuery({
    queryKey: ['projectScenes', project?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('project_id', project!.id)
        .order('scene_index', { ascending: true });
      
      return data || [];
    },
    enabled: !!project?.id
  });

  return {
    project,
    scenes,
    isLoading
  };
}
