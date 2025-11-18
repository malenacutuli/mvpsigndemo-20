import { supabase } from '@/integrations/supabase/client';
import { getSpeakerColor } from '@/lib/cwiPalette';

/**
 * API Response wrapper for consistent error handling
 */
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Options for creating a new scene
 */
interface CreateSceneOptions {
  name?: string;
  duration?: number;
  layout?: 'fullscreen' | 'pip' | 'split-vertical' | 'split-horizontal' | 'side-by-side' | 'custom';
  insertAtIndex?: number;
  mediaStartTime?: number;
  mediaEndTime?: number;
  videoId?: string;
}

/**
 * Complete scene data structure
 */
interface ProjectScene {
  id: string;
  project_id: string;
  video_id: string;
  scene_order: number;
  name: string;
  duration_seconds: number;
  timeline_start: number;
  timeline_end: number;
  layout_type: string;
  layout_config?: any;
  background_type: string;
  background_config?: any;
  transition_type: string;
  transition_duration_ms: number;
  transition_config?: any;
  media_type: string;
  media_url?: string;
  media_start_time: number;
  media_end_time?: number;
  visual_description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Scene Manager - Handles all CRUD operations for project scenes
 * 
 * @example
 * ```ts
 * import { sceneManager } from './scene-manager';
 * 
 * // Create a new scene
 * const result = await sceneManager.createScene('project-id', {
 *   name: 'Opening Scene',
 *   duration: 10,
 *   layout: 'fullscreen'
 * });
 * ```
 */
export class SceneManager {
  /**
   * Create a new scene in a project
   * 
   * @param projectId - The ID of the project to add the scene to
   * @param options - Configuration options for the new scene
   * @returns APIResponse containing the created scene or error details
   * 
   * @example
   * ```ts
   * const result = await sceneManager.createScene('project-123', {
   *   name: 'My Scene',
   *   duration: 5,
   *   layout: 'fullscreen'
   * });
   * 
   * if (result.success) {
   *   console.log('Scene created:', result.data);
   * }
   * ```
   */
  async createScene(
    projectId: string,
    options: CreateSceneOptions = {}
  ): Promise<APIResponse<ProjectScene>> {
    try {
      // Step 1: Get next scene_order
      const { data: existingScenes } = await supabase
        .from('project_scenes')
        .select('scene_order')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: false })
        .limit(1);
      
      const nextOrder = (existingScenes?.[0]?.scene_order ?? -1) + 1;
      
      // Step 2: Insert new scene with all required fields
      const { data: scene, error } = await supabase
        .from('project_scenes')
        .insert({
          project_id: projectId,
          video_id: options.videoId || projectId, // Fallback to projectId if no videoId
          name: options.name || `Scene ${nextOrder + 1}`,
          scene_order: options.insertAtIndex ?? nextOrder,
          duration_seconds: options.duration || 5,
          timeline_start: 0, // Will be recalculated
          timeline_end: options.duration || 5,
          layout_type: options.layout || 'fullscreen',
          layout_config: null,
          background_type: 'solid',
          background_config: { color: '#000000' },
          transition_type: 'fade',
          transition_duration_ms: 500,
          transition_config: null,
          media_type: 'video',
          media_url: null,
          media_start_time: options.mediaStartTime || 0,
          media_end_time: options.mediaEndTime || (options.duration || 5),
          visual_description: null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Step 3: Recalculate timeline positions
      await this.recalculateTimeline(projectId);
      
      return {
        success: true,
        data: scene as ProjectScene
      };
      
    } catch (error: any) {
      console.error('[SceneManager] createScene error:', error);
      return {
        success: false,
        error: {
          code: 'CREATE_SCENE_FAILED',
          message: error.message || 'Failed to create scene',
          details: error
        }
      };
    }
  }

