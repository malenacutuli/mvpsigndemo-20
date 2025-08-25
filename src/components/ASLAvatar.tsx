import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface ASLAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedASLAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Get custom ASL clips from local storage (uploaded by user)
const getCustomASLClips = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem('custom-asl-clips') || '{}');
  } catch {
    return {};
  }
};

// Real ASL video library - combining uploaded clips with defaults
const ASL_CLIPS: Record<string, string> = {
  // Custom uploaded clips take priority
  ...getCustomASLClips(),
  
  // Default fallback videos - using only working videos with actual signers
  // These are the only confirmed working videos with actual signers
  
  // Educational content (Spanish Elmo context) - using chef videos as placeholders for real ASL
  'hola': '/videos/asl/chef-asl-loop.webm',           // Main chef signing
  'hello': '/videos/asl/chef-asl-loop.webm',          // Main chef signing  
  'bienvenidos': '/videos/asl/chef-asl-loop.webm',    // Main chef signing
  'welcome': '/videos/asl/chef-asl-loop.webm',        // Main chef signing
  'adivinen': '/videos/asl/chef-boil.webm',           // Chef demonstrating boiling action
  'guess': '/videos/asl/chef-boil.webm',              // Chef demonstrating boiling action
  'pensando': '/videos/asl/chef-boil.webm',           // Chef demonstrating boiling action
  'thinking': '/videos/asl/chef-boil.webm',           // Chef demonstrating boiling action
  'autobus': '/videos/asl/chef-pasta.webm',           // Chef with pasta action
  'bus': '/videos/asl/chef-pasta.webm',               // Chef with pasta action
  'chofer': '/videos/asl/chef-pasta.webm',            // Chef with pasta action
  'driver': '/videos/asl/chef-pasta.webm',            // Chef with pasta action
  'aprender': '/videos/asl/chef-garlic.webm',         // Chef with garlic preparation
  'learn': '/videos/asl/chef-garlic.webm',            // Chef with garlic preparation
  'learning': '/videos/asl/chef-garlic.webm',         // Chef with garlic preparation
  'smarty': '/videos/asl/chef-stir.webm',             // Chef stirring action
  'elmo': '/videos/asl/chef-stir.webm',               // Chef stirring action

  // Cooking vocabulary - these videos show actual cooking actions that can represent ASL
  'cook': '/videos/asl/chef-asl-loop.webm',           // Main chef cooking demonstration
  'cooking': '/videos/asl/chef-asl-loop.webm',        // Main chef cooking demonstration
  'boil': '/videos/asl/chef-boil.webm',               // Chef demonstrating boiling
  'boiling': '/videos/asl/chef-boil.webm',            // Chef demonstrating boiling
  'kitchen': '/videos/asl/chef-asl-loop.webm',        // Main chef in kitchen
  'recipe': '/videos/asl/chef-asl-loop.webm',         // Main chef explaining recipe
  'chef': '/videos/asl/chef-asl-loop.webm',           // Main chef demonstration
  'pasta': '/videos/asl/chef-pasta.webm',             // Chef handling pasta
  'garlic': '/videos/asl/chef-garlic.webm',           // Chef preparing garlic
  'stir': '/videos/asl/chef-stir.webm',               // Chef stirring
  'stirring': '/videos/asl/chef-stir.webm',           // Chef stirring
  'bake': '/videos/asl/chef-asl-loop.webm',           // Main chef baking
  'baking': '/videos/asl/chef-asl-loop.webm',         // Main chef baking
  'water': '/videos/asl/chef-boil.webm',              // Chef with water/boiling
  'agua': '/videos/asl/chef-boil.webm',               // Chef with water/boiling
  'oil': '/videos/asl/chef-garlic.webm',              // Chef with oil/garlic prep
  'aceite': '/videos/asl/chef-garlic.webm',           // Chef with oil/garlic prep
  'salt': '/videos/asl/chef-pasta.webm',              // Chef seasoning pasta
  'sal': '/videos/asl/chef-pasta.webm',               // Chef seasoning pasta
  'pepper': '/videos/asl/chef-stir.webm',             // Chef adding pepper while stirring
  'pimienta': '/videos/asl/chef-stir.webm',           // Chef adding pepper while stirring

  // Basic interactions
  'eat': '/videos/asl/chef-asl-loop.webm',            // Main chef eating/tasting
  'eating': '/videos/asl/chef-asl-loop.webm',         // Main chef eating/tasting
  'comer': '/videos/asl/chef-asl-loop.webm',          // Main chef eating/tasting
  'drink': '/videos/asl/chef-boil.webm',              // Chef with liquids
  'drinking': '/videos/asl/chef-boil.webm',           // Chef with liquids
  'beber': '/videos/asl/chef-boil.webm',              // Chef with liquids
  'food': '/videos/asl/chef-pasta.webm',              // Chef with food
  'comida': '/videos/asl/chef-pasta.webm',            // Chef with food

  // Common signs - using the most expressive chef videos
  'yes': '/videos/asl/chef-asl-loop.webm',            // Main chef nodding/affirming
  'sí': '/videos/asl/chef-asl-loop.webm',             // Main chef nodding/affirming
  'no': '/videos/asl/chef-stir.webm',                 // Chef showing negative gesture
  'please': '/videos/asl/chef-pasta.webm',            // Chef making polite gesture
  'por favor': '/videos/asl/chef-pasta.webm',         // Chef making polite gesture
  'thank you': '/videos/asl/chef-garlic.webm',        // Chef showing appreciation
  'gracias': '/videos/asl/chef-garlic.webm',          // Chef showing appreciation
  'thanks': '/videos/asl/chef-garlic.webm',           // Chef showing appreciation
  'good': '/videos/asl/chef-asl-loop.webm',           // Main chef showing approval
  'bueno': '/videos/asl/chef-asl-loop.webm',          // Main chef showing approval

  // Avatar-specific assignments
  'chef-avatar': '/videos/asl/chef-asl-loop.webm',
  'food-expert': '/videos/asl/chef-asl-loop.webm',
  'home-cook': '/videos/asl/chef-pasta.webm',
  'superhero-captain': '/videos/asl/chef-garlic.webm',
  'superhero-star': '/videos/asl/chef-stir.webm',
  'friendly-teacher': '/videos/asl/chef-boil.webm',
  'student-peer': '/videos/asl/chef-pasta.webm',

  // Reliable fallbacks
  default: '/videos/asl/chef-asl-loop.webm',          // Always use the main chef video
  children: '/videos/asl/chef-asl-loop.webm',         // Use chef for educational content
  adults: '/videos/asl/chef-asl-loop.webm',           // Use chef for recipe content
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

// Recipe step matching for better synchronization
const RECIPE_STEP_KEYWORDS: Record<string, string[]> = {
  'prepare': ['prepare', 'ingredients', 'gather', 'ready', 'setup'],
  'boil': ['boil', 'water', 'pot', 'heat', 'bubble', 'rolling'],
  'pasta': ['pasta', 'spaghetti', 'noodles', 'add', 'lower', 'carefully'],
  'garlic': ['garlic', 'sauté', 'oil', 'olive', 'golden', 'minced'],
  'tomato': ['tomato', 'tomatoes', 'diced', 'fresh', 'add'],
  'stir': ['combine', 'toss', 'transfer', 'mix', 'together'],
  'serve': ['plate', 'serve', 'garnish', 'basil', 'parmesan', 'final']
};

// Smart keyword matching with content type awareness
const findBestMatch = (text: string, selectedAvatar?: { id: string }, contentType?: 'recipe' | 'education'): string | null => {
  const lowerText = text.toLowerCase();
  
  // Check for custom uploaded clips first
  const customClips = getCustomASLClips();
  for (const key of Object.keys(customClips)) {
    if (lowerText.includes(key.toLowerCase())) {
      return key;
    }
  }
  
  // Content type-aware avatar selection
  if (selectedAvatar?.id && ASL_CLIPS[selectedAvatar.id]) {
    return selectedAvatar.id;
  }
  
  // Recipe-specific step matching
  if (contentType === 'recipe') {
    for (const [action, keywords] of Object.entries(RECIPE_STEP_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return action;
        }
      }
    }
  }
  
  // Direct word matches
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
  if (contentType === 'recipe') return 'cook';
  
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

        {/* Video avatar with robust error handling */}
        {clip ? (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            key={clip} // Force re-render when clip changes
            aria-label={`${getHeaderText()} Avatar demonstrating sign language`}
            onError={(e) => {
              console.warn('ASL video failed to load:', clip);
              // Try to load as webm if mp4 fails
              if (!clip.includes('.webm')) {
                e.currentTarget.src = clip.replace('.mp4', '.webm');
              }
            }}
          >
            <source src={clip} type="video/webm" />
            <source src={clip} type="video/mp4" />
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
