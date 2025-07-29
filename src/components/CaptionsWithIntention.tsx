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

// Demo captions for recipe content with Gordon Ramsay-style narration
const recipeCaptions: CaptionSegment[] = [
  {
    text: "Right, let's get this pasta absolutely perfect!",
    speaker: 'chef',
    startTime: 2,
    endTime: 6,
    words: [
      { text: 'Right,', startTime: 2.0, endTime: 2.4, emphasis: 'loud', pitch: 'normal' },
      { text: "let's", startTime: 2.5, endTime: 2.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'get', startTime: 2.9, endTime: 3.1, emphasis: 'normal', pitch: 'normal' },
      { text: 'this', startTime: 3.2, endTime: 3.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'pasta', startTime: 3.5, endTime: 4.0, emphasis: 'loud', pitch: 'high' },
      { text: 'absolutely', startTime: 4.1, endTime: 4.8, emphasis: 'loud', pitch: 'high' },
      { text: 'perfect!', startTime: 4.9, endTime: 6.0, emphasis: 'loud', pitch: 'high' }
    ]
  },
  {
    text: 'The water needs to be boiling vigorously.',
    speaker: 'chef',
    startTime: 8,
    endTime: 12,
    words: [
      { text: 'The', startTime: 8.0, endTime: 8.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'water', startTime: 8.3, endTime: 8.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'needs', startTime: 8.8, endTime: 9.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'to', startTime: 9.3, endTime: 9.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'be', startTime: 9.5, endTime: 9.7, emphasis: 'normal', pitch: 'normal' },
      { text: 'boiling', startTime: 9.8, endTime: 10.5, emphasis: 'loud', pitch: 'high' },
      { text: 'vigorously.', startTime: 10.6, endTime: 12.0, emphasis: 'loud', pitch: 'normal' }
    ]
  },
  {
    text: 'Beautiful! Look at that steam rising.',
    speaker: 'chef',
    startTime: 15,
    endTime: 18,
    words: [
      { text: 'Beautiful!', startTime: 15.0, endTime: 15.8, emphasis: 'loud', pitch: 'high' },
      { text: 'Look', startTime: 16.0, endTime: 16.3, emphasis: 'normal', pitch: 'normal' },
      { text: 'at', startTime: 16.4, endTime: 16.5, emphasis: 'normal', pitch: 'normal' },
      { text: 'that', startTime: 16.6, endTime: 16.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'steam', startTime: 16.9, endTime: 17.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'rising.', startTime: 17.5, endTime: 18.0, emphasis: 'quiet', pitch: 'low' }
    ]
  },
  {
    text: 'Season the water generously with salt.',
    speaker: 'narrator',
    startTime: 22,
    endTime: 25,
    words: [
      { text: 'Season', startTime: 22.0, endTime: 22.5, emphasis: 'normal', pitch: 'normal' },
      { text: 'the', startTime: 22.6, endTime: 22.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'water', startTime: 22.9, endTime: 23.3, emphasis: 'normal', pitch: 'normal' },
      { text: 'generously', startTime: 23.4, endTime: 24.1, emphasis: 'normal', pitch: 'normal' },
      { text: 'with', startTime: 24.2, endTime: 24.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'salt.', startTime: 24.5, endTime: 25.0, emphasis: 'normal', pitch: 'normal' }
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