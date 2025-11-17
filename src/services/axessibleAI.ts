import { supabase } from '@/integrations/supabase/client';

export interface AIAction {
  action: string;
  [key: string]: any;
}

export interface AIResponse {
  response: string;
  action: AIAction | null;
}

export async function sendAICommand(
  sessionId: string,
  message: string,
  projectId: string,
  videoId: string,
  currentContext: string
): Promise<AIResponse> {
  const { data, error } = await supabase.functions.invoke('axessible-ai-command', {
    body: {
      sessionId,
      message,
      projectId,
      videoId,
      currentContext
    }
  });

  if (error) throw error;
  return data as AIResponse;
}

export async function executeAIAction(
  action: AIAction,
  projectId: string,
  videoId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (action.action) {
      case 'apply_template': {
        const { data: template } = await supabase
          .from('caption_templates')
          .select('id')
          .ilike('name', `%${action.template_name}%`)
          .single();

        if (!template) {
          return { success: false, error: 'Template not found' };
        }

        if (action.scene_id) {
          await supabase
            .from('project_scenes')
            .update({ caption_template_id: template.id })
            .eq('id', action.scene_id);
        } else {
          await supabase
            .from('project_scenes')
            .update({ caption_template_id: template.id })
            .eq('project_id', projectId);
        }

        return { success: true, result: { template_id: template.id } };
      }

      case 'delete_segments': {
        const { data: segments } = await supabase
          .from('transcript_segments_clean')
          .select('id')
          .eq('video_id', videoId)
          .in('idx', action.segment_indices);

        if (!segments || segments.length === 0) {
          return { success: false, error: 'Segments not found' };
        }

        // Mark segments as deleted using local state approach
        // (actual deletion will be handled by TextBasedEditor component)
        return { success: true, result: { segment_ids: segments.map(s => s.id) } };
      }

      case 'create_scene': {
        const { data: lastScene } = await supabase
          .from('project_scenes')
          .select('scene_order')
          .eq('project_id', projectId)
          .order('scene_order', { ascending: false })
          .limit(1)
          .single();

        const nextOrder = (lastScene?.scene_order ?? -1) + 1;

        const { data: scene } = await supabase
          .from('project_scenes')
          .insert({
            project_id: projectId,
            video_id: videoId,
            scene_order: nextOrder,
            timeline_start: 0,
            timeline_end: action.duration,
            duration_seconds: action.duration,
            layout_type: action.layout
          })
          .select()
          .single();

        return { success: true, result: { scene_id: scene?.id } };
      }

      case 'update_scene': {
        const { data: scenes } = await supabase
          .from('project_scenes')
          .select('id')
          .eq('project_id', projectId)
          .order('scene_index')
          .limit(1)
          .range(action.scene_index, action.scene_index);

        if (!scenes || scenes.length === 0) {
          return { success: false, error: 'Scene not found' };
        }

        await supabase
          .from('project_scenes')
          .update({ layout_type: action.layout })
          .eq('id', scenes[0].id);

        return { success: true, result: { scene_id: scenes[0].id } };
      }

      case 'generate_clip': {
        const { data: segments } = await supabase
          .from('transcript_segments_clean')
          .select('*')
          .eq('video_id', videoId)
          .in('idx', action.segments);

        const { data: clip } = await supabase
          .from('social_clips')
          .insert({
            video_id: videoId,
            platform: action.platform,
            title: 'AI Generated Clip',
            start_time: segments?.[0]?.start_time || 0,
            end_time: segments?.[segments.length - 1]?.end_time || 0,
            source_segments: segments?.map(s => ({
              segment_id: s.id,
              start_time: s.start_time,
              end_time: s.end_time
            })),
            aspect_ratio: action.platform === 'tiktok' || action.platform === 'instagram_reel' ? '9:16' : '16:9',
            resolution: '1920x1080',
            status: 'pending'
          })
          .select()
          .single();

        return { success: true, result: { clip_id: clip?.id } };
      }

      default:
        return { success: false, error: 'Unknown action type' };
    }
  } catch (error) {
    console.error('AI action execution error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
