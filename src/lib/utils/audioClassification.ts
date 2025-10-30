/**
 * CWI Audio Classification System
 * Detects and formats special audio content per Design Guide
 */

export interface AudioClassification {
  is_sound_effect: boolean;
  is_music: boolean;
  formatted_text: string;
  vocal_intensity: 'whisper' | 'normal' | 'yell' | 'shout';
}

// Sound effect keywords that trigger classification
const SFX_KEYWORDS = [
  'bang', 'crash', 'boom', 'explosion', 'thud', 'slam', 'pop',
  'click', 'beep', 'buzz', 'ring', 'ding', 'chime', 'bell',
  'door', 'footsteps', 'glass breaking', 'thunder', 'applause',
  'knock', 'splash', 'whoosh', 'screech', 'honk', 'siren'
];

// Music-related keywords
const MUSIC_KEYWORDS = [
  'music', 'song', 'melody', 'tune', 'playing', 'singing',
  'humming', 'whistling', 'jazz', 'rock', 'classical', 'pop',
  'instrumental', 'orchestra', 'piano', 'guitar', 'drums'
];

// Volume intensity keywords
const INTENSITY_KEYWORDS = {
  whisper: ['whisper', 'whispering', 'quietly', 'softly', 'murmur'],
  yell: ['yell', 'yelling', 'loudly', 'shouting'],
  shout: ['shout', 'scream', 'screaming', 'roar', 'bellowing']
};

export function classifyAudioContent(text: string): AudioClassification {
  const lowerText = text.toLowerCase();
  
  // Check if it's a sound effect
  const is_sound_effect = 
    // Already formatted with brackets
    /\[.*?\]/.test(text) ||
    // Contains SFX keywords
    SFX_KEYWORDS.some(keyword => lowerText.includes(keyword)) ||
    // Common SFX patterns
    /\b(sound|noise)\b/i.test(lowerText);
  
  // Check if it's music
  const is_music = 
    // Already has music symbols
    /♪|♫/.test(text) ||
    // Contains music keywords
    MUSIC_KEYWORDS.some(keyword => lowerText.includes(keyword)) ||
    // Music patterns
    /\b(plays?|playing|starts?|stops?)\s+(music|song)/i.test(lowerText);
  
  // Detect vocal intensity
  let vocal_intensity: AudioClassification['vocal_intensity'] = 'normal';
  
  for (const [intensity, keywords] of Object.entries(INTENSITY_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      vocal_intensity = intensity as AudioClassification['vocal_intensity'];
      break;
    }
  }
  
  // Check for ALL CAPS (usually means shouting)
  if (text === text.toUpperCase() && text.length > 5 && /[A-Z]/.test(text)) {
    vocal_intensity = 'shout';
  }
  
  // Format the text according to CWI guidelines
  let formatted_text = text;
  
  if (is_music) {
    // Add music symbols if not present
    if (!text.includes('♪')) {
      formatted_text = `♪ ${text.replace(/[♪♫]/g, '').trim()} ♪`;
    }
  } else if (is_sound_effect) {
    // Add brackets if not present
    if (!text.startsWith('[')) {
      formatted_text = `[${text.replace(/[\[\]]/g, '').trim()}]`;
    }
  }
  
  return {
    is_sound_effect,
    is_music,
    formatted_text,
    vocal_intensity
  };
}
