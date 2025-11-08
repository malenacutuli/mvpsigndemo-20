import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CICharacterSyncProps {
  videoId: string;
  language?: string;
}

/**
 * Captions with Intention Character Synchronization
 * Ensures character data stays in sync across the application
 */
export const CICharacterSync: React.FC<CICharacterSyncProps> = ({ 
  videoId, 
  language = 'en' 
}) => {
  
  useEffect(() => {
    console.log('[CI-Sync] Initializing for video', videoId, 'language', language);
    
    // Set up real-time listeners
    const segmentChannel = supabase
      .channel(`transcript-segments-${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transcript_segments_clean',
          filter: `video_id=eq.${videoId}`
        },
        (payload) => {
          console.log('[CI-Sync] Transcript segment changed', payload);
          syncCharacterData();
        }
      )
      .subscribe();

    const characterChannel = supabase
      .channel(`characters-${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `video_id=eq.${videoId}`
        },
        (payload) => {
          console.log('[CI-Sync] Character changed', payload);
          syncCharacterData();
        }
      )
      .subscribe();

    // Initial sync
    syncCharacterData();

    return () => {
      supabase.removeChannel(segmentChannel);
      supabase.removeChannel(characterChannel);
    };
  }, [videoId, language]);

  const syncCharacterData = async () => {
    try {
      console.log('[CI-Sync] Syncing from database');
      
      // Fetch characters
      const { data: characters, error: charError } = await supabase
        .from('characters')
        .select('id, name, color, is_off_camera, type')
        .eq('video_id', videoId);

      if (charError) {
        console.error('[CI-Sync] Failed to fetch characters', charError);
        toast({
          title: "Sync Error",
          description: "Failed to sync character data",
          variant: "destructive"
        });
        return;
      }

      // Fetch segments with character assignments
      const { data: segments, error: segError } = await supabase
        .from('transcript_segments_clean')
        .select('speaker, speaker_color, speaker_asr_label, character_id')
        .eq('video_id', videoId)
        .eq('language', language);

      if (segError) {
        console.error('[CI-Sync] Failed to fetch segments', segError);
        toast({
          title: "Sync Error",
          description: "Failed to sync transcript data",
          variant: "destructive"
        });
        return;
      }

      // Build unified character data
      const characterData: Record<string, {
        id: string;
        color: string;
        is_off_camera: boolean;
        type: string;
      }> = {};

      // Priority 1: Characters from database
      if (characters) {
        characters.forEach(char => {
          if (char.name && char.color) {
            characterData[char.name] = {
              id: char.id,
              color: char.color,
              is_off_camera: char.is_off_camera || false,
              type: char.type || 'main'
            };
          }
        });
      }

      // Priority 2: Speaker colors from segments (fallback)
      if (segments) {
        segments.forEach(seg => {
          if (seg.speaker && seg.speaker_color && !characterData[seg.speaker]) {
            characterData[seg.speaker] = {
              id: seg.character_id || '',
              color: seg.speaker_color,
              is_off_camera: false,
              type: 'supporting'
            };
          }
        });
      }

      // Update localStorage as cache
      localStorage.setItem('character-data', JSON.stringify(characterData));
      localStorage.setItem('character-data-timestamp', Date.now().toString());
      
      // Dispatch event for components
      window.dispatchEvent(new CustomEvent('character-data-updated', { 
        detail: { 
          characters: characterData, 
          videoId, 
          language, 
          source: 'database' 
        } 
      }));

      console.log('[CI-Sync] Synced successfully', {
        characterCount: Object.keys(characterData).length,
        characters: Object.keys(characterData)
      });

    } catch (error) {
      console.error('[CI-Sync] Synchronization failed', error);
      toast({
        title: "Sync Failed",
        description: "Character synchronization failed",
        variant: "destructive"
      });
    }
  };

  return null;
};