import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Using ElevenLabs via Supabase Edge Function proxy for secure TTS

interface AudioDescriptionProps {
  currentTime: number;
  isPlaying: boolean;
  contentType?: 'recipe' | 'education';
  selectedVoice?: {
    id: string;
    name: string;
    description: string;
  };
  // Optional: dynamically generated descriptions (e.g., from transcript)
  dynamicDescriptions?: AudioDescription[];
  // Controls if audio descriptions should actually play audio
  enabled?: boolean;
}

interface AudioDescription {
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging';
}

// Realistic audio descriptions for pasta cooking masterclass
const recipeDescriptions: AudioDescription[] = [
  {
    text: "Chef Gordon stands before a gleaming stainless steel stove, his intense gaze focused on a large pot of water beginning to bubble. The kitchen is immaculate, every tool in its place.",
    startTime: 0.0,
    endTime: 7
    voiceStyle: 'passionate'
  },
  {
    text: "Violent bubbles break the surface as the water reaches a rolling boil. Steam rises dramatically, catching the overhead lights like culinary theater.",
    startTime: 6,
    endTime: 11,
    voiceStyle: 'authoritative'
  },
  {
    text: "Gordon reaches for coarse sea salt, his movements precise and confident. He adds generous handfuls, the salt dissolving instantly in the churning water.",
    startTime: 12,
    endTime: 17,
    voiceStyle: 'passionate'
  },
  {
    text: "Long strands of bronze-cut spaghetti cascade into the pot like golden ribbons. The pasta immediately begins its dance in the boiling water.",
    startTime: 18,
    endTime: 23,
    voiceStyle: 'passionate'
  },
  {
    text: "On a wooden cutting board, eight cloves of garlic await transformation. Gordon's knife moves with surgical precision, creating paper-thin slices that glisten with oils.",
    startTime: 29,
    endTime: 35,
    voiceStyle: 'authoritative'
  },
  {
    text: "Extra virgin olive oil shimmers in a large pan, heated to the perfect temperature. The garlic slices hit the oil with an immediate, satisfying sizzle.",
    startTime: 36,
    endTime: 42,
    voiceStyle: 'passionate'
  },
  {
    text: "The garlic transforms from pale white to golden perfection, releasing an intoxicating aroma that fills the entire kitchen. This is the moment every Italian chef lives for.",
    startTime: 43,
    endTime: 49,
    voiceStyle: 'passionate'
  }
];

// Audio descriptions for educational content
const educationDescriptions: AudioDescription[] = [
  {
    text: "Our classroom transforms into a magical science laboratory, filled with wonder and discovery.",
    startTime: 0.5,
    endTime: 4,
    voiceStyle: 'warm'
  },
  {
    text: "Captain Wonder appears with a friendly smile, his cape gently flowing as he prepares to teach us about gravity.",
    startTime: 6,
    endTime: 11,
    voiceStyle: 'encouraging'
  },
  {
    text: "The children's eyes light up with understanding as they see gravity in action through Captain Wonder's demonstration.",
    startTime: 18,
    endTime: 24,
    voiceStyle: 'warm'
  }
];

// ElevenLabs voice mapping for demo profiles
const elevenVoices: Record<string, string> = {
  // Recipe voices
  'gordon-ramsay': 'nPczCjzI2devNBz1zQrb', // Brian
  'julia-child': '9BWtsMINqrJLrRacOk9x',   // Aria
  'anthony-bourdain': 'JBFqnCBsd6RMkjVDRZzb', // George
  // Education voices
  'selena-gomez': 'EXAVITQu4vr4xnSDxMaL',  // Sarah
  'emma-stone': 'FGY2WhTYpPnrIDTdsKH5',    // Laura
  'zendaya': 'XB0fDUnXU5powFXDhCwa',       // Charlotte
};

const defaultVoiceByContent: Record<'recipe' | 'education', string> = {
  recipe: 'nPczCjzI2devNBz1zQrb', // Brian
  education: 'EXAVITQu4vr4xnSDxMaL', // Sarah
};

