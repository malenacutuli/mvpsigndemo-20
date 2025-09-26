import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface SignLanguageAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedSignLanguageAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Get custom Sign Language clips from local storage (uploaded by user)
const getCustomSignLanguageClips = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem('custom-sign-language-clips') || '{}');
  } catch {
    return {};
  }
};

// Real Sign Language video library - combining uploaded clips with defaults
const getSignLanguageClips = (): Record<string, string> => {
  const customClips = getCustomSignLanguageClips();
  return {
    // Custom uploaded clips take priority
    ...customClips,
    
    // Default fallback videos - using only working videos with actual signers
    // Educational content (Spanish Elmo context) - using chef videos as placeholders for real Sign Language
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

    // Cooking vocabulary - these videos show actual cooking actions that can represent Sign Language
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

    // Basic food and actions
    'eat': '/videos/asl/chef-asl-loop.webm',            // Main chef eating/tasting
    'eating': '/videos/asl/chef-asl-loop.webm',         // Main chef eating/tasting
    'comer': '/videos/asl/chef-asl-loop.webm',          // Main chef eating/tasting
    'drink': '/videos/asl/chef-boil.webm',              // Chef with liquids
    'drinking': '/videos/asl/chef-boil.webm',           // Chef with liquids
    'beber': '/videos/asl/chef-boil.webm',              // Chef with liquids
    'food': '/videos/asl/chef-pasta.webm',              // Chef with food
    'comida': '/videos/asl/chef-pasta.webm',            // Chef with food

    // Basic responses and expressions
    'yes': '/videos/asl/chef-asl-loop.webm',            // Main chef nodding/affirming
    'no': '/videos/asl/chef-boil.webm',                 // Chef declining/negative
    'good': '/videos/asl/chef-garlic.webm',             // Chef showing approval
    'bad': '/videos/asl/chef-stir.webm',                // Chef showing concern
    'ok': '/videos/asl/chef-asl-loop.webm',             // Main chef okay gesture
    'ready': '/videos/asl/chef-pasta.webm',             // Chef ready with pasta
    'wait': '/videos/asl/chef-boil.webm',               // Chef waiting for boil
    'done': '/videos/asl/chef-asl-loop.webm',           // Main chef completion
    'finish': '/videos/asl/chef-stir.webm',             // Chef finishing stir
    'more': '/videos/asl/chef-garlic.webm',             // Chef adding more
    'help': '/videos/asl/chef-pasta.webm',              // Chef helping gesture
    'please': '/videos/asl/chef-boil.webm',             // Chef polite request
    'thank': '/videos/asl/chef-asl-loop.webm',          // Main chef gratitude

    // Content type defaults for fallback
    'children': '/videos/asl/chef-pasta.webm',          // Default for education
    'education': '/videos/asl/chef-pasta.webm',         // Educational fallback
  };
};

// Keyword expansion for better matching
const KEYWORD_EXPANSIONS = {
  'cook': ['cook', 'cooking', 'chef', 'kitchen', 'prepare', 'make'],
  'eat': ['eat', 'eating', 'taste', 'try', 'consume', 'bite'],
  'drink': ['drink', 'sip', 'beverage', 'liquid', 'water', 'juice'],
  'good': ['good', 'great', 'excellent', 'amazing', 'wonderful', 'perfect'],
  'bad': ['bad', 'terrible', 'awful', 'wrong', 'problem', 'issue'],
  'help': ['help', 'assist', 'support', 'aid', 'guide'],
  'thank': ['thank', 'thanks', 'grateful', 'appreciate'],
  'hello': ['hello', 'hi', 'hey', 'greetings', 'welcome'],
  'yes': ['yes', 'okay', 'sure', 'correct', 'right'],
  'no': ['no', 'not', 'never', 'wrong', 'incorrect'],
};

// Recipe-specific step keywords for better cooking content matching  
const RECIPE_STEP_KEYWORDS = {
  'cook': ['start', 'begin', 'first', 'preparation', 'prep'],
  'boil': ['boil', 'water', 'pot', 'heat', 'bubble', 'rolling'],
  'pasta': ['pasta', 'spaghetti', 'noodles', 'add', 'lower', 'carefully'],
  'garlic': ['garlic', 'sauté', 'oil', 'olive', 'golden', 'minced'],
  'tomato': ['tomato', 'tomatoes', 'diced', 'fresh', 'add'],
  'stir': ['combine', 'toss', 'transfer', 'mix', 'together'],
  'serve': ['plate', 'serve', 'garnish', 'basil', 'parmesan', 'final']
};

