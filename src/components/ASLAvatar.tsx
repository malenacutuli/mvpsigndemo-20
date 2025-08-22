import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface ASLAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedASLAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Enhanced ASL library with diverse signers including children
const RECIPE_ASL_CLIPS: Record<string, string> = {
  // Cooking actions
  boil: '/videos/asl/chef-boil.webm',
  pasta: '/videos/asl/chef-pasta.webm', 
  garlic: '/videos/asl/chef-garlic.webm',
  stir: '/videos/asl/chef-stir.webm',
  cook: '/videos/asl/lifeprint-cook.mp4',
  bake: '/videos/asl/chef-bake.webm',
  
  // Cooking tools & ingredients
  water: '/videos/asl/kids-water-sign.mp4',
  timer: '/videos/asl/kids-timer-sign.mp4', 
  pan: '/videos/asl/kids-pan-sign.mp4',
  'olive oil': '/videos/asl/kids-oil-sign.mp4',
  'large pan': '/videos/asl/kids-large-pan.mp4',
  'al dente': '/videos/asl/kids-al-dente.mp4',
  'angel pasta': '/videos/asl/kids-angel-pasta.mp4',
  
  // Kitchen vocabulary from educational sources
  kitchen: '/videos/asl/startasl-kitchen.mp4',
  food: '/videos/asl/lifeprint-food-cooking.mp4',
  
  // Educational content
  learn: '/videos/asl/gallaudet-children-dictionary.mp4',
  study: '/videos/asl/kids-study-sign.mp4',
  
  // Default fallbacks with diverse signers
  default: '/videos/asl/chef-asl-loop.webm',
  children: '/videos/asl/kids-kitchen-signs.mp4',
};

export const ASLAvatar: React.FC<ASLAvatarProps> = ({ contentType = 'recipe', selectedASLAvatar, currentCaption }) => {
  const clip = useMemo(() => {
    const text = (currentCaption?.text || '').toLowerCase();
    const keys = Object.keys(RECIPE_ASL_CLIPS).filter(k => k !== 'default');
    const match = keys.find(k => text.includes(k));
    return RECIPE_ASL_CLIPS[match || 'default'];
  }, [currentCaption]);

  return (
    <div className="absolute bottom-16 right-4 w-32 h-32 rounded-lg border-2 border-primary/30 bg-black/30 backdrop-blur-sm overflow-hidden animate-fade-in">
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
