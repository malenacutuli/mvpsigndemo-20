/**
 * Scene Manager - Handles all scene operations for Premium Video Editor
 * Descript-style scene manipulation with timeline management
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  APIResponse,
  ProjectScene,
  CreateSceneParams,
  SceneLayer,
} from '@/types/premium-editor-api';

/**
 * Scene Manager class for handling all scene operations
 */
class SceneManager {
  /**
   * Create a new scene in a project
   */
  async createScene(
    projectId: string,
    options: CreateSceneParams = {}
  ): Promise<APIResponse<ProjectScene>> {
    try {
      // Get next scene_order
      const { data: existingScenes, error: fetchError } = await supabase
        .from('project_scenes')
        .select('scene_order')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: false })
        .limit(1);

      if (fetchError) {
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: `Failed to fetch existing scenes: ${fetchError.message}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      const nextOrder = (existingScenes?.[0]?.scene_order ?? -1) + 1;
      const duration = options.duration || 5;

      // Prepare scene data with defaults
      const sceneData = {
        project_id: projectId,
        video_id: options.videoId || null,
        scene_order: nextOrder,
        name: options.name || `Scene ${nextOrder + 1}`,
        duration_seconds: duration,
        timeline_start: 0,
        timeline_end: duration,
        layout_type: options.layoutType || 'fullscreen',
        background_type: options.backgroundType || 'solid',
        background_config: options.backgroundColor 
          ? { color: options.backgroundColor } 
          : { color: '#000000' },
        transition_type: options.transitionType || 'fade',
        transition_duration_ms: 500,
        media_type: 'video',
        media_start_time: options.mediaStartTime || 0,
        media_end_time: options.mediaEndTime || duration,
        media_url: options.mediaUrl || null,
        scene_config: {},
      };

      // Insert new scene
      const { data: newScene, error: insertError } = await supabase
        .from('project_scenes')
        .insert(sceneData)
        .select()
        .single();

      if (insertError || !newScene) {
        return {
          success: false,
          error: {
            code: 'INSERT_ERROR',
            message: `Failed to create scene: ${insertError?.message || 'Unknown error'}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Recalculate timeline after insert
      await this.recalculateTimeline(projectId);

      return {
        success: true,
        data: newScene as ProjectScene,
        message: 'Scene created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Split a scene at a specific time point
   */
  async splitScene(
    sceneId: string,
    splitTime: number
  ): Promise<APIResponse<{ firstHalf: ProjectScene; secondHalf: ProjectScene }>> {
    try {
      // Fetch the scene
      const { data: scene, error: fetchError } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();

      if (fetchError || !scene) {
        return {
          success: false,
          error: {
            code: 'SCENE_NOT_FOUND',
            message: `Scene not found: ${fetchError?.message || 'Unknown error'}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Calculate split offset relative to scene start
      const sceneStart = scene.timeline_start || 0;
      const splitOffset = splitTime - sceneStart;

      // Validate split is within scene duration
      const sceneDuration = scene.duration_seconds || 0;
      if (splitOffset <= 0 || splitOffset >= sceneDuration) {
        return {
          success: false,
          error: {
            code: 'INVALID_SPLIT_TIME',
            message: 'Split time must be within scene duration',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Calculate durations for both halves
      const firstHalfDuration = splitOffset;
      const secondHalfDuration = sceneDuration - splitOffset;

      // Update first scene duration
      const { data: updatedFirstHalf, error: updateError } = await supabase
        .from('project_scenes')
        .update({ duration_seconds: firstHalfDuration })
        .eq('id', sceneId)
        .select()
        .single();

      if (updateError || !updatedFirstHalf) {
        return {
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: `Failed to update first scene: ${updateError?.message}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Create second scene with remaining duration
      const secondSceneData = {
        project_id: scene.project_id,
        scene_order: scene.scene_order + 1,
        name: scene.name ? `${scene.name} (2)` : `Scene ${scene.scene_order + 1}`,
        duration_seconds: secondHalfDuration,
        layout_type: scene.layout_type,
        layout_config: scene.layout_config,
        background_type: scene.background_type,
        background_config: scene.background_config,
        transition_type: scene.transition_type,
        transition_duration_ms: scene.transition_duration_ms,
        transition_config: scene.transition_config,
        media_type: scene.media_type,
        media_url: scene.media_url,
        media_start_time: (scene.media_start_time || 0) + splitOffset,
        media_end_time: scene.media_end_time,
        video_id: scene.video_id,
        scene_config: scene.scene_config,
      };

      const { data: secondHalf, error: insertError } = await supabase
        .from('project_scenes')
        .insert(secondSceneData)
        .select()
        .single();

      if (insertError || !secondHalf) {
        return {
          success: false,
          error: {
            code: 'INSERT_ERROR',
            message: `Failed to create second scene: ${insertError?.message}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Fetch and distribute layers between the two scenes
      const { data: layers, error: layersError } = await supabase
        .from('scene_layers')
        .select('*')
        .eq('scene_id', sceneId);

      if (!layersError && layers) {
        // Copy all layers to second scene (simple approach)
        // In a full implementation, you'd split layers based on timing
        const newLayers = layers.map((layer) => {
          const { id, scene_id, created_at, updated_at, ...layerData } = layer;
          return {
            ...layerData,
            scene_id: secondHalf.id,
          };
        });

        if (newLayers.length > 0) {
          await supabase.from('scene_layers').insert(newLayers);
        }
      }

      // Recalculate timeline
      await this.recalculateTimeline(scene.project_id);

      return {
        success: true,
        data: {
          firstHalf: updatedFirstHalf as ProjectScene,
          secondHalf: secondHalf as ProjectScene,
        },
        message: 'Scene split successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Merge multiple scenes into one
   */
  async mergeScenes(sceneIds: string[]): Promise<APIResponse<ProjectScene>> {
    try {
      // Validate at least 2 scenes
      if (sceneIds.length < 2) {
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'At least 2 scenes are required for merging',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Fetch all scenes in order
      const { data: scenes, error: fetchError } = await supabase
        .from('project_scenes')
        .select('*')
        .in('id', sceneIds)
        .order('scene_order', { ascending: true });

      if (fetchError || !scenes || scenes.length !== sceneIds.length) {
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to fetch scenes for merging',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Calculate total duration
      const totalDuration = scenes.reduce((sum, scene) => sum + (scene.duration_seconds || 0), 0);
      const firstScene = scenes[0];
      const projectId = firstScene.project_id;

      // Update first scene with combined duration
      const { data: mergedScene, error: updateError } = await supabase
        .from('project_scenes')
        .update({
          duration_seconds: totalDuration,
          name: firstScene.name ? `${firstScene.name} (merged)` : 'Merged Scene',
        })
        .eq('id', firstScene.id)
        .select()
        .single();

      if (updateError || !mergedScene) {
        return {
          success: false,
          error: {
            code: 'UPDATE_ERROR',
            message: `Failed to update merged scene: ${updateError?.message}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Move all layers from other scenes to first scene
      for (let i = 1; i < scenes.length; i++) {
        const scene = scenes[i];

        // Move layers to first scene
        await supabase
          .from('scene_layers')
          .update({ scene_id: firstScene.id })
          .eq('scene_id', scene.id);
      }

      // Delete merged scenes (except first)
      const sceneIdsToDelete = sceneIds.slice(1);
      const { error: deleteError } = await supabase
        .from('project_scenes')
        .delete()
        .in('id', sceneIdsToDelete);

      if (deleteError) {
        return {
          success: false,
          error: {
            code: 'DELETE_ERROR',
            message: `Failed to delete merged scenes: ${deleteError.message}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Recalculate timeline
      await this.recalculateTimeline(projectId);

      return {
        success: true,
        data: mergedScene as ProjectScene,
        message: 'Scenes merged successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Reorder scenes in a project
   */
  async reorderScenes(
    projectId: string,
    sceneOrders: { id: string; order: number }[]
  ): Promise<APIResponse> {
    try {
      // Update each scene's order
      for (const { id, order } of sceneOrders) {
        const { error } = await supabase
          .from('project_scenes')
          .update({ scene_order: order })
          .eq('id', id)
          .eq('project_id', projectId);

        if (error) {
          return {
            success: false,
            error: {
              code: 'UPDATE_ERROR',
              message: `Failed to reorder scene ${id}: ${error.message}`,
              timestamp: new Date().toISOString(),
            },
          };
        }
      }

      // Recalculate timeline
      await this.recalculateTimeline(projectId);

      return {
        success: true,
        message: 'Scenes reordered successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Delete a scene from a project
   */
  async deleteScene(sceneId: string): Promise<APIResponse> {
    try {
      // Get project_id before deleting
      const { data: scene, error: fetchError } = await supabase
        .from('project_scenes')
        .select('project_id')
        .eq('id', sceneId)
        .single();

      if (fetchError || !scene) {
        return {
          success: false,
          error: {
            code: 'SCENE_NOT_FOUND',
            message: 'Scene not found',
            timestamp: new Date().toISOString(),
          },
        };
      }

      const projectId = scene.project_id;

      // Delete scene (cascade will remove layers)
      const { error: deleteError } = await supabase
        .from('project_scenes')
        .delete()
        .eq('id', sceneId);

      if (deleteError) {
        return {
          success: false,
          error: {
            code: 'DELETE_ERROR',
            message: `Failed to delete scene: ${deleteError.message}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Recalculate timeline
      await this.recalculateTimeline(projectId);

      return {
        success: true,
        message: 'Scene deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Duplicate an existing scene
   */
  async duplicateScene(sceneId: string): Promise<APIResponse<ProjectScene>> {
    try {
      // Fetch original scene
      const { data: originalScene, error: fetchError } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();

      if (fetchError || !originalScene) {
        return {
          success: false,
          error: {
            code: 'SCENE_NOT_FOUND',
            message: 'Original scene not found',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Get next order after original scene
      const newOrder = originalScene.scene_order + 1;

      // Shift all subsequent scenes
      const { data: subsequentScenes } = await supabase
        .from('project_scenes')
        .select('id, scene_order')
        .eq('project_id', originalScene.project_id)
        .gte('scene_order', newOrder);

      if (subsequentScenes) {
        for (const scene of subsequentScenes) {
          await supabase
            .from('project_scenes')
            .update({ scene_order: scene.scene_order + 1 })
            .eq('id', scene.id);
        }
      }

      // Create new scene with same properties
      const { id, created_at, updated_at, timeline_start, timeline_end, ...sceneData } = originalScene;
      const newSceneData = {
        ...sceneData,
        scene_order: newOrder,
        name: originalScene.name ? `${originalScene.name} (copy)` : `Scene ${newOrder}`,
      };

      const { data: newScene, error: insertError } = await supabase
        .from('project_scenes')
        .insert(newSceneData)
        .select()
        .single();

      if (insertError || !newScene) {
        return {
          success: false,
          error: {
            code: 'INSERT_ERROR',
            message: `Failed to create duplicate scene: ${insertError?.message}`,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Copy all layers
      const { data: originalLayers, error: layersError } = await supabase
        .from('scene_layers')
        .select('*')
        .eq('scene_id', sceneId);

      if (!layersError && originalLayers) {
        const newLayers = originalLayers.map((layer) => {
          const { id, scene_id, created_at, updated_at, ...layerData } = layer;
          return {
            ...layerData,
            scene_id: newScene.id,
          };
        });

        if (newLayers.length > 0) {
          await supabase.from('scene_layers').insert(newLayers);
        }
      }

      // Recalculate timeline
      await this.recalculateTimeline(originalScene.project_id);

      return {
        success: true,
        data: newScene as ProjectScene,
        message: 'Scene duplicated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Recalculate timeline positions for all scenes in a project
   * Updates timeline_start, timeline_end, and project total_duration
   */
  private async recalculateTimeline(projectId: string): Promise<void> {
    try {
      // Fetch all scenes in order
      const { data: scenes, error: fetchError } = await supabase
        .from('project_scenes')
        .select('id, duration_seconds, scene_order')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });

      if (fetchError || !scenes) {
        console.error('Failed to fetch scenes for timeline recalculation:', fetchError);
        return;
      }

      // Calculate timeline positions
      let cumulativeTime = 0;
      const updates: { id: string; timeline_start: number; timeline_end: number }[] = [];

      for (const scene of scenes) {
        const duration = scene.duration_seconds || 0;
        updates.push({
          id: scene.id,
          timeline_start: cumulativeTime,
          timeline_end: cumulativeTime + duration,
        });
        cumulativeTime += duration;
      }

      // Update all scenes
      for (const update of updates) {
        await supabase
          .from('project_scenes')
          .update({
            timeline_start: update.timeline_start,
            timeline_end: update.timeline_end,
          })
          .eq('id', update.id);
      }

      // Update project total duration
      await supabase
        .from('video_projects')
        .update({
          duration_seconds: cumulativeTime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
    } catch (error) {
      console.error('Error recalculating timeline:', error);
    }
  }
}

// Export singleton instance
export const sceneManager = new SceneManager();
