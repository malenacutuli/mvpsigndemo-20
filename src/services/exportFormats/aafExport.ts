import { supabase } from '@/integrations/supabase/client';
import { generateAAF } from '@/lib/exports/aafExporter';

export async function generateAAFTimeline(projectId: string): Promise<Blob> {
  // Get project details
  const { data: project } = await supabase
    .from('video_projects')
    .select('name')
    .eq('id', projectId)
    .single();

  if (!project) throw new Error('Project not found');

  // Get project scenes
  const { data: scenes } = await supabase
    .from('project_scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('scene_order');

  if (!scenes || scenes.length === 0) {
    throw new Error('No scenes found in project');
  }

  // Get transcript segments for all scenes
  const videoIds = scenes.map(s => s.video_id).filter(Boolean);
  const { data: segments } = await supabase
    .from('transcript_segments_clean')
    .select('*')
    .in('video_id', videoIds)
    .order('start_time');

  // Format segments for AAF export
  const formattedSegments = segments?.map(s => ({
    start_time: s.start_time,
    end_time: s.end_time,
    text: s.text,
    speaker: s.speaker || undefined
  })) || [];

  // Generate AAF content
  const aafContent = generateAAF({
    projectName: project.name || 'Untitled Project',
    frameRate: 30, // Default framerate
    segments: formattedSegments
  });

  const blob = new Blob([aafContent], { type: 'application/xml' });
  return blob;
}
