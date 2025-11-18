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
      // First, try to find existing project by video ID (project id = video id)
      const { data: existingProject } = await supabase
        .from('video_projects')
        .select('*')
        .eq('id', videoId)
        .single();

      if (existingProject) return existingProject;

      // Get video details for default name
      const { data: video } = await supabase
        .from('videos')
        .select('title, duration_seconds')
        .eq('id', videoId)
        .single();

      // Create new project using video ID as project ID
      const { data: newProject } = await supabase
        .from('video_projects')
        .insert({
          id: videoId,
          created_by: user!.id,
          name: video?.title || 'Untitled Project',
          description: 'Auto-created from video'
        })
        .select()
        .single();

      return newProject;
    },
    enabled: !!user && !!videoId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: 2 // Retry failed requests twice
  });

  // Query scenes with caching
  const { data: scenes = [] } = useQuery({
    queryKey: ['projectScenes', project?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('project_id', project!.id)
        .order('scene_order', { ascending: true });
      
      return data || [];
    },
    enabled: !!project?.id,
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  return {
    project,
    scenes,
    isLoading
  };
}

// Auto-generate scenes from transcript segments
export async function generateScenesFromTranscript(projectId: string, videoId: string) {
  try {
    console.log('🎬 Generating scenes from transcript...');
    
    // Check if scenes already exist
    const { data: existingScenes } = await supabase
      .from('project_scenes')
      .select('id')
      .eq('project_id', projectId)
      .limit(1);
    
    if (existingScenes && existingScenes.length > 0) {
      console.log('✅ Scenes already exist, skipping generation');
      return;
    }
    
    // Fetch transcript segments
    const { data: segments, error: segmentError } = await supabase
      .from('transcript_segments_clean')
      .select('*')
      .eq('video_id', videoId)
      .order('start_time', { ascending: true });
    
    if (segmentError) {
      console.error('Error fetching segments:', segmentError);
      return;
    }
    
    if (!segments || segments.length === 0) {
      console.log('⚠️ No transcript segments found');
      return;
    }
    
    console.log(`📝 Found ${segments.length} transcript segments`);
    
    // Group segments into logical scenes (every 5 segments = 1 scene, or 10-30 second chunks)
    const sceneGroups: any[][] = [];
    let currentGroup: any[] = [];
    let groupDuration = 0;
    
    for (const segment of segments) {
      const segmentDuration = segment.end_time - segment.start_time;
      
      // Start new scene if:
      // - Current group has 5+ segments, OR
      // - Current group duration > 30 seconds, OR
      // - This is first segment
      if (currentGroup.length >= 5 || groupDuration > 30 || currentGroup.length === 0) {
        if (currentGroup.length > 0) {
          sceneGroups.push(currentGroup);
        }
        currentGroup = [segment];
        groupDuration = segmentDuration;
      } else {
        currentGroup.push(segment);
        groupDuration += segmentDuration;
      }
    }
    
    // Add last group
    if (currentGroup.length > 0) {
      sceneGroups.push(currentGroup);
    }
    
    console.log(`✂️ Creating ${sceneGroups.length} scenes...`);
    
    // Create scenes from groups
    for (let i = 0; i < sceneGroups.length; i++) {
      const group = sceneGroups[i];
      const firstSegment = group[0];
      const lastSegment = group[group.length - 1];
      
      // Scene name from first segment text (first 40 chars)
      const sceneText = firstSegment.text.trim();
      const sceneName = sceneText.length > 40 
        ? sceneText.substring(0, 40) + '...'
        : sceneText;
      
      // Calculate scene duration
      const sceneDuration = lastSegment.end_time - firstSegment.start_time;
      
      // Create scene
      const { error: sceneError } = await supabase
        .from('project_scenes')
        .insert({
          project_id: projectId,
          video_id: videoId,
          name: sceneName || `Scene ${i + 1}`,
          scene_order: i,
          duration_seconds: sceneDuration,
          timeline_start: firstSegment.start_time,
          timeline_end: lastSegment.end_time,
          layout_type: 'fullscreen',
          background_type: 'solid',
          background_config: { color: '#000000' },
          transition_type: i === 0 ? 'none' : 'fade',
          transition_duration_ms: 500,
          media_type: 'video',
          media_start_time: firstSegment.start_time,
          media_end_time: lastSegment.end_time
        });
      
      if (sceneError) {
        console.error(`Error creating scene ${i + 1}:`, sceneError);
      }
    }
    
    console.log(`✅ Successfully created ${sceneGroups.length} scenes!`);
    
  } catch (error) {
    console.error('Error generating scenes:', error);
  }
}
