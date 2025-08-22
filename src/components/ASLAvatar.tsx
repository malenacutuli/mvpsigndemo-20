import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface ASLAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedASLAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Enhanced ASL library with diverse signers including children
const ASL_CLIPS: Record<string, string> = {
  // Cooking actions
  boil: '/videos/asl/chef-boil.webm',
  boiling: '/videos/asl/chef-boil.webm',
  pasta: '/videos/asl/chef-pasta.webm', 
  garlic: '/videos/asl/chef-garlic.webm',
  stir: '/videos/asl/chef-stir.webm',
  stirring: '/videos/asl/chef-stir.webm',
  cook: '/videos/asl/lifeprint-cook.mp4',
  cooking: '/videos/asl/lifeprint-cook.mp4',
  bake: '/videos/asl/chef-bake.webm',
  baking: '/videos/asl/chef-bake.webm',
  eat: '/videos/asl/sample-eat.mp4',
  eating: '/videos/asl/sample-eat.mp4',
  drink: '/videos/asl/sample-drink.mp4',
  drinking: '/videos/asl/sample-drink.mp4',
  
  // Cooking tools & ingredients
  water: '/videos/asl/kids-water-sign.mp4',
  timer: '/videos/asl/kids-timer-sign.mp4', 
  pan: '/videos/asl/kids-pan-sign.mp4',
  'olive oil': '/videos/asl/kids-oil-sign.mp4',
  oil: '/videos/asl/kids-oil-sign.mp4',
  'large pan': '/videos/asl/kids-large-pan.mp4',
  'al dente': '/videos/asl/kids-al-dente.mp4',
  'angel pasta': '/videos/asl/kids-angel-pasta.mp4',
  salt: '/videos/asl/sample-salt.mp4',
  pepper: '/videos/asl/sample-pepper.mp4',
  
  // Kitchen vocabulary from educational sources
  kitchen: '/videos/asl/startasl-kitchen.mp4',
  food: '/videos/asl/lifeprint-food-cooking.mp4',
  
  // Educational content
  learn: '/videos/asl/gallaudet-children-dictionary.mp4',
  learning: '/videos/asl/gallaudet-children-dictionary.mp4',
  study: '/videos/asl/kids-study-sign.mp4',
  studying: '/videos/asl/kids-study-sign.mp4',
  teach: '/videos/asl/gallaudet-children-dictionary.mp4',
  teaching: '/videos/asl/gallaudet-children-dictionary.mp4',
  
  // Default fallbacks with diverse signers
  default: '/videos/asl/chef-asl-loop.webm',
  children: '/videos/asl/kids-kitchen-signs.mp4',
};

// Keyword expansion mapping for better matching
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  // Cooking verbs
  'cook': ['cook', 'cooking', 'prepare', 'preparing', 'make', 'making'],
  'boil': ['boil', 'boiling', 'boiled', 'bubble', 'bubbling'],
  'stir': ['stir', 'stirring', 'mix', 'mixing', 'blend', 'blending'],
  'bake': ['bake', 'baking', 'baked', 'oven', 'roast', 'roasting'],
  'eat': ['eat', 'eating', 'taste', 'tasting', 'consume'],
  'drink': ['drink', 'drinking', 'sip', 'sipping', 'beverage'],
  
  // Ingredients
  'garlic': ['garlic', 'clove', 'cloves', 'minced garlic'],
  'pasta': ['pasta', 'noodles', 'spaghetti', 'angel hair'],
  'water': ['water', 'liquid', 'hot water', 'cold water'],
  'oil': ['oil', 'olive oil', 'cooking oil', 'vegetable oil'],
  'salt': ['salt', 'seasoning', 'sodium'],
  'pepper': ['pepper', 'black pepper', 'spice'],
  
  // Kitchen tools
  'pan': ['pan', 'large pan', 'frying pan', 'skillet'],
  'timer': ['timer', 'time', 'minutes', 'seconds'],
  
  // Educational terms
  'learn': ['learn', 'learning', 'education', 'study', 'studying'],
  'teach': ['teach', 'teaching', 'instruction', 'lesson'],
};

// Smart keyword matching function
const findBestMatch = (text: string): string | null => {
  const lowerText = text.toLowerCase();
  
  // First try direct matches
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
    if (!text) return ASL_CLIPS.default;
    
    // Use the smart matching function
    const matchedKey = findBestMatch(text);
    return ASL_CLIPS[matchedKey || 'default'];
  }, [currentCaption]);

  return (
    <div className="absolute bottom-20 right-4 w-32 h-32 rounded-lg border-2 border-primary/30 bg-black/30 backdrop-blur-sm overflow-hidden animate-fade-in">
      <div className="w-full h-full relative">
        {/* Header bar */}
        <div className="absolute top-1 left-1 right-1 flex items-center justify-between text-xs text-white/80">
          <span className="inline-flex items-center gap-1"><ChefHat className="w-3 h-3 text-primary"/> ASL Chef</span>
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
            aria-label="ASL Chef Avatar"
          >
            <source src={clip} type="video/mp4" />
            <source src={clip.replace('.mp4', '.webm')} type="video/webm" />
            <source src={clip.replace('.mp4', '.ogv')} type="video/ogg" />
            Sorry, your browser doesn't support embedded videos.
          </video>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center px-3">
              <div className="text-white/90 font-medium">ASL avatar not set</div>
              <div className="text-white/60 text-xs mt-1">Upload signer clips to /videos/asl</div>
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
