export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  accent?: string;
  gender?: 'male' | 'female';
  category?: 'chef' | 'narrator' | 'education' | 'premium';
  elevenLabsId?: string;
}

// Centralized voice options with ElevenLabs integration
export const VOICE_OPTIONS: VoiceOption[] = [
  // Chef/Recipe Voices
  { id: 'gordon-ramsay', name: 'Gordon Ramsay Style', description: 'Passionate, authoritative cooking voice', gender: 'male', category: 'chef', elevenLabsId: 'nPczCjzI2devNBz1zQrb' },
  { id: 'julia-child', name: 'Julia Child Style', description: 'Warm, encouraging culinary guide', gender: 'female', category: 'chef', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
  { id: 'anthony-bourdain', name: 'Anthony Bourdain Style', description: 'Sophisticated, worldly food narrator', gender: 'male', category: 'chef', elevenLabsId: 'JBFqnCBsd6RMkjVDRZzb' },
  { id: 'jamie-oliver', name: 'Jamie Oliver Style', description: 'Enthusiastic, approachable chef', gender: 'male', category: 'chef', elevenLabsId: 'CwhRBWXzGAHq8TQ4Fs17' },
  { id: 'ina-garten', name: 'Ina Garten Style', description: 'Calm, reassuring cooking mentor', gender: 'female', category: 'chef', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
  { id: 'emeril-style', name: 'Emeril Style', description: 'Energetic, enthusiastic chef', gender: 'male', category: 'chef', elevenLabsId: 'TX3LPaxmHKxFdv7VOQHJ' },
  { id: 'rachael-ray-style', name: 'Rachael Ray Style', description: 'Upbeat, friendly cooking host', gender: 'female', category: 'chef', elevenLabsId: 'cgSgspJ2msm6clMCkdW9' },
  
  // Professional Narrators
  { id: 'professional-male', name: 'Professional Male', description: 'Clear, authoritative narrator', gender: 'male', category: 'narrator', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
  { id: 'professional-female', name: 'Professional Female', description: 'Warm, engaging narrator', gender: 'female', category: 'narrator', elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku' },
  { id: 'documentary-male', name: 'Documentary Style Male', description: 'David Attenborough inspired', gender: 'male', category: 'narrator', elevenLabsId: 'IKne3meq5aSn9XLyUdCD' },
  { id: 'documentary-female', name: 'Documentary Style Female', description: 'Engaging documentary narrator', gender: 'female', category: 'narrator', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
  { id: 'news-anchor-male', name: 'News Anchor (Male)', description: 'Trusted news delivery voice', gender: 'male', category: 'narrator', elevenLabsId: 'bIHbv24MWmeRgasZH58o' },
  { id: 'news-anchor-female', name: 'News Anchor (Female)', description: 'Professional news presenter', gender: 'female', category: 'narrator', elevenLabsId: 'XrExE9yKIg1WjnnlVkGX' },
  
  // Education Focused
  { id: 'teacher-female', name: 'Teacher (Female)', description: 'Patient, educational tone', gender: 'female', category: 'education', elevenLabsId: 'cgSgspJ2msm6clMCkdW9' },
  { id: 'teacher-male', name: 'Teacher (Male)', description: 'Encouraging, instructional voice', gender: 'male', category: 'education', elevenLabsId: 'TX3LPaxmHKxFdv7VOQHJ' },
  { id: 'storyteller-female', name: 'Storyteller (Female)', description: 'Expressive, engaging storyteller', gender: 'female', category: 'education', elevenLabsId: 'XrExE9yKIg1WjnnlVkGX' },
  { id: 'storyteller-male', name: 'Storyteller (Male)', description: 'Captivating story narrator', gender: 'male', category: 'education', elevenLabsId: 'bIHbv24MWmeRgasZH58o' },
  { id: 'children-host-female', name: 'Children Host (Female)', description: 'Friendly children\'s educator', gender: 'female', category: 'education', elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku' },
  { id: 'children-host-male', name: 'Children Host (Male)', description: 'Animated children\'s presenter', gender: 'male', category: 'education', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
  
  // Spanish Voices
  { id: 'spanish-narrator-female', name: 'Spanish Narrator (Female)', description: 'Clear Spanish pronunciation', accent: 'Spanish', gender: 'female', category: 'education', elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku' },
  { id: 'spanish-narrator-male', name: 'Spanish Narrator (Male)', description: 'Professional Spanish voice', accent: 'Spanish', gender: 'male', category: 'education', elevenLabsId: 'JBFqnCBsd6RMkjVDRZzb' },
  { id: 'spanish-warm-female', name: 'Spanish Warm (Female)', description: 'Warm, motherly Spanish voice', accent: 'Spanish', gender: 'female', category: 'education', elevenLabsId: 'cgSgspJ2msm6clMCkdW9' },
  { id: 'spanish-energetic', name: 'Spanish Energetic', description: 'Energetic Spanish for children', accent: 'Spanish', gender: 'female', category: 'education', elevenLabsId: 'XrExE9yKIg1WjnnlVkGX' },
  { id: 'spanish-chef-male', name: 'Spanish Chef (Male)', description: 'Passionate Spanish cooking voice', accent: 'Spanish', gender: 'male', category: 'chef', elevenLabsId: 'CwhRBWXzGAHq8TQ4Fs17' },
  { id: 'spanish-chef-female', name: 'Spanish Chef (Female)', description: 'Traditional Spanish cooking guide', accent: 'Spanish', gender: 'female', category: 'chef', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
  
  // Premium Voices
  { id: 'premium-aria', name: 'Aria (Premium)', description: 'Ultra-realistic female voice', gender: 'female', category: 'premium', elevenLabsId: '9BWtsMINqrJLrRacOk9x' },
  { id: 'premium-roger', name: 'Roger (Premium)', description: 'Deep, resonant male voice', gender: 'male', category: 'premium', elevenLabsId: 'CwhRBWXzGAHq8TQ4Fs17' },
  { id: 'premium-sarah', name: 'Sarah (Premium)', description: 'Sophisticated female narrator', gender: 'female', category: 'premium', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL' },
  { id: 'premium-charlie', name: 'Charlie (Premium)', description: 'Versatile male voice', gender: 'male', category: 'premium', elevenLabsId: 'IKne3meq5aSn9XLyUdCD' },
  { id: 'premium-emma', name: 'Emma (Premium)', description: 'Elegant British narrator', gender: 'female', category: 'premium', elevenLabsId: 'XB0fDUnXU5powFXDhCwa' },
  { id: 'premium-daniel', name: 'Daniel (Premium)', description: 'Smooth American narrator', gender: 'male', category: 'premium', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9' },
];

export const getCategoryColor = (category: string) => {
  switch (category) {
    case 'chef': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'narrator': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'education': return 'bg-green-100 text-green-800 border-green-200';
    case 'premium': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getFilteredVoices = (language = 'en', contentType: 'recipe' | 'education' = 'recipe') => {
  let voices = VOICE_OPTIONS;
  
  // Filter by language
  if (language === 'es') {
    voices = voices.filter(v => v.accent === 'Spanish' || v.category === 'premium');
  } else {
    voices = voices.filter(v => !v.accent || v.accent !== 'Spanish');
  }
  
  // Prioritize by content type
  voices.sort((a, b) => {
    if (contentType === 'recipe' && a.category === 'chef' && b.category !== 'chef') return -1;
    if (contentType === 'recipe' && b.category === 'chef' && a.category !== 'chef') return 1;
    if (contentType === 'education' && a.category === 'education' && b.category !== 'education') return -1;
    if (contentType === 'education' && b.category === 'education' && a.category !== 'education') return 1;
    return 0;
  });
  
  return voices;
};

export const findVoiceById = (id: string): VoiceOption | undefined => {
  return VOICE_OPTIONS.find(voice => voice.id === id);
};