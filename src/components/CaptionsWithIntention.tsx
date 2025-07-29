import React, { useState, useEffect } from 'react';

interface CaptionSegment {
  text: string;
  speaker: 'chef' | 'narrator' | 'child';
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
}

// Demo captions for recipe content with Gordon Ramsay-style narration
const demoCaptions: CaptionSegment[] = [
  {
    text: "Right, let's get this pasta perfect!",
    speaker: 'chef',
    startTime: 2,
    endTime: 5,
    words: [
      { text: 'Right,', startTime: 2.0, endTime: 2.3, emphasis: 'loud', pitch: 'normal' },
      { text: "let's", startTime: 2.4, endTime: 2.6, emphasis: 'normal', pitch: 'normal' },
      { text: 'get', startTime: 2.7, endTime: 2.9, emphasis: 'normal', pitch: 'normal' },
      { text: 'this', startTime: 3.0, endTime: 3.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'pasta', startTime: 3.3, endTime: 3.7, emphasis: 'loud', pitch: 'high' },
      { text: 'perfect!', startTime: 3.8, endTime: 5.0, emphasis: 'loud', pitch: 'high' }
    ]
  },
  {
    text: 'The water needs to be absolutely boiling.',
    speaker: 'chef',
    startTime: 6,
    endTime: 9,
    words: [
      { text: 'The', startTime: 6.0, endTime: 6.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'water', startTime: 6.3, endTime: 6.6, emphasis: 'normal', pitch: 'normal' },
      { text: 'needs', startTime: 6.7, endTime: 7.0, emphasis: 'normal', pitch: 'normal' },
      { text: 'to', startTime: 7.1, endTime: 7.2, emphasis: 'normal', pitch: 'normal' },
      { text: 'be', startTime: 7.3, endTime: 7.4, emphasis: 'normal', pitch: 'normal' },
      { text: 'absolutely', startTime: 7.5, endTime: 8.2, emphasis: 'loud', pitch: 'high' },
      { text: 'boiling.', startTime: 8.3, endTime: 9.0, emphasis: 'loud', pitch: 'normal' }
    ]
  },
  {
    text: 'Beautiful! Look at that steam rising.',
    speaker: 'chef',
    startTime: 12,
    endTime: 15,
    words: [
      { text: 'Beautiful!', startTime: 12.0, endTime: 12.8, emphasis: 'loud', pitch: 'high' },
      { text: 'Look', startTime: 13.0, endTime: 13.3, emphasis: 'normal', pitch: 'normal' },
      { text: 'at', startTime: 13.4, endTime: 13.5, emphasis: 'normal', pitch: 'normal' },
      { text: 'that', startTime: 13.6, endTime: 13.8, emphasis: 'normal', pitch: 'normal' },
      { text: 'steam', startTime: 13.9, endTime: 14.3, emphasis: 'normal', pitch: 'normal' },
      { text: 'rising.', startTime: 14.4, endTime: 15.0, emphasis: 'quiet', pitch: 'low' }
    ]
  }
];

export const CaptionsWithIntention: React.FC<CaptionsWithIntentionProps> = ({
  currentTime,
  isPlaying
}) => {
  const [currentCaption, setCurrentCaption] = useState<CaptionSegment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  useEffect(() => {
    if (!isPlaying) return;

    // Find current caption
    const caption = demoCaptions.find(
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
  }, [currentTime, isPlaying]);

  if (!currentCaption) return null;

  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'chef':
        return 'cwi-main-orange'; // Gordon Ramsay-style character
      case 'narrator':
        return 'cwi-main-blue';
      case 'child':
        return 'cwi-main-yellow';
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

        {/* Speaker indicator */}
        <div className="text-xs text-white/60 mt-2 uppercase tracking-wider">
          {currentCaption.speaker === 'chef' && '🔥 Chef'}
          {currentCaption.speaker === 'narrator' && '🎙️ Narrator'}
          {currentCaption.speaker === 'child' && '👶 Child'}
        </div>
      </div>
    </div>
  );
};