import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface ASLAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedASLAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Enhanced ASL library with diverse signers including real children
const ASL_CLIPS: Record<string, string> = {
  // Real children's cooking actions - NEW DOWNLOADS
  boil: '/videos/asl/children-cooking-basics.mp4',
  boiling: '/videos/asl/children-cooking-basics.mp4',
  cook: '/videos/asl/children-cooking-basics.mp4',
  cooking: '/videos/asl/children-cooking-basics.mp4',
  kitchen: '/videos/asl/children-kitchen-words.mp4',
  
  // Food vocabulary with children signers
  pasta: '/videos/asl/children-food-vocabulary.mp4', 
  food: '/videos/asl/children-food-vocabulary.mp4',
  eat: '/videos/asl/sample-eat.mp4',
  eating: '/videos/asl/sample-eat.mp4',
  drink: '/videos/asl/sample-drink.mp4',
  drinking: '/videos/asl/sample-drink.mp4',
  
  // Basic cooking terms with children
  garlic: '/videos/asl/children-food-vocabulary.mp4',
  stir: '/videos/asl/children-cooking-basics.mp4',
  stirring: '/videos/asl/children-cooking-basics.mp4',
  bake: '/videos/asl/children-cooking-basics.mp4',
  baking: '/videos/asl/children-cooking-basics.mp4',
  
  // Kitchen tools & ingredients
  water: '/videos/asl/children-food-vocabulary.mp4',
  timer: '/videos/asl/children-kitchen-words.mp4', 
  pan: '/videos/asl/children-kitchen-words.mp4',
  'olive oil': '/videos/asl/children-food-vocabulary.mp4',
  oil: '/videos/asl/children-food-vocabulary.mp4',
  'large pan': '/videos/asl/children-kitchen-words.mp4',
  salt: '/videos/asl/sample-salt.mp4',
  pepper: '/videos/asl/sample-pepper.mp4',
  
  // Educational content with children signers
  learn: '/videos/asl/children-learn-together.mp4',
  learning: '/videos/asl/children-learn-together.mp4',
  study: '/videos/asl/children-learn-together.mp4',
  studying: '/videos/asl/children-learn-together.mp4',
  teach: '/videos/asl/children-learn-together.mp4',
  teaching: '/videos/asl/children-learn-together.mp4',
  
  // Superhero educational signs for children
  superhero: '/videos/asl/children-superhero-learning.mp4',
  hero: '/videos/asl/children-superhero-learning.mp4',
  adventure: '/videos/asl/children-superhero-learning.mp4',
  science: '/videos/asl/children-learn-together.mp4',
  
  // Avatar-specific clips based on character (children signers)
  'chef-avatar': '/videos/asl/children-cooking-basics.mp4',
  'food-expert': '/videos/asl/children-food-vocabulary.mp4',
  'home-cook': '/videos/asl/children-kitchen-words.mp4',
  'superhero-captain': '/videos/asl/children-superhero-learning.mp4',
  'superhero-star': '/videos/asl/children-superhero-learning.mp4',
  'friendly-teacher': '/videos/asl/children-learn-together.mp4',
  'student-peer': '/videos/asl/children-learn-together.mp4',
  
  // Educational alphabet and storytelling
  alphabet: '/videos/asl/children-educational-alphabet.mp4',
  story: '/videos/asl/children-storytelling-signs.mp4',
  storytelling: '/videos/asl/children-storytelling-signs.mp4',
  
  // Default fallbacks with real children signers
  default: '/videos/asl/children-cooking-basics.mp4',
  children: '/videos/asl/children-learn-together.mp4',
  
  // Professional chef content (keep existing for cooking demos)
  'professional-chef': '/videos/asl/chef-asl-loop.webm',
  'chef-professional': '/videos/asl/chef-pasta.webm',
};

