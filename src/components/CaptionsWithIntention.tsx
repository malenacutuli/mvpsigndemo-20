import React, { useState, useEffect } from 'react';

export interface CaptionSegment {
  text: string;
  speaker: 'chef' | 'narrator' | 'child' | 'teacher' | 'hero';
  startTime: number;
  endTime: number;
  words: Array<{
    text: string;
    startTime: number;
    endTime: number;
    emphasis?: 'loud' | 'quiet' | 'normal';
    pitch?: 'high' | 'low' | 'normal';
  }>;
}

interface CaptionsWithIntentionProps {
  currentTime: number;
  isPlaying: boolean;
  contentType?: 'recipe' | 'education';
  captionsOverride?: CaptionSegment[];
}

// Demo captions for realistic pasta recipe content with Gordon Ramsay-style passion
const recipeCaptions: CaptionSegment[] = [
  {
    text: "It can be easily undercooked or overcooked.",
    speaker: "chef",
    startTime: 0.08,
    endTime: 2.36,
    words: [
      {
        text: "It",
        startTime: 0.08,
        endTime: 0.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "can",
        startTime: 0.2,
        endTime: 0.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "be",
        startTime: 0.36,
        endTime: 0.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "easily",
        startTime: 0.48,
        endTime: 0.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "undercooked",
        startTime: 0.84,
        endTime: 1.52,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "or",
        startTime: 1.52,
        endTime: 1.64,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "overcooked.",
        startTime: 1.64,
        endTime: 2.36,
        emphasis: "loud",
        pitch: "low"
      }
    ]
  },
  {
    text: "That's why pasta is so CRUCIAL!",
    speaker: "chef",
    startTime: 3.12,
    endTime: 6.24,
    words: [
      {
        text: "That's",
        startTime: 3.12,
        endTime: 3.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "why",
        startTime: 3.48,
        endTime: 3.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta",
        startTime: 3.72,
        endTime: 4.08,
        emphasis: "loud",
        pitch: "normal"
      },
      {
        text: "is",
        startTime: 4.08,
        endTime: 4.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "so",
        startTime: 4.2,
        endTime: 4.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "CRUCIAL!",
        startTime: 4.44,
        endTime: 6.24,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  }
];

// Demo captions for educational content with warm, engaging narration
const educationCaptions: CaptionSegment[] = [
  {
    text: "Welcome to our educational cooking journey!",
    speaker: "teacher",
    startTime: 0.0,
    endTime: 3.5,
    words: [
      {
        text: "Welcome",
        startTime: 0.0,
        endTime: 0.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 0.8,
        endTime: 1.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "our",
        startTime: 1.0,
        endTime: 1.3,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "educational",
        startTime: 1.3,
        endTime: 2.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "cooking",
        startTime: 2.2,
        endTime: 2.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "journey!",
        startTime: 2.8,
        endTime: 3.5,
        emphasis: "normal",
        pitch: "high"
      }
    ]
  },
  {
    text: "Today we'll learn about the science of cooking pasta.",
    speaker: "teacher",
    startTime: 4.0,
    endTime: 7.5,
    words: [
      {
        text: "Today",
        startTime: 4.0,
        endTime: 4.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "we'll",
        startTime: 4.4,
        endTime: 4.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "learn",
        startTime: 4.7,
        endTime: 5.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "about",
        startTime: 5.1,
        endTime: 5.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 5.4,
        endTime: 5.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "science",
        startTime: 5.6,
        endTime: 6.2,
        emphasis: "loud",
        pitch: "normal"
      },
      {
        text: "of",
        startTime: 6.2,
        endTime: 6.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "cooking",
        startTime: 6.4,
        endTime: 6.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta.",
        startTime: 6.9,
        endTime: 7.5,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  }
];

const CaptionsWithIntention: React.FC<CaptionsWithIntentionProps> = ({ 
  currentTime, 
  isPlaying, 
  contentType = 'recipe',
  captionsOverride 
}) => {
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  
  // Choose the appropriate captions based on content type or override
  const captions = captionsOverride || (contentType === 'education' ? educationCaptions : recipeCaptions);

  // Find current caption based on time
  const currentCaption = captions.find(caption => 
    currentTime >= caption.startTime && currentTime <= caption.endTime
  );

  // Word-by-word sync timing
  useEffect(() => {
    if (!currentCaption || !isPlaying) {
      setActiveWordIndex(-1);
      return;
    }

    // Find the active word based on current time
    const activeIndex = currentCaption.words.findIndex((word, index) => {
      const nextWord = currentCaption.words[index + 1];
      return currentTime >= word.startTime && (!nextWord || currentTime < nextWord.startTime);
    });

    setActiveWordIndex(activeIndex);
  }, [currentTime, currentCaption, isPlaying]);

  if (!currentCaption) return null;

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'chef': return 'text-orange-400';
      case 'narrator': return 'text-blue-300'; 
      case 'child': return 'text-pink-300';
      case 'teacher': return 'text-green-300';
      case 'hero': return 'text-purple-300';
      default: return 'text-white';
    }
  };

  const getWordStyle = (word: any, isActive: boolean) => {
    let fontSize = 'text-2xl'; // 5% of screen height equivalent
    let fontWeight = 'font-normal';
    let fontWidth = '';

    // Volume-based size (3% to 12% of screen height)
    if (word.emphasis === 'loud') {
      fontSize = 'text-4xl'; // Larger for loud
    } else if (word.emphasis === 'quiet') {
      fontSize = 'text-lg'; // Smaller for quiet
    }

    // Pitch-based weight and width (using Roboto Flex capabilities)
    if (word.pitch === 'high') {
      fontWeight = 'font-light';
      fontWidth = 'font-condensed';
    } else if (word.pitch === 'low') {
      fontWeight = 'font-bold';
      fontWidth = 'font-expanded';
    }

    return {
      fontSize,
      fontWeight,
      fontWidth,
      transform: isActive ? 'scale(1.15)' : 'scale(1)',
      transition: 'all 0.1s ease-out'
    };
  };

  return (
    <div className="absolute bottom-20 left-0 right-0 px-8">
      {/* CWI Captions Box - 90% black background */}
      <div className="bg-black/90 rounded-lg p-4 mx-auto max-w-4xl">
        
        {/* Dynamic colored text with word-by-word sync */}
        <div className="font-roboto-flex leading-relaxed">
          {currentCaption.words.map((word, index) => {
            const isActive = index === activeWordIndex;
            const isSpoken = index <= activeWordIndex;
            const style = getWordStyle(word, isActive);
            
            return (
              <span
                key={index}
                className={`inline-block mr-2 transition-all duration-100 ${
                  isSpoken ? getSpeakerColor(currentCaption.speaker) : 'text-transparent'
                } ${style.fontSize} ${style.fontWeight}`}
                style={{
                  transform: style.transform,
                  transition: style.transition
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>

        {/* Enhanced Speaker indicator */}
        <div className="text-xs text-white/60 mt-2 uppercase tracking-wider">
          {currentCaption.speaker === 'chef' && '🔥 Chef Gordon'}
          {currentCaption.speaker === 'narrator' && '🎙️ Narrator'}
          {currentCaption.speaker === 'child' && '👶 Child'}
          {currentCaption.speaker === 'teacher' && '👩‍🏫 Teacher'}
          {currentCaption.speaker === 'hero' && '🦸‍♂️ Captain Wonder'}
        </div>
      </div>
    </div>
  );
};

export default CaptionsWithIntention;