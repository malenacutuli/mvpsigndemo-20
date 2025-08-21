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
    startTime: 0.5,
    endTime: 5,
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

// Audio descriptions for educational content (Spanish Elmo) - Updated with improved timing
const educationDescriptions: AudioDescription[] = [
  {
    text: "Un autobus amarillo llega y cuatro gallinas se suben a el. El autobus se va.",
    startTime: 27.10,
    endTime: 30.60,
    voiceStyle: 'warm'
  },
  {
    text: "Elmo abre sus brazos, mira al cielo y llama a Smarty.",
    startTime: 40.00,
    endTime: 44.00,
    voiceStyle: 'encouraging'
  },
  {
    text: "Un autobus azul y blanco llega rapidamente con smarty al volante.",
    startTime: 52.80,
    endTime: 56.40,
    voiceStyle: 'warm'
  },
  {
    text: "El autobús se convierte en un telefono movil amarillo.",
    startTime: 60.90,
    endTime: 63.60,
    voiceStyle: 'warm'
  },
  {
    text: "Vemos la ciudad mientras el autobús avanza.",
    startTime: 70.20,
    endTime: 71.80,
    voiceStyle: 'warm'
  },
  {
    text: "Aparece un mapa sencillo de la ruta.",
    startTime: 76.90,
    endTime: 77.90,
    voiceStyle: 'encouraging'
  },
  {
    text: "El autobús se detiene en la parada.",
    startTime: 84.85,
    endTime: 85.40,
    voiceStyle: 'warm'
  },
  {
    text: "Un pasajero pulsa el timbre de parada.",
    startTime: 91.60,
    endTime: 92.10,
    voiceStyle: 'encouraging'
  },
  {
    text: "El autobús se aleja por la calle.",
    startTime: 105.80,
    endTime: 107.40,
    voiceStyle: 'warm'
  },
  {
    text: "Smarty se despide con un gesto.",
    startTime: 119.60,
    endTime: 120.10,
    voiceStyle: 'encouraging'
  },
  {
    text: "Elmo mira a cámara, pensativo.",
    startTime: 126.00,
    endTime: 127.20,
    voiceStyle: 'warm'
  },
  {
    text: "Se le ocurre una idea y sonríe.",
    startTime: 129.80,
    endTime: 130.60,
    voiceStyle: 'encouraging'
  },
  {
    text: "Aparece un semáforo grande en pantalla.",
    startTime: 135.60,
    endTime: 137.40,
    voiceStyle: 'authoritative'
  },
  {
    text: "La luz cambia a verde.",
    startTime: 166.60,
    endTime: 167.80,
    voiceStyle: 'authoritative'
  },
  {
    text: "La escuela aparece al fondo.",
    startTime: 177.40,
    endTime: 178.30,
    voiceStyle: 'warm'
  },
  {
    text: "Elmo celebra con entusiasmo.",
    startTime: 182.50,
    endTime: 183.10,
    voiceStyle: 'encouraging'
  },
  {
    text: "Entra el Sr. Noodle en escena.",
    startTime: 200.20,
    endTime: 200.80,
    voiceStyle: 'warm'
  },
  {
    text: "El Sr. Noodle saluda con energía.",
    startTime: 201.95,
    endTime: 203.50,
    voiceStyle: 'encouraging'
  },
  {
    text: "Aparece la Srta. Noodle.",
    startTime: 206.00,
    endTime: 207.10,
    voiceStyle: 'warm'
  },
  {
    text: "La Srta. Noodle sube al autobús.",
    startTime: 212.40,
    endTime: 214.20,
    voiceStyle: 'warm'
  },
  {
    text: "Busca los controles para conducir.",
    startTime: 221.10,
    endTime: 222.90,
    voiceStyle: 'encouraging'
  },
  {
    text: "Hace un gesto exagerado como si convocara un autobús.",
    startTime: 225.60,
    endTime: 227.80,
    voiceStyle: 'encouraging'
  },
  {
    text: "Se sienta como pasajera, no conductora.",
    startTime: 232.40,
    endTime: 233.90,
    voiceStyle: 'authoritative'
  },
  {
    text: "El autobús avanza entre edificios.",
    startTime: 252.80,
    endTime: 253.90,
    voiceStyle: 'warm'
  },
  {
    text: "Elmo baila contento.",
    startTime: 260.00,
    endTime: 262.50,
    voiceStyle: 'encouraging'
  },
  {
    text: "Elmo se despide con la mano.",
    startTime: 274.40,
    endTime: 276.10,
    voiceStyle: 'warm'
  }
];