  /**
   * Split a scene at a specific timestamp
   * 
   * @param sceneId - The ID of the scene to split
   * @param splitTime - The timestamp (in seconds) where to split the scene
   * @returns APIResponse containing both halves of the split scene
   * 
   * @example
   * ```ts
   * const result = await sceneManager.splitScene('scene-123', 5.5);
   * 
   * if (result.success) {
   *   console.log('First half:', result.data.firstHalf);
   *   console.log('Second half:', result.data.secondHalf);
   * }
   * ```
   */
  async splitScene(
    sceneId: string,
    splitTime: number
  ): Promise<APIResponse<{ firstHalf: ProjectScene; secondHalf: ProjectScene }>> {
    try {
      // Step 1: Get the scene to split
      const { data: scene, error: fetchError } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();
      
      if (fetchError) throw fetchError;
      if (!scene) throw new Error('Scene not found');
      
      // Step 2: Calculate split offset relative to scene start
      const splitOffset = splitTime - scene.timeline_start;
      
      // Validate split is within scene duration
      if (splitOffset <= 0 || splitOffset >= scene.duration_seconds) {
        throw new Error('Split time must be within scene duration');
      }
      
      // Step 3: Create second half of split scene
      const secondHalfResult = await this.createScene(scene.project_id, {
        name: `${scene.name} (Part 2)`,
        layout: scene.layout_type as CreateSceneOptions['layout'],
        insertAtIndex: scene.scene_order + 1,
        duration: scene.duration_seconds - splitOffset,
        mediaStartTime: scene.media_start_time + splitOffset,
        mediaEndTime: scene.media_end_time,
        videoId: scene.video_id
      });
      
      if (!secondHalfResult.success || !secondHalfResult.data) {
        throw new Error('Failed to create second half of scene');
      }
      
      // Step 4: Update first half duration
      const { error: updateError } = await supabase
        .from('project_scenes')
        .update({
          duration_seconds: splitOffset,
          media_end_time: scene.media_start_time + splitOffset,
          timeline_end: scene.timeline_start + splitOffset
        })
        .eq('id', sceneId);
      
      if (updateError) throw updateError;
      
      // Step 5: Handle layers - copy to appropriate scenes
      const { data: layers } = await supabase
        .from('scene_layers')
        .select('*')
        .eq('scene_id', sceneId);
      
      if (layers && layers.length > 0) {
        for (const layer of layers) {
          const layerEnd = layer.start_offset_seconds + (layer.duration_seconds || 0);
          
          if (layer.start_offset_seconds >= splitOffset) {
            // Layer is entirely in second half - move it
            await supabase
              .from('scene_layers')
              .update({
                scene_id: secondHalfResult.data.id,
                start_offset_seconds: layer.start_offset_seconds - splitOffset
              })
              .eq('id', layer.id);
          } else if (layerEnd > splitOffset) {
            // Layer spans the split - duplicate to both scenes
            const { id, ...layerData } = layer;
            
            // Create copy in second scene
            await supabase
              .from('scene_layers')
              .insert({
                ...layerData,
                scene_id: secondHalfResult.data.id,
                start_offset_seconds: 0,
                duration_seconds: layerEnd - splitOffset
              });
            
            // Truncate original in first scene
            await supabase
              .from('scene_layers')
              .update({
                duration_seconds: splitOffset - layer.start_offset_seconds
              })
              .eq('id', layer.id);
          }
          // Layers entirely in first half remain unchanged
        }
      }
      
      // Step 6: Recalculate timeline
      await this.recalculateTimeline(scene.project_id);
      
      return {
        success: true,
        data: {
          firstHalf: scene as ProjectScene,
          secondHalf: secondHalfResult.data
        }
      };
      
    } catch (error: any) {
      console.error('[SceneManager] splitScene error:', error);
      return {
        success: false,
        error: {
          code: 'SPLIT_SCENE_FAILED',
          message: error.message || 'Failed to split scene',
          details: error
        }
      };
    }
  }

