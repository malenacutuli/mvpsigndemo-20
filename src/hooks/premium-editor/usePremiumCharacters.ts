import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PremiumCharacter } from '@/types/premium-transcript';
import { getNextAvailableColor } from '@/lib/premium/cwiPalette';

interface UsePremiumCharactersOptions {
  videoId: string;
  onCharactersChange?: () => void;
}

export function usePremiumCharacters({ videoId, onCharactersChange }: UsePremiumCharactersOptions) {
  const [characters, setCharacters] = useState<PremiumCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    loadCharacters();
  }, [videoId]);

  async function loadCharacters() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Map to PremiumCharacter format
      const mappedCharacters: PremiumCharacter[] = (data || []).map(char => ({
        id: char.id,
        version_id: char.video_id,
        name: char.name,
        type: char.type as 'main' | 'supporting' | 'minor' | 'off_camera',
        color: char.color,
        voice_id: char.voice_id,
        voice_name: char.voice_name,
        voice_type: char.voice_type,
        emphasis: char.emphasis || 'normal',
        pitch: char.pitch || 'normal',
        is_off_camera: char.is_off_camera || false,
        created_at: char.created_at,
        updated_at: char.updated_at
      }));

      setCharacters(mappedCharacters);
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  }

  const createCharacter = useCallback(async (
    name: string,
    type: 'main' | 'supporting' | 'minor' | 'off_camera' = 'main'
  ) => {
    try {
      setSaving(true);

      const usedColors = characters.map(c => c.color);
      const color = getNextAvailableColor(usedColors, type);

      const { data, error } = await supabase
        .from('characters')
        .insert({
          video_id: videoId,
          name,
          type,
          color: color.hex,
          emphasis: 'normal',
          pitch: 'normal',
          is_off_camera: type === 'off_camera'
        })
        .select()
        .single();

      if (error) throw error;

      const newCharacter: PremiumCharacter = {
        id: data.id,
        version_id: data.video_id,
        name: data.name,
        type: data.type as 'main' | 'supporting' | 'minor' | 'off_camera',
        color: data.color,
        voice_id: data.voice_id,
        voice_name: data.voice_name,
        voice_type: data.voice_type,
        emphasis: data.emphasis || 'normal',
        pitch: data.pitch || 'normal',
        is_off_camera: data.is_off_camera || false,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      setCharacters(prev => [...prev, newCharacter]);
      onCharactersChange?.();

      return newCharacter;
    } catch (error) {
      console.error('Failed to create character:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  }, [videoId, characters, onCharactersChange]);

  const updateCharacter = useCallback(async (
    characterId: string,
    updates: Partial<PremiumCharacter>
  ) => {
    try {
      setSaving(true);

      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.type) dbUpdates.type = updates.type;
      if (updates.color) dbUpdates.color = updates.color;
      if (updates.emphasis) dbUpdates.emphasis = updates.emphasis;
      if (updates.pitch) dbUpdates.pitch = updates.pitch;
      if (updates.voice_id !== undefined) dbUpdates.voice_id = updates.voice_id;
      if (updates.voice_name !== undefined) dbUpdates.voice_name = updates.voice_name;

      const { error } = await supabase
        .from('characters')
        .update(dbUpdates)
        .eq('id', characterId);

      if (error) throw error;

      setCharacters(prev => prev.map(char =>
        char.id === characterId ? { ...char, ...updates } : char
      ));

      onCharactersChange?.();
    } catch (error) {
      console.error('Failed to update character:', error);
    } finally {
      setSaving(false);
    }
  }, [onCharactersChange]);

  const deleteCharacter = useCallback(async (characterId: string) => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId);

      if (error) throw error;

      setCharacters(prev => prev.filter(char => char.id !== characterId));
      onCharactersChange?.();
    } catch (error) {
      console.error('Failed to delete character:', error);
    } finally {
      setSaving(false);
    }
  }, [onCharactersChange]);

  const detectSpeakers = useCallback(async () => {
    try {
      setSaving(true);

      // Get unique speakers from video's transcript
      const { data: segments } = await supabase
        .from('transcript_segments_clean')
        .select('speaker')
        .eq('video_id', videoId)
        .not('speaker', 'is', null);

      if (!segments) return;

      const uniqueSpeakers = [...new Set(
        segments
          .map(s => s.speaker)
          .filter(Boolean)
      )] as string[];

      const existingNames = new Set(characters.map(c => c.name.toLowerCase()));
      const newSpeakers = uniqueSpeakers.filter(
        speaker => !existingNames.has(speaker.toLowerCase())
      );

      for (const speaker of newSpeakers) {
        await createCharacter(speaker, 'main');
      }

      await loadCharacters();
    } catch (error) {
      console.error('Failed to detect speakers:', error);
    } finally {
      setSaving(false);
    }
  }, [videoId, characters, createCharacter, loadCharacters]);

  return {
    characters,
    loading,
    saving,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    detectSpeakers,
    reloadCharacters: loadCharacters
  };
}
