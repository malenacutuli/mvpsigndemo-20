import { useState } from 'react';
import { CaptionSegment } from '@/components/CaptionsWithIntention';

// Captions with Intention speaker color assignments - Official CI Palette
const CI_SPEAKER_COLORS = [
  // Main Characters (6 primary colors) - Highest Priority
  '#E5E517', // Yellow (Main)
  '#17E5E5', // Cyan (Main) 
  '#E51717', // Red (Main)
  '#17E517', // Green (Main)
  '#E517E5', // Magenta (Main)
  '#E58017', // Orange (Main)
  // Supporting Characters (12 between colors) - Medium Priority  
  '#E85C2E', '#47C2EB', '#EBC247', '#5E82ED', '#C2EB47', '#8C6BED',
  '#82ED5E', '#CC6BED', '#47EB70', '#EB47C2', '#5EEDC9', '#ED5E82'
];

interface SpeakerProfile {
  id: string;
  name: string;
  color: string;
  voiceCharacteristics: {
    avgPitch?: number;
    pitchRange?: number;
    speechRate?: number;
    pausePattern?: number;
  };
  segmentCount: number;
}

interface UseSpeakerIdentificationReturn {
  identifiedSpeakers: SpeakerProfile[];
  identifySpeakers: (segments: CaptionSegment[]) => CaptionSegment[];
  assignSpeakerColors: (segments: CaptionSegment[]) => CaptionSegment[];
}

