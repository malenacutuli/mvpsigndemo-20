import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Transition } from '@/types/premium-timeline';

interface Scene {
  id: string;
  name?: string | null;
  layout_type: string;
  layout_config?: Record<string, any> | null;
  background_type: string;
  background_config?: Record<string, any> | null;
  transition_type: string;
  transition_duration_ms: number;
  transition_config?: Record<string, any> | null;
  duration_seconds?: number | null;
  timeline_start?: number | null;
  timeline_end?: number | null;
  scene_order: number;
  media_start_time?: number | null;
  media_end_time?: number | null;
  media_url?: string | null;
  [key: string]: any;
}

interface UsePremiumSceneOptions {
  sceneId: string | null;
  onSceneUpdate?: (scene: Scene) => void;
}

export function usePremiumScene({ sceneId, onSceneUpdate }: UsePremiumSceneOptions) {
  const [scene, setScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load scene from database
  useEffect(() => {
    if (!sceneId) {
      setScene(null);
      return;
    }

    loadScene();
  }, [sceneId]);

  async function loadScene() {
    if (!sceneId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();

      if (error) throw error;

      setScene(data as any);
      onSceneUpdate?.(data as any);
    } catch (error) {
      console.error('Failed to load scene:', error);
    } finally {
      setLoading(false);
    }
  }

  // Update scene property
  const updateScene = useCallback(async (updates: Partial<Scene>) => {
    if (!sceneId || !scene) return;

    try {
      setSaving(true);

      const updatedScene = { ...scene, ...updates, updated_at: new Date().toISOString() };

      const { error } = await supabase
        .from('project_scenes')
        .update(updates)
        .eq('id', sceneId);

      if (error) throw error;

      setScene(updatedScene);
      onSceneUpdate?.(updatedScene);
    } catch (error) {
      console.error('Failed to update scene:', error);
    } finally {
      setSaving(false);
    }
  }, [sceneId, scene, onSceneUpdate]);

  // Update layout
  const updateLayout = useCallback(async (layoutType: string, layoutConfig?: any) => {
    await updateScene({
      layout_type: layoutType,
      layout_config: layoutConfig || scene?.layout_config || {}
    });
  }, [updateScene, scene]);

  // Update background
  const updateBackground = useCallback(async (backgroundType: string, backgroundConfig?: any) => {
    await updateScene({
      background_type: backgroundType,
      background_config: backgroundConfig || scene?.background_config || {}
    });
  }, [updateScene, scene]);

  // Update transition
  const updateTransition = useCallback(async (transition: Partial<Transition>) => {
    await updateScene({
      transition_type: transition.type || scene?.transition_type || 'none',
      transition_duration_ms: transition.duration || scene?.transition_duration_ms || 500,
      transition_config: transition.config || scene?.transition_config || {}
    });
  }, [updateScene, scene]);

  // Update duration
  const updateDuration = useCallback(async (duration: number) => {
    if (!scene) return;

    await updateScene({
      duration_seconds: duration,
      timeline_end: (scene.timeline_start || 0) + duration
    });
  }, [scene, updateScene]);

  return {
    scene,
    loading,
    saving,
    updateScene,
    updateLayout,
    updateBackground,
    updateTransition,
    updateDuration,
    reloadScene: loadScene
  };
}
