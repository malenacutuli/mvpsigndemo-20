/**
 * Comprehensive Audio Description Segment for Extended Audio Description (EAD) support
 * Supports WCAG 2.2 Level AAA (Success Criterion 1.2.7)
 */
export interface AudioDescriptionSegment {
  // Core identification
  id?: string;
  
  // Content
  text: string;
  
  // Timing (in seconds)
  startTime: number;
  endTime: number;
  
  // Voice and style
  voiceStyle?: 'passionate' | 'warm' | 'authoritative' | 'encouraging' | 'calm' | 'energetic';
  voiceId?: string; // ElevenLabs voice ID
  voiceName?: string; // Human-readable voice name
  
  // Extended Audio Description (EAD) metadata
  estimatedDuration?: number; // Estimated audio playback duration in seconds
  requiresExtension?: boolean; // Does this AD need video pause/slowdown?
  extensionDuration?: number; // How long to extend (pause/slow) the video
  extensionType?: 'pause' | 'slowdown' | 'none'; // How to extend
  priorityLevel?: 'critical' | 'important' | 'supplementary'; // Importance for accessibility
  
  // Gap analysis (from scheduler)
  gapDuration?: number; // Available gap in video (seconds)
  
  // Generation metadata
  language?: string; // ISO language code (e.g., 'en', 'es')
  confidence?: number; // AI generation confidence score (0-1)
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  
  // Audio output
  audioUrl?: string; // Generated TTS audio file URL
  audioGenerationStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  audioErrorMessage?: string;
  audioGeneratedAt?: string; // ISO timestamp
  
  // Legacy compatibility
  timestamp?: number; // Optional timestamp for sync reference (milliseconds)
}

/**
 * User preferences for Extended Audio Description playback
 */
export interface UserEADPreferences {
  eadEnabled: boolean;
  maxExtensionDuration: number; // Maximum seconds to pause/slow video
  extensionStrategy: 'pause' | 'slowdown' | 'hybrid';
  autoResume: boolean; // Auto-resume video after AD completes
  showVisualIndicator: boolean; // Show overlay during EAD pause
  skipShortcutEnabled: boolean; // Allow Shift+D to skip current EAD
}

/**
 * Runtime state for Extended Audio Description playback
 */
export interface EADPlaybackState {
  isActive: boolean; // Is an EAD currently playing?
  currentDescriptionId: string | null;
  pausedAt: number | null; // Video timestamp when paused
  resumeAt: number | null; // Video timestamp to resume at
  remainingDuration: number | null; // Seconds left in current AD
  canSkip: boolean; // Can user skip this AD?
}

/**
 * Gap classification result from scheduler
 */
export interface GapClassification {
  gapStart: number;
  gapEnd: number;
  gapDuration: number;
  descriptionLength: number;
  estimatedAudioDuration: number;
  sufficiency: 'sufficient' | 'tight' | 'requires-ead';
  recommendedExtension?: number; // Suggested extension duration
}
