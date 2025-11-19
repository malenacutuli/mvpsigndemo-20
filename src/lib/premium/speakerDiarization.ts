import { supabase } from '@/integrations/supabase/client';
import { PremiumTranscript, PremiumCharacter } from '@/types/premium-transcript';
import { getNextAvailableColor } from './cwiPalette';

export class SpeakerDiarizationService {
  static async autoAssignSpeakers(
    projectId: string,
    segments: PremiumTranscript[],
    characters: PremiumCharacter[]
  ): Promise<{ assigned: number; skipped: number }> {
    let assigned = 0;
    let skipped = 0;

    const speakerGroups = this.groupByNormalizedSpeaker(segments);

    for (const [speakerName, segmentIds] of Object.entries(speakerGroups)) {
      const matchingCharacter = characters.find(
        char => char.name.toLowerCase() === speakerName.toLowerCase()
      );

      if (matchingCharacter) {
        await supabase
          .from('premium_transcript_segments')
          .update({
            speaker: matchingCharacter.name
          })
          .in('id', segmentIds);

        assigned += segmentIds.length;
      } else {
        skipped += segmentIds.length;
      }
    }

    return { assigned, skipped };
  }

  static async createCharactersFromSpeakers(
    videoId: string,
    segments: PremiumTranscript[],
    existingCharacters: PremiumCharacter[]
  ): Promise<PremiumCharacter[]> {
    const speakerGroups = this.groupByNormalizedSpeaker(segments);
    const existingNames = new Set(
      existingCharacters.map(c => c.name.toLowerCase())
    );

    const newCharacters: PremiumCharacter[] = [];

    for (const speakerName of Object.keys(speakerGroups)) {
      if (existingNames.has(speakerName.toLowerCase())) {
        continue;
      }

      const segmentCount = speakerGroups[speakerName].length;
      let type: 'main' | 'supporting' | 'minor' = 'minor';
      
      if (segmentCount > 50) {
        type = 'main';
      } else if (segmentCount > 20) {
        type = 'supporting';
      }

      const usedColors = [...existingCharacters, ...newCharacters].map(c => c.color);
      const color = getNextAvailableColor(usedColors, type);

      const { data, error } = await supabase
        .from('characters')
        .insert({
          video_id: videoId,
          name: speakerName,
          type,
          color: color.hex,
          emphasis: 'normal',
          pitch: 'normal',
          is_off_camera: false
        })
        .select()
        .single();

      if (!error && data) {
        newCharacters.push({
          id: data.id,
          version_id: data.video_id,
          name: data.name,
          type: data.type as any,
          color: data.color,
          voice_id: data.voice_id,
          voice_name: data.voice_name,
          voice_type: data.voice_type,
          emphasis: data.emphasis || 'normal',
          pitch: data.pitch || 'normal',
          is_off_camera: data.is_off_camera || false,
          created_at: data.created_at,
          updated_at: data.updated_at
        });
      }
    }

    return newCharacters;
  }

  static analyzeSpeakerPatterns(segments: PremiumTranscript[]) {
    const speakerStats: Record<string, {
      segmentCount: number;
      totalDuration: number;
      avgSentiment: number;
      avgConfidence: number;
      firstAppearance: number;
      lastAppearance: number;
    }> = {};

    segments.forEach(segment => {
      const speaker = segment.speaker_normalized || segment.speaker || 'Unknown';
      
      if (!speakerStats[speaker]) {
        speakerStats[speaker] = {
          segmentCount: 0,
          totalDuration: 0,
          avgSentiment: 0,
          avgConfidence: 0,
          firstAppearance: segment.start_time,
          lastAppearance: segment.end_time
        };
      }

      const stats = speakerStats[speaker];
      stats.segmentCount++;
      stats.totalDuration += (segment.end_time - segment.start_time);
      stats.avgSentiment += (segment.sentiment_score || 0);
      stats.avgConfidence += (segment.speaker_confidence || 0);
      stats.lastAppearance = Math.max(stats.lastAppearance, segment.end_time);
    });

    Object.keys(speakerStats).forEach(speaker => {
      const stats = speakerStats[speaker];
      stats.avgSentiment /= stats.segmentCount;
      stats.avgConfidence /= stats.segmentCount;
    });

    return speakerStats;
  }

  static suggestCharacterType(
    speakerName: string,
    patterns: ReturnType<typeof SpeakerDiarizationService.analyzeSpeakerPatterns>
  ): 'main' | 'supporting' | 'minor' | 'off_camera' {
    const stats = patterns[speakerName];
    if (!stats) return 'minor';

    if (stats.segmentCount > 50 || stats.totalDuration > 300) {
      return 'main';
    }

    if (stats.segmentCount > 20 || stats.totalDuration > 120) {
      return 'supporting';
    }

    if (stats.avgConfidence < 0.5) {
      return 'off_camera';
    }

    return 'minor';
  }

  private static groupByNormalizedSpeaker(
    segments: PremiumTranscript[]
  ): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    segments.forEach(segment => {
      const speaker = segment.speaker_normalized || segment.speaker || 'Unknown';
      
      if (!groups[speaker]) {
        groups[speaker] = [];
      }
      
      groups[speaker].push(segment.id);
    });

    return groups;
  }
}
