import { v4 as uuidv4 } from 'uuid';
import { detectLanguage } from '@/lib/services/language-detection';
import { normalizeTranscript } from '@/lib/utils/transcript-utils';

interface Speaker {
  id: string;
  label: string;
  color: string;
  language: string;
  confidence: number;
  segments: SpeakerSegment[];
  voiceFingerprint?: string;
}

interface SpeakerSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  language?: string;
}

interface CharacterAssignmentConfig {
  minSpeakerConfidence: number;
  languageDetectionThreshold: number;
  colorConsistencyEnabled: boolean;
  voiceFingerprintEnabled: boolean;
}

export class CharacterAssignmentService {
  private speakerColorMap: Map<string, string> = new Map();
  private speakerLanguageMap: Map<string, string> = new Map();
  private voiceFingerprintMap: Map<string, string> = new Map();
  private colorPool: string[] = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#48C9B0', '#F4A261', '#E76F51', '#A8E6CF', '#FFD93D',
    '#6BCB77', '#4D96FF', '#FF6B9D', '#C44569', '#F8956F'
  ];
  private usedColors: Set<string> = new Set();
  
  private config: CharacterAssignmentConfig = {
    minSpeakerConfidence: 0.75,
    languageDetectionThreshold: 0.8,
    colorConsistencyEnabled: true,
    voiceFingerprintEnabled: true
  };

  constructor(config?: Partial<CharacterAssignmentConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Main entry point for character assignment with language validation
   */
  async assignCharacters(
    transcriptData: any,
    primaryLanguage: string,
    options?: {
      forceReassign?: boolean;
      validateLanguage?: boolean;
    }
  ): Promise<Speaker[]> {
    try {
      // Step 1: Normalize and validate transcript data
      const normalizedData = normalizeTranscript(transcriptData);
      
      // Step 2: Extract and validate speakers
      const rawSpeakers = this.extractSpeakers(normalizedData);
      
      // Step 3: Validate speaker count and merge duplicates
      const validatedSpeakers = await this.validateAndMergeSpeakers(rawSpeakers);
      
      // Step 4: Assign consistent colors
      const coloredSpeakers = this.assignConsistentColors(validatedSpeakers);
      
      // Step 5: Validate and fix language assignments
      const languageValidatedSpeakers = await this.validateLanguageAssignments(
        coloredSpeakers,
        primaryLanguage
      );
      
      // Step 6: Apply voice fingerprinting if enabled
      const finalSpeakers = this.config.voiceFingerprintEnabled 
        ? await this.applyVoiceFingerprinting(languageValidatedSpeakers)
        : languageValidatedSpeakers;
      
      return finalSpeakers;
    } catch (error) {
      console.error('Character assignment failed:', error);
      throw new Error(`Character assignment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract speakers from normalized transcript data
   */
  private extractSpeakers(data: any): Speaker[] {
    const speakersMap = new Map<string, Speaker>();
    
    // Handle different transcript formats
    if (data.utterances) {
      // AssemblyAI format
      data.utterances.forEach((utterance: any) => {
        const speakerId = utterance.speaker || `SPEAKER_${utterance.speaker_id || '0'}`;
        
        if (!speakersMap.has(speakerId)) {
          speakersMap.set(speakerId, {
            id: speakerId,
            label: this.generateSpeakerLabel(speakerId),
            color: '', // Will be assigned later
            language: '',
            confidence: utterance.confidence || 0,
            segments: []
          });
        }
        
        speakersMap.get(speakerId)!.segments.push({
          start: utterance.start,
          end: utterance.end,
          text: utterance.text,
          confidence: utterance.confidence || 0
        });
      });
    } else if (data.segments) {
      // Deepgram or custom format
      data.segments.forEach((segment: any) => {
        const speakerId = segment.speaker || `SPEAKER_${segment.speaker_id || '0'}`;
        
        if (!speakersMap.has(speakerId)) {
          speakersMap.set(speakerId, {
            id: speakerId,
            label: this.generateSpeakerLabel(speakerId),
            color: '',
            language: '',
            confidence: segment.confidence || 0,
            segments: []
          });
        }
        
        speakersMap.get(speakerId)!.segments.push({
          start: segment.start,
          end: segment.end,
          text: segment.text || segment.transcript,
          confidence: segment.confidence || 0
        });
      });
    }
    
    return Array.from(speakersMap.values());
  }

  /**
   * Validate speaker count and merge potential duplicates
   */
  private async validateAndMergeSpeakers(speakers: Speaker[]): Promise<Speaker[]> {
    if (speakers.length === 0) {
      throw new Error('No speakers detected in transcript');
    }
    
    // Check for speakers with very similar voice patterns (potential duplicates)
    const mergedSpeakers: Speaker[] = [];
    const processed = new Set<string>();
    
    for (const speaker of speakers) {
      if (processed.has(speaker.id)) continue;
      
      // Find potential duplicates based on voice similarity
      const duplicates = speakers.filter(s => 
        s.id !== speaker.id && 
        !processed.has(s.id) &&
        this.areSpeakersSimilar(speaker, s)
      );
      
      if (duplicates.length > 0) {
        // Merge duplicates into primary speaker
        const merged = this.mergeSpeakers(speaker, duplicates);
        mergedSpeakers.push(merged);
        processed.add(speaker.id);
        duplicates.forEach(d => processed.add(d.id));
      } else {
        mergedSpeakers.push(speaker);
        processed.add(speaker.id);
      }
    }
    
    // Re-label speakers after merging
    mergedSpeakers.forEach((speaker, index) => {
      speaker.label = `Speaker ${index + 1}`;
    });
    
    return mergedSpeakers;
  }

  /**
   * Check if two speakers are similar enough to be the same person
   */
  private areSpeakersSimilar(speaker1: Speaker, speaker2: Speaker): boolean {
    // Calculate overlap in speaking times
    const timeOverlap = this.calculateTimeOverlap(speaker1.segments, speaker2.segments);
    if (timeOverlap > 0.1) return false; // Can't be same person if speaking simultaneously
    
    // Check voice pattern similarity if fingerprints available
    if (speaker1.voiceFingerprint && speaker2.voiceFingerprint) {
      const similarity = this.compareVoiceFingerprints(
        speaker1.voiceFingerprint,
        speaker2.voiceFingerprint
      );
      return similarity > 0.85;
    }
    
    // Check text pattern similarity
    const textSimilarity = this.compareTextPatterns(speaker1, speaker2);
    return textSimilarity > 0.75;
  }

  /**
   * Calculate time overlap between two sets of segments
   */
  private calculateTimeOverlap(segments1: SpeakerSegment[], segments2: SpeakerSegment[]): number {
    let overlapTime = 0;
    let totalTime = 0;
    
    for (const seg1 of segments1) {
      totalTime += seg1.end - seg1.start;
      for (const seg2 of segments2) {
        const overlapStart = Math.max(seg1.start, seg2.start);
        const overlapEnd = Math.min(seg1.end, seg2.end);
        if (overlapStart < overlapEnd) {
          overlapTime += overlapEnd - overlapStart;
        }
      }
    }
    
    return totalTime > 0 ? overlapTime / totalTime : 0;
  }

  /**
   * Merge multiple speakers into one
   */
  private mergeSpeakers(primary: Speaker, duplicates: Speaker[]): Speaker {
    const merged: Speaker = {
      ...primary,
      segments: [...primary.segments]
    };
    
    for (const duplicate of duplicates) {
      merged.segments.push(...duplicate.segments);
      merged.confidence = Math.max(merged.confidence, duplicate.confidence);
    }
    
    // Sort segments by time
    merged.segments.sort((a, b) => a.start - b.start);
    
    return merged;
  }

  /**
   * Assign consistent colors to speakers
   */
  private assignConsistentColors(speakers: Speaker[]): Speaker[] {
    // Reset color tracking for new assignment
    if (this.config.colorConsistencyEnabled) {
      // Preserve existing color assignments if available
      speakers.forEach(speaker => {
        if (this.speakerColorMap.has(speaker.id)) {
          speaker.color = this.speakerColorMap.get(speaker.id)!;
          this.usedColors.add(speaker.color);
        }
      });
    }
    
    // Assign colors to speakers without colors
    speakers.forEach((speaker, index) => {
      if (!speaker.color) {
        speaker.color = this.getNextAvailableColor(index);
        this.speakerColorMap.set(speaker.id, speaker.color);
        this.usedColors.add(speaker.color);
      }
    });
    
    return speakers;
  }

  /**
   * Get next available color from pool
   */
  private getNextAvailableColor(index: number): string {
    // Try to get unused color from pool
    for (const color of this.colorPool) {
      if (!this.usedColors.has(color)) {
        return color;
      }
    }
    
    // If all colors used, generate new color based on index
    const hue = (index * 137.5) % 360; // Golden angle distribution
    return `hsl(${hue}, 70%, 55%)`;
  }

  /**
   * Validate and fix language assignments
   */
  private async validateLanguageAssignments(
    speakers: Speaker[],
    primaryLanguage: string
  ): Promise<Speaker[]> {
    for (const speaker of speakers) {
      const detectedLanguages: Map<string, number> = new Map();
      
      // Analyze language for each segment
      for (const segment of speaker.segments) {
        if (segment.text && segment.text.trim().length > 10) {
          const detectedLang = await detectLanguage(segment.text);
          
          if (detectedLang.confidence > this.config.languageDetectionThreshold) {
            const count = detectedLanguages.get(detectedLang.language) || 0;
            detectedLanguages.set(detectedLang.language, count + 1);
            segment.language = detectedLang.language;
          }
        }
      }
      
      // Determine speaker's primary language
      if (detectedLanguages.size > 0) {
        const sortedLangs = Array.from(detectedLanguages.entries())
          .sort((a, b) => b[1] - a[1]);
        speaker.language = sortedLangs[0][0];
      } else {
        speaker.language = primaryLanguage;
      }
      
      this.speakerLanguageMap.set(speaker.id, speaker.language);
    }
    
    return speakers;
  }

  /**
   * Apply voice fingerprinting for speaker consistency
   */
  private async applyVoiceFingerprinting(speakers: Speaker[]): Promise<Speaker[]> {
    // This would integrate with your audio analysis service
    // For now, we'll use a placeholder implementation
    
    for (const speaker of speakers) {
      if (!speaker.voiceFingerprint) {
        speaker.voiceFingerprint = await this.generateVoiceFingerprint(speaker);
        this.voiceFingerprintMap.set(speaker.id, speaker.voiceFingerprint);
      }
    }
    
    return speakers;
  }

  /**
   * Generate voice fingerprint for speaker
   */
  private async generateVoiceFingerprint(speaker: Speaker): Promise<string> {
    // Placeholder - would integrate with actual voice analysis
    const textFeatures = speaker.segments
      .map(s => s.text)
      .join(' ')
      .toLowerCase();
    
    // Simple hash for demo - replace with actual voice analysis
    let hash = 0;
    for (let i = 0; i < textFeatures.length; i++) {
      const char = textFeatures.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `vf_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Compare voice fingerprints
   */
  private compareVoiceFingerprints(fp1: string, fp2: string): number {
    // Placeholder - would use actual voice comparison
    return fp1 === fp2 ? 1.0 : 0.0;
  }

  /**
   * Compare text patterns between speakers
   */
  private compareTextPatterns(speaker1: Speaker, speaker2: Speaker): number {
    const text1 = speaker1.segments.map(s => s.text).join(' ').toLowerCase();
    const text2 = speaker2.segments.map(s => s.text).join(' ').toLowerCase();
    
    // Simple word frequency comparison
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate speaker label
   */
  private generateSpeakerLabel(speakerId: string): string {
    const match = speakerId.match(/\d+/);
    const number = match ? parseInt(match[0]) + 1 : 1;
    return `Speaker ${number}`;
  }

  /**
   * Reset color assignments (for new sessions)
   */
  resetColorAssignments(): void {
    this.speakerColorMap.clear();
    this.usedColors.clear();
  }

  /**
   * Get speaker by ID with consistent color
   */
  getSpeakerById(speakerId: string): Speaker | null {
    const color = this.speakerColorMap.get(speakerId);
    const language = this.speakerLanguageMap.get(speakerId);
    const voiceFingerprint = this.voiceFingerprintMap.get(speakerId);
    
    if (color) {
      return {
        id: speakerId,
        label: this.generateSpeakerLabel(speakerId),
        color,
        language: language || '',
        confidence: 1.0,
        segments: [],
        voiceFingerprint
      };
    }
    
    return null;
  }
}

// Export singleton instance
export const characterAssignment = new CharacterAssignmentService({
  minSpeakerConfidence: 0.75,
  languageDetectionThreshold: 0.8,
  colorConsistencyEnabled: true,
  voiceFingerprintEnabled: true
});
