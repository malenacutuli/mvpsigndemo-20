import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface ASLAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedASLAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Working ASL video library - simplified for demo
const ASL_CLIPS: Record<string, string> = {
  // Educational vocabulary - Children signers
  'hola': '/videos/asl/working-asl-demo.mp4',
  'hello': '/videos/asl/working-asl-demo.mp4',
  'bienvenidos': '/videos/asl/working-asl-demo.mp4',
  'welcome': '/videos/asl/working-asl-demo.mp4',
  'adivinen': '/videos/asl/asl-signer-demo.mp4',
  'guess': '/videos/asl/asl-signer-demo.mp4',
  'pensando': '/videos/asl/asl-signer-demo.mp4',
  'thinking': '/videos/asl/asl-signer-demo.mp4',
  'autobus': '/videos/asl/working-asl-demo.mp4',
  'bus': '/videos/asl/working-asl-demo.mp4',
  'chofer': '/videos/asl/working-asl-demo.mp4',
  'driver': '/videos/asl/working-asl-demo.mp4',
  'aprender': '/videos/asl/asl-signer-demo.mp4',
  'learn': '/videos/asl/asl-signer-demo.mp4',
  'learning': '/videos/asl/asl-signer-demo.mp4',
  'smarty': '/videos/asl/working-asl-demo.mp4',
  'elmo': '/videos/asl/working-asl-demo.mp4',

  // Cooking vocabulary - Adult signers
  'cook': '/videos/asl/asl-signer-demo.mp4',
  'cooking': '/videos/asl/asl-signer-demo.mp4',
  'boil': '/videos/asl/asl-signer-demo.mp4',
  'boiling': '/videos/asl/asl-signer-demo.mp4',
  'kitchen': '/videos/asl/working-asl-demo.mp4',
  'recipe': '/videos/asl/asl-signer-demo.mp4',
  'chef': '/videos/asl/asl-signer-demo.mp4',
  'pasta': '/videos/asl/asl-signer-demo.mp4',
  'garlic': '/videos/asl/working-asl-demo.mp4',
  'stir': '/videos/asl/asl-signer-demo.mp4',
  'stirring': '/videos/asl/asl-signer-demo.mp4',
  'bake': '/videos/asl/working-asl-demo.mp4',
  'baking': '/videos/asl/working-asl-demo.mp4',
  'water': '/videos/asl/asl-signer-demo.mp4',
  'oil': '/videos/asl/working-asl-demo.mp4',
  'salt': '/videos/asl/asl-signer-demo.mp4',
  'pepper': '/videos/asl/working-asl-demo.mp4',

  // Basic food vocabulary
  'eat': '/videos/asl/working-asl-demo.mp4',
  'eating': '/videos/asl/working-asl-demo.mp4',
  'drink': '/videos/asl/asl-signer-demo.mp4',
  'drinking': '/videos/asl/asl-signer-demo.mp4',
  'food': '/videos/asl/working-asl-demo.mp4',

  // Avatar-specific clips
  'chef-avatar': '/videos/asl/asl-signer-demo.mp4',
  'food-expert': '/videos/asl/asl-signer-demo.mp4',
  'home-cook': '/videos/asl/working-asl-demo.mp4',
  'superhero-captain': '/videos/asl/working-asl-demo.mp4',
  'superhero-star': '/videos/asl/asl-signer-demo.mp4',
  'friendly-teacher': '/videos/asl/working-asl-demo.mp4',
  'student-peer': '/videos/asl/asl-signer-demo.mp4',

  // Default fallbacks
  default: '/videos/asl/working-asl-demo.mp4',
  children: '/videos/asl/working-asl-demo.mp4',
  adults: '/videos/asl/asl-signer-demo.mp4',
};

// Expanded keyword mapping for Spanish Elmo content and cooking vocabulary
const KEYWORD_EXPANSIONS: Record<string, string[]> = {
  // Spanish educational vocabulary (children signers)
  'hola': ['hola', 'hello', 'hi', 'greeting'],
  'bienvenidos': ['bienvenidos', 'welcome', 'bienvenido'],
  'adivinen': ['adivinen', 'guess', 'guessing', 'pensando', 'thinking'],
  'autobus': ['autobus', 'autobús', 'bus', 'transportation'],
  'chofer': ['chofer', 'driver', 'conductor'],
  'aprender': ['aprender', 'learn', 'learning', 'estudiar'],
  'smarty': ['smarty', 'teléfono', 'phone'],
  'elmo': ['elmo', 'puppet', 'character'],

  // Cooking verbs (women signers for recipe content)
  'cook': ['cook', 'cooking', 'prepare', 'preparing', 'make', 'making', 'chef'],
  'boil': ['boil', 'boiling', 'boiled', 'bubble', 'bubbling'],
  'stir': ['stir', 'stirring', 'mix', 'mixing', 'blend', 'blending'],
  'bake': ['bake', 'baking', 'baked', 'oven', 'roast', 'roasting'],
  'kitchen': ['kitchen', 'cooking area', 'cocina'],
  
  // Ingredients and tools
  'garlic': ['garlic', 'clove', 'cloves', 'ajo'],
  'pasta': ['pasta', 'noodles', 'spaghetti', 'angel hair'],
  'water': ['water', 'liquid', 'hot water', 'agua'],
  'oil': ['oil', 'olive oil', 'cooking oil', 'aceite'],
  'salt': ['salt', 'seasoning', 'sal'],
  'pepper': ['pepper', 'black pepper', 'pimienta'],
  
  // Basic actions
  'eat': ['eat', 'eating', 'taste', 'tasting', 'comer'],
  'drink': ['drink', 'drinking', 'sip', 'beber'],
};

// Smart keyword matching with content type awareness
const findBestMatch = (text: string, selectedAvatar?: { id: string }, contentType?: 'recipe' | 'education'): string | null => {
  const lowerText = text.toLowerCase();
  
  // Content type-aware avatar selection
  if (selectedAvatar?.id && ASL_CLIPS[selectedAvatar.id]) {
    return selectedAvatar.id;
  }
  
  // Direct word matches first
  for (const key of Object.keys(ASL_CLIPS)) {
    if (lowerText.includes(key)) {
      return key;
    }
  }
  
  // Expanded keyword matches
  for (const [baseWord, expansions] of Object.entries(KEYWORD_EXPANSIONS)) {
    for (const expansion of expansions) {
      if (lowerText.includes(expansion)) {
        return baseWord;
      }
    }
  }
  
  // Fallback based on content type
  if (contentType === 'education') return 'children';
  if (contentType === 'recipe') return 'adults';
  
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
      // Fallback based on content type
      return contentType === 'education' ? ASL_CLIPS.children : ASL_CLIPS.adults;
    }
    
    // Use the smart matching function with content type awareness
    const matchedKey = findBestMatch(text, selectedASLAvatar, contentType);
    return ASL_CLIPS[matchedKey || (contentType === 'education' ? 'children' : 'adults')];
  }, [currentCaption, selectedASLAvatar, contentType]);

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
