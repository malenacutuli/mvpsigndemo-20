import { supabase } from '@/integrations/supabase/client';

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

type LayerType =
  | 'video'
  | 'audio'
  | 'text'
  | 'subtitle'
  | 'image'
  | 'shape'
  | 'waveform'
  | 'timer'
  | 'composition'
  | 'marker'
  | 'avatar';

interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'percent' | 'pixels';
}

interface Transform {
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

interface AddLayerOptions {
  name?: string;
  position?: Position;
  transform?: Transform;
  content?: any;
  startOffset?: number;
  duration?: number;
  visible?: boolean;
  locked?: boolean;
  animationType?: string;
  animationDuration?: number;
}

export interface SceneLayer {
  id: string;
  scene_id: string;
  name: string;
  layer_type: LayerType;
  layer_order: number;
  visible: boolean;
  locked: boolean;
  position: Position;
  transform: Transform;
  content: any;
  start_offset_seconds: number;
  duration_seconds?: number;
  animation_type?: string;
  animation_duration_ms?: number;
  animation_config?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Layer Manager - Handles all layer operations for Premium Video Editor
 * Manages text, images, shapes, and other visual elements within scenes
 */
export class LayerManager {
  /**
   * Add a new layer to a scene
   * Automatically assigns z-index and provides type-specific defaults
   * 
   * @param sceneId - The scene to add the layer to
   * @param layerType - Type of layer (text, image, shape, etc.)
   * @param options - Configuration options for the layer
   * @returns Promise with the created layer or error
   * 
   * @example
   * ```typescript
   * // Add text layer
   * const textResult = await layerManager.addLayer('scene-id', 'text', {
   *   name: 'Title',
   *   content: { 
   *     text: 'Hello World', 
   *     fontSize: 48,
   *     color: '#FFFFFF'
   *   }
   * });
   * 
   * // Add image layer
   * const imageResult = await layerManager.addLayer('scene-id', 'image', {
   *   content: { url: 'https://example.com/image.jpg' }
   * });
   * ```
   */
  async addLayer(
    sceneId: string,
    layerType: LayerType,
    options: AddLayerOptions = {}
  ): Promise<APIResponse<SceneLayer>> {
    try {
      // Step 1: Get next layer_order (z-index)
      const { data: existingLayers } = await supabase
        .from('scene_layers')
        .select('layer_order')
        .eq('scene_id', sceneId)
        .order('layer_order', { ascending: false })
        .limit(1);

      const nextOrder = (existingLayers?.[0]?.layer_order ?? -1) + 1;

      // Step 2: Set defaults based on layer type
      const defaultPosition: Position = {
        x: 50,
        y: 50,
        width: 50,
        height: 50,
        unit: 'percent'
      };

      const defaultTransform: Transform = {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1
      };

      // Type-specific defaults
      let defaultContent = {};
      if (layerType === 'text') {
        defaultContent = {
          text: 'New Text',
          fontSize: 32,
          fontFamily: 'Inter',
          fontWeight: '600',
          color: '#FFFFFF',
          textAlign: 'center'
        };
      } else if (layerType === 'subtitle') {
        defaultContent = {
          text: '',
          fontSize: 28,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          color: '#FFFFFF',
          backgroundColor: 'rgba(0,0,0,0.7)',
          characterColors: true
        };
      } else if (layerType === 'shape') {
        defaultContent = {
          shapeType: 'rectangle',
          fillColor: '#FF0000',
          strokeColor: '#000000',
          strokeWidth: 2
        };
      }

      // Step 3: Insert layer
      const { data: layer, error } = await supabase
        .from('scene_layers')
        .insert({
          scene_id: sceneId,
          name: options.name || `${layerType.charAt(0).toUpperCase() + layerType.slice(1)} Layer`,
          layer_type: layerType,
          layer_order: nextOrder,
          visible: options.visible ?? true,
          locked: options.locked ?? false,
          position: options.position || defaultPosition as any,
          transform: options.transform || defaultTransform as any,
          content: options.content || defaultContent,
          start_offset_seconds: options.startOffset || 0,
          duration_seconds: options.duration,
          animation_type: options.animationType || 'none',
          animation_duration_ms: options.animationDuration || 500,
          animation_config: null
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...layer,
          position: layer.position as unknown as Position,
          transform: layer.transform as unknown as Transform
        } as SceneLayer
      };

    } catch (error: any) {
      console.error('[LayerManager] addLayer error:', error);
      return {
        success: false,
        error: {
          code: 'ADD_LAYER_FAILED',
          message: error.message || 'Failed to add layer',
          details: error
        }
      };
    }
  }