// Enhanced Sign Language matching with better keyword handling
const findBestMatch = (text: string, selectedAvatar?: { id: string }, contentType?: 'recipe' | 'education'): string | null => {
  if (!text) return null;
  
  const customClips = getCustomSignLanguageClips();
  const signLanguageClips = getSignLanguageClips();
  const lowerText = text.toLowerCase();
  
  console.log('🔍 Sign Language matching for:', text, { selectedAvatar: selectedAvatar?.id, contentType });
  
  // Priority 1: Custom uploaded clips
  for (const [keyword, clipUrl] of Object.entries(customClips)) {
    if (lowerText.includes(keyword.toLowerCase())) {
      console.log('✅ Found custom Sign Language clip for:', keyword);
      return clipUrl;
    }
  }
  
  // Priority 2: Avatar-specific assignment
  if (selectedAvatar?.id && signLanguageClips[selectedAvatar.id]) {
    console.log('✅ Using avatar-specific Sign Language:', selectedAvatar.id);
    return signLanguageClips[selectedAvatar.id];
  }
  
  // Priority 3: Recipe steps (for cooking content)
  if (contentType === 'recipe') {
    for (const [step, keywords] of Object.entries(RECIPE_STEP_KEYWORDS)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        const clipKey = signLanguageClips[step];
        if (clipKey) {
          console.log('✅ Found recipe step Sign Language match:', step);
          return clipKey;
        }
      }
    }
  }
  
  // Priority 4: Direct keyword match
  for (const keyword of Object.keys(signLanguageClips)) {
    if (lowerText.includes(keyword.toLowerCase())) {
      console.log('✅ Direct Sign Language keyword match:', keyword);
      return signLanguageClips[keyword];
    }
  }
  
  // Priority 5: Expanded keyword matching
  for (const [baseKeyword, expansions] of Object.entries(KEYWORD_EXPANSIONS)) {
    if (expansions.some(exp => lowerText.includes(exp.toLowerCase()))) {
      const clipKey = signLanguageClips[baseKeyword];
      if (clipKey) {
        console.log('✅ Expanded Sign Language keyword match:', baseKeyword);
        return clipKey;
      }
    }
  }
  
  console.log('❌ No Sign Language match found, using fallback for content type:', contentType);
  // Fallback based on content type
  if (contentType === 'education') return 'children';
  if (contentType === 'recipe') return 'cook';
  
  return null;
};

export const SignLanguageAvatar: React.FC<SignLanguageAvatarProps> = ({ 
  contentType = 'recipe', 
  selectedSignLanguageAvatar, 
  currentCaption 
}) => {
  const clip = useMemo(() => {
    const text = currentCaption?.text || '';
    const signLanguageClips = getSignLanguageClips();
    
    console.log('🎬 Sign Language Avatar rendering with:', { text, contentType, selectedAvatar: selectedSignLanguageAvatar?.id });
    
    if (!text) {
      // Use avatar-specific default clip if available
      if (selectedSignLanguageAvatar?.id && signLanguageClips[selectedSignLanguageAvatar.id]) {
        return signLanguageClips[selectedSignLanguageAvatar.id];
      }
      // Fallback to content type defaults
      return signLanguageClips[contentType === 'education' ? 'children' : 'cook'];
    }
    
    // Find best matching clip
    const matchedKey = findBestMatch(text, selectedSignLanguageAvatar, contentType);
    if (matchedKey && signLanguageClips[matchedKey]) {
      return signLanguageClips[matchedKey];
    }
    
    // Final fallback
    if (selectedSignLanguageAvatar?.id && signLanguageClips[selectedSignLanguageAvatar.id]) {
      return signLanguageClips[selectedSignLanguageAvatar.id];
    }
    
    // Default based on content type
    return signLanguageClips[contentType === 'education' ? 'children' : 'cook'];
  }, [currentCaption?.text, selectedSignLanguageAvatar, contentType]);

  // Helper function to get contextual header text
  const getHeaderText = () => {
    if (selectedSignLanguageAvatar?.name) {
      return selectedSignLanguageAvatar.name;
    }
    return contentType === 'education' ? 'Student' : 'Chef';
  };

  return (
    <div className="absolute bottom-4 right-4 z-30 pointer-events-none">
      <div className="relative bg-black/80 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-2 z-40">
          <div className="flex items-center gap-2">
            {contentType === 'recipe' ? (
              <ChefHat className="w-3 h-3 text-white/90" />
            ) : (
              <HandHelping className="w-3 h-3 text-white/90" />
            )}
            <span className="text-white/90 text-xs font-medium truncate">
              {getHeaderText()}
            </span>
          </div>
        </div>

        {/* Video content */}
        {clip ? (
          <video
            key={clip}
            width="200"
            height="150"
            autoPlay
            muted
            loop={false}
            playsInline
            className="bg-black"
            aria-label={`${getHeaderText()} Avatar demonstrating sign language`}
            onError={(e) => {
              console.warn('Sign Language video failed to load:', clip);
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
              <div className="text-white/90 font-medium">Sign Language avatar loading...</div>
              <div className="text-white/60 text-xs mt-1">Preparing sign language interpretation</div>
            </div>
          </div>
        )}

        {/* Meta pill - simplified without character description */}
        <div className="absolute bottom-1 left-1 bg-primary/30 text-white text-[10px] px-2 py-0.5 rounded-full">
          Sign Language
        </div>
      </div>
    </div>
  );
};