import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LoadCharactersFromDBProps {
  videoId: string;
  language?: string;
}

/**
 * Loads characters from database on mount and refreshes character list
 * This ensures CharacterManager always has the latest data
 */
export const LoadCharactersFromDB: React.FC<LoadCharactersFromDBProps> = ({ 
  videoId, 
  language = 'en' 
}) => {
  
  useEffect(() => {
    const loadCharactersFromDatabase = async () => {
      try {
        const { data: characters, error } = await supabase
          .from('characters')
          .select('name, color')
          .eq('video_id', videoId);

        if (error) {
          console.error('❌ Failed to fetch characters from DB', error);
          return;
        }

        if (characters && characters.length > 0) {
          const colorMapping: Record<string, string> = {};
          characters.forEach(char => {
            if (char.name && char.color) {
              colorMapping[char.name] = char.color;
            }
          });
          
          localStorage.setItem('character-colors', JSON.stringify(colorMapping));
          console.log('✅ Loaded characters from DB on mount:', colorMapping);
        }
      } catch (error) {
        console.error('❌ Error loading characters from DB:', error);
      }
    };
    
    loadCharactersFromDatabase();
  }, [videoId]);

  return null; // Headless component
};
