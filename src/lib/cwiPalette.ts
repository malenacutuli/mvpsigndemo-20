// Captions with Intention — Color System (full palette)
// - 6 Main
// - 12 Supporting
// - 24 Minor (pastels)
// Source of truth for all color selection in the app.

export const CWI_PALETTE = {
  main: [
    '#E5E517', // Yellow
    '#17E5E5', // Cyan
    '#E51717', // Red
    '#E58017', // Orange
    '#17E517', // Green
    '#E517E5', // Magenta
  ],
  supporting: [
    '#E85C2E', '#47C2EB', '#EBC247', '#5E82ED', '#C2EB47', '#8C6BED',
    '#82ED5E', '#CC6BED', '#47EB70', '#EB47C2', '#5EEDC9', '#ED5E82',
  ],
  minor: [
    // 24 pastels — choose your approved set (examples shown)
    '#F7E8A1','#CFF1F7','#F7B3B3','#FAD3A1','#CFF7CF','#F1C2F7',
    '#D9F7A1','#D1C2F7','#B3F7D9','#F7A1E1','#A1E1F7','#F7D9A1',
    '#E1F7A1','#A1F7E1','#D9A1F7','#F1F7A1','#A1F1F7','#F7A1C2',
    '#C2F7A1','#A1C2F7','#F7C2A1','#A1F7C2','#E1A1F7','#F7A1A1',
  ],
} as const;

export type CharacterType = 'main' | 'supporting' | 'minor';
export type PalettePool = keyof typeof CWI_PALETTE;

// fnv1a 32-bit hash for stability across sessions
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Pick a color by pool + index (wraps safely).
 */
export function getColorByPool(pool: PalettePool, index: number): string {
  const arr = CWI_PALETTE[pool];
  return arr[((index % arr.length) + arr.length) % arr.length];
}

/**
 * Deterministic auto-color for a speaker/character when DB color is missing.
 * - Respects character type → pool selection
 * - Seeds by videoId+language so colors don't "shift" between projects
 * - Falls back to supporting, then minor, then main (in case of type=undefined)
 */
export function getAutoColor(
  opts: {
    name: string;                 // speaker or character name
    type?: CharacterType | null;  // 'main' | 'supporting' | 'minor'
    seed?: string;                // e.g. `${videoId}:${language}`
  }
): string {
  const { name, type, seed = '' } = opts;
  const key = `${seed}::${(name ?? '').trim().toLowerCase()}`;
  const h = fnv1a(key);

  // Choose pool by type (spec-compliant)
  const pool: PalettePool =
    type === 'main' ? 'main' :
    type === 'supporting' ? 'supporting' :
    type === 'minor' ? 'minor' :
    // If type is unknown, prefer supporting (more slots), else minor
    'supporting';

  const arr = CWI_PALETTE[pool];
  return arr[h % arr.length];
}

/**
 * Resolve final color with proper precedence:
 * 1) Explicit character.color from DB (single source of truth)
 * 2) Auto-color by type using stable hashing (project-scoped by seed)
 */
export function resolveSpeakerColor(params: {
  characterColor?: string | null;
  characterType?: CharacterType | null;
  speakerName: string;
  seed?: string; // `${videoId}:${language}`
}): string {
  const { characterColor, characterType, speakerName, seed } = params;
  if (characterColor && /^#([0-9a-f]{3}){1,2}$/i.test(characterColor)) {
    return characterColor;
  }
  return getAutoColor({ name: speakerName, type: characterType ?? undefined, seed });
}
