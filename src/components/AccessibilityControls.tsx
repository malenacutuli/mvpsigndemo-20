import React from 'react';
import { Button } from '@/components/ui/button';
import { HandHelping, Mic, Pause } from 'lucide-react';
import captionsIntention from '@/assets/captions-intention.jpg';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AccessibilityControlsProps {
  showCaptions: boolean;
  showASL: boolean;
  showAudioDescription: boolean;
  eadEnabled?: boolean; // NEW: Extended Audio Description toggle
  onToggleCaptions: (show: boolean) => void;
  onToggleASL: (show: boolean) => void;
  onToggleAudioDescription: (show: boolean) => void;
  onToggleEAD?: (enabled: boolean) => void; // NEW: EAD toggle handler
}

export const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  showCaptions,
  showASL,
  showAudioDescription,
  eadEnabled = false,
  onToggleCaptions,
  onToggleASL,
  onToggleAudioDescription,
  onToggleEAD,
}) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Captions with Intention Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleCaptions(!showCaptions)}
              aria-label={showCaptions ? "Hide Captions with Intention" : "Show Captions with Intention"}
              className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${
                showCaptions ? 'bg-primary/30 text-primary' : ''
              }`}
            >
              <img src={captionsIntention} alt="Captions with Intention" className="w-4 h-4 object-contain" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Captions with Intention</p>
          </TooltipContent>
        </Tooltip>

        {/* ASL Avatar Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleASL(!showASL)}
              aria-label={showASL ? "Hide ASL Avatar" : "Show ASL Avatar"}
              className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${
                showASL ? 'bg-primary/30 text-primary' : ''
              }`}
            >
              <HandHelping className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>AI-Animated ASL Avatar</p>
          </TooltipContent>
        </Tooltip>

        {/* Audio Description Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleAudioDescription(!showAudioDescription)}
              aria-label={showAudioDescription ? "Disable Audio Description" : "Enable Audio Description"}
              className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${
                showAudioDescription ? 'bg-primary/30 text-primary' : ''
              }`}
            >
              <Mic className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Celebrity-Style Audio Description</p>
          </TooltipContent>
        </Tooltip>

        {/* Extended Audio Description Toggle */}
        {onToggleEAD && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleEAD(!eadEnabled)}
                aria-label={eadEnabled ? "Disable Extended Audio Description" : "Enable Extended Audio Description"}
                className={`text-primary-foreground hover:text-primary hover:bg-primary/20 ${
                  eadEnabled ? 'bg-amber-500/30 text-amber-400' : ''
                }`}
              >
                <Pause className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Extended Audio Description (Pauses Video)</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};