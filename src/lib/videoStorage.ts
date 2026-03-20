import { supabase } from "@/integrations/supabase/client";

export interface VideoTranscript {
  videoId: string;
  language: string;
  segments: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    speaker?: string;
    speakerColor?: string;
    emphasis?: 'loud' | 'quiet' | 'normal';
    pitch?: 'high' | 'low' | 'normal';
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface VideoAudioDescription {
  videoId: string;
  language: string;
  segments: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging';
  }>;
  createdAt: string;
  updatedAt: string;
}

// Local storage keys
const TRANSCRIPT_KEY = 'video_transcripts';
const AUDIO_DESC_KEY = 'video_audio_descriptions';

// Save transcript to local storage
export function saveTranscript(transcript: VideoTranscript): void {
  try {
    const stored = localStorage.getItem(TRANSCRIPT_KEY);
    const transcripts = stored ? JSON.parse(stored) : {};
    const key = `${transcript.videoId}_${transcript.language}`;
    
    transcripts[key] = {
      ...transcript,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(transcripts));
  } catch (error) {
    console.error('Failed to save transcript:', error);
  }
}

// Load transcript from local storage
export function loadTranscript(videoId: string, language: string): VideoTranscript | null {
  try {
    const stored = localStorage.getItem(TRANSCRIPT_KEY);
    if (!stored) return null;
    
    const transcripts = JSON.parse(stored);
    const key = `${videoId}_${language}`;
    
    return transcripts[key] || null;
  } catch (error) {
    console.error('Failed to load transcript:', error);
    return null;
  }
}

// Save audio description to local storage
export function saveAudioDescription(audioDesc: VideoAudioDescription): void {
  try {
    const stored = localStorage.getItem(AUDIO_DESC_KEY);
    const audioDescs = stored ? JSON.parse(stored) : {};
    const key = `${audioDesc.videoId}_${audioDesc.language}`;
    
    audioDescs[key] = {
      ...audioDesc,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(AUDIO_DESC_KEY, JSON.stringify(audioDescs));
  } catch (error) {
    console.error('Failed to save audio description:', error);
  }
}

// Load audio description from local storage
export function loadAudioDescription(videoId: string, language: string): VideoAudioDescription | null {
  try {
    const stored = localStorage.getItem(AUDIO_DESC_KEY);
    if (!stored) return null;
    
    const audioDescs = JSON.parse(stored);
    const key = `${videoId}_${language}`;
    
    return audioDescs[key] || null;
  } catch (error) {
    console.error('Failed to load audio description:', error);
    return null;
  }
}

// Get native voice options for different languages
export function getNativeVoices(language: string) {
  const voiceOptions = {
    'en': [
      { id: 'sarah', name: 'Sarah', description: 'Professional American English voice', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL', isNative: true },
      { id: 'charlie', name: 'Charlie', description: 'Warm British English voice', elevenLabsId: 'IKne3meq5aSn9XLyUdCD', isNative: true },
      { id: 'aria', name: 'Aria', description: 'Clear American English voice', elevenLabsId: '9BWtsMINqrJLrRacOk9x', isNative: true },
      { id: 'roger', name: 'Roger', description: 'Deep American English voice', elevenLabsId: 'CwhRBWXzGAHq8TQ4Fs17', isNative: true }
    ],
    'es': [
      { id: 'sofia', name: 'Sofía', description: 'Native Spanish voice from Madrid', elevenLabsId: 'ThT5KcBeYPX3keUQqHPh', isNative: true },
      { id: 'diego', name: 'Diego', description: 'Native Mexican Spanish voice', elevenLabsId: '5Q0t7uMcjvnagumLfvZi', isNative: true },
      { id: 'isabella', name: 'Isabella', description: 'Native Argentinian Spanish voice', elevenLabsId: 'XB0fDUnXU5powFXDhCwa', isNative: true },
      { id: 'carlos', name: 'Carlos', description: 'Native Colombian Spanish voice', elevenLabsId: 'TX3LPaxmHKxFdv7VOQHJ', isNative: true }
    ],
    'fr': [
      { id: 'marie', name: 'Marie', description: 'Native Parisian French voice', elevenLabsId: 'Xb7hH8MSUJpSbSDYk0k2', isNative: true },
      { id: 'pierre', name: 'Pierre', description: 'Native French voice from Lyon', elevenLabsId: 'onwK4e9ZLuTAKqWW03F9', isNative: true },
      { id: 'camille', name: 'Camille', description: 'Native Canadian French voice', elevenLabsId: 'pFZP5JQG7iQjIQuC4Bku', isNative: true }
    ],
    'de': [
      { id: 'anna', name: 'Anna', description: 'Native German voice from Berlin', elevenLabsId: 'cgSgspJ2msm6clMCkdW9', isNative: true },
      { id: 'michael', name: 'Michael', description: 'Native Austrian German voice', elevenLabsId: 'nPczCjzI2devNBz1zQrb', isNative: true },
      { id: 'greta', name: 'Greta', description: 'Native Swiss German voice', elevenLabsId: 'XrExE9yKIg1WjnnlVkGX', isNative: true }
    ],
    'it': [
      { id: 'giulia', name: 'Giulia', description: 'Native Italian voice from Rome', elevenLabsId: 'JBFqnCBsd6RMkjVDRZzb', isNative: true },
      { id: 'marco', name: 'Marco', description: 'Native Italian voice from Milan', elevenLabsId: 'bIHbv24MWmeRgasZH58o', isNative: true },
      { id: 'lucia', name: 'Lucia', description: 'Native Italian voice from Naples', elevenLabsId: 'SAz9YHcvj6GT2YYXdXww', isNative: true }
    ],
    'pt': [
      { id: 'ana', name: 'Ana', description: 'Native Brazilian Portuguese voice', elevenLabsId: 'FGY2WhTYpPnrIDTdsKH5', isNative: true },
      { id: 'joão', name: 'João', description: 'Native European Portuguese voice', elevenLabsId: 'N2lVS1w4EtoT3dr4eOWO', isNative: true },
      { id: 'maria', name: 'Maria', description: 'Native Portuguese voice from Lisbon', elevenLabsId: 'cjVigY5qzO86Huf0OWal', isNative: true }
    ],
    'tr': [
      { id: 'elif', name: 'Elif', description: 'Native Turkish voice', elevenLabsId: 'EXAVITQu4vr4xnSDxMaL', isNative: true },
      { id: 'ahmet', name: 'Ahmet', description: 'Native Turkish male voice', elevenLabsId: 'nPczCjzI2devNBz1zQrb', isNative: true }
    ]
  };

  return voiceOptions[language as keyof typeof voiceOptions] || voiceOptions['en'];
}