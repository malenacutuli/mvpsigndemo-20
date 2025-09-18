import { useEffect } from 'react';

interface SpeakerMappingSyncProps {
  videoId: string;
  mappings: Record<string, string>;
  characters: Array<{name: string, color: string}>;
}

export const SpeakerMappingSync: React.FC<SpeakerMappingSyncProps> = ({
  videoId,
  mappings,
  characters
}) => {
  useEffect(() => {
    // Update localStorage with correct mappings
    localStorage.setItem(`speaker-mappings-${videoId}`, JSON.stringify(mappings));
    
    // Update character definitions in localStorage
    localStorage.setItem(`characters-${videoId}`, JSON.stringify(characters));
    
    // Create character color map
    const colorMap = characters.reduce((acc, char) => ({
      ...acc,
      [char.name]: char.color
    }), {});
    
    localStorage.setItem('character-colors', JSON.stringify(colorMap));
    
    // Dispatch update event
    window.dispatchEvent(new CustomEvent('character-colors-updated', {
      detail: { colors: colorMap, characters, mappings }
    }));
    
    console.log('🎭 Speaker mappings synchronized:', mappings);
    console.log('🎨 Character colors synchronized:', colorMap);
    
  }, [videoId, mappings, characters]);

  return null; // Headless component
};