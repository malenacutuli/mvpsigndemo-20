import React, { useState, useEffect } from 'react';

interface CaptionSegment {
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
}

// Demo captions for realistic pasta recipe content with Gordon Ramsay-style passion
const recipeCaptions: CaptionSegment[] = [
  {
    text: "Right! Today we're making the perfect spaghetti aglio e olio.",
    speaker: 'chef',
    startTime: 1,
    endTime: 5,
    words: [
      { text: 'Right!', startTime: 1.0, endTime: 1.6, emphasis: 'loud', pitch: 'high' },
      { text: 'Today', startTime: 1.8, endTime: 2.2, emphasis: 'normal', pitch: 'normal' },
      { text: "we're", startTime: 2.3, endTime: 2.6, emphasis: 'normal', pitch: 'normal' },
      { text: 'making', startTime: 2.7, endTime: 3.1, emphasis: 'normal', pitch: 'normal' },
      { text: 'the', startTime: 3.2, endTime: 3.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'perfect', startTime: 3.5, endTime: 4.1, emphasis: 'loud', pitch: 'high' },
      { text: 'spaghetti', startTime: 4.2, endTime: 4.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'aglio', startTime: 4.9, endTime: 5.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'e', startTime: 5.3, endTime: 5.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'olio.', startTime: 5.5, endTime: 6.0, emphasis: 'normal', pitch: 'normal' }
    ]
  },
  {
    text: "First, get that water boiling - and I mean BOILING!",
    speaker: 'chef',
    startTime: 7,
    endTime: 11,
    words: [
      { text: 'First,', startTime: 7.0, endTime: 7.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'get', startTime: 7.5, endTime: 7.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'that', startTime: 7.8, endTime: 8.0, emphasis: 'normal', pitch: 'normal' },
      { text: 'water', startTime: 8.1, endTime: 8.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'boiling', startTime: 8.5, endTime: 9.0, emphasis: 'loud', pitch: 'high' },
      { text: '-', startTime: 9.1, endTime: 9.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'and', startTime: 9.3, endTime: 9.5, emphasis: 'normal', pitch: 'normal' },
      { text: 'I', startTime: 9.6, endTime: 9.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'mean', startTime: 9.8, endTime: 10.1, emphasis: 'loud', pitch: 'normal' },
      { text: 'BOILING!', startTime: 10.2, endTime: 11.0, emphasis: 'loud', pitch: 'high' }
    ]
  },
  {
    text: "Salt it like the ocean - don't be shy!",
    speaker: 'chef',
    startTime: 13,
    endTime: 16,
    words: [
      { text: 'Salt', startTime: 13.0, endTime: 13.3, emphasis: 'normal', pitch: 'normal' },
      { text: 'it', startTime: 13.4, endTime: 13.5, emphasis: 'normal', pitch: 'normal' },
      { text: 'like', startTime: 13.6, endTime: 13.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'the', startTime: 13.9, endTime: 14.1, emphasis: 'normal', pitch: 'normal' },
      { text: 'ocean', startTime: 14.2, endTime: 14.7, emphasis: 'loud', pitch: 'high' },
      { text: '-', startTime: 14.8, endTime: 14.9, emphasis: 'normal', pitch: 'normal' },
      { text: "don't", startTime: 15.0, endTime: 15.3, emphasis: 'loud', pitch: 'normal' },
      { text: 'be', startTime: 15.4, endTime: 15.6, emphasis: 'loud', pitch: 'normal' },
      { text: 'shy!', startTime: 15.7, endTime: 16.0, emphasis: 'loud', pitch: 'high' }
    ]
  },
  {
    text: "Now add your spaghetti and give it a gentle stir.",
    speaker: 'chef',
    startTime: 18,
    endTime: 22,
    words: [
      { text: 'Now', startTime: 18.0, endTime: 18.3, emphasis: 'normal', pitch: 'normal' },
      { text: 'add', startTime: 18.4, endTime: 18.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'your', startTime: 18.8, endTime: 19.0, emphasis: 'normal', pitch: 'normal' },
      { text: 'spaghetti', startTime: 19.1, endTime: 19.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'and', startTime: 19.9, endTime: 20.1, emphasis: 'normal', pitch: 'normal' },
      { text: 'give', startTime: 20.2, endTime: 20.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'it', startTime: 20.5, endTime: 20.6, emphasis: 'normal', pitch: 'normal' },
      { text: 'a', startTime: 20.7, endTime: 20.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'gentle', startTime: 20.9, endTime: 21.3, emphasis: 'quiet', pitch: 'low' },
      { text: 'stir.', startTime: 21.4, endTime: 22.0, emphasis: 'quiet', pitch: 'low' }
    ]
  },
  {
    text: "While that's cooking, let's build our flavor foundation.",
    speaker: 'chef',
    startTime: 24,
    endTime: 28,
    words: [
      { text: 'While', startTime: 24.0, endTime: 24.3, emphasis: 'normal', pitch: 'normal' },
      { text: "that's", startTime: 24.4, endTime: 24.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'cooking,', startTime: 24.8, endTime: 25.3, emphasis: 'normal', pitch: 'normal' },
      { text: "let's", startTime: 25.4, endTime: 25.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'build', startTime: 25.8, endTime: 26.1, emphasis: 'normal', pitch: 'normal' },
      { text: 'our', startTime: 26.2, endTime: 26.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'flavor', startTime: 26.5, endTime: 27.0, emphasis: 'loud', pitch: 'high' },
      { text: 'foundation.', startTime: 27.1, endTime: 28.0, emphasis: 'loud', pitch: 'high' }
    ]
  },
  {
    text: "Slice your garlic paper-thin - precision is everything!",
    speaker: 'chef',
    startTime: 30,
    endTime: 34,
    words: [
      { text: 'Slice', startTime: 30.0, endTime: 30.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'your', startTime: 30.5, endTime: 30.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'garlic', startTime: 30.8, endTime: 31.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'paper-thin', startTime: 31.3, endTime: 32.0, emphasis: 'loud', pitch: 'high' },
      { text: '-', startTime: 32.1, endTime: 32.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'precision', startTime: 32.3, endTime: 33.0, emphasis: 'loud', pitch: 'high' },
      { text: 'is', startTime: 33.1, endTime: 33.3, emphasis: 'loud', pitch: 'high' },
      { text: 'everything!', startTime: 33.4, endTime: 34.0, emphasis: 'loud', pitch: 'high' }
    ]
  },
  {
    text: "[sizzling sounds intensify]",
    speaker: 'narrator',
    startTime: 36,
    endTime: 38,
    words: [
      { text: '[sizzling', startTime: 36.0, endTime: 36.8, emphasis: 'loud', pitch: 'normal' },
      { text: 'sounds', startTime: 36.9, endTime: 37.3, emphasis: 'loud', pitch: 'normal' },
      { text: 'intensify]', startTime: 37.4, endTime: 38.0, emphasis: 'loud', pitch: 'normal' }
    ]
  },
  {
    text: "Perfect! The garlic is turning golden - that's our moment!",
    speaker: 'chef',
    startTime: 40,
    endTime: 44,
    words: [
      { text: 'Perfect!', startTime: 40.0, endTime: 40.6, emphasis: 'loud', pitch: 'high' },
      { text: 'The', startTime: 40.7, endTime: 40.9, emphasis: 'normal', pitch: 'normal' },
      { text: 'garlic', startTime: 41.0, endTime: 41.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'is', startTime: 41.5, endTime: 41.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'turning', startTime: 41.8, endTime: 42.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'golden', startTime: 42.3, endTime: 42.8, emphasis: 'loud', pitch: 'high' },
      { text: '-', startTime: 42.9, endTime: 43.0, emphasis: 'normal', pitch: 'normal' },
      { text: "that's", startTime: 43.1, endTime: 43.4, emphasis: 'loud', pitch: 'normal' },
      { text: 'our', startTime: 43.5, endTime: 43.7, emphasis: 'loud', pitch: 'normal' },
      { text: 'moment!', startTime: 43.8, endTime: 44.0, emphasis: 'loud', pitch: 'high' }
    ]
  }
];