  /**
   * Merge multiple consecutive scenes into one
   * 
   * @param sceneIds - Array of scene IDs to merge (must be in order)
   * @returns APIResponse containing the merged scene
   * 
   * @example
   * ```ts
   * const result = await sceneManager.mergeScenes(['scene-1', 'scene-2', 'scene-3']);
   * 
   * if (result.success) {
   *   console.log('Merged scene:', result.data);
   * }
   * ```
   */
  async mergeScenes(sceneIds: string[]): Promise<APIResponse<ProjectScene>> {
    try {
      if (sceneIds.length < 2) {
        throw new Error('Need at least 2 scenes to merge');
      }
      
      // Step 1: Fetch all scenes in order
      const { data: scenes, error: fetchError } = await supabase
        .from('project_scenes')
        .select('*')
        .in('id', sceneIds)
        .order('scene_order', { ascending: true });
      
      if (fetchError) throw fetchError;
      if (!scenes || scenes.length !== sceneIds.length) {
        throw new Error('Some scenes not found');
      }
      
      // Step 2: Calculate merged duration
      const totalDuration = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);
      
      // Step 3: Update first scene to span entire duration
      const { error: updateError } = await supabase
        .from('project_scenes')
        .update({
          duration_seconds: totalDuration,
          media_end_time: scenes[scenes.length - 1].media_end_time,
          timeline_end: scenes[0].timeline_start + totalDuration
        })
        .eq('id', scenes[0].id);
      
      if (updateError) throw updateError;
      
      // Step 4: Move all layers from other scenes to first scene
      for (let i = 1; i < scenes.length; i++) {
        const scene = scenes[i];
        const offset = scenes.slice(0, i).reduce((sum, s) => sum + s.duration_seconds, 0);
        
        // Get layers for this scene
        const { data: sceneLayers } = await supabase
          .from('scene_layers')
          .select('*')
          .eq('scene_id', scene.id);
        
        if (sceneLayers && sceneLayers.length > 0) {
          // Update each layer individually with new scene_id and adjusted offset
          for (const layer of sceneLayers) {
            await supabase
              .from('scene_layers')
              .update({
                scene_id: scenes[0].id,
                start_offset_seconds: layer.start_offset_seconds + offset
              })
              .eq('id', layer.id);
          }
        }
      }
      
      // Step 5: Delete other scenes
      const { error: deleteError } = await supabase
        .from('project_scenes')
        .delete()
        .in('id', sceneIds.slice(1));
      
      if (deleteError) throw deleteError;
      
      // Step 6: Recalculate timeline
      await this.recalculateTimeline(scenes[0].project_id);
      
      return {
        success: true,
        data: scenes[0] as ProjectScene
      };
      
    } catch (error: any) {
      console.error('[SceneManager] mergeScenes error:', error);
      return {
        success: false,
        error: {
          code: 'MERGE_SCENES_FAILED',
          message: error.message || 'Failed to merge scenes',
          details: error
        }
      };
    }
  }

  /**
   * Reorder scenes after drag-drop
   * 
   * @param projectId - The project ID containing the scenes
   * @param sceneOrders - Array of objects with scene ID and new order
   * @returns APIResponse indicating success or failure
   * 
   * @example
   * ```ts
   * const result = await sceneManager.reorderScenes('project-123', [
   *   { id: 'scene-1', order: 2 },
   *   { id: 'scene-2', order: 0 },
   *   { id: 'scene-3', order: 1 }
   * ]);
   * ```
   */
  async reorderScenes(
    projectId: string,
    sceneOrders: { id: string; order: number }[]
  ): Promise<APIResponse> {
    try {
      // Update each scene's order
      for (const { id, order } of sceneOrders) {
        await supabase
          .from('project_scenes')
          .update({ scene_order: order })
          .eq('id', id);
      }
      
      // Recalculate timeline positions
      await this.recalculateTimeline(projectId);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('[SceneManager] reorderScenes error:', error);
      return {
        success: false,
        error: {
          code: 'REORDER_SCENES_FAILED',
          message: error.message || 'Failed to reorder scenes',
          details: error
        }
      };
    }
  }

  /**
   * Delete a scene
   * 
   * @param sceneId - The ID of the scene to delete
   * @returns APIResponse indicating success or failure
   * 
   * @example
   * ```ts
   * const result = await sceneManager.deleteScene('scene-123');
   * 
   * if (result.success) {
   *   console.log('Scene deleted successfully');
   * }
   * ```
   */
  async deleteScene(sceneId: string): Promise<APIResponse> {
    try {
      // Get project_id before deletion
      const { data: scene } = await supabase
        .from('project_scenes')
        .select('project_id')
        .eq('id', sceneId)
        .single();
      
      if (!scene) throw new Error('Scene not found');
      
      // Delete scene (cascade will remove layers)
      const { error } = await supabase
        .from('project_scenes')
        .delete()
        .eq('id', sceneId);
      
      if (error) throw error;
      
      // Recalculate timeline
      await this.recalculateTimeline(scene.project_id);
      
      return { success: true };
      
    } catch (error: any) {
      console.error('[SceneManager] deleteScene error:', error);
      return {
        success: false,
        error: {
          code: 'DELETE_SCENE_FAILED',
          message: error.message || 'Failed to delete scene',
          details: error
        }
      };
    }
  }

