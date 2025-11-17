import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useVideoProject(videoId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Auto-create project if it doesn't exist
  const { data: project, isLoading } = useQuery({
    queryKey: ['videoProject', videoId],
    queryFn: async () => {
      if (!user) return null;

      // First, try to find existing project linked to this video
      const { data: existingProjects } = await supabase
        .from('video_projects')
        .select('*')
        .eq('user_id', user.id)
        .contains('metadata', { source_video_id: videoId })
        .limit(1);

      if (existingProjects && existingProjects.length > 0) {
        return existingProjects[0];
      }

      // Get video details for default name
      const { data: video } = await supabase
        .from('videos')
        .select('title, duration_seconds')
        .eq('id', videoId)
        .single();

      // Create new project
      const { data: newProject, error } = await supabase
        .from('video_projects')
        .insert({
          user_id: user.id,
          name: video?.title || 'Untitled Project',
          duration_seconds: video?.duration_seconds || 0,
          metadata: { source_video_id: videoId }
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        throw error;
      }

      return newProject;
    },
    enabled: !!user && !!videoId
  });

  // Query scenes
  const { data: scenes = [] } = useQuery({
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

  return {
    project,
    scenes,
    isLoading
  };
}