// Demo captions for educational content with warm, engaging narration
const educationCaptions: CaptionSegment[] = [
  {
    text: "Today we're going on an amazing science adventure!",
    speaker: 'teacher',
    startTime: 1,
    endTime: 5,
    words: [
      { text: 'Today', startTime: 1.0, endTime: 1.4, emphasis: 'normal', pitch: 'normal' },
      { text: "we're", startTime: 1.5, endTime: 1.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'going', startTime: 1.9, endTime: 2.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'on', startTime: 2.3, endTime: 2.5, emphasis: 'normal', pitch: 'normal' },
      { text: 'an', startTime: 2.6, endTime: 2.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'amazing', startTime: 2.9, endTime: 3.6, emphasis: 'loud', pitch: 'high' },
      { text: 'science', startTime: 3.7, endTime: 4.2, emphasis: 'loud', pitch: 'high' },
      { text: 'adventure!', startTime: 4.3, endTime: 5.0, emphasis: 'loud', pitch: 'high' }
    ]
  },
  {
    text: 'Captain Wonder, can you help us learn about gravity?',
    speaker: 'child',
    startTime: 7,
    endTime: 11,
    words: [
      { text: 'Captain', startTime: 7.0, endTime: 7.4, emphasis: 'normal', pitch: 'high' },
      { text: 'Wonder,', startTime: 7.5, endTime: 8.0, emphasis: 'normal', pitch: 'high' },
      { text: 'can', startTime: 8.1, endTime: 8.3, emphasis: 'normal', pitch: 'high' },
      { text: 'you', startTime: 8.4, endTime: 8.6, emphasis: 'normal', pitch: 'high' },
      { text: 'help', startTime: 8.7, endTime: 9.0, emphasis: 'normal', pitch: 'high' },
      { text: 'us', startTime: 9.1, endTime: 9.3, emphasis: 'normal', pitch: 'high' },
      { text: 'learn', startTime: 9.4, endTime: 9.8, emphasis: 'normal', pitch: 'high' },
      { text: 'about', startTime: 9.9, endTime: 10.3, emphasis: 'normal', pitch: 'high' },
      { text: 'gravity?', startTime: 10.4, endTime: 11.0, emphasis: 'normal', pitch: 'high' }
    ]
  },
  {
    text: "Of course! Gravity is the force that pulls things down.",
    speaker: 'hero',
    startTime: 13,
    endTime: 17,
    words: [
      { text: 'Of', startTime: 13.0, endTime: 13.2, emphasis: 'normal', pitch: 'low' },
      { text: 'course!', startTime: 13.3, endTime: 13.8, emphasis: 'loud', pitch: 'normal' },
      { text: 'Gravity', startTime: 14.0, endTime: 14.6, emphasis: 'normal', pitch: 'normal' },
      { text: 'is', startTime: 14.7, endTime: 14.9, emphasis: 'normal', pitch: 'normal' },
      { text: 'the', startTime: 15.0, endTime: 15.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'force', startTime: 15.3, endTime: 15.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'that', startTime: 15.8, endTime: 16.0, emphasis: 'normal', pitch: 'normal' },
      { text: 'pulls', startTime: 16.1, endTime: 16.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'things', startTime: 16.5, endTime: 16.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'down.', startTime: 16.9, endTime: 17.0, emphasis: 'normal', pitch: 'normal' }
    ]
  },
  {
    text: 'Wow! That makes perfect sense!',
    speaker: 'child',
    startTime: 20,
    endTime: 23,
    words: [
      { text: 'Wow!', startTime: 20.0, endTime: 20.5, emphasis: 'loud', pitch: 'high' },
      { text: 'That', startTime: 20.7, endTime: 21.0, emphasis: 'normal', pitch: 'high' },
      { text: 'makes', startTime: 21.1, endTime: 21.4, emphasis: 'normal', pitch: 'high' },
      { text: 'perfect', startTime: 21.5, endTime: 22.0, emphasis: 'loud', pitch: 'high' },
      { text: 'sense!', startTime: 22.1, endTime: 23.0, emphasis: 'loud', pitch: 'high' }
    ]
  }
];