  /**
   * Duplicate a scene
   * 
   * @param sceneId - The ID of the scene to duplicate
   * @returns APIResponse containing the duplicated scene
   * 
   * @example
   * ```ts
   * const result = await sceneManager.duplicateScene('scene-123');
   * 
   * if (result.success) {
   *   console.log('Duplicated scene:', result.data);
   * }
   * ```
   */
  async duplicateScene(sceneId: string): Promise<APIResponse<ProjectScene>> {
    try {
      // Get original scene
      const { data: originalScene, error: fetchError } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();
      
      if (fetchError) throw fetchError;
      if (!originalScene) throw new Error('Scene not found');
      
      // Create duplicate
      const result = await this.createScene(originalScene.project_id, {
        name: `${originalScene.name} (Copy)`,
        duration: originalScene.duration_seconds,
        layout: originalScene.layout_type as CreateSceneOptions['layout'],
        insertAtIndex: originalScene.scene_order + 1,
        mediaStartTime: originalScene.media_start_time,
        mediaEndTime: originalScene.media_end_time,
        videoId: originalScene.video_id
      });
      
      if (!result.success || !result.data) {
        throw new Error('Failed to create duplicate scene');
      }
      
      // Copy all layers
      const { data: layers } = await supabase
        .from('scene_layers')
        .select('*')
        .eq('scene_id', sceneId);
      
      if (layers && layers.length > 0) {
        for (const layer of layers) {
          const { id, created_at, updated_at, ...layerData } = layer;
          await supabase
            .from('scene_layers')
            .insert({
              ...layerData,
              scene_id: result.data.id
            });
        }
      }
      
      return {
        success: true,
        data: result.data
      };
      
    } catch (error: any) {
      console.error('[SceneManager] duplicateScene error:', error);
      return {
        success: false,
        error: {
          code: 'DUPLICATE_SCENE_FAILED',
          message: error.message || 'Failed to duplicate scene',
          details: error
        }
      };
    }
  }

  /**
   * Recalculate timeline positions for all scenes
   * Uses Supabase RPC function
   * 
   * @param projectId - The project ID to recalculate timeline for
   * @private
   */
  private async recalculateTimeline(projectId: string): Promise<void> {
    try {
      // Get all scenes in order
      const { data: scenes } = await supabase
        .from('project_scenes')
        .select('id, scene_order, duration_seconds')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
      
      if (!scenes) return;
      
      // Calculate timeline positions
      let currentTime = 0;
      for (const scene of scenes) {
        await supabase
          .from('project_scenes')
          .update({
            timeline_start: currentTime,
            timeline_end: currentTime + scene.duration_seconds
          })
          .eq('id', scene.id);
        
        currentTime += scene.duration_seconds;
      }
      
      // Update project total duration
      await supabase
        .from('premium_projects')
        .update({ total_duration: currentTime })
        .eq('id', projectId);
      
    } catch (error) {
      console.error('[SceneManager] recalculateTimeline error:', error);
    }
  }

  /**
   * Get all scenes for a project
   * 
   * @param projectId - The project ID to fetch scenes for
   * @returns APIResponse containing array of scenes
   * 
   * @example
   * ```ts
   * const result = await sceneManager.getScenes('project-123');
   * 
   * if (result.success) {
   *   console.log('Scenes:', result.data);
   * }
   * ```
   */
  async getScenes(projectId: string): Promise<APIResponse<ProjectScene[]>> {
    try {
      const { data: scenes, error } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('project_id', projectId)
        .order('scene_order', { ascending: true });
      
      if (error) throw error;
      
      return {
        success: true,
        data: scenes as ProjectScene[]
      };
      
    } catch (error: any) {
      console.error('[SceneManager] getScenes error:', error);
      return {
        success: false,
        error: {
          code: 'GET_SCENES_FAILED',
          message: error.message || 'Failed to fetch scenes'
        }
      };
    }
  }