  /**
   * Update layer properties
   * Can update any layer field including position, content, visibility, etc.
   * 
   * @param layerId - The layer to update
   * @param updates - Partial layer object with fields to update
   * @returns Promise with updated layer or error
   * 
   * @example
   * ```typescript
   * await layerManager.updateLayer('layer-id', {
   *   name: 'Updated Title',
   *   content: { text: 'New text content' }
   * });
   * ```
   */
  async updateLayer(
    layerId: string,
    updates: Partial<SceneLayer>
  ): Promise<APIResponse<SceneLayer>> {
    try {
      const { data: layer, error } = await supabase
        .from('scene_layers')
        .update(updates as any)
        .eq('id', layerId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...layer,
          position: layer.position as unknown as Position,
          transform: layer.transform as unknown as Transform
        } as SceneLayer
      };

    } catch (error: any) {
      console.error('[LayerManager] updateLayer error:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_LAYER_FAILED',
          message: error.message || 'Failed to update layer',
          details: error
        }
      };
    }
  }

  /**
   * Delete a layer from a scene
   * Permanently removes the layer and all its data
   * 
   * @param layerId - The layer to delete
   * @returns Promise indicating success or error
   * 
   * @example
   * ```typescript
   * await layerManager.deleteLayer('layer-id');
   * ```
   */
  async deleteLayer(layerId: string): Promise<APIResponse> {
    try {
      const { error } = await supabase
        .from('scene_layers')
        .delete()
        .eq('id', layerId);

      if (error) throw error;

      return { success: true };

    } catch (error: any) {
      console.error('[LayerManager] deleteLayer error:', error);
      return {
        success: false,
        error: {
          code: 'DELETE_LAYER_FAILED',
          message: error.message || 'Failed to delete layer',
          details: error
        }
      };
    }
  }

  /**
   * Reorder layers (change z-index)
   * Updates the visual stacking order of layers
   * 
   * @param sceneId - The scene containing the layers
   * @param layerOrders - Array of {id, order} pairs defining new z-index
   * @returns Promise indicating success or error
   * 
   * @example
   * ```typescript
   * await layerManager.reorderLayers('scene-id', [
   *   { id: 'layer-1', order: 2 },  // Move to top
   *   { id: 'layer-2', order: 0 },  // Move to bottom
   *   { id: 'layer-3', order: 1 }   // Middle
   * ]);
   * ```
   */
  async reorderLayers(
    sceneId: string,
    layerOrders: { id: string; order: number }[]
  ): Promise<APIResponse> {
    try {
      for (const { id, order } of layerOrders) {
        await supabase
          .from('scene_layers')
          .update({ layer_order: order })
          .eq('id', id)
          .eq('scene_id', sceneId);
      }

      return { success: true };

    } catch (error: any) {
      console.error('[LayerManager] reorderLayers error:', error);
      return {
        success: false,
        error: {
          code: 'REORDER_LAYERS_FAILED',
          message: error.message || 'Failed to reorder layers',
          details: error
        }
      };
    }
  }

  /**
   * Duplicate a layer
   * Creates an exact copy with slightly offset position
   * 
   * @param layerId - The layer to duplicate
   * @returns Promise with the new duplicated layer or error
   * 
   * @example
   * ```typescript
   * const result = await layerManager.duplicateLayer('layer-id');
   * if (result.success) {
   *   console.log('Duplicated layer:', result.data.id);
   * }
   * ```
   */
  async duplicateLayer(layerId: string): Promise<APIResponse<SceneLayer>> {
    try {
      const { data: originalLayer, error: fetchError } = await supabase
        .from('scene_layers')
        .select('*')
        .eq('id', layerId)
        .single();

      if (fetchError) throw fetchError;
      if (!originalLayer) throw new Error('Layer not found');

      const { data: existingLayers } = await supabase
        .from('scene_layers')
        .select('layer_order')
        .eq('scene_id', originalLayer.scene_id)
        .order('layer_order', { ascending: false })
        .limit(1);

      const nextOrder = (existingLayers?.[0]?.layer_order ?? -1) + 1;

      const { id, created_at, updated_at, ...layerData } = originalLayer;
      const layerPosition = originalLayer.position as any as Position;
      const { data: newLayer, error } = await supabase
        .from('scene_layers')
        .insert({
          ...layerData,
          name: `${originalLayer.name} (Copy)`,
          layer_order: nextOrder,
          position: {
            ...layerPosition,
            x: layerPosition.x + 5,
            y: layerPosition.y + 5
          } as any
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...newLayer,
          position: newLayer.position as unknown as Position,
          transform: newLayer.transform as unknown as Transform
        } as SceneLayer
      };

    } catch (error: any) {
      console.error('[LayerManager] duplicateLayer error:', error);
      return {
        success: false,
        error: {
          code: 'DUPLICATE_LAYER_FAILED',
          message: error.message || 'Failed to duplicate layer',
          details: error
        }
      };
    }
  }

