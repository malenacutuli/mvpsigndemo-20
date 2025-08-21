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
  contentType = 'recipe',
  captionsOverride
}) => {
  const [currentCaption, setCurrentCaption] = useState<CaptionSegment | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  useEffect(() => {
    if (!isPlaying) return;

    // Select captions: use override if provided
    const captions = captionsOverride && captionsOverride.length > 0
      ? captionsOverride
      : (contentType === 'recipe' ? recipeCaptions : educationCaptions);

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
  }, [currentTime, isPlaying, contentType, captionsOverride]);

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