  /**
   * Update scene properties
   * 
   * @param sceneId - The ID of the scene to update
   * @param updates - Partial scene object with properties to update
   * @returns APIResponse containing the updated scene
   * 
   * @example
   * ```ts
   * const result = await sceneManager.updateScene('scene-123', {
   *   name: 'Updated Scene Name',
   *   duration_seconds: 10
   * });
   * ```
   */
  async updateScene(
    sceneId: string,
    updates: Partial<ProjectScene>
  ): Promise<APIResponse<ProjectScene>> {
    try {
      const { data: scene, error } = await supabase
        .from('project_scenes')
        .update(updates)
        .eq('id', sceneId)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        data: scene as ProjectScene
      };
      
    } catch (error: any) {
      console.error('[SceneManager] updateScene error:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_SCENE_FAILED',
          message: error.message || 'Failed to update scene'
        }
      };
    }
  }
}

// Export singleton instance
export const sceneManager = new SceneManager();

// ============= Timeline Scene Conversion Functions =============

/**
 * Scene representation for timeline display
 */
export interface Scene {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  transcriptSegmentId: string;
  
  // Character/Speaker data
  speaker: string;
  speakerColor: string;
  characterType?: 'hero' | 'villain' | 'main' | 'supporting' | 'minor';
  
  // Scene content
  text: string;
  words: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>;
  
  // Scene properties
  layout: 'fullscreen' | 'pip' | 'split' | 'multicam' | 'intro';
  order: number;
  
  // Accessibility features
  hasAudioDescription: boolean;
  hasSignLanguage: boolean;
  audioDescriptions?: AudioDescription[];
  signLanguageClipUrl?: string;
}

export interface TranscriptSegment {
  id: string;
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string;
  speaker_color?: string;
  character_id?: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

export interface Character {
  id: string;
  name: string;
  color: string;
  type: string;
  video_id: string;
}

export interface AudioDescription {
  id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  description: string;
  audio_url?: string;
}

export interface SignLanguageClip {
  id: string;
  video_id: string;
  clip_url: string;
  start_time_ms: number;
  end_time_ms: number;
  transcript_segment_id?: string;
}

/**
 * Convert transcript segments to timeline scenes
 */
export function convertSegmentsToScenes(
  segments: TranscriptSegment[],
  characters: Character[],
  audioDescriptions: AudioDescription[],
  signLanguageClips: SignLanguageClip[]
): Scene[] {
  if (!segments || segments.length === 0) return [];

  const scenes: Scene[] = segments.map((segment, index) => {
    const speaker = segment.speaker || 'Speaker';
    const startTime = segment.start_time;
    const endTime = segment.end_time;

    // Get character and color
    const character = findCharacterForSpeaker(speaker, characters);
    const speakerColor = getSceneColor(speaker, characters, segment.speaker_color);
    const characterType = mapCharacterType(character?.type);

    // Convert words
    const words = segment.words?.map(w => ({
      text: w.text,
      startTime: w.start,
      endTime: w.end
    })) || [];

    // Find overlapping audio descriptions
    const sceneADs = audioDescriptions.filter(ad => 
      (ad.start_time >= startTime && ad.start_time < endTime) ||
      (ad.end_time > startTime && ad.end_time <= endTime) ||
      (ad.start_time <= startTime && ad.end_time >= endTime)
    );

    // Find sign language clip
    const signClip = signLanguageClips.find(
      clip => clip.transcript_segment_id === segment.id
    );

    return {
      id: segment.id,
      name: generateSceneName(segment.text),
      startTime,
      endTime,
      duration: endTime - startTime,
      transcriptSegmentId: segment.id,
      speaker,
      speakerColor,
      characterType,
      text: segment.text,
      words,
      layout: 'fullscreen',
      order: index,
      hasAudioDescription: sceneADs.length > 0,
      hasSignLanguage: !!signClip,
      audioDescriptions: sceneADs.length > 0 ? sceneADs : undefined,
      signLanguageClipUrl: signClip?.clip_url
    };
  });

  return scenes.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Generate scene name from text
 */
export function generateSceneName(text: string): string {
  if (!text) return 'Untitled Scene';
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 30) return cleaned;
  const truncated = cleaned.substring(0, 30);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 20) return truncated.substring(0, lastSpace) + '...';
  return truncated + '...';
}

