/**
 * Captions with Intention (CWI) Official Color Palette
 * Design Guide V1.0 - Pages 16, 20, 22
 * 
 * Total: 42 colors (6 main + 12 supporting + 24 minor pastels)
 */

export const CWI_PALETTE = {
  // Main characters (6 colors) - Design Guide page 16
  main: [
    '#E5E517', // Yellow - Hero
    '#17E5E5', // Cyan - Villain (opposite of hero)
    '#E51717', // Red
    '#E58017', // Orange
    '#17E517', // Green
    '#E517E5', // Magenta
  ] as string[],
  
  // Supporting characters (12 colors) - Design Guide page 20
  supporting: [
    '#E85C2E', // Orange
    '#47C2EB', // Blue I
    '#EBC247', // Yellow
    '#5E82ED', // Blue II
    '#C2EB47', // Green I
    '#8C6BED', // Purple I
    '#82ED5E', // Green II
    '#CC6BED', // Purple II
    '#47EB70', // Green III
    '#EB47C2', // Pink I
    '#5EEDC9', // Cyan
    '#ED5E82', // Pink II
  ] as string[],
  
  // Minor characters (24 pastels) - Design Guide page 22
  // Formula: hsl(H, 30%, 90%)
  minor: Array.from({ length: 24 }, (_, i) => {
    const hue = (i * 15) % 360; // Evenly spaced around color wheel
    return `hsl(${hue}, 30%, 90%)`;
  })
};

/**
 * Get color by character type and index
 */
export function getColorByType(
  type: 'main' | 'supporting' | 'minor',
  index: number
): string {
  const pool = CWI_PALETTE[type];
  return pool[index % pool.length];
}

/**
 * Get color for a speaker with priority system
 * 
 * Priority order:
 * 1. Database segment.speaker_color (if set)
 * 2. CharacterManager custom colors (if provided)
 * 3. localStorage character-colors (legacy)
 * 4. Auto-assign from full palette based on speaker name
 */
export function getSpeakerColor(
  speaker: string,
  customColors?: Record<string, string>,
  segmentColor?: string,
  characterType?: 'main' | 'supporting' | 'minor'
): string {
  // Priority 1: Database segment.speaker_color
  if (segmentColor && segmentColor !== '#3B82F6') {
    return segmentColor;
  }
  
  // Priority 2: Character Manager colors (passed as prop)
  if (customColors && customColors[speaker]) {
    return customColors[speaker];
  }
  
  // Priority 3: localStorage 'character-colors' (legacy support)
  if (typeof window !== 'undefined') {
    try {
      const storedColors = JSON.parse(localStorage.getItem('character-colors') || '{}');
      if (storedColors[speaker]) {
        return storedColors[speaker];
      }
    } catch (e) {
      console.warn('Failed to parse character-colors from localStorage:', e);
    }
  }
  
  // Priority 4: Auto-assign from full palette
  return autoAssignColor(speaker, characterType);
}

/**
 * Auto-assign color from 42-color palette
 * Uses character type if provided, otherwise assigns from all colors
 */
function autoAssignColor(
  speaker: string,
  characterType?: 'main' | 'supporting' | 'minor'
): string {
  // Determine color pool
  let colorPool: string[];
  
  if (characterType === 'main') {
    colorPool = CWI_PALETTE.main;
  } else if (characterType === 'supporting') {
    colorPool = CWI_PALETTE.supporting;
  } else if (characterType === 'minor') {
    colorPool = CWI_PALETTE.minor;
  } else {
    // No type specified: Use main + supporting (18 colors)
    // Pastels excluded from auto-assignment unless explicitly requested
    colorPool = [
      ...CWI_PALETTE.main,
      ...CWI_PALETTE.supporting
    ];
  }
  
  // Generate consistent hash from speaker name
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = ((hash << 5) - hash) + speaker.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Return color from pool
  return colorPool[Math.abs(hash) % colorPool.length];
}

/**
 * Get next available color for new character
 * Avoids colors already in use
 */
export function getNextAvailableColor(
  usedColors: string[],
  characterType: 'main' | 'supporting' | 'minor' = 'main'
): string {
  const pool = CWI_PALETTE[characterType];
  
  // Find first unused color
  const availableColor = pool.find(color => !usedColors.includes(color));
  
  // If all colors used, return first color from pool
  return availableColor || pool[0];
}

/**
 * Get color by character importance
 * Used in CharacterManager when creating new characters
 */
export function getColorByCharacterImportance(
  importance: 'hero' | 'villain' | 'main' | 'supporting' | 'minor',
  usedColors: string[]
): string {
  switch (importance) {
    case 'hero':
      // Yellow (#E5E517) - Most visible
      return CWI_PALETTE.main[0];
    
    case 'villain':
      // Cyan (#17E5E5) - Opposite of hero
      return CWI_PALETTE.main[1];
    
    case 'main':
      return getNextAvailableColor(usedColors, 'main');
    
    case 'supporting':
      return getNextAvailableColor(usedColors, 'supporting');
    
    case 'minor':
      return getNextAvailableColor(usedColors, 'minor');
    
    default:
      return getNextAvailableColor(usedColors, 'main');
  }
}

/**
 * Get all available colors (6 + 12 = 18 non-pastel colors)
 */
export function getAllColors(): string[] {
  return [...CWI_PALETTE.main, ...CWI_PALETTE.supporting];
}