// Keyword expansion mapping for better matching with children's content
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  // Cooking verbs (now mapped to children's videos)
  'cook': ['cook', 'cooking', 'prepare', 'preparing', 'make', 'making'],
  'boil': ['boil', 'boiling', 'boiled', 'bubble', 'bubbling'],
  'stir': ['stir', 'stirring', 'mix', 'mixing', 'blend', 'blending'],
  'bake': ['bake', 'baking', 'baked', 'oven', 'roast', 'roasting'],
  'eat': ['eat', 'eating', 'taste', 'tasting', 'consume'],
  'drink': ['drink', 'drinking', 'sip', 'sipping', 'beverage'],
  
  // Ingredients (children signers)
  'garlic': ['garlic', 'clove', 'cloves', 'minced garlic'],
  'pasta': ['pasta', 'noodles', 'spaghetti', 'angel hair'],
  'water': ['water', 'liquid', 'hot water', 'cold water'],
  'oil': ['oil', 'olive oil', 'cooking oil', 'vegetable oil'],
  'salt': ['salt', 'seasoning', 'sodium'],
  'pepper': ['pepper', 'black pepper', 'spice'],
  
  // Kitchen tools (children demonstrating)
  'pan': ['pan', 'large pan', 'frying pan', 'skillet'],
  'timer': ['timer', 'time', 'minutes', 'seconds'],
  'kitchen': ['kitchen', 'cooking area', 'cook space'],
  
  // Educational terms (children learning)
  'learn': ['learn', 'learning', 'education', 'study', 'studying'],
  'teach': ['teach', 'teaching', 'instruction', 'lesson'],
  'superhero': ['superhero', 'hero', 'captain', 'adventure'],
  'science': ['science', 'experiment', 'discovery'],
  'story': ['story', 'storytelling', 'narrative', 'tale'],
};

// Smart keyword matching function
const findBestMatch = (text: string, selectedAvatar?: { id: string }): string | null => {
  const lowerText = text.toLowerCase();
  
  // First try avatar-specific clip if available
  if (selectedAvatar?.id && ASL_CLIPS[selectedAvatar.id]) {
    return selectedAvatar.id;
  }
  
  // Then try direct matches
  for (const key of Object.keys(ASL_CLIPS)) {
    if (lowerText.includes(key)) {
      return key;
    }
  }
  
  // Then try expanded keyword matches
  for (const [baseWord, expansions] of Object.entries(KEYWORD_EXPANSIONS)) {
    for (const expansion of expansions) {
      if (lowerText.includes(expansion)) {
        return baseWord;
      }
    }
  }
  
  return null;
};

export const ASLAvatar: React.FC<ASLAvatarProps> = ({ contentType = 'recipe', selectedASLAvatar, currentCaption }) => {
  const clip = useMemo(() => {
    const text = currentCaption?.text || '';
    if (!text) {
      // Use avatar-specific default clip if available
      if (selectedASLAvatar?.id && ASL_CLIPS[selectedASLAvatar.id]) {
        return ASL_CLIPS[selectedASLAvatar.id];
      }
      return ASL_CLIPS.default;
    }
    
    // Use the smart matching function
    const matchedKey = findBestMatch(text, selectedASLAvatar);
    return ASL_CLIPS[matchedKey || 'default'];
  }, [currentCaption, selectedASLAvatar]);

  // Get proper header text based on content type and avatar
  const getHeaderText = () => {
    if (contentType === 'education') {
      return selectedASLAvatar?.name?.includes('Teacher') ? 'ASL Teacher' : 'ASL Guide';
    }
    return 'ASL Chef';
  };

  return (
    <div className="absolute bottom-20 right-4 w-32 h-32 rounded-lg border-2 border-primary/30 bg-black/30 backdrop-blur-sm overflow-hidden animate-fade-in">
      <div className="w-full h-full relative">
        {/* Header bar */}
        <div className="absolute top-1 left-1 right-1 flex items-center justify-between text-xs text-white/80">
          <span className="inline-flex items-center gap-1">
            {contentType === 'recipe' ? <ChefHat className="w-3 h-3 text-primary"/> : <HandHelping className="w-3 h-3 text-primary"/>}
            {getHeaderText()}
          </span>
          <span className="inline-flex items-center gap-1"><HandHelping className="w-3 h-3 text-primary"/> LIVE</span>
        </div>

        {/* Video avatar (falls back to helper panel if missing) */}
        {clip ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            aria-label={`${getHeaderText()} Avatar`}
            onError={(e) => {
              console.error('ASL video failed to load:', clip);
            }}
          >
            <source src={clip} type="video/mp4" />
            <source src={clip.replace('.mp4', '.webm')} type="video/webm" />
            <source src={clip.replace('.webm', '.mp4')} type="video/mp4" />
            Sorry, your browser doesn't support embedded videos.
          </video>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-3">
              <div className="text-white/90 font-medium">ASL avatar loading...</div>
              <div className="text-white/60 text-xs mt-1">Preparing sign language interpretation</div>
            </div>
          </div>
        )}

        {/* Meta pill */}
        <div className="absolute bottom-1 left-1 bg-primary/30 text-white text-[10px] px-2 py-0.5 rounded-full">
          {selectedASLAvatar?.name || (contentType === 'recipe' ? 'Chef' : 'Teacher')}
        </div>
      </div>
    </div>
  );
};
