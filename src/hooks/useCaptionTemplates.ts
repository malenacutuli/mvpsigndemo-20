import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  use_count: number;
}

export function useCaptionTemplates(filterType?: 'system' | 'custom' | 'all') {
  const { user } = useAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['captionTemplates', filterType],
    queryFn: async () => {
      let query = supabase
        .from('caption_templates')
        .select('*')
        .order('use_count', { ascending: false });

      if (filterType === 'system') {
        query = query.eq('template_type', 'preset');
      } else if (filterType === 'custom') {
        query = query.eq('template_type', 'custom').eq('created_by', user?.id);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: "Error loading templates",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      }
      return (data || []) as unknown as CaptionTemplate[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      // Increment template usage count
      await supabase.rpc('increment_template_usage', { template_id: templateId });

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

      return { success: true, projectId, sceneId };
    },
    onMutate: async ({ projectId, templateId, sceneId }) => {
      await queryClient.cancelQueries({ queryKey: ['projectScenes', projectId] });
      const previousScenes = queryClient.getQueryData(['projectScenes', projectId]);
      
      // Optimistically update
      queryClient.setQueryData(['projectScenes', projectId], (old: any[] = []) =>
        old.map(scene => 
          (!sceneId || scene.id === sceneId) 
            ? { ...scene, caption_template_id: templateId }
            : scene
        )
      );

      return { previousScenes };
    },
    onError: (error, { projectId }, context) => {
      queryClient.setQueryData(['projectScenes', projectId], context?.previousScenes);
      toast({
        title: "Error applying template",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: ({ projectId, sceneId }) => {
      queryClient.invalidateQueries({ queryKey: ['projectScenes', projectId] });
      queryClient.invalidateQueries({ queryKey: ['captionTemplates'] });
      toast({
        title: "Template applied",
        description: sceneId ? "Template applied to scene" : "Template applied to all scenes"
      });
    }
  });
}

export function useCreateCustomTemplate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      styleConfig
    }: {
      name: string;
      description?: string;
      styleConfig: CaptionTemplate['style_config'];
    }) => {
      const { data, error } = await supabase
        .from('caption_templates')
        .insert({
          name,
          description,
          template_type: 'custom',
          style_config: styleConfig as any,
          created_by: user?.id,
          is_premium: false
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as CaptionTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['captionTemplates'] });
      toast({
        title: "Custom template created",
        description: `"${data.name}" has been saved to your templates`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (templateId: string) => {
      // Check if it's a system template (cannot delete)
      const { data: template } = await supabase
        .from('caption_templates')
        .select('template_type')
        .eq('id', templateId)
        .single();

      if (template?.template_type === 'preset') {
        throw new Error('Cannot delete system templates');
      }

      const { error } = await supabase
        .from('caption_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return templateId;
    },
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: ['captionTemplates'] });
      const previousTemplates = queryClient.getQueryData(['captionTemplates']);
      
      // Optimistically remove template
      queryClient.setQueryData(['captionTemplates'], (old: CaptionTemplate[] = []) =>
        old.filter(t => t.id !== templateId)
      );

      return { previousTemplates };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(['captionTemplates'], context?.previousTemplates);
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captionTemplates'] });
      toast({
        title: "Template deleted",
        description: "Custom template has been removed"
      });
    }
  });
}
