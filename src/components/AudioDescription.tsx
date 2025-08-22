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
    text: "Chef Gordon stands before a gleaming stainless steel stove.",
    startTime: 0.1,
    endTime: 4,
    voiceStyle: 'passionate'
  },
  
];

// Audio descriptions for educational content (Spanish Elmo) - Updated with improved timing
const educationDescriptions: AudioDescription[] = [
  {
    text: "Un autobus amarillo llega y cuatro gallinas se suben a el. El autobus se va.",
    startTime: 24.10,
    endTime: 28.60,
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
    text: "Aparece un autobus y el conductor abre la puerta y saluda.",
    startTime: 74.90,
    endTime: 76.90,
    voiceStyle: 'encouraging'
  },
  {
    text: "El autobús continua el camino con los pasajeros.",
    startTime: 84.85,
    endTime: 85.40,
    voiceStyle: 'warm'
  },
  {
    text: "Un pasajero pulsa el timbre de parada.",
    startTime: 91.60,
    endTime: 93.10,
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

// ElevenLabs voice mapping with native Spanish voices for education
const elevenVoices: Record<string, string> = {
  // Recipe voices - English cooking personalities
  'gordon-ramsay': 'nPczCjzI2devNBz1zQrb', // Brian
  'julia-child': '9BWtsMINqrJLrRacOk9x',   // Aria
  'anthony-bourdain': 'JBFqnCBsd6RMkjVDRZzb', // George
  // Education voices - Native Spanish speakers for children's content
  'dora-exploradora': 'pFZP5JQG7iQjIQuC4Bku',  // Lily - natural Spanish accent
  'minnie-mouse': 'cgSgspJ2msm6clMCkdW9',      // Jessica - warm Spanish voice
  'bob-esponja': 'XrExE9yKIg1WjnnlVkGX',       // Matilda - animated Spanish voice
};

const defaultVoiceByContent: Record<'recipe' | 'education', string> = {
  recipe: 'nPczCjzI2devNBz1zQrb', // Brian
  education: 'pFZP5JQG7iQjIQuC4Bku', // Lily - native Spanish speaker
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
  
  console.log('AudioDescription sync check:', {
    currentTime,
    contentType,
    totalDescriptions: descriptions.length,
    isPlaying
  });
  
  // Find potential AD that matches current time
  const potentialDescription = descriptions.find(desc => {
    const matches = currentTime >= desc.startTime && currentTime <= desc.endTime;
    if (matches) {
      console.log('Found matching description:', {
        text: desc.text.substring(0, 50) + '...',
        startTime: desc.startTime,
        endTime: desc.endTime,
        currentTime
      });
    }
    return matches;
  });
  
  // Check for overlap with captions if we have Spanish Elmo data
  if (potentialDescription && contentType === 'education') {
    // For now, let's disable overlap checking to test if descriptions show
    console.log('Setting description without overlap check:', potentialDescription.text.substring(0, 50));
    setCurrentDescription(potentialDescription);
    
    // Commented out overlap detection for debugging
    /*
    import('@/data/spanishElmoCaptions').then(({ spanishElmoCaptions }) => {
      // Check if current description overlaps with any spoken caption
      const hasOverlap = spanishElmoCaptions.some(caption => {
        // Check for any time overlap between AD and caption
        return !(potentialDescription.endTime <= caption.startTime || potentialDescription.startTime >= caption.endTime);
      });
      
      console.log('Overlap check:', { hasOverlap, currentTime });
      // Only set description if no overlap with voice-over
      setCurrentDescription(hasOverlap ? null : potentialDescription);
    }).catch(() => {
      // Fallback if captions can't be loaded
      console.log('Caption data not available, setting description');
      setCurrentDescription(potentialDescription);
    });
    */
  } else {
    setCurrentDescription(potentialDescription);
  }
}, [currentTime, contentType, dynamicDescriptions, isPlaying]);

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
    <div className="absolute top-4 left-4 max-w-sm">
      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-primary/30">
        {/* Audio Description Header */}
        <div className="flex items-center gap-2 mb-2">
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

        {/* Description Text */}
        <div className={`text-sm leading-relaxed ${getVoiceStyleColor(currentDescription.voiceStyle)} ${
          isDescriptionPlaying ? 'animate-pulse' : ''
        }`}>
          "{currentDescription.text}"
        </div>
        {genError && (
          <div className="text-xs text-destructive mt-2">{genError}</div>
        )}
      </div>
    </div>
  );
};
