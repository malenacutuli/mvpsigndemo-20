import React, { useMemo } from 'react';
import { HandHelping, ChefHat } from 'lucide-react';
import type { CaptionSegment } from './CaptionsWithIntention';

interface ASLAvatarProps {
  contentType?: 'recipe' | 'education';
  selectedASLAvatar?: { id: string; name: string; description: string };
  currentCaption?: CaptionSegment | null;
}

// Simple keyword → clip mapping (replace URLs with your own signer assets)
const RECIPE_ASL_CLIPS: Record<string, string> = {
  boil: '/videos/asl/chef-boil.mp4',
  pasta: '/videos/asl/chef-pasta.mp4',
  garlic: '/videos/asl/chef-garlic.mp4',
  stir: '/videos/asl/chef-stir.mp4',
  default: '/videos/asl/chef-asl-loop.mp4',
};

export const ASLAvatar: React.FC<ASLAvatarProps> = ({ contentType = 'recipe', selectedASLAvatar, currentCaption }) => {
  const clip = useMemo(() => {
    const text = (currentCaption?.text || '').toLowerCase();
    const keys = Object.keys(RECIPE_ASL_CLIPS).filter(k => k !== 'default');
    const match = keys.find(k => text.includes(k));
    return RECIPE_ASL_CLIPS[match || 'default'];
  }, [currentCaption]);

  return (
    <div className="absolute top-4 right-4 w-44 h-44 rounded-xl border-2 border-primary/30 bg-black/30 backdrop-blur-sm overflow-hidden animate-fade-in">
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
