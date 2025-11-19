/**
 * Captions with Intention (CWI) Color Palette
 * 42-color system for character identification
 */

export interface CWIColor {
  name: string;
  hex: string;
  type: 'main' | 'supporting' | 'pastel';
  category: 'warm' | 'cool' | 'neutral';
}

export const CWI_MAIN_COLORS: CWIColor[] = [
  { name: 'Ruby Red', hex: '#E63946', type: 'main', category: 'warm' },
  { name: 'Tangerine', hex: '#F77F00', type: 'main', category: 'warm' },
  { name: 'Golden Yellow', hex: '#FCBF49', type: 'main', category: 'warm' },
  { name: 'Emerald Green', hex: '#06A77D', type: 'main', category: 'cool' },
  { name: 'Azure Blue', hex: '#1982C4', type: 'main', category: 'cool' },
  { name: 'Royal Purple', hex: '#6A4C93', type: 'main', category: 'cool' }
];

export const CWI_SUPPORTING_COLORS: CWIColor[] = [
  { name: 'Crimson', hex: '#D00000', type: 'supporting', category: 'warm' },
  { name: 'Scarlet', hex: '#DC2F02', type: 'supporting', category: 'warm' },
  { name: 'Coral', hex: '#FF6B6B', type: 'supporting', category: 'warm' },
  { name: 'Salmon', hex: '#FFA07A', type: 'supporting', category: 'warm' },
  { name: 'Amber', hex: '#FFBA08', type: 'supporting', category: 'warm' },
  { name: 'Gold', hex: '#FAA307', type: 'supporting', category: 'warm' },
  { name: 'Lime', hex: '#A7C957', type: 'supporting', category: 'warm' },
  { name: 'Forest', hex: '#386641', type: 'supporting', category: 'cool' },
  { name: 'Teal', hex: '#2A9D8F', type: 'supporting', category: 'cool' },
  { name: 'Cyan', hex: '#00B4D8', type: 'supporting', category: 'cool' },
  { name: 'Sapphire', hex: '#0077B6', type: 'supporting', category: 'cool' },
  { name: 'Indigo', hex: '#3F37C9', type: 'supporting', category: 'cool' }
];

export const CWI_PASTEL_COLORS: CWIColor[] = [
  { name: 'Pink Lace', hex: '#FFD6E8', type: 'pastel', category: 'warm' },
  { name: 'Peach', hex: '#FFCDB2', type: 'pastel', category: 'warm' },
  { name: 'Apricot', hex: '#FFB4A2', type: 'pastel', category: 'warm' },
  { name: 'Vanilla', hex: '#FFF3B0', type: 'pastel', category: 'warm' },
  { name: 'Lemon', hex: '#FFFFEA', type: 'pastel', category: 'warm' },
  { name: 'Mint', hex: '#B7E4C7', type: 'pastel', category: 'cool' },
  { name: 'Seafoam', hex: '#A8DADC', type: 'pastel', category: 'cool' },
  { name: 'Sky', hex: '#CAF0F8', type: 'pastel', category: 'cool' },
  { name: 'Periwinkle', hex: '#C8B6FF', type: 'pastel', category: 'cool' },
  { name: 'Lavender', hex: '#E0BBE4', type: 'pastel', category: 'cool' },
  { name: 'Lilac', hex: '#D4A5A5', type: 'pastel', category: 'neutral' },
  { name: 'Cream', hex: '#F8EDE3', type: 'pastel', category: 'neutral' },
  { name: 'Ivory', hex: '#FEFAE0', type: 'pastel', category: 'neutral' },
  { name: 'Pearl', hex: '#F0EAD6', type: 'pastel', category: 'neutral' },
  { name: 'Silver', hex: '#E5E5E5', type: 'pastel', category: 'neutral' },
  { name: 'Ash', hex: '#D6D6D6', type: 'pastel', category: 'neutral' },
  { name: 'Cloud', hex: '#F5F5F5', type: 'pastel', category: 'neutral' },
  { name: 'Mist', hex: '#E8E8E8', type: 'pastel', category: 'neutral' },
  { name: 'Dove', hex: '#DCDCDC', type: 'pastel', category: 'neutral' },
  { name: 'Smoke', hex: '#CCCCCC', type: 'pastel', category: 'neutral' },
  { name: 'Oyster', hex: '#F4F1DE', type: 'pastel', category: 'neutral' },
  { name: 'Bone', hex: '#F2E9E4', type: 'pastel', category: 'neutral' },
  { name: 'Parchment', hex: '#F4E8D8', type: 'pastel', category: 'neutral' },
  { name: 'Sand', hex: '#E9DDC8', type: 'pastel', category: 'neutral' }
];

export const CWI_ALL_COLORS: CWIColor[] = [
  ...CWI_MAIN_COLORS,
  ...CWI_SUPPORTING_COLORS,
  ...CWI_PASTEL_COLORS
];

// Get next available color based on character importance
export function getNextAvailableColor(
  usedColors: string[],
  characterType: 'main' | 'supporting' | 'minor' | 'off_camera'
): CWIColor {
  let availableColors: CWIColor[];

  switch (characterType) {
    case 'main':
      availableColors = CWI_MAIN_COLORS;
      break;
    case 'supporting':
      availableColors = [...CWI_MAIN_COLORS, ...CWI_SUPPORTING_COLORS];
      break;
    case 'minor':
    case 'off_camera':
      availableColors = CWI_ALL_COLORS;
      break;
    default:
      availableColors = CWI_ALL_COLORS;
  }

  // Find first unused color
  const unusedColor = availableColors.find(color => !usedColors.includes(color.hex));
  
  // If all colors are used, return first color (shouldn't happen with 42 colors)
  return unusedColor || availableColors[0];
}

// Get color by hex
export function getCWIColor(hex: string): CWIColor | undefined {
  return CWI_ALL_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase());
}

// Get colors by type
export function getCWIColorsByType(type: 'main' | 'supporting' | 'pastel'): CWIColor[] {
  return CWI_ALL_COLORS.filter(c => c.type === type);
}

// Get colors by category
export function getCWIColorsByCategory(category: 'warm' | 'cool' | 'neutral'): CWIColor[] {
  return CWI_ALL_COLORS.filter(c => c.category === category);
}