export const AudioDescription: React.FC<AudioDescriptionProps> = ({
  currentTime,
  isPlaying,
  contentType = 'recipe',
  selectedVoice,
  dynamicDescriptions,
  enabled = true,
}) => {
  const [currentDescription, setCurrentDescription] = useState<AudioDescription | null>(null);
  const [isDescriptionPlaying, setIsDescriptionPlaying] = useState(false);
  const [descriptionAudio, setDescriptionAudio] = useState<HTMLAudioElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Helper to resolve ElevenLabs voice id
  const resolveVoiceId = () => {
    if (selectedVoice?.id && elevenVoices[selectedVoice.id]) return elevenVoices[selectedVoice.id];
    return defaultVoiceByContent[contentType];
  };

// Track which segment is active for UI state
useEffect(() => {
  const base = contentType === 'recipe' ? recipeDescriptions : educationDescriptions;
  const descriptions = (dynamicDescriptions && dynamicDescriptions.length > 0) ? dynamicDescriptions : base;
  const description = descriptions.find(desc => currentTime >= desc.startTime && currentTime <= desc.endTime) || null;
  setCurrentDescription(description);
}, [currentTime, contentType, dynamicDescriptions]);

  // Generate and play TTS for the current segment
  useEffect(() => {
    // Stop audio if not enabled
    if (!enabled || !isPlaying) {
      if (descriptionAudio && !descriptionAudio.paused) {
        descriptionAudio.pause();
        setIsDescriptionPlaying(false);
      }
      return;
    }
    if (!currentDescription) return;

    let cancelled = false;

    (async () => {
      try {
        setIsGenerating(true);
        setGenError(null);
        const voiceId = resolveVoiceId();
        const res = await fetch('https://edjufyzwjicniycrerde.supabase.co/functions/v1/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkanVmeXp3amljbml5Y3JlcmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNzYzMzEsImV4cCI6MjA2OTc1MjMzMX0.-M924wPgC6EWDQmf2EHNZsl_unKlnga1n6qfv9FyDIE',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkanVmeXp3amljbml5Y3JlcmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNzYzMzEsImV4cCI6MjA2OTc1MjMzMX0.-M924wPgC6EWDQmf2EHNZsl_unKlnga1n6qfv9FyDIE'
          },
          body: JSON.stringify({ text: currentDescription.text, voiceId, modelId: 'eleven_turbo_v2_5' })
        });
        if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (descriptionAudio) {
          try {
            descriptionAudio.pause();
            descriptionAudio.currentTime = 0;
          } catch {}
        }
        const audio = new Audio(url);
        audio.onended = () => {
          setIsDescriptionPlaying(false);
          URL.revokeObjectURL(url);
        };
        audio.volume = 0.85;
        setDescriptionAudio(audio);
        setIsDescriptionPlaying(true);
        await audio.play().catch(() => {/* autoplay policies */});
      } catch (e: any) {
        setGenError(e.message || 'Failed to generate audio');
        setIsDescriptionPlaying(false);
      } finally {
        setIsGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentDescription, isPlaying, selectedVoice, contentType, enabled]);

  if (!currentDescription) return null;

  const getVoiceStyleColor = (style: string) => {
    switch (style) {
      case 'passionate':
        return 'text-cwi-main-orange';
      case 'authoritative':
        return 'text-cwi-main-red';
      case 'warm':
        return 'text-cwi-main-yellow';
      case 'encouraging':
        return 'text-cwi-main-green';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="absolute top-4 left-4 max-w-md">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-primary/30">
        {/* Audio Description Header */}
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="w-4 h-4 text-primary" />
          <Badge variant="secondary" className="text-xs">
            Audio Description
          </Badge>
          {isDescriptionPlaying && !isGenerating && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-red-400">LIVE</span>
            </div>
          )}
          {isGenerating && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-yellow-400">Generating…</span>
            </div>
          )}
        </div>

        {/* Voice Profile */}
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">
            {selectedVoice ? selectedVoice.name : contentType === 'recipe' ? 'Gordon Ramsay Style' : 'Selena Gomez Style'}
          </div>
          <div className="text-xs text-primary/80">
            {currentDescription.voiceStyle} tone
          </div>
        </div>

        {/* Description Text */}
        <div className={`text-sm leading-relaxed ${getVoiceStyleColor(currentDescription.voiceStyle)} ${
          isDescriptionPlaying ? 'animate-pulse' : ''
        }`}>
          "{currentDescription.text}"
        </div>
        {genError && (
          <div className="text-xs text-destructive mt-2">{genError}</div>
        )}

        {/* Timing Info */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <span className="text-xs text-muted-foreground">
            {currentDescription.startTime}s - {currentDescription.endTime}s
          </span>
          <div className="flex items-center gap-2">
            {contentType === 'recipe' && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-cwi-main-orange">🔥</span>
                <span className="text-xs text-muted-foreground">Gordon Style</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">Voice: {selectedVoice ? selectedVoice.name : 'Default'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
