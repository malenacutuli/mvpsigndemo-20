import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CaptionTemplate {
  id: string;
  name: string;
  description: string;
  template_type: 'preset' | 'custom';
  style_config: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    textAlign: string;
    colors: {
      main: string;
      secondary: string;
      accent: string;
    };
    background?: {
      enabled: boolean;
      color: string;
      opacity: number;
      padding: number;
      borderRadius?: number;
    };
    position: {
      vertical: 'top' | 'center' | 'bottom';
      horizontal: 'left' | 'center' | 'right';
      offsetX?: number;
      offsetY?: number;
    };
    animation?: {
      entrance: string;
      emphasis: string;
      exit: string;
    };
    characterColors: boolean;
    speakerLabels: boolean;
    maxWidth: number;
    lineHeight: number;
    shadow?: {
      enabled: boolean;
      color: string;
      blur: number;
      offsetX: number;
      offsetY: number;
    };
    stroke?: {
      enabled: boolean;
      color: string;
      width: number;
    };
    border?: {
      enabled: boolean;
      color: string;
      width: number;
    };
  };
  preview_url?: string;
  is_premium: boolean;
  usage_count: number;
}

export function useCaptionTemplates() {
  return useQuery({
    queryKey: ['captionTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('caption_templates')
        .select('*')
        .eq('template_type', 'preset')
        .order('use_count', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CaptionTemplate[];
    }
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      templateId,
      sceneId
    }: {
      projectId: string;
      templateId: string;
      sceneId?: string;
    }) => {
      if (sceneId) {
        // Apply to specific scene
        const { error } = await supabase
          .from('project_scenes')
          .update({ caption_template_id: templateId })
          .eq('id', sceneId);

        if (error) throw error;
      } else {
        // Apply to all scenes in project
        const { error } = await supabase
          .from('project_scenes')
          .update({ caption_template_id: templateId })
          .eq('project_id', projectId);

        if (error) throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes'] });
    }
  });
}
