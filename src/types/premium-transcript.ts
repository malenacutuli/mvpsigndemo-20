export interface PremiumTranscript {
  id: string;
  version_id: string;
  idx: number;
  start_time: number;
  end_time: number;
  text: string;
  speaker: string | null;
  speaker_normalized: string | null;
  speaker_confidence: number | null;
  character_id: string | null;
  emphasis: 'normal' | 'loud' | 'quiet' | 'yelling' | null;
  pitch: 'normal' | 'high' | 'low' | null;
  vocal_intensity: number | null;
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  sentiment_score: number | null;
  is_off_camera: boolean;
  is_music: boolean;
  is_sound_effect: boolean;
  words: TranscriptWord[];
  character_color: string | null;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface PremiumCharacter {
  id: string;
  version_id: string;
  name: string;
  type: 'main' | 'supporting' | 'minor' | 'off_camera';
  color: string; // CWI color from palette
  voice_id: string | null;
  voice_name: string | null;
  voice_type: string | null;
  emphasis: string;
  pitch: string;
  is_off_camera: boolean;
  created_at: string;
  updated_at: string;
}

export interface TranscriptGenerationOptions {
  language: string;
  speaker_labels: boolean;
  sentiment_analysis: boolean;
  entity_detection: boolean;
  auto_highlights: boolean;
}

export interface TranscriptEditAction {
  type: 'insert' | 'delete' | 'update' | 'merge' | 'split';
  segmentId: string;
  data?: any;
}
