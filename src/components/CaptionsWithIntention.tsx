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
        endTime: 0.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "undercooked",
        startTime: 0.8,
        endTime: 1.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "or",
        startTime: 1.48,
        endTime: 1.64,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "overcooked.",
        startTime: 1.64,
        endTime: 2.36,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Here's how to do it properly.",
    speaker: "chef",
    startTime: 2.36,
    endTime: 3.68,
    words: [
      {
        text: "Here's",
        startTime: 2.36,
        endTime: 2.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "how",
        startTime: 2.72,
        endTime: 2.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 2.84,
        endTime: 2.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "do",
        startTime: 2.96,
        endTime: 3.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 3.04,
        endTime: 3.16,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "properly.",
        startTime: 3.16,
        endTime: 3.68,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "First, water all in nice large pan",
    speaker: "chef",
    startTime: 3.92,
    endTime: 6.36,
    words: [
      {
        text: "First,",
        startTime: 3.92,
        endTime: 4.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "water",
        startTime: 4.32,
        endTime: 4.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "all",
        startTime: 4.68,
        endTime: 4.92,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 4.92,
        endTime: 5.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 5.44,
        endTime: 5.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "large",
        startTime: 5.8,
        endTime: 6.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pan",
        startTime: 6.04,
        endTime: 6.36,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "to make sure the pasta's got sufficient room",
    speaker: "chef",
    startTime: 6.36,
    endTime: 8.32,
    words: [
      {
        text: "to",
        startTime: 6.36,
        endTime: 6.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "make",
        startTime: 6.6,
        endTime: 6.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sure",
        startTime: 6.8,
        endTime: 7.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 7.0,
        endTime: 7.16,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta's",
        startTime: 7.16,
        endTime: 7.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "got",
        startTime: 7.6,
        endTime: 7.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sufficient",
        startTime: 7.72,
        endTime: 8.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "room",
        startTime: 8.04,
        endTime: 8.32,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "to cook evenly.",
    speaker: "chef",
    startTime: 8.32,
    endTime: 9.36,
    words: [
      {
        text: "to",
        startTime: 8.32,
        endTime: 8.52,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "cook",
        startTime: 8.52,
        endTime: 8.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "evenly.",
        startTime: 8.76,
        endTime: 9.36,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Nicely seasoned. Absolutely crucial.",
    speaker: "chef",
    startTime: 9.6,
    endTime: 11.84,
    words: [
      {
        text: "Nicely",
        startTime: 9.6,
        endTime: 10.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "seasoned.",
        startTime: 10.12,
        endTime: 10.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "Absolutely",
        startTime: 10.72,
        endTime: 11.36,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "crucial.",
        startTime: 11.36,
        endTime: 11.84,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "Olive oil in that stops the pasta",
    speaker: "chef",
    startTime: 12.16,
    endTime: 14.8,
    words: [
      {
        text: "Olive",
        startTime: 12.16,
        endTime: 12.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "oil",
        startTime: 12.6,
        endTime: 12.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 12.8,
        endTime: 13.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 13.52,
        endTime: 13.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "stops",
        startTime: 13.84,
        endTime: 14.16,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 14.16,
        endTime: 14.28,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta",
        startTime: 14.28,
        endTime: 14.8,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "from sticking together.",
    speaker: "chef",
    startTime: 14.8,
    endTime: 15.68,
    words: [
      {
        text: "from",
        startTime: 14.8,
        endTime: 15.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sticking",
        startTime: 15.0,
        endTime: 15.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "together.",
        startTime: 15.36,
        endTime: 15.68,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Bring it up to the boil.",
    speaker: "chef",
    startTime: 16.079,
    endTime: 17.12,
    words: [
      {
        text: "Bring",
        startTime: 16.079,
        endTime: 16.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 16.36,
        endTime: 16.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "up",
        startTime: 16.48,
        endTime: 16.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 16.6,
        endTime: 16.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 16.72,
        endTime: 16.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "boil.",
        startTime: 16.8,
        endTime: 17.12,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "That's the rolling boil.",
    speaker: "chef",
    startTime: 18.32,
    endTime: 19.44,
    words: [
      {
        text: "That's",
        startTime: 18.32,
        endTime: 18.64,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 18.64,
        endTime: 18.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "rolling",
        startTime: 18.76,
        endTime: 19.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "boil.",
        startTime: 19.04,
        endTime: 19.44,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "The secret there.",
    speaker: "chef",
    startTime: 19.44,
    endTime: 20.4,
    words: [
      {
        text: "The",
        startTime: 19.44,
        endTime: 19.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "secret",
        startTime: 19.72,
        endTime: 20.0,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "there.",
        startTime: 20.0,
        endTime: 20.4,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "It stops the pasta from sticking together.",
    speaker: "chef",
    startTime: 20.72,
    endTime: 22.36,
    words: [
      {
        text: "It",
        startTime: 20.72,
        endTime: 21.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "stops",
        startTime: 21.04,
        endTime: 21.28,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 21.28,
        endTime: 21.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta",
        startTime: 21.4,
        endTime: 21.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "from",
        startTime: 21.8,
        endTime: 21.92,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sticking",
        startTime: 21.92,
        endTime: 22.16,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "together.",
        startTime: 22.16,
        endTime: 22.36,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "And it gently rolls it around.",
    speaker: "chef",
    startTime: 22.36,
    endTime: 23.68,
    words: [
      {
        text: "And",
        startTime: 22.36,
        endTime: 22.56,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 22.56,
        endTime: 22.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "gently",
        startTime: 22.68,
        endTime: 23.0,
        emphasis: "quiet",
        pitch: "low"
      },
      {
        text: "rolls",
        startTime: 23.0,
        endTime: 23.28,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 23.28,
        endTime: 23.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "around.",
        startTime: 23.4,
        endTime: 23.68,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Now, this is angel pasta.",
    speaker: "chef",
    startTime: 24.08,
    endTime: 25.76,
    words: [
      {
        text: "Now,",
        startTime: 24.08,
        endTime: 24.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "this",
        startTime: 24.4,
        endTime: 24.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "is",
        startTime: 24.6,
        endTime: 24.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "angel",
        startTime: 24.8,
        endTime: 25.28,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta.",
        startTime: 25.28,
        endTime: 25.76,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Nice, thin pasta.",
    speaker: "chef",
    startTime: 25.76,
    endTime: 27.56,
    words: [
      {
        text: "Nice,",
        startTime: 25.76,
        endTime: 26.08,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "thin",
        startTime: 26.08,
        endTime: 26.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta.",
        startTime: 27.04,
        endTime: 27.56,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Takes three and a half",
    speaker: "chef",
    startTime: 27.56,
    endTime: 28.2,
    words: [
      {
        text: "Takes",
        startTime: 27.56,
        endTime: 27.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "three",
        startTime: 27.76,
        endTime: 27.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "and",
        startTime: 27.88,
        endTime: 28.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 28.0,
        endTime: 28.08,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "half",
        startTime: 28.08,
        endTime: 28.2,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "to four minutes.",
    speaker: "chef",
    startTime: 28.2,
    endTime: 28.88,
    words: [
      {
        text: "to",
        startTime: 28.2,
        endTime: 28.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "four",
        startTime: 28.32,
        endTime: 28.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "minutes.",
        startTime: 28.44,
        endTime: 28.88,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "So into the pan as it hits the.",
    speaker: "chef",
    startTime: 29.2,
    endTime: 31.52,
    words: [
      {
        text: "So",
        startTime: 29.2,
        endTime: 29.52,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "into",
        startTime: 29.52,
        endTime: 29.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 29.76,
        endTime: 29.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pan",
        startTime: 29.96,
        endTime: 30.24,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "as",
        startTime: 30.56,
        endTime: 30.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 30.88,
        endTime: 31.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "hits",
        startTime: 31.04,
        endTime: 31.24,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the.",
        startTime: 31.24,
        endTime: 31.52,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "It melts. And then you turn it round.",
    speaker: "chef",
    startTime: 32.06,
    endTime: 34.06,
    words: [
      {
        text: "It",
        startTime: 32.06,
        endTime: 32.18,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "melts.",
        startTime: 32.18,
        endTime: 32.58,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "And",
        startTime: 32.58,
        endTime: 32.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "then",
        startTime: 32.9,
        endTime: 33.18,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "you",
        startTime: 33.18,
        endTime: 33.38,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "turn",
        startTime: 33.38,
        endTime: 33.54,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 33.54,
        endTime: 33.74,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "round.",
        startTime: 33.74,
        endTime: 34.06,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Tongs. As that starts to melt,",
    speaker: "chef",
    startTime: 34.38,
    endTime: 36.46,
    words: [
      {
        text: "Tongs.",
        startTime: 34.38,
        endTime: 35.02,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "As",
        startTime: 35.26,
        endTime: 35.54,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 35.54,
        endTime: 35.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "starts",
        startTime: 35.7,
        endTime: 35.98,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 35.98,
        endTime: 36.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "melt,",
        startTime: 36.1,
        endTime: 36.46,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "gently twist that into the pan.",
    speaker: "chef",
    startTime: 36.62,
    endTime: 39.02,
    words: [
      {
        text: "gently",
        startTime: 36.62,
        endTime: 37.26,
        emphasis: "quiet",
        pitch: "low"
      },
      {
        text: "twist",
        startTime: 37.5,
        endTime: 37.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 37.9,
        endTime: 38.22,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "into",
        startTime: 38.3,
        endTime: 38.62,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 38.62,
        endTime: 38.78,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pan.",
        startTime: 38.78,
        endTime: 39.02,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Bring it back up to the boil.",
    speaker: "chef",
    startTime: 39.18,
    endTime: 40.62,
    words: [
      {
        text: "Bring",
        startTime: 39.18,
        endTime: 39.46,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 39.46,
        endTime: 39.66,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "back",
        startTime: 39.66,
        endTime: 39.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "up",
        startTime: 39.9,
        endTime: 40.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 40.1,
        endTime: 40.22,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 40.22,
        endTime: 40.3,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "boil.",
        startTime: 40.3,
        endTime: 40.62,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "If you're bad at timing,",
    speaker: "chef",
    startTime: 40.86,
    endTime: 42.18,
    words: [
      {
        text: "If",
        startTime: 40.86,
        endTime: 41.14,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "you're",
        startTime: 41.14,
        endTime: 41.34,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "bad",
        startTime: 41.34,
        endTime: 41.5,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "at",
        startTime: 41.5,
        endTime: 41.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "timing,",
        startTime: 41.7,
        endTime: 42.18,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "then set a timer.",
    speaker: "chef",
    startTime: 42.18,
    endTime: 43.5,
    words: [
      {
        text: "then",
        startTime: 42.18,
        endTime: 42.46,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "set",
        startTime: 42.46,
        endTime: 42.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 42.7,
        endTime: 42.94,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "timer.",
        startTime: 42.94,
        endTime: 43.5,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Beautiful. To test it.",
    speaker: "chef",
    startTime: 44.38,
    endTime: 46.3,
    words: [
      {
        text: "Beautiful.",
        startTime: 44.38,
        endTime: 45.02,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "To",
        startTime: 45.42,
        endTime: 45.74,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "test",
        startTime: 45.74,
        endTime: 45.98,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it.",
        startTime: 45.98,
        endTime: 46.3,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Lift a little strand.",
    speaker: "chef",
    startTime: 46.7,
    endTime: 47.74,
    words: [
      {
        text: "Lift",
        startTime: 46.7,
        endTime: 47.06,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 47.06,
        endTime: 47.18,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "little",
        startTime: 47.18,
        endTime: 47.34,
        emphasis: "quiet",
        pitch: "low"
      },
      {
        text: "strand.",
        startTime: 47.34,
        endTime: 47.74,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "You can actually feel it with your fingers.",
    speaker: "chef",
    startTime: 48.46,
    endTime: 49.78,
    words: [
      {
        text: "You",
        startTime: 48.46,
        endTime: 48.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "can",
        startTime: 48.7,
        endTime: 48.82,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "actually",
        startTime: 48.82,
        endTime: 48.98,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "feel",
        startTime: 48.98,
        endTime: 49.14,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 49.14,
        endTime: 49.26,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "with",
        startTime: 49.26,
        endTime: 49.38,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "your",
        startTime: 49.38,
        endTime: 49.5,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "fingers.",
        startTime: 49.5,
        endTime: 49.78,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "It's still nice and firm,",
    speaker: "chef",
    startTime: 49.78,
    endTime: 50.78,
    words: [
      {
        text: "It's",
        startTime: 49.78,
        endTime: 49.98,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "still",
        startTime: 49.98,
        endTime: 50.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 50.1,
        endTime: 50.3,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "and",
        startTime: 50.3,
        endTime: 50.42,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "firm,",
        startTime: 50.42,
        endTime: 50.78,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "al dente. Not a bite,",
    speaker: "chef",
    startTime: 52.54,
    endTime: 54.14,
    words: [
      {
        text: "al",
        startTime: 52.54,
        endTime: 52.82,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "dente.",
        startTime: 52.82,
        endTime: 53.26,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "Not",
        startTime: 53.26,
        endTime: 53.54,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 53.54,
        endTime: 53.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "bite,",
        startTime: 53.7,
        endTime: 54.14,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "not a strong bite,",
    speaker: "chef",
    startTime: 54.14,
    endTime: 55.02,
    words: [
      {
        text: "not",
        startTime: 54.14,
        endTime: 54.42,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 54.42,
        endTime: 54.54,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "strong",
        startTime: 54.54,
        endTime: 54.7,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "bite,",
        startTime: 54.7,
        endTime: 55.02,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "but just really nice and firm inside.",
    speaker: "chef",
    startTime: 55.02,
    endTime: 56.86,
    words: [
      {
        text: "but",
        startTime: 55.02,
        endTime: 55.22,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "just",
        startTime: 55.22,
        endTime: 55.42,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "really",
        startTime: 55.42,
        endTime: 55.62,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 55.62,
        endTime: 55.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "and",
        startTime: 55.9,
        endTime: 56.1,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "firm",
        startTime: 56.1,
        endTime: 56.38,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "inside.",
        startTime: 56.38,
        endTime: 56.86,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Definitely not crunchy.",
    speaker: "chef",
    startTime: 57.18,
    endTime: 58.3,
    words: [
      {
        text: "Definitely",
        startTime: 57.18,
        endTime: 57.62,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "not",
        startTime: 57.62,
        endTime: 57.78,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "crunchy.",
        startTime: 57.78,
        endTime: 58.3,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "And then into a colander,",
    speaker: "chef",
    startTime: 58.54,
    endTime: 60.62,
    words: [
      {
        text: "And",
        startTime: 58.54,
        endTime: 58.86,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "then",
        startTime: 58.86,
        endTime: 59.18,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "into",
        startTime: 59.58,
        endTime: 59.9,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 59.9,
        endTime: 60.06,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "colander,",
        startTime: 60.06,
        endTime: 60.62,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "drain the pasta in a",
    speaker: "chef",
    startTime: 60.78,
    endTime: 64.48,
    words: [
      {
        text: "drain",
        startTime: 60.78,
        endTime: 61.26,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 61.26,
        endTime: 61.46,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pasta",
        startTime: 61.46,
        endTime: 62.06,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 62.94,
        endTime: 63.34,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "a",
        startTime: 64.36,
        endTime: 64.48,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "light seasoning. Salt and pepper,",
    speaker: "chef",
    startTime: 64.48,
    endTime: 67.64,
    words: [
      {
        text: "light",
        startTime: 64.48,
        endTime: 64.72,
        emphasis: "quiet",
        pitch: "low"
      },
      {
        text: "seasoning.",
        startTime: 64.72,
        endTime: 65.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "Salt",
        startTime: 65.72,
        endTime: 66.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "and",
        startTime: 66.92,
        endTime: 67.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pepper,",
        startTime: 67.2,
        endTime: 67.64,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "a tablespoon of olive oil.",
    speaker: "chef",
    startTime: 68.76,
    endTime: 71.48,
    words: [
      {
        text: "a",
        startTime: 68.76,
        endTime: 69.04,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "tablespoon",
        startTime: 69.04,
        endTime: 69.72,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "of",
        startTime: 70.6,
        endTime: 70.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "olive",
        startTime: 70.88,
        endTime: 71.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "oil.",
        startTime: 71.2,
        endTime: 71.48,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Mix that through.",
    speaker: "chef",
    startTime: 72.28,
    endTime: 73.16,
    words: [
      {
        text: "Mix",
        startTime: 72.28,
        endTime: 72.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 72.68,
        endTime: 72.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "through.",
        startTime: 72.88,
        endTime: 73.16,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "That stops it from sticking together.",
    speaker: "chef",
    startTime: 74.12,
    endTime: 75.48,
    words: [
      {
        text: "That",
        startTime: 74.12,
        endTime: 74.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "stops",
        startTime: 74.4,
        endTime: 74.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "it",
        startTime: 74.68,
        endTime: 74.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "from",
        startTime: 74.76,
        endTime: 74.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "sticking",
        startTime: 74.88,
        endTime: 75.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "together.",
        startTime: 75.2,
        endTime: 75.48,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "And look. There you go.",
    speaker: "chef",
    startTime: 76.04,
    endTime: 77.72,
    words: [
      {
        text: "And",
        startTime: 76.04,
        endTime: 76.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "look.",
        startTime: 76.32,
        endTime: 76.6,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "There",
        startTime: 77.08,
        endTime: 77.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "you",
        startTime: 77.36,
        endTime: 77.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "go.",
        startTime: 77.48,
        endTime: 77.72,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "Beautiful. Pasta al dente.",
    speaker: "chef",
    startTime: 77.72,
    endTime: 79.32,
    words: [
      {
        text: "Beautiful.",
        startTime: 77.72,
        endTime: 78.2,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "Pasta",
        startTime: 78.2,
        endTime: 78.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "al",
        startTime: 78.68,
        endTime: 78.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "dente.",
        startTime: 78.88,
        endTime: 79.32,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "Cooked perfectly. Just as those carrots start going nice",
    speaker: "chef",
    startTime: 80.68,
    endTime: 83.56,
    words: [
      {
        text: "Cooked",
        startTime: 80.68,
        endTime: 81.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "perfectly.",
        startTime: 81.12,
        endTime: 81.64,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "Just",
        startTime: 81.88,
        endTime: 82.24,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "as",
        startTime: 82.24,
        endTime: 82.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "those",
        startTime: 82.48,
        endTime: 82.64,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "carrots",
        startTime: 82.64,
        endTime: 82.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "start",
        startTime: 82.96,
        endTime: 83.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "going",
        startTime: 83.12,
        endTime: 83.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 83.32,
        endTime: 83.56,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "and soft, don't overcook them.",
    speaker: "chef",
    startTime: 83.56,
    endTime: 84.76,
    words: [
      {
        text: "and",
        startTime: 83.56,
        endTime: 83.68,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "soft,",
        startTime: 83.68,
        endTime: 83.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "don't",
        startTime: 83.96,
        endTime: 84.24,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "overcook",
        startTime: 84.24,
        endTime: 84.6,
        emphasis: "loud",
        pitch: "high"
      },
      {
        text: "them.",
        startTime: 84.6,
        endTime: 84.76,
        emphasis: "loud",
        pitch: "high"
      }
    ]
  },
  {
    text: "You want that nice texture in there.",
    speaker: "chef",
    startTime: 84.76,
    endTime: 86.12,
    words: [
      {
        text: "You",
        startTime: 84.76,
        endTime: 84.96,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "want",
        startTime: 84.96,
        endTime: 85.08,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "that",
        startTime: 85.08,
        endTime: 85.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "nice",
        startTime: 85.2,
        endTime: 85.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "texture",
        startTime: 85.44,
        endTime: 85.76,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 85.76,
        endTime: 85.88,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "there.",
        startTime: 85.88,
        endTime: 86.12,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "And just rinse the rice.",
    speaker: "chef",
    startTime: 86.92,
    endTime: 88.84,
    words: [
      {
        text: "And",
        startTime: 86.92,
        endTime: 87.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "just",
        startTime: 87.2,
        endTime: 87.36,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "rinse",
        startTime: 87.36,
        endTime: 87.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 88.12,
        endTime: 88.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "rice.",
        startTime: 88.44,
        endTime: 88.84,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  },
  {
    text: "That stops the rice from becoming clumpy in the pan.",
    speaker: "chef",
    startTime: 89.56,
    endTime: 91.72,
    words: [
      {
        text: "That",
        startTime: 89.56,
        endTime: 89.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "stops",
        startTime: 89.84,
        endTime: 90.12,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 90.12,
        endTime: 90.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "rice",
        startTime: 90.2,
        endTime: 90.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "from",
        startTime: 90.4,
        endTime: 90.56,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "becoming",
        startTime: 90.56,
        endTime: 90.84,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "clumpy",
        startTime: 90.84,
        endTime: 91.32,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "in",
        startTime: 91.32,
        endTime: 91.4,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "the",
        startTime: 91.4,
        endTime: 91.48,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "pan.",
        startTime: 91.48,
        endTime: 91.72,
        emphasis: "normal",
        pitch: "normal"
      }
    ]
  }
];

// Demo captions for educational content with warm, engaging narration
const educationCaptions: CaptionSegment[] = [
  [
  {
    "start": 5.04,
    "end": 8.4,
    "speaker": "chef",
    "words": [
      {
        "text": "Hola.",
        "startTime": 5.04,
        "endTime": 5.44,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Bienvenidos",
        "startTime": 5.84,
        "endTime": 6.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 6.68,
        "endTime": 6.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "El",
        "startTime": 6.84,
        "endTime": 7.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Mundo",
        "startTime": 7.0,
        "endTime": 7.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 7.28,
        "endTime": 7.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo.",
        "startTime": 7.64,
        "endTime": 8.4,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 8.8,
    "end": 12.16,
    "speaker": "chef",
    "words": [
      {
        "text": "Adivinen",
        "startTime": 8.8,
        "endTime": 9.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "lo",
        "startTime": 9.64,
        "endTime": 9.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "que",
        "startTime": 9.68,
        "endTime": 9.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo",
        "startTime": 9.76,
        "endTime": 10.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "est\u00e1",
        "startTime": 10.12,
        "endTime": 10.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pensando",
        "startTime": 10.36,
        "endTime": 11.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "el",
        "startTime": 11.0,
        "endTime": 11.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "d\u00eda",
        "startTime": 11.24,
        "endTime": 11.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 11.48,
        "endTime": 11.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hoy.",
        "startTime": 11.72,
        "endTime": 12.16,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 27.32,
    "end": 29.0,
    "speaker": "chef",
    "words": [
      {
        "text": "Disfruten",
        "startTime": 27.32,
        "endTime": 28.16,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "el",
        "startTime": 28.16,
        "endTime": 28.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "paseo.",
        "startTime": 28.28,
        "endTime": 28.52,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Gallina.",
        "startTime": 28.52,
        "endTime": 29.0,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 33.08,
    "end": 36.12,
    "speaker": "chef",
    "words": [
      {
        "text": "Vaya.",
        "startTime": 33.08,
        "endTime": 33.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo",
        "startTime": 33.56,
        "endTime": 34.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "quiere",
        "startTime": 34.12,
        "endTime": 34.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "saber",
        "startTime": 34.48,
        "endTime": 34.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "todo",
        "startTime": 34.76,
        "endTime": 35.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sobre",
        "startTime": 35.0,
        "endTime": 35.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "los",
        "startTime": 35.2,
        "endTime": 35.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "choferes",
        "startTime": 35.36,
        "endTime": 35.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 35.96,
        "endTime": 36.12,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 36.12,
    "end": 39.2,
    "speaker": "chef",
    "words": [
      {
        "text": "autob\u00fas.",
        "startTime": 36.12,
        "endTime": 36.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Pregunt\u00e9mosle",
        "startTime": 37.16,
        "endTime": 38.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 38.2,
        "endTime": 38.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 38.28,
        "endTime": 38.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "amiga",
        "startTime": 38.36,
        "endTime": 38.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 38.6,
        "endTime": 38.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo,",
        "startTime": 38.72,
        "endTime": 39.2,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 39.2,
    "end": 41.8,
    "speaker": "chef",
    "words": [
      {
        "text": "Smarty.",
        "startTime": 39.2,
        "endTime": 40.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Llam\u00e9mosla",
        "startTime": 40.24,
        "endTime": 41.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "juntos.",
        "startTime": 41.24,
        "endTime": 41.8,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 49.32,
    "end": 51.52,
    "speaker": "chef",
    "words": [
      {
        "text": "Esta",
        "startTime": 49.32,
        "endTime": 49.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "parada",
        "startTime": 49.64,
        "endTime": 50.08,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "es",
        "startTime": 50.08,
        "endTime": 50.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Al",
        "startTime": 50.28,
        "endTime": 50.52,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Mundo",
        "startTime": 50.52,
        "endTime": 50.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 50.76,
        "endTime": 50.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo.",
        "startTime": 50.96,
        "endTime": 51.52,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 51.52,
    "end": 52.44,
    "speaker": "chef",
    "words": [
      {
        "text": "Cuidado",
        "startTime": 51.52,
        "endTime": 51.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "al",
        "startTime": 51.96,
        "endTime": 52.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "bajar.",
        "startTime": 52.04,
        "endTime": 52.44,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 52.96,
    "end": 54.64,
    "speaker": "chef",
    "words": [
      {
        "text": "Oh,",
        "startTime": 52.96,
        "endTime": 53.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hola,",
        "startTime": 53.44,
        "endTime": 53.92,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo.",
        "startTime": 53.92,
        "endTime": 54.64,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 54.72,
    "end": 56.72,
    "speaker": "chef",
    "words": [
      {
        "text": "Hola,",
        "startTime": 54.72,
        "endTime": 55.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Smarty.",
        "startTime": 55.12,
        "endTime": 56.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Guau.",
        "startTime": 56.2,
        "endTime": 56.72,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 57.44,
    "end": 59.36,
    "speaker": "chef",
    "words": [
      {
        "text": "Smarty",
        "startTime": 57.44,
        "endTime": 58.08,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "es",
        "startTime": 58.08,
        "endTime": 58.16,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "chofer",
        "startTime": 58.16,
        "endTime": 58.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 58.56,
        "endTime": 58.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 58.8,
        "endTime": 59.36,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 59.36,
    "end": 62.8,
    "speaker": "chef",
    "words": [
      {
        "text": "As\u00ed",
        "startTime": 59.36,
        "endTime": 59.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "es.",
        "startTime": 59.84,
        "endTime": 60.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Los",
        "startTime": 60.72,
        "endTime": 61.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "tel\u00e9fonos",
        "startTime": 61.0,
        "endTime": 61.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "somos",
        "startTime": 61.56,
        "endTime": 61.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "muy",
        "startTime": 61.88,
        "endTime": 62.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "m\u00f3viles.",
        "startTime": 62.12,
        "endTime": 62.8,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 63.68,
    "end": 66.72,
    "speaker": "chef",
    "words": [
      {
        "text": "Smarty,",
        "startTime": 63.68,
        "endTime": 64.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo",
        "startTime": 64.36,
        "endTime": 64.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "quiere",
        "startTime": 64.8,
        "endTime": 65.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "saber",
        "startTime": 65.12,
        "endTime": 65.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "m\u00e1s",
        "startTime": 65.4,
        "endTime": 65.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sobre",
        "startTime": 65.56,
        "endTime": 65.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "los",
        "startTime": 65.8,
        "endTime": 66.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "choferes",
        "startTime": 66.04,
        "endTime": 66.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 66.64,
        "endTime": 66.72,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 66.72,
    "end": 67.28,
    "speaker": "chef",
    "words": [
      {
        "text": "autob\u00fas.",
        "startTime": 66.72,
        "endTime": 67.28,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 67.28,
    "end": 70.08,
    "speaker": "chef",
    "words": [
      {
        "text": "\u00bfQu\u00e9",
        "startTime": 67.28,
        "endTime": 67.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hacemos",
        "startTime": 67.48,
        "endTime": 67.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "para",
        "startTime": 67.88,
        "endTime": 68.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "aprender",
        "startTime": 68.12,
        "endTime": 68.44,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "algo",
        "startTime": 68.44,
        "endTime": 68.759,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "nuevo?",
        "startTime": 68.759,
        "endTime": 69.199,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "No.",
        "startTime": 69.68,
        "endTime": 70.08,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 72.56,
    "end": 76.0,
    "speaker": "chef",
    "words": [
      {
        "text": "Demos",
        "startTime": 72.56,
        "endTime": 73.08,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 73.08,
        "endTime": 73.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "paseo",
        "startTime": 73.24,
        "endTime": 73.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "y",
        "startTime": 73.72,
        "endTime": 73.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "aprendamos",
        "startTime": 73.84,
        "endTime": 74.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sobre",
        "startTime": 74.32,
        "endTime": 74.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "los",
        "startTime": 74.56,
        "endTime": 74.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "choferes",
        "startTime": 74.68,
        "endTime": 75.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 75.32,
        "endTime": 75.44,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 75.44,
        "endTime": 76.0,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 76.0,
    "end": 76.72,
    "speaker": "chef",
    "words": [
      {
        "text": "Aqu\u00ed",
        "startTime": 76.0,
        "endTime": 76.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "vamos.",
        "startTime": 76.32,
        "endTime": 76.72,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 78.16,
    "end": 81.36,
    "speaker": "chef",
    "words": [
      {
        "text": "Un",
        "startTime": 78.16,
        "endTime": 78.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "chofer",
        "startTime": 78.48,
        "endTime": 78.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 78.96,
        "endTime": 79.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 79.2,
        "endTime": 79.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conduce",
        "startTime": 79.64,
        "endTime": 80.08,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 80.08,
        "endTime": 80.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 80.2,
        "endTime": 80.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "por",
        "startTime": 80.68,
        "endTime": 80.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "una",
        "startTime": 80.84,
        "endTime": 81.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "ruta.",
        "startTime": 81.0,
        "endTime": 81.36,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 81.84,
    "end": 84.71,
    "speaker": "chef",
    "words": [
      {
        "text": "Se",
        "startTime": 81.84,
        "endTime": 82.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "detiene",
        "startTime": 82.12,
        "endTime": 82.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "en",
        "startTime": 82.64,
        "endTime": 82.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 82.72,
        "endTime": 82.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "parada",
        "startTime": 82.8,
        "endTime": 83.08,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "del",
        "startTime": 83.08,
        "endTime": 83.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 83.24,
        "endTime": 83.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "para",
        "startTime": 83.72,
        "endTime": 83.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "recoger",
        "startTime": 83.84,
        "endTime": 84.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasajeros.",
        "startTime": 84.28,
        "endTime": 84.71,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 85.5,
    "end": 88.06,
    "speaker": "chef",
    "words": [
      {
        "text": "Los",
        "startTime": 85.5,
        "endTime": 85.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasajeros",
        "startTime": 85.62,
        "endTime": 86.22,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pagan",
        "startTime": 86.22,
        "endTime": 86.66,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "su",
        "startTime": 86.66,
        "endTime": 86.82,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "viaje",
        "startTime": 86.82,
        "endTime": 87.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "cuando",
        "startTime": 87.18,
        "endTime": 87.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "suben.",
        "startTime": 87.38,
        "endTime": 88.06,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 88.06,
    "end": 90.06,
    "speaker": "chef",
    "words": [
      {
        "text": "Y",
        "startTime": 88.06,
        "endTime": 88.14,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "empieza",
        "startTime": 88.14,
        "endTime": 88.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "el",
        "startTime": 88.62,
        "endTime": 88.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "viaje",
        "startTime": 88.86,
        "endTime": 89.14,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "por",
        "startTime": 89.14,
        "endTime": 89.26,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 89.26,
        "endTime": 89.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "ciudad.",
        "startTime": 89.38,
        "endTime": 90.06,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 90.22,
    "end": 91.58,
    "speaker": "chef",
    "words": [
      {
        "text": "No",
        "startTime": 90.22,
        "endTime": 90.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "olvides",
        "startTime": 90.46,
        "endTime": 91.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "su",
        "startTime": 91.06,
        "endTime": 91.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "parada.",
        "startTime": 91.18,
        "endTime": 91.58,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 92.14,
    "end": 95.18,
    "speaker": "chef",
    "words": [
      {
        "text": "Un",
        "startTime": 92.14,
        "endTime": 92.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "chofer",
        "startTime": 92.54,
        "endTime": 92.94,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 92.94,
        "endTime": 93.14,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 93.14,
        "endTime": 93.66,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "puede",
        "startTime": 93.66,
        "endTime": 93.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "incluso",
        "startTime": 93.86,
        "endTime": 94.14,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "llevarse",
        "startTime": 94.14,
        "endTime": 94.58,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 94.58,
        "endTime": 94.74,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "paradas",
        "startTime": 94.74,
        "endTime": 95.18,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 95.18,
    "end": 98.26,
    "speaker": "chef",
    "words": [
      {
        "text": "muy",
        "startTime": 95.18,
        "endTime": 95.3,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "lejanas.",
        "startTime": 95.3,
        "endTime": 96.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Un",
        "startTime": 96.22,
        "endTime": 96.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "chofer",
        "startTime": 96.5,
        "endTime": 96.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 96.86,
        "endTime": 97.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 97.06,
        "endTime": 97.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "escolar",
        "startTime": 97.54,
        "endTime": 97.9,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "te",
        "startTime": 97.9,
        "endTime": 98.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "lleva",
        "startTime": 98.06,
        "endTime": 98.26,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 98.26,
    "end": 99.02,
    "speaker": "chef",
    "words": [
      {
        "text": "a",
        "startTime": 98.26,
        "endTime": 98.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 98.38,
        "endTime": 98.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "escuela.",
        "startTime": 98.5,
        "endTime": 99.02,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 99.42,
    "end": 100.74,
    "speaker": "chef",
    "words": [
      {
        "text": "Y",
        "startTime": 99.42,
        "endTime": 99.66,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "cuando",
        "startTime": 99.66,
        "endTime": 99.82,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "termina",
        "startTime": 99.82,
        "endTime": 100.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "el",
        "startTime": 100.5,
        "endTime": 100.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "d\u00eda,",
        "startTime": 100.54,
        "endTime": 100.74,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 100.74,
    "end": 103.66,
    "speaker": "chef",
    "words": [
      {
        "text": "el",
        "startTime": 100.74,
        "endTime": 100.979,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "chofer",
        "startTime": 100.979,
        "endTime": 101.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "del",
        "startTime": 101.46,
        "endTime": 101.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 101.7,
        "endTime": 102.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "escolar",
        "startTime": 102.18,
        "endTime": 102.58,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "est\u00e1",
        "startTime": 102.58,
        "endTime": 102.74,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "ah\u00ed",
        "startTime": 102.74,
        "endTime": 102.94,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "para",
        "startTime": 102.94,
        "endTime": 103.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "llevarte",
        "startTime": 103.06,
        "endTime": 103.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 103.54,
        "endTime": 103.66,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 103.66,
    "end": 105.58,
    "speaker": "chef",
    "words": [
      {
        "text": "casa.",
        "startTime": 103.66,
        "endTime": 103.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Nos",
        "startTime": 104.54,
        "endTime": 104.78,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "vemos",
        "startTime": 104.78,
        "endTime": 105.02,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "ma\u00f1ana.",
        "startTime": 105.02,
        "endTime": 105.58,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 109.42,
    "end": 111.82,
    "speaker": "chef",
    "words": [
      {
        "text": "Los",
        "startTime": 109.42,
        "endTime": 109.66,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "choferes",
        "startTime": 109.66,
        "endTime": 110.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 110.38,
        "endTime": 110.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 110.5,
        "endTime": 111.02,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "son",
        "startTime": 111.02,
        "endTime": 111.26,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "muy",
        "startTime": 111.26,
        "endTime": 111.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "amables.",
        "startTime": 111.46,
        "endTime": 111.82,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 112.42,
    "end": 113.3,
    "speaker": "chef",
    "words": [
      {
        "text": "S\u00ed",
        "startTime": 112.42,
        "endTime": 112.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "que",
        "startTime": 112.62,
        "endTime": 112.78,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "lo",
        "startTime": 112.78,
        "endTime": 112.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "son.",
        "startTime": 112.98,
        "endTime": 113.3,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 113.62,
    "end": 115.7,
    "speaker": "chef",
    "words": [
      {
        "text": "Parece",
        "startTime": 113.62,
        "endTime": 114.1,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "que",
        "startTime": 114.1,
        "endTime": 114.22,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "es",
        "startTime": 114.22,
        "endTime": 114.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hora",
        "startTime": 114.34,
        "endTime": 114.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 114.54,
        "endTime": 114.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "cambiar",
        "startTime": 114.7,
        "endTime": 114.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 114.98,
        "endTime": 115.22,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "rumbo.",
        "startTime": 115.22,
        "endTime": 115.7,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 115.7,
    "end": 117.86,
    "speaker": "chef",
    "words": [
      {
        "text": "Este",
        "startTime": 115.7,
        "endTime": 115.9,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 115.9,
        "endTime": 116.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "tiene",
        "startTime": 116.46,
        "endTime": 116.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 116.62,
        "endTime": 116.78,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "horario",
        "startTime": 116.78,
        "endTime": 117.1,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "que",
        "startTime": 117.1,
        "endTime": 117.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "cumplir.",
        "startTime": 117.34,
        "endTime": 117.86,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 117.94,
    "end": 118.82,
    "speaker": "chef",
    "words": [
      {
        "text": "Nos",
        "startTime": 117.94,
        "endTime": 118.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "vemos",
        "startTime": 118.18,
        "endTime": 118.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "luego,",
        "startTime": 118.38,
        "endTime": 118.82,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 118.82,
    "end": 119.46,
    "speaker": "chef",
    "words": [
      {
        "text": "Elmo.",
        "startTime": 118.82,
        "endTime": 119.46,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 120.18,
    "end": 123.18,
    "speaker": "chef",
    "words": [
      {
        "text": "Feliz",
        "startTime": 120.18,
        "endTime": 120.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "viaje.",
        "startTime": 120.62,
        "endTime": 121.3,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Vaya,",
        "startTime": 122.66,
        "endTime": 123.18,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 123.18,
    "end": 125.86,
    "speaker": "chef",
    "words": [
      {
        "text": "Elmo",
        "startTime": 123.18,
        "endTime": 123.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "desear\u00eda",
        "startTime": 123.86,
        "endTime": 124.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "ser",
        "startTime": 124.34,
        "endTime": 124.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "chofer",
        "startTime": 124.46,
        "endTime": 124.9,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 124.9,
        "endTime": 125.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 125.18,
        "endTime": 125.86,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 127.54,
    "end": 129.7,
    "speaker": "chef",
    "words": [
      {
        "text": "A",
        "startTime": 127.54,
        "endTime": 127.82,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo",
        "startTime": 127.82,
        "endTime": 128.22,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "se",
        "startTime": 128.22,
        "endTime": 128.419,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "le",
        "startTime": 128.419,
        "endTime": 128.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "ocurri\u00f3",
        "startTime": 128.5,
        "endTime": 129.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "una",
        "startTime": 129.06,
        "endTime": 129.3,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "idea.",
        "startTime": 129.3,
        "endTime": 129.7,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 130.82,
    "end": 132.9,
    "speaker": "chef",
    "words": [
      {
        "text": "Vamos",
        "startTime": 130.82,
        "endTime": 131.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 131.18,
        "endTime": 131.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "jugar",
        "startTime": 131.34,
        "endTime": 131.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 131.7,
        "endTime": 131.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "juego",
        "startTime": 131.86,
        "endTime": 132.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "juntos.",
        "startTime": 132.38,
        "endTime": 132.9,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 132.9,
    "end": 135.3,
    "speaker": "chef",
    "words": [
      {
        "text": "S\u00ed.",
        "startTime": 132.9,
        "endTime": 133.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Sigan",
        "startTime": 134.02,
        "endTime": 134.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 134.54,
        "endTime": 134.74,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo.",
        "startTime": 134.74,
        "endTime": 135.3,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 143.22,
    "end": 144.09,
    "speaker": "chef",
    "words": [
      {
        "text": "Elmo",
        "startTime": 143.22,
        "endTime": 143.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "se",
        "startTime": 143.7,
        "endTime": 143.82,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "preg.",
        "startTime": 143.82,
        "endTime": 144.09,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 144.48,
    "end": 146.64,
    "speaker": "chef",
    "words": [
      {
        "text": "Si",
        "startTime": 144.48,
        "endTime": 144.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "podemos",
        "startTime": 144.6,
        "endTime": 144.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conducir",
        "startTime": 144.88,
        "endTime": 145.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "el",
        "startTime": 145.4,
        "endTime": 145.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 145.56,
        "endTime": 146.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 146.04,
        "endTime": 146.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 146.2,
        "endTime": 146.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "escuela.",
        "startTime": 146.32,
        "endTime": 146.64,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 146.96,
    "end": 149.6,
    "speaker": "chef",
    "words": [
      {
        "text": "\u00bfEst\u00e1s",
        "startTime": 146.96,
        "endTime": 147.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "listo?",
        "startTime": 147.36,
        "endTime": 147.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "A",
        "startTime": 148.24,
        "endTime": 148.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "jugar.",
        "startTime": 148.88,
        "endTime": 149.6,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 150.08,
    "end": 153.16,
    "speaker": "chef",
    "words": [
      {
        "text": "Mira.",
        "startTime": 150.08,
        "endTime": 150.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Debemos",
        "startTime": 150.48,
        "endTime": 151.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conducir",
        "startTime": 151.12,
        "endTime": 151.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 151.56,
        "endTime": 151.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 151.72,
        "endTime": 152.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "lleno",
        "startTime": 152.12,
        "endTime": 152.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 152.56,
        "endTime": 152.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "monstruos",
        "startTime": 152.64,
        "endTime": 153.16,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 153.16,
    "end": 154.56,
    "speaker": "chef",
    "words": [
      {
        "text": "en",
        "startTime": 153.16,
        "endTime": 153.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 153.36,
        "endTime": 153.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "escuela",
        "startTime": 153.48,
        "endTime": 153.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 153.8,
        "endTime": 153.92,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "monstruos.",
        "startTime": 153.92,
        "endTime": 154.56,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 154.56,
    "end": 157.68,
    "speaker": "chef",
    "words": [
      {
        "text": "Pero",
        "startTime": 154.56,
        "endTime": 154.92,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "solo",
        "startTime": 154.92,
        "endTime": 155.16,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "podemos",
        "startTime": 155.16,
        "endTime": 155.52,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "vernos",
        "startTime": 155.68,
        "endTime": 156.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "cuando",
        "startTime": 156.2,
        "endTime": 156.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "el",
        "startTime": 156.48,
        "endTime": 156.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sem\u00e1foro",
        "startTime": 156.72,
        "endTime": 157.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "est\u00e9",
        "startTime": 157.36,
        "endTime": 157.68,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 157.68,
    "end": 160.72,
    "speaker": "chef",
    "words": [
      {
        "text": "en",
        "startTime": 157.68,
        "endTime": 157.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "verde.",
        "startTime": 157.84,
        "endTime": 158.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "El",
        "startTime": 158.72,
        "endTime": 159.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sem\u00e1foro",
        "startTime": 159.0,
        "endTime": 159.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "est\u00e1",
        "startTime": 159.72,
        "endTime": 159.999,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "en",
        "startTime": 159.999,
        "endTime": 160.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "rojo.",
        "startTime": 160.24,
        "endTime": 160.72,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 160.72,
    "end": 162.8,
    "speaker": "chef",
    "words": [
      {
        "text": "Los",
        "startTime": 160.72,
        "endTime": 161.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "verdes",
        "startTime": 161.0,
        "endTime": 161.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "avanzamos.",
        "startTime": 161.76,
        "endTime": 162.8,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 163.44,
    "end": 166.48,
    "speaker": "chef",
    "words": [
      {
        "text": "S\u00ed.",
        "startTime": 163.44,
        "endTime": 163.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Verde",
        "startTime": 163.88,
        "endTime": 164.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "significa",
        "startTime": 164.88,
        "endTime": 165.44,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "banda.",
        "startTime": 165.6,
        "endTime": 166.48,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 167.92,
    "end": 171.32,
    "speaker": "chef",
    "words": [
      {
        "text": "Luz.",
        "startTime": 167.92,
        "endTime": 168.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Zoemos",
        "startTime": 168.4,
        "endTime": 170.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "avanzar.",
        "startTime": 170.4,
        "endTime": 171.32,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 171.32,
    "end": 173.6,
    "speaker": "chef",
    "words": [
      {
        "text": "No.",
        "startTime": 171.32,
        "endTime": 171.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "El",
        "startTime": 171.92,
        "endTime": 172.16,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sem\u00e1foro",
        "startTime": 172.16,
        "endTime": 172.92,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "est\u00e1",
        "startTime": 172.92,
        "endTime": 173.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "en",
        "startTime": 173.12,
        "endTime": 173.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "rojo.",
        "startTime": 173.28,
        "endTime": 173.6,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 173.92,
    "end": 177.34,
    "speaker": "chef",
    "words": [
      {
        "text": "Tiene",
        "startTime": 173.92,
        "endTime": 174.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "favor.",
        "startTime": 174.28,
        "endTime": 174.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Luz",
        "startTime": 175.12,
        "endTime": 175.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "verde",
        "startTime": 175.48,
        "endTime": 175.99,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "avanza.",
        "startTime": 176.46,
        "endTime": 177.34,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 178.46,
    "end": 179.9,
    "speaker": "chef",
    "words": [
      {
        "text": "Llegamos",
        "startTime": 178.46,
        "endTime": 179.1,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 179.1,
        "endTime": 179.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 179.34,
        "endTime": 179.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "escuela.",
        "startTime": 179.46,
        "endTime": 179.9,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 180.06,
    "end": 182.38,
    "speaker": "chef",
    "words": [
      {
        "text": "Muy",
        "startTime": 180.06,
        "endTime": 180.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "j.",
        "startTime": 180.46,
        "endTime": 180.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Lo",
        "startTime": 181.42,
        "endTime": 181.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "logramos.",
        "startTime": 181.7,
        "endTime": 182.38,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 183.18,
    "end": 186.38,
    "speaker": "chef",
    "words": [
      {
        "text": "S\u00ed.",
        "startTime": 183.18,
        "endTime": 183.74,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Qu\u00e9",
        "startTime": 184.3,
        "endTime": 184.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "buenos",
        "startTime": 184.62,
        "endTime": 185.14,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conductores",
        "startTime": 185.14,
        "endTime": 186.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "son.",
        "startTime": 186.06,
        "endTime": 186.38,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 186.86,
    "end": 189.86,
    "speaker": "chef",
    "words": [
      {
        "text": "Guau.",
        "startTime": 186.86,
        "endTime": 187.42,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Los",
        "startTime": 187.9,
        "endTime": 188.14,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "choferes",
        "startTime": 188.14,
        "endTime": 188.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 188.86,
        "endTime": 188.94,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 188.94,
        "endTime": 189.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hacen",
        "startTime": 189.38,
        "endTime": 189.58,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "que",
        "startTime": 189.58,
        "endTime": 189.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "las",
        "startTime": 189.7,
        "endTime": 189.86,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 189.86,
    "end": 193.1,
    "speaker": "chef",
    "words": [
      {
        "text": "ruedas",
        "startTime": 189.86,
        "endTime": 190.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "del",
        "startTime": 190.38,
        "endTime": 190.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 190.5,
        "endTime": 191.1,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "giren",
        "startTime": 191.5,
        "endTime": 192.259,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "y",
        "startTime": 192.259,
        "endTime": 192.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "giren.",
        "startTime": 192.38,
        "endTime": 193.1,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 193.5,
    "end": 196.3,
    "speaker": "chef",
    "words": [
      {
        "text": "Y",
        "startTime": 193.5,
        "endTime": 193.74,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "eso",
        "startTime": 193.74,
        "endTime": 193.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hace",
        "startTime": 193.86,
        "endTime": 194.02,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "que",
        "startTime": 194.02,
        "endTime": 194.22,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo",
        "startTime": 194.22,
        "endTime": 194.78,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "se",
        "startTime": 194.78,
        "endTime": 194.94,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pregunte",
        "startTime": 194.94,
        "endTime": 195.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a\u00fan",
        "startTime": 195.46,
        "endTime": 195.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "m\u00e1s.",
        "startTime": 195.98,
        "endTime": 196.3,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 196.78,
    "end": 200.14,
    "speaker": "chef",
    "words": [
      {
        "text": "\u00bfEl",
        "startTime": 196.78,
        "endTime": 197.02,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Sr.",
        "startTime": 197.02,
        "endTime": 197.26,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Noodle",
        "startTime": 197.26,
        "endTime": 197.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sabr\u00e1",
        "startTime": 197.98,
        "endTime": 198.42,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "algo",
        "startTime": 198.42,
        "endTime": 198.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sobre",
        "startTime": 198.62,
        "endTime": 198.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conducir",
        "startTime": 198.86,
        "endTime": 199.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 199.34,
        "endTime": 199.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas?",
        "startTime": 199.5,
        "endTime": 200.14,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 200.86,
    "end": 201.9,
    "speaker": "chef",
    "words": [
      {
        "text": "Vamos",
        "startTime": 200.86,
        "endTime": 201.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 201.18,
        "endTime": 201.26,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "preguntarle.",
        "startTime": 201.26,
        "endTime": 201.9,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 203.92,
    "end": 205.84,
    "speaker": "chef",
    "words": [
      {
        "text": "Hola,",
        "startTime": 203.92,
        "endTime": 204.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Sr.",
        "startTime": 204.4,
        "endTime": 204.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Noodle.",
        "startTime": 204.96,
        "endTime": 205.84,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 207.28,
    "end": 208.56,
    "speaker": "chef",
    "words": [
      {
        "text": "Es",
        "startTime": 207.28,
        "endTime": 207.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 207.56,
        "endTime": 207.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hermana",
        "startTime": 207.68,
        "endTime": 208.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "del",
        "startTime": 208.04,
        "endTime": 208.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Sr.",
        "startTime": 208.24,
        "endTime": 208.56,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 208.56,
    "end": 209.92,
    "speaker": "chef",
    "words": [
      {
        "text": "Noodle,",
        "startTime": 208.56,
        "endTime": 209.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 209.12,
        "endTime": 209.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Srta.",
        "startTime": 209.36,
        "endTime": 209.92,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 209.92,
    "end": 212.2,
    "speaker": "chef",
    "words": [
      {
        "text": "Noodle.",
        "startTime": 209.92,
        "endTime": 210.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Hola,",
        "startTime": 211.2,
        "endTime": 211.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Srta.",
        "startTime": 211.6,
        "endTime": 212.2,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 212.2,
    "end": 214.44,
    "speaker": "chef",
    "words": [
      {
        "text": "Noodle.",
        "startTime": 212.2,
        "endTime": 212.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Srta.",
        "startTime": 213.28,
        "endTime": 213.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Noodle,",
        "startTime": 213.84,
        "endTime": 214.44,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 214.44,
    "end": 216.08,
    "speaker": "chef",
    "words": [
      {
        "text": "\u00bfSabe",
        "startTime": 214.44,
        "endTime": 214.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conducir",
        "startTime": 214.72,
        "endTime": 215.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 215.24,
        "endTime": 215.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas?",
        "startTime": 215.4,
        "endTime": 216.08,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 216.72,
    "end": 218.88,
    "speaker": "chef",
    "words": [
      {
        "text": "S\u00ed",
        "startTime": 216.72,
        "endTime": 217.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sabe.",
        "startTime": 217.12,
        "endTime": 217.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "\u00bfPuede",
        "startTime": 217.999,
        "endTime": 218.279,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "mostrarnos,",
        "startTime": 218.279,
        "endTime": 218.88,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 218.88,
    "end": 220.96,
    "speaker": "chef",
    "words": [
      {
        "text": "se\u00f1orita?",
        "startTime": 218.88,
        "endTime": 219.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "S\u00ed,",
        "startTime": 219.32,
        "endTime": 219.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "mu\u00e9strenos.",
        "startTime": 219.76,
        "endTime": 220.96,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 224.24,
    "end": 225.44,
    "speaker": "chef",
    "words": [
      {
        "text": "Est\u00e1",
        "startTime": 224.24,
        "endTime": 224.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "tratando",
        "startTime": 224.64,
        "endTime": 225.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 225.2,
        "endTime": 225.44,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 228.32,
    "end": 229.6,
    "speaker": "chef",
    "words": [
      {
        "text": "convoc",
        "startTime": 228.32,
        "endTime": 228.92,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 228.92,
        "endTime": 229.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 229.04,
        "endTime": 229.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 229.12,
        "endTime": 229.6,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 229.97,
    "end": 232.29,
    "speaker": "chef",
    "words": [
      {
        "text": "No",
        "startTime": 229.97,
        "endTime": 230.21,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "debe",
        "startTime": 230.21,
        "endTime": 230.77,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "estar",
        "startTime": 230.77,
        "endTime": 230.97,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "adentro",
        "startTime": 230.97,
        "endTime": 231.53,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "del",
        "startTime": 231.53,
        "endTime": 231.69,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 231.69,
        "endTime": 232.29,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 234.21,
    "end": 236.05,
    "speaker": "chef",
    "words": [
      {
        "text": "Ella",
        "startTime": 234.21,
        "endTime": 234.65,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "est\u00e1",
        "startTime": 234.65,
        "endTime": 234.93,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "en",
        "startTime": 234.93,
        "endTime": 235.13,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "el",
        "startTime": 235.13,
        "endTime": 235.33,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 235.33,
        "endTime": 236.05,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 236.37,
    "end": 237.65,
    "speaker": "chef",
    "words": [
      {
        "text": "Es",
        "startTime": 236.37,
        "endTime": 236.65,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "una",
        "startTime": 236.65,
        "endTime": 236.89,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasajera.",
        "startTime": 236.89,
        "endTime": 237.65,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 237.97,
    "end": 241.57,
    "speaker": "chef",
    "words": [
      {
        "text": "Se\u00f1orita",
        "startTime": 237.97,
        "endTime": 238.65,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Noodle,",
        "startTime": 238.65,
        "endTime": 239.41,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "eso",
        "startTime": 239.41,
        "endTime": 239.81,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "no",
        "startTime": 239.81,
        "endTime": 240.05,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "es",
        "startTime": 240.05,
        "endTime": 240.21,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conducir",
        "startTime": 240.21,
        "endTime": 240.69,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "un",
        "startTime": 240.69,
        "endTime": 240.85,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 240.85,
        "endTime": 241.57,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 241.65,
    "end": 244.69,
    "speaker": "chef",
    "words": [
      {
        "text": "El",
        "startTime": 241.65,
        "endTime": 241.97,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conductor",
        "startTime": 241.97,
        "endTime": 242.45,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "del",
        "startTime": 242.45,
        "endTime": 242.65,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas",
        "startTime": 242.65,
        "endTime": 243.05,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "va",
        "startTime": 243.05,
        "endTime": 243.29,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "al",
        "startTime": 243.29,
        "endTime": 243.57,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "frente",
        "startTime": 243.57,
        "endTime": 243.89,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "del",
        "startTime": 243.89,
        "endTime": 244.09,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 244.09,
        "endTime": 244.69,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 245.01,
    "end": 247.65,
    "speaker": "chef",
    "words": [
      {
        "text": "As\u00ed",
        "startTime": 245.01,
        "endTime": 245.33,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "es.",
        "startTime": 245.33,
        "endTime": 245.65,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Est\u00e1",
        "startTime": 245.89,
        "endTime": 246.29,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conduciendo",
        "startTime": 246.29,
        "endTime": 247.01,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "al",
        "startTime": 247.01,
        "endTime": 247.25,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 247.25,
        "endTime": 247.65,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 247.65,
    "end": 249.49,
    "speaker": "chef",
    "words": [
      {
        "text": "Lo",
        "startTime": 247.65,
        "endTime": 247.85,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "logr\u00f3,",
        "startTime": 247.85,
        "endTime": 248.33,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "se\u00f1orita",
        "startTime": 248.33,
        "endTime": 248.81,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Noodle.",
        "startTime": 248.81,
        "endTime": 249.49,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 249.49,
    "end": 251.09,
    "speaker": "chef",
    "words": [
      {
        "text": "Est\u00e1",
        "startTime": 249.49,
        "endTime": 249.77,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "conduciendo",
        "startTime": 249.77,
        "endTime": 250.33,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "al",
        "startTime": 250.33,
        "endTime": 250.57,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "autob\u00fas.",
        "startTime": 250.57,
        "endTime": 251.09,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 251.33,
    "end": 252.69,
    "speaker": "chef",
    "words": [
      {
        "text": "Y",
        "startTime": 251.33,
        "endTime": 251.57,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "amistad",
        "startTime": 251.57,
        "endTime": 252.01,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "en",
        "startTime": 252.01,
        "endTime": 252.13,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "el",
        "startTime": 252.13,
        "endTime": 252.21,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "camino.",
        "startTime": 252.21,
        "endTime": 252.69,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 253.97,
    "end": 257.39,
    "speaker": "chef",
    "words": [
      {
        "text": "Aprender",
        "startTime": 253.97,
        "endTime": 254.45,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "cosas",
        "startTime": 254.45,
        "endTime": 254.81,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "nuevas",
        "startTime": 254.81,
        "endTime": 255.17,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hace",
        "startTime": 255.17,
        "endTime": 255.41,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 255.41,
        "endTime": 255.57,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Elmo",
        "startTime": 255.57,
        "endTime": 256.05,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "tan",
        "startTime": 256.13,
        "endTime": 256.45,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "feliz",
        "startTime": 256.45,
        "endTime": 256.77,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "que",
        "startTime": 257.27,
        "endTime": 257.39,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 257.39,
    "end": 259.43,
    "speaker": "chef",
    "words": [
      {
        "text": "le",
        "startTime": 257.39,
        "endTime": 257.63,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "dan",
        "startTime": 257.63,
        "endTime": 258.03,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "ganas",
        "startTime": 258.03,
        "endTime": 258.35,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "de",
        "startTime": 258.35,
        "endTime": 258.59,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "bailar.",
        "startTime": 258.59,
        "endTime": 259.43,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 273.43,
    "end": 283.91,
    "speaker": "chef",
    "words": [
      {
        "text": "Hasta",
        "startTime": 273.43,
        "endTime": 273.71,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "la",
        "startTime": 273.71,
        "endTime": 273.87,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pr\u00f3xima.",
        "startTime": 273.87,
        "endTime": 274.31,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Otro.",
        "startTime": 283.27,
        "endTime": 283.91,
        "emphasis": "",
        "pitch": ""
      }
    ]
  }
]

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