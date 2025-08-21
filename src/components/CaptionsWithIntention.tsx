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
  [
  {
    "start": 0.08,
    "end": 2.36,
    "speaker": "chef",
    "words": [
      {
        "text": "It",
        "startTime": 0.08,
        "endTime": 0.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "can",
        "startTime": 0.2,
        "endTime": 0.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "be",
        "startTime": 0.36,
        "endTime": 0.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "easily",
        "startTime": 0.48,
        "endTime": 0.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "undercooked",
        "startTime": 0.8,
        "endTime": 1.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "or",
        "startTime": 1.48,
        "endTime": 1.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "overcooked.",
        "startTime": 1.64,
        "endTime": 2.36,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 2.36,
    "end": 3.68,
    "speaker": "chef",
    "words": [
      {
        "text": "Here's",
        "startTime": 2.36,
        "endTime": 2.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "how",
        "startTime": 2.72,
        "endTime": 2.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "to",
        "startTime": 2.84,
        "endTime": 2.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "do",
        "startTime": 2.96,
        "endTime": 3.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 3.04,
        "endTime": 3.16,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "properly.",
        "startTime": 3.16,
        "endTime": 3.68,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 3.92,
    "end": 6.36,
    "speaker": "chef",
    "words": [
      {
        "text": "First,",
        "startTime": 3.92,
        "endTime": 4.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "water",
        "startTime": 4.32,
        "endTime": 4.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "all",
        "startTime": 4.68,
        "endTime": 4.92,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "in",
        "startTime": 4.92,
        "endTime": 5.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "nice",
        "startTime": 5.44,
        "endTime": 5.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "large",
        "startTime": 5.8,
        "endTime": 6.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pan",
        "startTime": 6.04,
        "endTime": 6.36,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 6.36,
    "end": 8.32,
    "speaker": "chef",
    "words": [
      {
        "text": "to",
        "startTime": 6.36,
        "endTime": 6.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "make",
        "startTime": 6.6,
        "endTime": 6.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sure",
        "startTime": 6.8,
        "endTime": 7.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 7.0,
        "endTime": 7.16,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasta's",
        "startTime": 7.16,
        "endTime": 7.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "got",
        "startTime": 7.6,
        "endTime": 7.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sufficient",
        "startTime": 7.72,
        "endTime": 8.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "room",
        "startTime": 8.04,
        "endTime": 8.32,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 8.32,
    "end": 9.36,
    "speaker": "chef",
    "words": [
      {
        "text": "to",
        "startTime": 8.32,
        "endTime": 8.52,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "cook",
        "startTime": 8.52,
        "endTime": 8.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "evenly.",
        "startTime": 8.76,
        "endTime": 9.36,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 9.6,
    "end": 11.84,
    "speaker": "chef",
    "words": [
      {
        "text": "Nicely",
        "startTime": 9.6,
        "endTime": 10.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "seasoned.",
        "startTime": 10.12,
        "endTime": 10.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Absolutely",
        "startTime": 10.72,
        "endTime": 11.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "crucial.",
        "startTime": 11.36,
        "endTime": 11.84,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 12.16,
    "end": 14.8,
    "speaker": "chef",
    "words": [
      {
        "text": "Olive",
        "startTime": 12.16,
        "endTime": 12.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "oil",
        "startTime": 12.6,
        "endTime": 12.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "in",
        "startTime": 12.8,
        "endTime": 13.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "that",
        "startTime": 13.52,
        "endTime": 13.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "stops",
        "startTime": 13.84,
        "endTime": 14.16,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 14.16,
        "endTime": 14.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasta",
        "startTime": 14.28,
        "endTime": 14.8,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 14.8,
    "end": 15.68,
    "speaker": "chef",
    "words": [
      {
        "text": "from",
        "startTime": 14.8,
        "endTime": 15.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sticking",
        "startTime": 15.0,
        "endTime": 15.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "together.",
        "startTime": 15.36,
        "endTime": 15.68,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 16.079,
    "end": 17.12,
    "speaker": "chef",
    "words": [
      {
        "text": "Bring",
        "startTime": 16.079,
        "endTime": 16.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 16.36,
        "endTime": 16.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "up",
        "startTime": 16.48,
        "endTime": 16.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "to",
        "startTime": 16.6,
        "endTime": 16.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 16.72,
        "endTime": 16.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "boil.",
        "startTime": 16.8,
        "endTime": 17.12,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 18.32,
    "end": 19.44,
    "speaker": "chef",
    "words": [
      {
        "text": "That's",
        "startTime": 18.32,
        "endTime": 18.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 18.64,
        "endTime": 18.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "rolling",
        "startTime": 18.76,
        "endTime": 19.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "boil.",
        "startTime": 19.04,
        "endTime": 19.44,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 19.44,
    "end": 20.4,
    "speaker": "chef",
    "words": [
      {
        "text": "The",
        "startTime": 19.44,
        "endTime": 19.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "secret",
        "startTime": 19.72,
        "endTime": 20.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "there.",
        "startTime": 20.0,
        "endTime": 20.4,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 20.72,
    "end": 22.36,
    "speaker": "chef",
    "words": [
      {
        "text": "It",
        "startTime": 20.72,
        "endTime": 21.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "stops",
        "startTime": 21.04,
        "endTime": 21.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 21.28,
        "endTime": 21.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasta",
        "startTime": 21.4,
        "endTime": 21.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "from",
        "startTime": 21.8,
        "endTime": 21.92,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sticking",
        "startTime": 21.92,
        "endTime": 22.16,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "together.",
        "startTime": 22.16,
        "endTime": 22.36,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 22.36,
    "end": 23.68,
    "speaker": "chef",
    "words": [
      {
        "text": "And",
        "startTime": 22.36,
        "endTime": 22.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 22.56,
        "endTime": 22.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "gently",
        "startTime": 22.68,
        "endTime": 23.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "rolls",
        "startTime": 23.0,
        "endTime": 23.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 23.28,
        "endTime": 23.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "around.",
        "startTime": 23.4,
        "endTime": 23.68,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 24.08,
    "end": 25.76,
    "speaker": "chef",
    "words": [
      {
        "text": "Now,",
        "startTime": 24.08,
        "endTime": 24.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "this",
        "startTime": 24.4,
        "endTime": 24.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "is",
        "startTime": 24.6,
        "endTime": 24.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "angel",
        "startTime": 24.8,
        "endTime": 25.28,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasta.",
        "startTime": 25.28,
        "endTime": 25.76,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 25.76,
    "end": 27.56,
    "speaker": "chef",
    "words": [
      {
        "text": "Nice,",
        "startTime": 25.76,
        "endTime": 26.08,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "thin",
        "startTime": 26.08,
        "endTime": 26.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasta.",
        "startTime": 27.04,
        "endTime": 27.56,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 27.56,
    "end": 28.2,
    "speaker": "chef",
    "words": [
      {
        "text": "Takes",
        "startTime": 27.56,
        "endTime": 27.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "three",
        "startTime": 27.76,
        "endTime": 27.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "and",
        "startTime": 27.88,
        "endTime": 28.0,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 28.0,
        "endTime": 28.08,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "half",
        "startTime": 28.08,
        "endTime": 28.2,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 28.2,
    "end": 28.88,
    "speaker": "chef",
    "words": [
      {
        "text": "to",
        "startTime": 28.2,
        "endTime": 28.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "four",
        "startTime": 28.32,
        "endTime": 28.44,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "minutes.",
        "startTime": 28.44,
        "endTime": 28.88,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 29.2,
    "end": 31.52,
    "speaker": "chef",
    "words": [
      {
        "text": "So",
        "startTime": 29.2,
        "endTime": 29.52,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "into",
        "startTime": 29.52,
        "endTime": 29.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 29.76,
        "endTime": 29.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pan",
        "startTime": 29.96,
        "endTime": 30.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "as",
        "startTime": 30.56,
        "endTime": 30.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 30.88,
        "endTime": 31.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "hits",
        "startTime": 31.04,
        "endTime": 31.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the.",
        "startTime": 31.24,
        "endTime": 31.52,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 32.06,
    "end": 34.06,
    "speaker": "chef",
    "words": [
      {
        "text": "It",
        "startTime": 32.06,
        "endTime": 32.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "melts.",
        "startTime": 32.18,
        "endTime": 32.58,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "And",
        "startTime": 32.58,
        "endTime": 32.9,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "then",
        "startTime": 32.9,
        "endTime": 33.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "you",
        "startTime": 33.18,
        "endTime": 33.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "turn",
        "startTime": 33.38,
        "endTime": 33.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 33.54,
        "endTime": 33.74,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "round.",
        "startTime": 33.74,
        "endTime": 34.06,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 34.38,
    "end": 36.46,
    "speaker": "chef",
    "words": [
      {
        "text": "Tongs.",
        "startTime": 34.38,
        "endTime": 35.02,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "As",
        "startTime": 35.26,
        "endTime": 35.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "that",
        "startTime": 35.54,
        "endTime": 35.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "starts",
        "startTime": 35.7,
        "endTime": 35.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "to",
        "startTime": 35.98,
        "endTime": 36.1,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "melt,",
        "startTime": 36.1,
        "endTime": 36.46,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 36.62,
    "end": 39.02,
    "speaker": "chef",
    "words": [
      {
        "text": "gently",
        "startTime": 36.62,
        "endTime": 37.26,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "twist",
        "startTime": 37.5,
        "endTime": 37.9,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "that",
        "startTime": 37.9,
        "endTime": 38.22,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "into",
        "startTime": 38.3,
        "endTime": 38.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 38.62,
        "endTime": 38.78,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pan.",
        "startTime": 38.78,
        "endTime": 39.02,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 39.18,
    "end": 40.62,
    "speaker": "chef",
    "words": [
      {
        "text": "Bring",
        "startTime": 39.18,
        "endTime": 39.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 39.46,
        "endTime": 39.66,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "back",
        "startTime": 39.66,
        "endTime": 39.9,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "up",
        "startTime": 39.9,
        "endTime": 40.1,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "to",
        "startTime": 40.1,
        "endTime": 40.22,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 40.22,
        "endTime": 40.3,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "boil.",
        "startTime": 40.3,
        "endTime": 40.62,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 40.86,
    "end": 42.18,
    "speaker": "chef",
    "words": [
      {
        "text": "If",
        "startTime": 40.86,
        "endTime": 41.14,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "you're",
        "startTime": 41.14,
        "endTime": 41.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "bad",
        "startTime": 41.34,
        "endTime": 41.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "at",
        "startTime": 41.5,
        "endTime": 41.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "timing,",
        "startTime": 41.7,
        "endTime": 42.18,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 42.18,
    "end": 43.5,
    "speaker": "chef",
    "words": [
      {
        "text": "then",
        "startTime": 42.18,
        "endTime": 42.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "set",
        "startTime": 42.46,
        "endTime": 42.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 42.7,
        "endTime": 42.94,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "timer.",
        "startTime": 42.94,
        "endTime": 43.5,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 44.38,
    "end": 46.3,
    "speaker": "chef",
    "words": [
      {
        "text": "Beautiful.",
        "startTime": 44.38,
        "endTime": 45.02,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "To",
        "startTime": 45.42,
        "endTime": 45.74,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "test",
        "startTime": 45.74,
        "endTime": 45.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it.",
        "startTime": 45.98,
        "endTime": 46.3,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 46.7,
    "end": 47.74,
    "speaker": "chef",
    "words": [
      {
        "text": "Lift",
        "startTime": 46.7,
        "endTime": 47.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 47.06,
        "endTime": 47.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "little",
        "startTime": 47.18,
        "endTime": 47.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "strand.",
        "startTime": 47.34,
        "endTime": 47.74,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 48.46,
    "end": 49.78,
    "speaker": "chef",
    "words": [
      {
        "text": "You",
        "startTime": 48.46,
        "endTime": 48.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "can",
        "startTime": 48.7,
        "endTime": 48.82,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "actually",
        "startTime": 48.82,
        "endTime": 48.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "feel",
        "startTime": 48.98,
        "endTime": 49.14,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 49.14,
        "endTime": 49.26,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "with",
        "startTime": 49.26,
        "endTime": 49.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "your",
        "startTime": 49.38,
        "endTime": 49.5,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "fingers.",
        "startTime": 49.5,
        "endTime": 49.78,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 49.78,
    "end": 50.78,
    "speaker": "chef",
    "words": [
      {
        "text": "It's",
        "startTime": 49.78,
        "endTime": 49.98,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "still",
        "startTime": 49.98,
        "endTime": 50.1,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "nice",
        "startTime": 50.1,
        "endTime": 50.3,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "and",
        "startTime": 50.3,
        "endTime": 50.42,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "firm,",
        "startTime": 50.42,
        "endTime": 50.78,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 52.54,
    "end": 54.14,
    "speaker": "chef",
    "words": [
      {
        "text": "al",
        "startTime": 52.54,
        "endTime": 52.82,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "dente.",
        "startTime": 52.82,
        "endTime": 53.26,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Not",
        "startTime": 53.26,
        "endTime": 53.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 53.54,
        "endTime": 53.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "bite,",
        "startTime": 53.7,
        "endTime": 54.14,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 54.14,
    "end": 55.02,
    "speaker": "chef",
    "words": [
      {
        "text": "not",
        "startTime": 54.14,
        "endTime": 54.42,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 54.42,
        "endTime": 54.54,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "strong",
        "startTime": 54.54,
        "endTime": 54.7,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "bite,",
        "startTime": 54.7,
        "endTime": 55.02,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 55.02,
    "end": 56.86,
    "speaker": "chef",
    "words": [
      {
        "text": "but",
        "startTime": 55.02,
        "endTime": 55.22,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "just",
        "startTime": 55.22,
        "endTime": 55.42,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "really",
        "startTime": 55.42,
        "endTime": 55.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "nice",
        "startTime": 55.62,
        "endTime": 55.9,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "and",
        "startTime": 55.9,
        "endTime": 56.1,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "firm",
        "startTime": 56.1,
        "endTime": 56.38,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "inside.",
        "startTime": 56.38,
        "endTime": 56.86,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 57.18,
    "end": 58.3,
    "speaker": "chef",
    "words": [
      {
        "text": "Definitely",
        "startTime": 57.18,
        "endTime": 57.62,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "not",
        "startTime": 57.62,
        "endTime": 57.78,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "crunchy.",
        "startTime": 57.78,
        "endTime": 58.3,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 58.54,
    "end": 60.62,
    "speaker": "chef",
    "words": [
      {
        "text": "And",
        "startTime": 58.54,
        "endTime": 58.86,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "then",
        "startTime": 58.86,
        "endTime": 59.18,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "into",
        "startTime": 59.58,
        "endTime": 59.9,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 59.9,
        "endTime": 60.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "colander,",
        "startTime": 60.06,
        "endTime": 60.62,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 60.78,
    "end": 64.48,
    "speaker": "chef",
    "words": [
      {
        "text": "drain",
        "startTime": 60.78,
        "endTime": 61.26,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 61.26,
        "endTime": 61.46,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pasta",
        "startTime": 61.46,
        "endTime": 62.06,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "in",
        "startTime": 62.94,
        "endTime": 63.34,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "a",
        "startTime": 64.36,
        "endTime": 64.48,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 64.48,
    "end": 67.64,
    "speaker": "chef",
    "words": [
      {
        "text": "light",
        "startTime": 64.48,
        "endTime": 64.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "seasoning.",
        "startTime": 64.72,
        "endTime": 65.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Salt",
        "startTime": 65.72,
        "endTime": 66.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "and",
        "startTime": 66.92,
        "endTime": 67.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pepper,",
        "startTime": 67.2,
        "endTime": 67.64,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 68.76,
    "end": 71.48,
    "speaker": "chef",
    "words": [
      {
        "text": "a",
        "startTime": 68.76,
        "endTime": 69.04,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "tablespoon",
        "startTime": 69.04,
        "endTime": 69.72,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "of",
        "startTime": 70.6,
        "endTime": 70.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "olive",
        "startTime": 70.88,
        "endTime": 71.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "oil.",
        "startTime": 71.2,
        "endTime": 71.48,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 72.28,
    "end": 73.16,
    "speaker": "chef",
    "words": [
      {
        "text": "Mix",
        "startTime": 72.28,
        "endTime": 72.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "that",
        "startTime": 72.68,
        "endTime": 72.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "through.",
        "startTime": 72.88,
        "endTime": 73.16,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 74.12,
    "end": 75.48,
    "speaker": "chef",
    "words": [
      {
        "text": "That",
        "startTime": 74.12,
        "endTime": 74.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "stops",
        "startTime": 74.4,
        "endTime": 74.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "it",
        "startTime": 74.68,
        "endTime": 74.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "from",
        "startTime": 74.76,
        "endTime": 74.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "sticking",
        "startTime": 74.88,
        "endTime": 75.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "together.",
        "startTime": 75.2,
        "endTime": 75.48,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 76.04,
    "end": 77.72,
    "speaker": "chef",
    "words": [
      {
        "text": "And",
        "startTime": 76.04,
        "endTime": 76.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "look.",
        "startTime": 76.32,
        "endTime": 76.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "There",
        "startTime": 77.08,
        "endTime": 77.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "you",
        "startTime": 77.36,
        "endTime": 77.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "go.",
        "startTime": 77.48,
        "endTime": 77.72,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 77.72,
    "end": 79.32,
    "speaker": "chef",
    "words": [
      {
        "text": "Beautiful.",
        "startTime": 77.72,
        "endTime": 78.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Pasta",
        "startTime": 78.2,
        "endTime": 78.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "al",
        "startTime": 78.68,
        "endTime": 78.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "dente.",
        "startTime": 78.88,
        "endTime": 79.32,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 80.68,
    "end": 83.56,
    "speaker": "chef",
    "words": [
      {
        "text": "Cooked",
        "startTime": 80.68,
        "endTime": 81.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "perfectly.",
        "startTime": 81.12,
        "endTime": 81.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "Just",
        "startTime": 81.88,
        "endTime": 82.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "as",
        "startTime": 82.24,
        "endTime": 82.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "those",
        "startTime": 82.48,
        "endTime": 82.64,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "carrots",
        "startTime": 82.64,
        "endTime": 82.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "start",
        "startTime": 82.96,
        "endTime": 83.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "going",
        "startTime": 83.12,
        "endTime": 83.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "nice",
        "startTime": 83.32,
        "endTime": 83.56,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 83.56,
    "end": 84.76,
    "speaker": "chef",
    "words": [
      {
        "text": "and",
        "startTime": 83.56,
        "endTime": 83.68,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "soft,",
        "startTime": 83.68,
        "endTime": 83.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "don't",
        "startTime": 83.96,
        "endTime": 84.24,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "overcook",
        "startTime": 84.24,
        "endTime": 84.6,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "them.",
        "startTime": 84.6,
        "endTime": 84.76,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 84.76,
    "end": 86.12,
    "speaker": "chef",
    "words": [
      {
        "text": "You",
        "startTime": 84.76,
        "endTime": 84.96,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "want",
        "startTime": 84.96,
        "endTime": 85.08,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "that",
        "startTime": 85.08,
        "endTime": 85.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "nice",
        "startTime": 85.2,
        "endTime": 85.44,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "texture",
        "startTime": 85.44,
        "endTime": 85.76,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "in",
        "startTime": 85.76,
        "endTime": 85.88,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "there.",
        "startTime": 85.88,
        "endTime": 86.12,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 86.92,
    "end": 88.84,
    "speaker": "chef",
    "words": [
      {
        "text": "And",
        "startTime": 86.92,
        "endTime": 87.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "just",
        "startTime": 87.2,
        "endTime": 87.36,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "rinse",
        "startTime": 87.36,
        "endTime": 87.8,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 88.12,
        "endTime": 88.44,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "rice.",
        "startTime": 88.44,
        "endTime": 88.84,
        "emphasis": "",
        "pitch": ""
      }
    ]
  },
  {
    "start": 89.56,
    "end": 91.72,
    "speaker": "chef",
    "words": [
      {
        "text": "That",
        "startTime": 89.56,
        "endTime": 89.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "stops",
        "startTime": 89.84,
        "endTime": 90.12,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 90.12,
        "endTime": 90.2,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "rice",
        "startTime": 90.2,
        "endTime": 90.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "from",
        "startTime": 90.4,
        "endTime": 90.56,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "becoming",
        "startTime": 90.56,
        "endTime": 90.84,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "clumpy",
        "startTime": 90.84,
        "endTime": 91.32,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "in",
        "startTime": 91.32,
        "endTime": 91.4,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "the",
        "startTime": 91.4,
        "endTime": 91.48,
        "emphasis": "",
        "pitch": ""
      },
      {
        "text": "pan.",
        "startTime": 91.48,
        "endTime": 91.72,
        "emphasis": "",
        "pitch": ""
      }
    ]
  }
]

// Demo captions for educational content with warm, engaging narration
const educationCaptions: CaptionSegment[] = [
  {
    text: "Hello! Welcome to learning with us today.",
    startTime: 5.04,
    endTime: 8.4,
    speaker: "child",
    words: [
      {
        text: "Hello!",
        startTime: 5.04,
        endTime: 5.44,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "Welcome",
        startTime: 5.44,
        endTime: 6.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "to",
        startTime: 6.0,
        endTime: 6.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "learning",
        startTime: 6.2,
        endTime: 6.8,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "with",
        startTime: 6.8,
        endTime: 7.0,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "us",
        startTime: 7.0,
        endTime: 7.2,
        emphasis: "normal",
        pitch: "normal"
      },
      {
        text: "today.",
        startTime: 7.2,
        endTime: 8.4,
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