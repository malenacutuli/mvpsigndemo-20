import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AIAction {
  action: 'apply_template' | 'delete_segments' | 'create_scene' | 'modify_timing' | 'change_layout' | 'update_scene' | 'generate_clip';
  parameters: Record<string, any>;
  confidence: number;
}

export interface AIResponse {
  response: string;
  action?: AIAction;
}

export async function sendAICommand(
  sessionId: string,
  message: string,
  projectId: string,
  videoId: string,
  currentContext: string,
  model: 'openai' | 'gemini-lovable' | 'gemini-direct' = 'gemini-lovable'
): Promise<AIResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('axessible-ai-command', {
      body: {
        sessionId,
        message,
        projectId,
        videoId,
        currentContext,
        model // Pass model selection to edge function
      }
    });

    if (error) {
      console.error('AI command error:', error);
      
      // Handle rate limiting
      if (error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment and try again.');
        throw new Error('Rate limit exceeded');
      }
      
      // Handle API errors
      if (error.message?.includes('API')) {
        toast.error('AI service temporarily unavailable. Please try again.');
        throw new Error('AI service error');
      }
      
      toast.error('Failed to process AI command');
      throw error;
    }

    return data as AIResponse;
  } catch (error) {
    console.error('sendAICommand error:', error);
    if (error instanceof Error && !error.message.includes('Rate limit')) {
      toast.error('Failed to send command to AI assistant');
    }
    throw error;
  }
}

export async function executeAIAction(
  action: AIAction,
  projectId: string,
  videoId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (action.action) {
      case 'apply_template': {
        const templateName = action.parameters?.template_name;
        if (!templateName) {
          return { success: false, error: 'Template name required' };
        }

        const { data: template } = await supabase
          .from('caption_templates')
          .select('id')
          .ilike('name', `%${templateName}%`)
          .single();

        if (!template) {
          return { success: false, error: 'Template not found' };
        }

        const sceneId = action.parameters?.scene_id;
        if (sceneId) {
          await supabase
            .from('project_scenes')
            .update({ caption_template_id: template.id })
            .eq('id', sceneId);
        } else {
          await supabase
            .from('project_scenes')
            .update({ caption_template_id: template.id })
            .eq('project_id', projectId);
        }

        toast.success('Caption template applied');
        return { success: true, result: { template_id: template.id } };
      }

      case 'delete_segments': {
        const segmentIndices = action.parameters?.segment_indices;
        if (!segmentIndices || !Array.isArray(segmentIndices)) {
          return { success: false, error: 'Segment indices required' };
        }

        const { data: segments } = await supabase
          .from('transcript_segments_clean')
          .select('id')
          .eq('video_id', videoId)
          .in('idx', segmentIndices);

        if (!segments || segments.length === 0) {
          return { success: false, error: 'Segments not found' };
        }

        toast.success('Segments marked for deletion');
        return { success: true, result: { segment_ids: segments.map(s => s.id) } };
      }

      case 'create_scene': {
        const { data: lastScene } = await supabase
          .from('project_scenes')
          .select('scene_order')
          .eq('project_id', projectId)
          .order('scene_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextOrder = (lastScene?.scene_order ?? -1) + 1;
        const duration = action.parameters?.duration || 10;
        const layoutType = action.parameters?.layout || 'fullscreen';

        const { data: scene } = await supabase
          .from('project_scenes')
          .insert({
            project_id: projectId,
            video_id: videoId,
            scene_order: nextOrder,
            timeline_start: 0,
            timeline_end: duration,
            duration_seconds: duration,
            name: `Scene ${nextOrder + 1}`,
            layout_type: layoutType,
            background_type: 'solid',
            background_config: { color: '#000000' },
            transition_type: 'fade',
            transition_duration_ms: 500,
            media_type: 'video',
            media_start_time: 0,
            scene_config: {}
          })
          .select()
          .single();

        toast.success('New scene created');
        return { success: true, result: { scene_id: scene?.id } };
      }

      case 'update_scene':
      case 'change_layout': {
        const sceneId = action.parameters?.scene_id;
        
        if (!sceneId) {
          return { success: false, error: 'Scene ID required' };
        }

        const updates: any = {};
        const layout = action.parameters?.layout;
        const background = action.parameters?.background;
        const transition = action.parameters?.transition;
        
        if (layout) updates.layout_type = layout;
        if (background) updates.background_type = background;
        if (transition) updates.transition_type = transition;

        const { error } = await supabase
          .from('project_scenes')
          .update(updates)
          .eq('id', sceneId)
          .eq('project_id', projectId);

        if (error) {
          console.error('Scene update error:', error);
          return { success: false, error: 'Failed to update scene' };
        }

        toast.success('Scene layout updated');
        return { success: true, result: { scene_id: sceneId, updates } };
      }

      case 'modify_timing': {
        const sceneId = action.parameters?.scene_id;
        const startTime = action.parameters?.start_time;
        const endTime = action.parameters?.end_time;
        
        if (!sceneId) {
          return { success: false, error: 'Scene ID required' };
        }

        const updates: any = {};
        if (startTime !== undefined) {
          updates.timeline_start = startTime;
          updates.media_start_time = startTime;
        }
        if (endTime !== undefined) {
          updates.timeline_end = endTime;
          updates.media_end_time = endTime;
        }
        if (startTime !== undefined && endTime !== undefined) {
          updates.duration_seconds = endTime - startTime;
        }

        const { error } = await supabase
          .from('project_scenes')
          .update(updates)
          .eq('id', sceneId)
          .eq('project_id', projectId);

        if (error) {
          console.error('Timing update error:', error);
          return { success: false, error: 'Failed to update scene timing' };
        }

        toast.success('Scene timing updated');
        return { success: true, result: { scene_id: sceneId, updates } };
      }

      case 'generate_clip': {
        const segmentIndices = action.parameters?.segments;
        const platform = action.parameters?.platform;
        
        if (!segmentIndices || !Array.isArray(segmentIndices) || !platform) {
          return { success: false, error: 'Segments and platform required' };
        }

        const { data: segments } = await supabase
          .from('transcript_segments_clean')
          .select('*')
          .eq('video_id', videoId)
          .in('idx', segmentIndices);

        if (!segments || segments.length === 0) {
          return { success: false, error: 'Segments not found' };
        }

        const { data: clip } = await supabase
          .from('social_clips')
          .insert({
            video_id: videoId,
            platform: platform,
            title: 'AI Generated Clip',
            start_time: segments[0].start_time,
            end_time: segments[segments.length - 1].end_time,
            source_segments: segments.map(s => ({
              segment_id: s.id,
              start_time: s.start_time,
              end_time: s.end_time
            })),
            aspect_ratio: platform === 'tiktok' || platform === 'instagram_reel' ? '9:16' : '16:9',
            resolution: '1920x1080',
            status: 'pending'
          })
          .select()
          .single();

        toast.success('Social clip created');
        return { success: true, result: { clip_id: clip?.id } };
      }

      default:
        toast.error(`Unknown action type: ${action.action}`);
        return { success: false, error: `Unknown action type: ${action.action}` };
    }
  } catch (error) {
    console.error('AI action execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Action failed: ${errorMessage}`);
    
    // Log to premium_video_edits for tracking
    try {
      await supabase
        .from('premium_video_edits')
        .insert({
          project_id: projectId,
          video_id: videoId,
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
          edit_type: 'ai_action_failed',
          edit_data: {
            action: action.action,
            error: errorMessage,
            timestamp: new Date().toISOString()
          },
          status: 'failed',
          error_message: errorMessage
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return { success: false, error: errorMessage };
  }
}