export const useSpeakerIdentification = (): UseSpeakerIdentificationReturn => {
  const [identifiedSpeakers, setIdentifiedSpeakers] = useState<SpeakerProfile[]>([]);

  /**
   * Identify different speakers based on audio characteristics and text patterns
   */
  const identifySpeakers = (segments: CaptionSegment[]): CaptionSegment[] => {
    if (!segments || segments.length === 0) return segments;

    console.log('🎭 Starting speaker identification for', segments.length, 'segments');

    // Group segments by potential speaker characteristics
    const speakerGroups: { [key: string]: CaptionSegment[] } = {};
    
    segments.forEach((segment, index) => {
      // Create a speaker signature based on multiple factors
      const signature = createSpeakerSignature(segment, index, segments);
      
      if (!speakerGroups[signature]) {
        speakerGroups[signature] = [];
      }
      speakerGroups[signature].push(segment);
    });

    // Convert groups to speaker profiles
    const speakers: SpeakerProfile[] = Object.entries(speakerGroups).map(([signature, segmentGroup], index) => {
      const speakerId = `speaker_${index + 1}`;
      const speakerName = generateSpeakerName(segmentGroup, index);
      
      return {
        id: speakerId,
        name: speakerName,
        color: CI_SPEAKER_COLORS[index % CI_SPEAKER_COLORS.length],
        voiceCharacteristics: calculateVoiceCharacteristics(segmentGroup),
        segmentCount: segmentGroup.length
      };
    });

    setIdentifiedSpeakers(speakers);
    console.log('🎯 Identified', speakers.length, 'unique speakers:', speakers.map(s => s.name));

    // Assign speaker information back to segments
    let updatedSegments = segments.map(segment => {
      const signature = createSpeakerSignature(segment, segments.indexOf(segment), segments);
      const speakerIndex = Object.keys(speakerGroups).indexOf(signature);
      const speaker = speakers[speakerIndex];
      
      return {
        ...segment,
        speaker: speaker?.name || segment.speaker || 'Speaker',
        speakerColor: speaker?.color || CI_SPEAKER_COLORS[0]
      };
    });

    // Fallback: if only one speaker detected, alternate speakers by conversational turns
    const uniqueSpeakers = new Set(updatedSegments.map(s => s.speaker)).size;
    if (uniqueSpeakers <= 1) {
      console.log('ℹ️ Speaker ID fallback: alternating speakers by pauses/pitch changes');
      let currentIdx = 0;
      const maxSpeakers = 3; // offer up to 3 distinct colors
      updatedSegments = updatedSegments.map((seg, i, arr) => {
        if (i > 0) {
          const prev = arr[i - 1];
          const gap = seg.startTime - prev.endTime;
          const punctChange = /[!?]$/.test(prev.text.trim());
          const prevPitch = typeof prev.pitch === 'number' ? prev.pitch : prev.pitch === 'high' ? 220 : prev.pitch === 'low' ? 100 : 180;
          const nowPitch = typeof seg.pitch === 'number' ? seg.pitch : seg.pitch === 'high' ? 220 : seg.pitch === 'low' ? 100 : 180;
          if (gap > 1.2 || punctChange || Math.abs(nowPitch - prevPitch) > 30) {
            currentIdx = (currentIdx + 1) % maxSpeakers;
          }
        }
        return {
          ...seg,
          speaker: `Speaker ${currentIdx + 1}`,
          speakerColor: CI_SPEAKER_COLORS[currentIdx % CI_SPEAKER_COLORS.length]
        };
      });

      const names = Array.from(new Set(updatedSegments.map(s => s.speaker)));
      setIdentifiedSpeakers(names.map((name, idx) => ({
        id: `speaker_${idx + 1}`,
        name,
        color: CI_SPEAKER_COLORS[idx % CI_SPEAKER_COLORS.length],
        voiceCharacteristics: {},
        segmentCount: updatedSegments.filter(s => s.speaker === name).length
      })));
    }

    return updatedSegments;
  };

  /**
   * Create a signature for speaker identification based on multiple factors
   */
  const createSpeakerSignature = (segment: CaptionSegment, index: number, allSegments: CaptionSegment[]): string => {
    const factors: string[] = [];
    
    // Factor 1: Pitch range (if available)
    if (segment.pitch) {
      const pitchCategory = typeof segment.pitch === 'number' 
        ? (segment.pitch < 150 ? 'low' : segment.pitch > 200 ? 'high' : 'medium')
        : segment.pitch;
      factors.push(`pitch_${pitchCategory}`);
    }

    // Factor 2: Speech patterns and timing
    const avgWordLength = segment.words?.reduce((acc, word) => acc + word.text.length, 0) / (segment.words?.length || 1);
    const speechRate = segment.words?.length || 1 / (segment.endTime - segment.startTime);
    
    factors.push(`rate_${speechRate < 2 ? 'slow' : speechRate > 4 ? 'fast' : 'normal'}`);
    factors.push(`words_${avgWordLength < 4 ? 'short' : avgWordLength > 8 ? 'long' : 'medium'}`);

    // Factor 3: Volume/intensity patterns (if available)
    if (segment.volume) {
      const volumeCategory = segment.volume < 40 ? 'quiet' : segment.volume > 70 ? 'loud' : 'normal';
      factors.push(`vol_${volumeCategory}`);
    }

    // Factor 4: Temporal clustering (speakers tend to have consecutive segments)
    const nearbySegments = allSegments.slice(Math.max(0, index - 2), Math.min(allSegments.length, index + 3));
    const hasNearbyQuietSegments = nearbySegments.some(s => s.volume && s.volume < 40);
    const hasNearbyLoudSegments = nearbySegments.some(s => s.volume && s.volume > 70);
    
    if (hasNearbyQuietSegments) factors.push('context_quiet');
    if (hasNearbyLoudSegments) factors.push('context_loud');

    // Factor 5: Language/accent detection from text patterns
    const textSignature = analyzeTextPatterns(segment.text);
    factors.push(`text_${textSignature}`);

    return factors.join('_');
  };

  /**
   * Analyze text patterns to help identify speaker characteristics
   */
  const analyzeTextPatterns = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Detect formal vs informal speech
    const formalIndicators = ['please', 'thank you', 'would you', 'could you', 'excuse me'];
    const informalIndicators = ['yeah', 'okay', 'um', 'like', 'you know'];
    
    const formalCount = formalIndicators.filter(indicator => lowerText.includes(indicator)).length;
    const informalCount = informalIndicators.filter(indicator => lowerText.includes(indicator)).length;
    
    if (formalCount > informalCount) return 'formal';
    if (informalCount > formalCount) return 'informal';
    
    // Detect technical vs conversational language
    const technicalIndicators = ['system', 'process', 'analysis', 'configuration', 'parameters'];
    const conversationalIndicators = ['really', 'actually', 'maybe', 'probably', 'I think'];
    
    const techCount = technicalIndicators.filter(indicator => lowerText.includes(indicator)).length;
    const convCount = conversationalIndicators.filter(indicator => lowerText.includes(indicator)).length;
    
    if (techCount > 0) return 'technical';
    if (convCount > 0) return 'conversational';
    
    return 'neutral';
  };

  /**
   * Generate appropriate speaker names based on their characteristics
   */
  const generateSpeakerName = (segments: CaptionSegment[], index: number): string => {
    const voiceChars = calculateVoiceCharacteristics(segments);
    const totalText = segments.map(s => s.text).join(' ').toLowerCase();
    
    // Analyze content to suggest speaker roles
    const roleIndicators = {
      'Host': ['welcome', 'today', 'we will', 'let me show', 'first', 'next', 'in conclusion'],
      'Narrator': ['meanwhile', 'then', 'after that', 'suddenly', 'in the distance'],
      'Expert': ['research shows', 'according to', 'studies indicate', 'data suggests'],
      'Child': ['wow', 'cool', 'awesome', 'can we', 'I want to'],
      'Teacher': ['class', 'students', 'lesson', 'remember', 'pay attention'],
      'Chef': ['ingredients', 'recipe', 'cooking', 'delicious', 'flavor', 'season']
    };
    
    let bestRole = 'Speaker';
    let maxMatches = 0;
    
    Object.entries(roleIndicators).forEach(([role, indicators]) => {
      const matches = indicators.filter(indicator => totalText.includes(indicator)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestRole = role;
      }
    });
    
    // If no specific role detected, use generic names with characteristics
    if (bestRole === 'Speaker') {
      const pitchLevel = voiceChars.avgPitch 
        ? (voiceChars.avgPitch < 150 ? 'Low Voice' : voiceChars.avgPitch > 200 ? 'High Voice' : 'Mid Voice')
        : '';
      
      bestRole = pitchLevel || `Speaker ${index + 1}`;
    }
    
    return bestRole;
  };

  /**
   * Calculate voice characteristics for a group of segments
   */
  const calculateVoiceCharacteristics = (segments: CaptionSegment[]) => {
    const pitches = segments
      .map(s => typeof s.pitch === 'number' ? s.pitch : null)
      .filter(p => p !== null) as number[];
      
    const speechRates = segments.map(s => 
      (s.words?.length || 1) / (s.endTime - s.startTime)
    );
    
    return {
      avgPitch: pitches.length > 0 ? pitches.reduce((a, b) => a + b, 0) / pitches.length : undefined,
      pitchRange: pitches.length > 0 ? Math.max(...pitches) - Math.min(...pitches) : undefined,
      speechRate: speechRates.reduce((a, b) => a + b, 0) / speechRates.length,
      pausePattern: segments.length > 1 ? calculateAveragePause(segments) : undefined
    };
  };

  /**
   * Calculate average pause duration between segments
   */
  const calculateAveragePause = (segments: CaptionSegment[]): number => {
    const pauses: number[] = [];
    
    for (let i = 0; i < segments.length - 1; i++) {
      const currentEnd = segments[i].endTime;
      const nextStart = segments[i + 1].startTime;
      if (nextStart > currentEnd) {
        pauses.push(nextStart - currentEnd);
      }
    }
    
    return pauses.length > 0 ? pauses.reduce((a, b) => a + b, 0) / pauses.length : 0;
  };

  /**
   * Assign colors to existing speakers without full identification
   */
  const assignSpeakerColors = (segments: CaptionSegment[]): CaptionSegment[] => {
    // Check for existing character colors from Character Manager first
    const existingColors = localStorage.getItem('character-colors');
    const characterColors: Record<string, string> = existingColors ? JSON.parse(existingColors) : {};
    
    const uniqueSpeakers = [...new Set(segments.map(s => s.speaker || 'Speaker'))];
    
    return segments.map(segment => {
      const speaker = segment.speaker || 'Speaker';
      
      // Priority 1: Use existing character color if available
      if (characterColors[speaker]) {
        return {
          ...segment,
          speakerColor: characterColors[speaker]
        };
      }
      
      // Priority 2: Assign CI color based on speaker index
      const speakerIndex = uniqueSpeakers.indexOf(speaker);
      return {
        ...segment,
        speakerColor: segment.speakerColor || CI_SPEAKER_COLORS[speakerIndex % CI_SPEAKER_COLORS.length]
      };
    });
  };

  return {
    identifiedSpeakers,
    identifySpeakers,
    assignSpeakerColors
  };
};