  /**
   * Move layer to different scene
   * Transfers a layer from one scene to another
   * 
   * @param layerId - The layer to move
   * @param targetSceneId - The scene to move the layer to
   * @param targetOrder - Optional z-index in target scene (auto-assigned if omitted)
   * @returns Promise indicating success or error
   * 
   * @example
   * ```typescript
   * await layerManager.moveLayer('layer-id', 'target-scene-id');
   * ```
   */
  async moveLayer(
    layerId: string,
    targetSceneId: string,
    targetOrder?: number
  ): Promise<APIResponse> {
    try {
      const updates: any = { scene_id: targetSceneId };

      if (targetOrder !== undefined) {
        updates.layer_order = targetOrder;
      } else {
        const { data: existingLayers } = await supabase
          .from('scene_layers')
          .select('layer_order')
          .eq('scene_id', targetSceneId)
          .order('layer_order', { ascending: false })
          .limit(1);

        updates.layer_order = (existingLayers?.[0]?.layer_order ?? -1) + 1;
      }

      const { error } = await supabase
        .from('scene_layers')
        .update(updates)
        .eq('id', layerId);

      if (error) throw error;

      return { success: true };

    } catch (error: any) {
      console.error('[LayerManager] moveLayer error:', error);
      return {
        success: false,
        error: {
          code: 'MOVE_LAYER_FAILED',
          message: error.message || 'Failed to move layer',
          details: error
        }
      };
    }
  }

  /**
   * Toggle layer visibility
   * Switches between visible and hidden states
   * 
   * @param layerId - The layer to toggle
   * @returns Promise with updated layer or error
   * 
   * @example
   * ```typescript
   * await layerManager.toggleLayerVisibility('layer-id');
   * ```
   */
  async toggleLayerVisibility(layerId: string): Promise<APIResponse<SceneLayer>> {
    try {
      const { data: layer } = await supabase
        .from('scene_layers')
        .select('visible')
        .eq('id', layerId)
        .single();

      if (!layer) throw new Error('Layer not found');

      const { data: updatedLayer, error } = await supabase
        .from('scene_layers')
        .update({ visible: !layer.visible })
        .eq('id', layerId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...updatedLayer,
          position: updatedLayer.position as unknown as Position,
          transform: updatedLayer.transform as unknown as Transform
        } as SceneLayer
      };

    } catch (error: any) {
      console.error('[LayerManager] toggleLayerVisibility error:', error);
      return {
        success: false,
        error: {
          code: 'TOGGLE_VISIBILITY_FAILED',
          message: error.message || 'Failed to toggle visibility',
          details: error
        }
      };
    }
  }

  /**
   * Lock/unlock layer for editing
   * Prevents accidental modifications when locked
   * 
   * @param layerId - The layer to lock/unlock
   * @param locked - True to lock, false to unlock
   * @returns Promise with updated layer or error
   * 
   * @example
   * ```typescript
   * // Lock layer
   * await layerManager.lockLayer('layer-id', true);
   * 
   * // Unlock layer
   * await layerManager.lockLayer('layer-id', false);
   * ```
   */
  async lockLayer(layerId: string, locked: boolean): Promise<APIResponse<SceneLayer>> {
    try {
      const { data: layer, error } = await supabase
        .from('scene_layers')
        .update({ locked })
        .eq('id', layerId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...layer,
          position: layer.position as unknown as Position,
          transform: layer.transform as unknown as Transform
        } as SceneLayer
      };

    } catch (error: any) {
      console.error('[LayerManager] lockLayer error:', error);
      return {
        success: false,
        error: {
          code: 'LOCK_LAYER_FAILED',
          message: error.message || 'Failed to lock/unlock layer',
          details: error
        }
      };
    }
  }

  /**
   * Get all layers for a scene
   * Returns layers ordered by z-index (layer_order)
   * 
   * @param sceneId - The scene to fetch layers from
   * @returns Promise with array of layers or error
   * 
   * @example
   * ```typescript
   * const result = await layerManager.getLayers('scene-id');
   * if (result.success) {
   *   console.log(`Found ${result.data.length} layers`);
   * }
   * ```
   */
  async getLayers(sceneId: string): Promise<APIResponse<SceneLayer[]>> {
    try {
      const { data: layers, error } = await supabase
        .from('scene_layers')
        .select('*')
        .eq('scene_id', sceneId)
        .order('layer_order', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: (layers || []).map(layer => ({
          ...layer,
          position: layer.position as unknown as Position,
          transform: layer.transform as unknown as Transform
        })) as SceneLayer[]
      };

    } catch (error: any) {
      console.error('[LayerManager] getLayers error:', error);
      return {
        success: false,
        error: {
          code: 'GET_LAYERS_FAILED',
          message: error.message || 'Failed to fetch layers',
          details: error
        }
      };
    }
  }

  /**
   * Update layer position
   * Modifies x, y, width, height, or unit values
   * 
   * @param layerId - The layer to update
   * @param position - Partial position object with fields to update
   * @returns Promise with updated layer or error
   * 
   * @example
   * ```typescript
   * await layerManager.updateLayerPosition('layer-id', {
   *   x: 25,
   *   y: 25,
   *   width: 75,
   *   height: 75
   * });
   * ```
   */
  async updateLayerPosition(
    layerId: string,
    position: Partial<Position>
  ): Promise<APIResponse<SceneLayer>> {
    try {
      const { data: layer } = await supabase
        .from('scene_layers')
        .select('position')
        .eq('id', layerId)
        .single();

      if (!layer) throw new Error('Layer not found');

      const currentPosition = layer.position as any as Position;
      const updatedPosition = {
        ...currentPosition,
        ...position
      };

      const { data: updatedLayer, error } = await supabase
        .from('scene_layers')
        .update({ position: updatedPosition as any })
        .eq('id', layerId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...updatedLayer,
          position: updatedLayer.position as unknown as Position,
          transform: updatedLayer.transform as unknown as Transform
        } as SceneLayer
      };

    } catch (error: any) {
      console.error('[LayerManager] updateLayerPosition error:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_POSITION_FAILED',
          message: error.message || 'Failed to update position',
          details: error
        }
      };
    }
  }

  /**
   * Update layer transform (rotation, scale, opacity)
   * Modifies visual transformation properties
   * 
   * @param layerId - The layer to transform
   * @param transform - Partial transform object with fields to update
   * @returns Promise with updated layer or error
   * 
   * @example
   * ```typescript
   * await layerManager.updateLayerTransform('layer-id', {
   *   rotation: 45,
   *   scaleX: 1.5,
   *   scaleY: 1.5,
   *   opacity: 0.8
   * });
   * ```
   */
  async updateLayerTransform(
    layerId: string,
    transform: Partial<Transform>
  ): Promise<APIResponse<SceneLayer>> {
    try {
      const { data: layer } = await supabase
        .from('scene_layers')
        .select('transform')
        .eq('id', layerId)
        .single();

      if (!layer) throw new Error('Layer not found');

      const currentTransform = layer.transform as any as Transform;
      const updatedTransform = {
        ...currentTransform,
        ...transform
      };

      const { data: updatedLayer, error } = await supabase
        .from('scene_layers')
        .update({ transform: updatedTransform as any })
        .eq('id', layerId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          ...updatedLayer,
          position: updatedLayer.position as unknown as Position,
          transform: updatedLayer.transform as unknown as Transform
        } as SceneLayer
      };

    } catch (error: any) {
      console.error('[LayerManager] updateLayerTransform error:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_TRANSFORM_FAILED',
          message: error.message || 'Failed to update transform',
          details: error
        }
      };
    }
  }
}

