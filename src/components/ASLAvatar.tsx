import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface ASLAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedASLAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Comprehensive ASL video library with maximum keyword coverage
const ASL_CLIPS: Record<string, string> = {
  // Basic common signs
  'hello': '/videos/asl/chef-asl-loop.webm',
  'hola': '/videos/asl/chef-asl-loop.webm',
  'hi': '/videos/asl/chef-asl-loop.webm',
  'yes': '/videos/asl/asl-yes.webm',
  'sí': '/videos/asl/asl-yes.webm',
  'no': '/videos/asl/asl-no.webm',
  'please': '/videos/asl/chef-pasta.webm',
  'por favor': '/videos/asl/chef-pasta.webm',
  'thank you': '/videos/asl/chef-garlic.webm',
  'gracias': '/videos/asl/chef-garlic.webm',
  'thanks': '/videos/asl/chef-garlic.webm',
  'good': '/videos/asl/asl-good.webm',
  'bueno': '/videos/asl/asl-good.webm',
  'bad': '/videos/asl/asl-bad.webm',
  'malo': '/videos/asl/asl-bad.webm',
  'more': '/videos/asl/asl-more.webm',
  'más': '/videos/asl/asl-more.webm',
  'stop': '/videos/asl/asl-stop.webm',
  'para': '/videos/asl/asl-stop.webm',
  'help': '/videos/asl/asl-help.webm',
  'ayuda': '/videos/asl/asl-help.webm',
  'sorry': '/videos/asl/asl-sorry.webm',
  'perdón': '/videos/asl/asl-sorry.webm',
  'finish': '/videos/asl/asl-finish.webm',
  'terminar': '/videos/asl/asl-finish.webm',

  // Colors
  'red': '/videos/asl/asl-red.webm',
  'rojo': '/videos/asl/asl-red.webm',
  'blue': '/videos/asl/asl-blue.webm',
  'azul': '/videos/asl/asl-blue.webm',
  'green': '/videos/asl/asl-green.webm',
  'verde': '/videos/asl/asl-green.webm',
  'color': '/videos/asl/asl-red.webm',
  'colors': '/videos/asl/asl-blue.webm',

  // Numbers and time
  'one': '/videos/asl/asl-numbers.webm',
  'uno': '/videos/asl/asl-numbers.webm',
  'two': '/videos/asl/asl-numbers.webm',
  'dos': '/videos/asl/asl-numbers.webm',
  'three': '/videos/asl/asl-numbers.webm',
  'tres': '/videos/asl/asl-numbers.webm',
  'number': '/videos/asl/asl-numbers.webm',
  'numbers': '/videos/asl/asl-numbers.webm',
  'time': '/videos/asl/asl-time.webm',
  'tiempo': '/videos/asl/asl-time.webm',
  'today': '/videos/asl/asl-today.webm',
  'hoy': '/videos/asl/asl-today.webm',

  // Family and social
  'family': '/videos/asl/asl-family.webm',
  'familia': '/videos/asl/asl-family.webm',
  'school': '/videos/asl/asl-school.webm',
  'escuela': '/videos/asl/asl-school.webm',

  // Educational vocabulary - Spanish Elmo content
  'bienvenidos': '/videos/asl/chef-asl-loop.webm',
  'welcome': '/videos/asl/chef-asl-loop.webm',
  'adivinen': '/videos/asl/chef-boil.webm',
  'guess': '/videos/asl/chef-boil.webm',
  'pensando': '/videos/asl/chef-boil.webm',
  'thinking': '/videos/asl/chef-boil.webm',
  'autobus': '/videos/asl/chef-pasta.webm',
  'bus': '/videos/asl/chef-pasta.webm',
  'chofer': '/videos/asl/chef-pasta.webm',
  'driver': '/videos/asl/chef-pasta.webm',
  'aprender': '/videos/asl/chef-garlic.webm',
  'learn': '/videos/asl/chef-garlic.webm',
  'learning': '/videos/asl/chef-garlic.webm',
  'smarty': '/videos/asl/chef-stir.webm',
  'elmo': '/videos/asl/chef-stir.webm',

  // Cooking vocabulary - using the chef videos
  'cook': '/videos/asl/chef-asl-loop.webm',
  'cooking': '/videos/asl/chef-asl-loop.webm',
  'boil': '/videos/asl/chef-boil.webm',
  'boiling': '/videos/asl/chef-boil.webm',
  'kitchen': '/videos/asl/chef-asl-loop.webm',
  'recipe': '/videos/asl/chef-asl-loop.webm',
  'chef': '/videos/asl/chef-asl-loop.webm',
  'pasta': '/videos/asl/chef-pasta.webm',
  'garlic': '/videos/asl/chef-garlic.webm',
  'stir': '/videos/asl/chef-stir.webm',
  'stirring': '/videos/asl/chef-stir.webm',
  'bake': '/videos/asl/chef-asl-loop.webm',
  'baking': '/videos/asl/chef-asl-loop.webm',
  'water': '/videos/asl/chef-boil.webm',
  'agua': '/videos/asl/chef-boil.webm',
  'oil': '/videos/asl/chef-garlic.webm',
  'aceite': '/videos/asl/chef-garlic.webm',
  'salt': '/videos/asl/chef-pasta.webm',
  'sal': '/videos/asl/chef-pasta.webm',
  'pepper': '/videos/asl/chef-stir.webm',
  'pimienta': '/videos/asl/chef-stir.webm',

  // Food vocabulary
  'eat': '/videos/asl/chef-asl-loop.webm',
  'eating': '/videos/asl/chef-asl-loop.webm',
  'comer': '/videos/asl/chef-asl-loop.webm',
  'drink': '/videos/asl/chef-boil.webm',
  'drinking': '/videos/asl/chef-boil.webm',
  'beber': '/videos/asl/chef-boil.webm',
  'food': '/videos/asl/chef-pasta.webm',
  'comida': '/videos/asl/chef-pasta.webm',

  // Avatar-specific clips
  'chef-avatar': '/videos/asl/chef-asl-loop.webm',
  'food-expert': '/videos/asl/chef-asl-loop.webm',
  'home-cook': '/videos/asl/chef-pasta.webm',
  'superhero-captain': '/videos/asl/asl-good.webm',
  'superhero-star': '/videos/asl/asl-help.webm',
  'friendly-teacher': '/videos/asl/asl-school.webm',
  'student-peer': '/videos/asl/asl-family.webm',

  // Default fallbacks
  default: '/videos/asl/chef-asl-loop.webm',
  children: '/videos/asl/asl-school.webm',
  adults: '/videos/asl/chef-asl-loop.webm',
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

        {/* Meta pill - simplified without character description */}
        <div className="absolute bottom-1 left-1 bg-primary/30 text-white text-[10px] px-2 py-0.5 rounded-full">
          {contentType === 'recipe' ? 'Chef' : 'Teacher'}
        </div>
      </div>
    </div>
  );
};