export const CaptionsWithIntention: React.FC<CaptionsWithIntentionProps> = ({
  currentTime,
  isPlaying,
  contentType = 'recipe'
}) => {
  const [currentCaption, setCurrentCaption] = useState<CaptionSegment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  useEffect(() => {
    if (!isPlaying) return;

    // Select the appropriate captions based on content type
    const captions = contentType === 'recipe' ? recipeCaptions : educationCaptions;

    // Find current caption
    const caption = captions.find(
      cap => currentTime >= cap.startTime && currentTime <= cap.endTime
    );

    if (caption) {
      setCurrentCaption(caption);
      
      // Find active word
      const wordIndex = caption.words.findIndex(
        word => currentTime >= word.startTime && currentTime <= word.endTime
      );
      setActiveWordIndex(wordIndex);
    } else {
      setCurrentCaption(null);
      setActiveWordIndex(-1);
    }
  }, [currentTime, isPlaying, contentType]);

  if (!currentCaption) return null;

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'chef':
        return 'cwi-main-orange'; // Gordon Ramsay-style character
      case 'narrator':
        return 'cwi-main-blue';
      case 'child':
        return 'cwi-main-yellow';
      case 'teacher':
        return 'cwi-main-green';
      case 'hero':
        return 'cwi-main-purple';
      default:
        return 'cwi-main-blue';
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
        {/* Read-ahead text (90% opacity white) */}
        <div className="text-white/90 text-2xl font-roboto-flex leading-relaxed mb-2">
          {currentCaption.text}
        </div>
        
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