/**
 * Find character for speaker
 */
export function findCharacterForSpeaker(
  speaker: string,
  characters: Character[]
): Character | undefined {
  if (!speaker || !characters) return undefined;
  
  // Exact match
  let match = characters.find(c => c.name === speaker);
  if (match) return match;
  
  // Case-insensitive
  const lower = speaker.toLowerCase();
  match = characters.find(c => c.name.toLowerCase() === lower);
  if (match) return match;
  
  // Normalized
  const normalized = speaker.replace(/\s+/g, '').toLowerCase();
  return characters.find(c => 
    c.name.replace(/\s+/g, '').toLowerCase() === normalized
  );
}

/**
 * Get scene color using CWI palette
 */
export function getSceneColor(
  speaker: string,
  characters: Character[],
  segmentColor?: string
): string {
  // Priority 1: Segment color
  if (segmentColor && segmentColor !== '#3B82F6') {
    return segmentColor;
  }
  
  // Priority 2: Character color
  const character = findCharacterForSpeaker(speaker, characters);
  if (character?.color) return character.color;
  
  // Priority 3: Auto-assign from CWI palette
  const characterType = mapCharacterType(character?.type);
  return getSpeakerColor(speaker, undefined, undefined, characterType);
}

/**
 * Map character type to CWI type
 */
function mapCharacterType(
  dbType?: string
): 'main' | 'supporting' | 'minor' | undefined {
  if (!dbType) return undefined;
  const type = dbType.toLowerCase();
  if (type === 'hero' || type === 'villain' || type === 'main') return 'main';
  if (type === 'supporting') return 'supporting';
  if (type === 'minor') return 'minor';
  return undefined;
}

/**
 * Reorder scenes after drag-drop
 */
export function reorderScenes(
  scenes: Scene[],
  movedSceneId: string,
  newStartTime: number
): Scene[] {
  const sceneIndex = scenes.findIndex(s => s.id === movedSceneId);
  if (sceneIndex === -1) return scenes;

  const movedScene = scenes[sceneIndex];
  const updatedScene: Scene = {
    ...movedScene,
    startTime: newStartTime,
    endTime: newStartTime + movedScene.duration
  };

  const updatedScenes = [...scenes];
  updatedScenes[sceneIndex] = updatedScene;
  updatedScenes.sort((a, b) => a.startTime - b.startTime);
  updatedScenes.forEach((scene, index) => { scene.order = index; });

  return updatedScenes;
}

/*
// TEST USAGE EXAMPLES:
import { sceneManager } from './scene-manager';

// Create a new scene
const createResult = await sceneManager.createScene('project-id', {
  name: 'Opening Scene',
  duration: 10,
  layout: 'fullscreen'
});

if (createResult.success) {
  console.log('Scene created:', createResult.data);
}

// Split a scene at 5.5 seconds
const splitResult = await sceneManager.splitScene('scene-id', 5.5);

if (splitResult.success) {
  console.log('First half:', splitResult.data.firstHalf);
  console.log('Second half:', splitResult.data.secondHalf);
}

// Merge multiple scenes
const mergeResult = await sceneManager.mergeScenes(['scene-1', 'scene-2', 'scene-3']);

if (mergeResult.success) {
  console.log('Merged scene:', mergeResult.data);
}

// Reorder scenes after drag-drop
const reorderResult = await sceneManager.reorderScenes('project-id', [
  { id: 'scene-1', order: 2 },
  { id: 'scene-2', order: 0 },
  { id: 'scene-3', order: 1 }
]);

// Delete a scene
const deleteResult = await sceneManager.deleteScene('scene-id');

// Duplicate a scene
const duplicateResult = await sceneManager.duplicateScene('scene-id');

// Get all scenes
const scenesResult = await sceneManager.getScenes('project-id');

// Update scene properties
const updateResult = await sceneManager.updateScene('scene-id', {
  name: 'Updated Name',
  duration_seconds: 15
});
*/