// Export singleton instance
export const layerManager = new LayerManager();

/*
// TEST USAGE:
import { layerManager } from './layer-manager';

// Add text layer
const textResult = await layerManager.addLayer('scene-id', 'text', {
  name: 'Title',
  content: { text: 'Hello World', fontSize: 48 }
});

// Add image layer
const imageResult = await layerManager.addLayer('scene-id', 'image', {
  content: { url: 'https://example.com/image.jpg' }
});

// Add shape layer
const shapeResult = await layerManager.addLayer('scene-id', 'shape', {
  content: { 
    shapeType: 'circle',
    fillColor: '#0000FF'
  }
});

// Update layer position
await layerManager.updateLayerPosition('layer-id', {
  x: 25,
  y: 25,
  width: 75,
  height: 75
});

// Update layer transform
await layerManager.updateLayerTransform('layer-id', {
  rotation: 45,
  scaleX: 1.5,
  opacity: 0.8
});

// Toggle visibility
await layerManager.toggleLayerVisibility('layer-id');

// Lock layer
await layerManager.lockLayer('layer-id', true);

// Duplicate layer
const duplicateResult = await layerManager.duplicateLayer('layer-id');

// Move layer to another scene
await layerManager.moveLayer('layer-id', 'target-scene-id');

// Reorder layers
await layerManager.reorderLayers('scene-id', [
  { id: 'layer-1', order: 2 },
  { id: 'layer-2', order: 0 },
  { id: 'layer-3', order: 1 }
]);

// Get all layers
const layersResult = await layerManager.getLayers('scene-id');

// Delete layer
await layerManager.deleteLayer('layer-id');

// Update layer content
await layerManager.updateLayer('layer-id', {
  content: { text: 'Updated text', fontSize: 64 }
});
*/
