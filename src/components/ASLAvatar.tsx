import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface ASLAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedASLAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Multi-format ASL video library with adults and children doing American Sign Language
interface ASLVideoSources {
  mp4?: string;
  webm?: string;
  ogg?: string;
}

const ASL_CLIPS: Record<string, ASLVideoSources> = {
  // Educational vocabulary - Children signers
  'hola': { 
    mp4: '/videos/asl/children-hello-bienvenidos.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  'hello': { 
    mp4: '/videos/asl/children-hello-bienvenidos.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  'bienvenidos': { 
    mp4: '/videos/asl/children-hello-bienvenidos.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  'welcome': { 
    mp4: '/videos/asl/children-hello-bienvenidos.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  'adivinen': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-pbs-real.mp4'
  },
  'guess': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-pbs-real.mp4'
  },
  'pensando': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-pbs-real.mp4'
  },
  'thinking': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-pbs-real.mp4'
  },
  'autobus': { 
    mp4: '/videos/asl/children-bus-autobus.mp4',
    webm: '/videos/asl/children-holidays-real.mp4'
  },
  'bus': { 
    mp4: '/videos/asl/children-bus-autobus.mp4',
    webm: '/videos/asl/children-holidays-real.mp4'
  },
  'chofer': { 
    mp4: '/videos/asl/children-bus-autobus.mp4',
    webm: '/videos/asl/children-holidays-real.mp4'
  },
  'driver': { 
    mp4: '/videos/asl/children-bus-autobus.mp4',
    webm: '/videos/asl/children-holidays-real.mp4'
  },
  'aprender': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-alphabet-real.mp4'
  },
  'learn': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-alphabet-real.mp4'
  },
  'learning': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-alphabet-real.mp4'
  },
  'smarty': { 
    mp4: '/videos/asl/children-food-vocabulary.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  'elmo': { 
    mp4: '/videos/asl/children-food-vocabulary.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },

  // Cooking vocabulary - Adult women signers
  'cook': { 
    mp4: '/videos/asl/lifeprint-cook.mp4',
    webm: '/videos/asl/women-cooking-professional.mp4'
  },
  'cooking': { 
    mp4: '/videos/asl/lifeprint-food-cooking.mp4',
    webm: '/videos/asl/women-cooking-professional.mp4'
  },
  'boil': { 
    mp4: '/videos/asl/lifeprint-cook.mp4',
    webm: '/videos/asl/chef-boil.webm'
  },
  'boiling': { 
    mp4: '/videos/asl/lifeprint-cook.mp4',
    webm: '/videos/asl/chef-boil.webm'
  },
  'kitchen': { 
    mp4: '/videos/asl/startasl-kitchen.mp4',
    webm: '/videos/asl/kids-kitchen-signs.mp4'
  },
  'recipe': { 
    mp4: '/videos/asl/lifeprint-food-cooking.mp4',
    webm: '/videos/asl/women-cooking-professional.mp4'
  },
  'chef': { 
    mp4: '/videos/asl/women-cooking-professional.mp4',
    webm: '/videos/asl/chef-asl-loop.webm'
  },
  'pasta': { 
    mp4: '/videos/asl/lifeprint-food-cooking.mp4',
    webm: '/videos/asl/chef-pasta.webm'
  },
  'garlic': { 
    mp4: '/videos/asl/startasl-kitchen.mp4',
    webm: '/videos/asl/chef-garlic.webm'
  },
  'stir': { 
    mp4: '/videos/asl/lifeprint-cook.mp4',
    webm: '/videos/asl/chef-stir.webm'
  },
  'stirring': { 
    mp4: '/videos/asl/lifeprint-cook.mp4',
    webm: '/videos/asl/chef-stir.webm'
  },
  'bake': { 
    mp4: '/videos/asl/lifeprint-food-cooking.mp4',
    webm: '/videos/asl/women-cooking-professional.mp4'
  },
  'baking': { 
    mp4: '/videos/asl/lifeprint-food-cooking.mp4',
    webm: '/videos/asl/women-cooking-professional.mp4'
  },
  'water': { 
    mp4: '/videos/asl/startasl-kitchen.mp4',
    webm: '/videos/asl/kids-kitchen-signs.mp4'
  },
  'oil': { 
    mp4: '/videos/asl/startasl-kitchen.mp4',
    webm: '/videos/asl/kids-kitchen-signs.mp4'
  },
  'salt': { 
    mp4: '/videos/asl/kids-kitchen-signs.mp4',
    webm: '/videos/asl/startasl-kitchen.mp4'
  },
  'pepper': { 
    mp4: '/videos/asl/kids-kitchen-signs.mp4',
    webm: '/videos/asl/startasl-kitchen.mp4'
  },

  // Basic food vocabulary - Mixed signers
  'eat': { 
    mp4: '/videos/asl/kids-kitchen-signs.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  'eating': { 
    mp4: '/videos/asl/kids-kitchen-signs.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  'drink': { 
    mp4: '/videos/asl/kids-kitchen-signs.mp4',
    webm: '/videos/asl/children-pbs-real.mp4'
  },
  'drinking': { 
    mp4: '/videos/asl/kids-kitchen-signs.mp4',
    webm: '/videos/asl/children-pbs-real.mp4'
  },
  'food': { 
    mp4: '/videos/asl/children-food-vocabulary.mp4',
    webm: '/videos/asl/children-holidays-real.mp4'
  },

  // Avatar-specific clips - Content type appropriate
  'chef-avatar': { 
    mp4: '/videos/asl/women-cooking-professional.mp4',
    webm: '/videos/asl/chef-asl-loop.webm'
  },
  'food-expert': { 
    mp4: '/videos/asl/lifeprint-food-cooking.mp4',
    webm: '/videos/asl/women-cooking-professional.mp4'
  },
  'home-cook': { 
    mp4: '/videos/asl/startasl-kitchen.mp4',
    webm: '/videos/asl/kids-kitchen-signs.mp4'
  },
  'superhero-captain': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  'superhero-star': { 
    mp4: '/videos/asl/children-food-vocabulary.mp4',
    webm: '/videos/asl/children-alphabet-real.mp4'
  },
  'friendly-teacher': { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-pbs-real.mp4'
  },
  'student-peer': { 
    mp4: '/videos/asl/children-food-vocabulary.mp4',
    webm: '/videos/asl/children-holidays-real.mp4'
  },

  // Default fallbacks - Content type appropriate
  default: { 
    mp4: '/videos/asl/chef-asl-loop.webm',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  children: { 
    mp4: '/videos/asl/gallaudet-children-dictionary.mp4',
    webm: '/videos/asl/children-body-language-real.mp4'
  },
  adults: { 
    mp4: '/videos/asl/women-cooking-professional.mp4',
    webm: '/videos/asl/lifeprint-food-cooking.mp4'
  },
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
  const videoSources = useMemo(() => {
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
        {videoSources ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            aria-label={`${getHeaderText()} Avatar`}
            onError={(e) => {
              console.error('ASL video failed to load:', videoSources);
            }}
          >
            {videoSources.mp4 && <source src={videoSources.mp4} type="video/mp4" />}
            {videoSources.webm && <source src={videoSources.webm} type="video/webm" />}
            {videoSources.ogg && <source src={videoSources.ogg} type="video/ogg" />}
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
