import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CICharacterSyncProps {
  videoId: string;
  language?: string;
}

/**
 * Captions with Intention Character Synchronization Component
 * 
 * This component ensures that all character colors and speaker assignments
 * are synchronized across the entire application following CI guidelines.
 * 
 * It listens for database changes and updates localStorage for instant sync.
 */
export const CICharacterSync: React.FC<CICharacterSyncProps> = ({ 
  videoId, 
  language = 'en' 
}) => {
  
  useEffect(() => {
    console.log('🔄 CI Character Sync: Initializing for video', videoId, 'language', language);
    
    // Set up real-time listener for transcript segment changes
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
          console.log('🔄 CI Character Sync: Transcript segment changed', payload);
          syncCharacterColors();
        }
      )
      .subscribe();

    // Set up real-time listener for character changes
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
          console.log('🔄 CI Character Sync: Character changed', payload);
          syncCharacterColors();
        }
      )
      .subscribe();

    // Initial sync
    syncCharacterColors();

    return () => {
      supabase.removeChannel(segmentChannel);
      supabase.removeChannel(characterChannel);
    };
  }, [videoId, language]);

  const syncCharacterColors = async () => {
    try {
      console.log('🎨 CI Character Sync: Starting color synchronization from DATABASE');
      
      // ALWAYS fetch from database - never trust localStorage alone
      const { data: characters, error: charError } = await supabase
        .from('characters')
        .select('name, color')
        .eq('video_id', videoId);

      if (charError) {
        console.error('❌ CI Character Sync: Failed to fetch characters', charError);
        return;
      }

      // Get all unique speakers from transcript segments
      const { data: segments, error: segError } = await supabase
        .from('transcript_segments_clean')
        .select('speaker, speaker_color')
        .eq('video_id', videoId)
        .eq('language', language);

      if (segError) {
        console.error('❌ CI Character Sync: Failed to fetch segments', segError);
        return;
      }

      // Build unified color mapping from SERVER data
      const colorMapping: Record<string, string> = {};

      // Priority 1: Character definitions from database
      if (characters) {
        characters.forEach(char => {
          if (char.name && char.color) {
            colorMapping[char.name] = char.color;
          }
        });
      }

      // Priority 2: Speaker colors from segments (if not already defined by characters)
      if (segments) {
        segments.forEach(seg => {
          if (seg.speaker && seg.speaker_color && !colorMapping[seg.speaker]) {
            colorMapping[seg.speaker] = seg.speaker_color;
          }
        });
      }

      // Update localStorage ONLY as read-through cache (database is source of truth)
      localStorage.setItem('character-colors', JSON.stringify(colorMapping));
      localStorage.setItem('character-colors-timestamp', Date.now().toString());
      
      // Dispatch event to notify all components of SERVER-synced data
      window.dispatchEvent(new CustomEvent('character-colors-updated', { 
        detail: { colors: colorMapping, videoId, language, source: 'database' } 
      }));

      console.log('✅ CI Character Sync: Synced from database across all devices', colorMapping);

    } catch (error) {
      console.error('❌ CI Character Sync: Synchronization failed', error);
    }
  };

  return null; // This is a headless component
};