// ElevenLabs voice mapping optimized for Spanish Spain accent (educational/children content)
const elevenVoices: Record<string, string> = {
  // Recipe voices - mature Spanish voices 
  'gordon-ramsay': 'nPczCjzI2devNBz1zQrb', // Brian
  'julia-child': '9BWtsMINqrJLrRacOk9x',   // Aria
  'anthony-bourdain': 'JBFqnCBsd6RMkjVDRZzb', // George
  // Education voices - Spanish Spain accent, child-friendly
  'dora-exploradora': 'XB0fDUnXU5powFXDhCwa',  // Charlotte - higher pitch, playful
  'minnie-mouse': 'EXAVITQu4vr4xnSDxMaL',     // Sarah - warm, clear
  'bob-esponja': 'FGY2WhTYpPnrIDTdsKH5',      // Laura - animated, energetic
};

const defaultVoiceByContent: Record<'recipe' | 'education', string> = {
  recipe: 'nPczCjzI2devNBz1zQrb', // Brian
  education: 'XB0fDUnXU5powFXDhCwa', // Charlotte - better for Spanish children's content
};

export const AudioDescription: React.FC<AudioDescriptionProps> = ({
  currentTime,
  isPlaying,
  contentType = 'recipe',
  selectedVoice,
  dynamicDescriptions,
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

// Track which segment is active for UI state with overlap prevention
useEffect(() => {
  const base = contentType === 'recipe' ? recipeDescriptions : educationDescriptions;
  const descriptions = (dynamicDescriptions && dynamicDescriptions.length > 0) ? dynamicDescriptions : base;
  
  // Find potential AD that matches current time
  const potentialDescription = descriptions.find(desc => currentTime >= desc.startTime && currentTime <= desc.endTime);
  
  // Check for overlap with captions if we have Spanish Elmo data
  if (potentialDescription && contentType === 'education') {
    // Import captions data to check for conflicts
    import('@/data/spanishElmoCaptions').then(({ spanishElmoCaptions }) => {
      // Check if current description overlaps with any spoken caption
      const hasOverlap = spanishElmoCaptions.some(caption => {
        // Check for any time overlap between AD and caption
        return !(potentialDescription.endTime <= caption.startTime || potentialDescription.startTime >= caption.endTime);
      });
      
      // Only set description if no overlap with voice-over
      setCurrentDescription(hasOverlap ? null : potentialDescription);
    }).catch(() => {
      // Fallback if captions can't be loaded
      setCurrentDescription(potentialDescription);
    });
  } else {
    setCurrentDescription(potentialDescription);
  }
}, [currentTime, contentType, dynamicDescriptions]);

  // Generate and play TTS for the current segment
  useEffect(() => {
    if (!isPlaying) {
      if (descriptionAudio && !descriptionAudio.paused) descriptionAudio.pause();
      setIsDescriptionPlaying(false);
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
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(`TTS failed: ${res.status} - ${errorData.error || 'Unknown error'}`);
        }
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
        await audio.play().catch((error) => {
          console.error('Audio playback failed:', error);
          setGenError(`Audio playback failed: ${error.message}`);
        });
      } catch (e: any) {
        console.error('TTS generation failed:', e);
        setGenError(e.message || 'Failed to generate audio');
        setIsDescriptionPlaying(false);
      } finally {
        setIsGenerating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentDescription, isPlaying, selectedVoice, contentType]);

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
            {selectedVoice ? selectedVoice.name : contentType === 'recipe' ? 'Gordon Ramsay Style' : 'Dora la Exploradora Style'}
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
