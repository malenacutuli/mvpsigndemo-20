// Complete Fix for Speaker Assignment & Manual Character Integration
// Handles both detected speakers (A, B, C) and unassigned segments

interface AssemblyAIUtterance {
  speaker?: string; // May be undefined for majority of segments
  text: string;
  start: number;
  end: number;
  confidence: number;
  emphasis?: string; // Sentiment-based emphasis
  emotion_metadata?: any; // Full sentiment data
  sentiment?: string; // Top-level sentiment
  sentiment_confidence?: number; // Top-level confidence
  words: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
    confidence: number;
    sentiment?: string;
    sentimentConfidence?: number;
  }>;
}

interface Character {
  id: string;
  name: string;
  type: 'main' | 'supporting' | 'minor';
  color: string;
  emphasis?: number;
  pitch?: number;
  video_id: string;
}

interface ProcessedSegment {
  text: string;
  start_time: number;
  end_time: number;
  speaker: string;
  speaker_color: string;
  character_id: string | null;
  language: string;
  confidence: number;
  speaker_asr_label?: string;
  words?: any[];
  emphasis?: string;
  emotion_metadata?: any;
  sentiment?: string;
  sentiment_confidence?: number;
}

export class SpeakerAssignmentService {
  private supabase: any;
  private videoId: string;
  private characterMap: Map<string, Character> = new Map();
  private speakerToCharacterMap: Map<string, string> = new Map();
  
  // Stable color palette for consistency (CI colors)
  private readonly COLOR_PALETTE = [
    '#E5E517', // Yellow - Main character
    '#17E5E5', // Cyan - Supporting 1
    '#E51717', // Red - Supporting 2
    '#17E517', // Green - Supporting 3
    '#E517E5', // Magenta - Supporting 4
    '#E58017', // Orange - Supporting 5
    '#47C2EB', // Light Blue - Minor 1
    '#EBC247', // Gold - Minor 2
    '#9CA3AF', // Gray - Unassigned (last)
  ];

  constructor(supabase: any, videoId: string) {
    this.supabase = supabase;
    this.videoId = videoId;
  }

  /**
   * Main processing function that handles both detected and undetected speakers
   */
  async processTranscriptionWithManualCharacters(
    utterances: AssemblyAIUtterance[],
    detectedLanguage: string
  ): Promise<ProcessedSegment[]> {
    console.log(`🎭 SpeakerAssignmentService: Processing ${utterances.length} utterances...`);
    
    // 1. Analyze speaker distribution
    const speakerStats = this.analyzeSpeakers(utterances);
    console.log('📊 Speaker Analysis:', speakerStats);

    // 2. Create or get characters for detected speakers
    await this.createCharactersForDetectedSpeakers(speakerStats.detected);

    // 3. Create or get the "Unassigned" character for undetected segments
    const unassignedChar = await this.createOrGetUnassignedCharacter();

    // 4. Load any manually created characters (Photographer, Housekeeper, etc.)
    await this.loadManualCharacters();

    // 5. Process segments with proper character assignment
    const processedSegments = await this.processSegments(
      utterances,
      detectedLanguage
    );

    // 6. Save speaker statistics to video metadata
    await this.updateVideoMetadata(speakerStats);

    return processedSegments;
  }

  /**
   * Analyze speaker distribution in utterances
   */
  private analyzeSpeakers(utterances: AssemblyAIUtterance[]) {
    const detected = new Map<string, number>();
    let undetectedCount = 0;
    let totalWords = 0;

    utterances.forEach(utterance => {
      if (utterance.speaker) {
        detected.set(
          utterance.speaker,
          (detected.get(utterance.speaker) || 0) + 1
        );
      } else {
        undetectedCount++;
      }
      totalWords += utterance.words?.length || 0;
    });

    return {
      detected: Array.from(detected.entries()).map(([speaker, count]) => ({
        label: speaker,
        count,
        percentage: (count / utterances.length) * 100
      })),
      undetectedCount,
      undetectedPercentage: (undetectedCount / utterances.length) * 100,
      totalUtterances: utterances.length,
      totalWords
    };
  }

  /**
   * Create characters for detected speakers (A, B, C)
   */
  private async createCharactersForDetectedSpeakers(
    detectedSpeakers: Array<{label: string; count: number; percentage: number}>
  ) {
    // Sort by occurrence to determine main/supporting/minor
    const sorted = detectedSpeakers.sort((a, b) => b.count - a.count);

    for (let i = 0; i < sorted.length; i++) {
      const speaker = sorted[i];
      const type = this.determineCharacterType(speaker.count, speaker.percentage);
      const characterName = `Speaker ${speaker.label}`;
      
      // Check if character already exists
      const { data: existing } = await this.supabase
        .from('characters')
        .select('*')
        .eq('video_id', this.videoId)
        .eq('name', characterName)
        .single();

      if (existing) {
        this.characterMap.set(speaker.label, existing);
        this.speakerToCharacterMap.set(speaker.label, existing.id);
        console.log(`✅ Found existing character: ${characterName}`);
      } else {
        // Create new character
        const { data: newChar, error } = await this.supabase
          .from('characters')
          .insert({
            video_id: this.videoId,
            name: characterName,
            type: type,
            color: this.COLOR_PALETTE[i],
            emphasis: type === 'main' ? 1.2 : 1.0,
            pitch: 1.0,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (newChar) {
          this.characterMap.set(speaker.label, newChar);
          this.speakerToCharacterMap.set(speaker.label, newChar.id);
          console.log(`✅ Created character: ${characterName} (${type}) - Color: ${this.COLOR_PALETTE[i]}`);
        } else if (error) {
          console.error(`❌ Failed to create character ${characterName}:`, error);
        }
      }
    }
  }

  /**
   * Create or get the "Unassigned" character for segments without speaker
   */
  private async createOrGetUnassignedCharacter(): Promise<Character | null> {
    const { data: existing } = await this.supabase
      .from('characters')
      .select('*')
      .eq('video_id', this.videoId)
      .eq('name', 'Unassigned')
      .single();

    if (existing) {
      this.characterMap.set('Unassigned', existing);
      this.speakerToCharacterMap.set('Unassigned', existing.id);
      console.log('✅ Found existing Unassigned character');
      return existing;
    }

    // Create the Unassigned character
    const { data: newChar, error } = await this.supabase
      .from('characters')
      .insert({
        video_id: this.videoId,
        name: 'Unassigned',
        type: 'minor',
        color: '#9CA3AF', // Gray
        emphasis: 1.0,
        pitch: 1.0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (newChar) {
      this.characterMap.set('Unassigned', newChar);
      this.speakerToCharacterMap.set('Unassigned', newChar.id);
      console.log('✅ Created Unassigned character for undetected segments');
      return newChar;
    } else if (error) {
      console.error('❌ Failed to create Unassigned character:', error);
      return null;
    }

    return null;
  }

  /**
   * Load manually created characters (Photographer, Housekeeper, etc.)
   */
  private async loadManualCharacters() {
    const { data: manualChars } = await this.supabase
      .from('characters')
      .select('*')
      .eq('video_id', this.videoId)
      .not('name', 'like', 'Speaker %')
      .not('name', 'eq', 'Unassigned');

    if (manualChars && manualChars.length > 0) {
      manualChars.forEach((char: Character) => {
        this.characterMap.set(char.name, char);
        console.log(`✅ Loaded manual character: ${char.name} (${char.type}) - Color: ${char.color}`);
      });
    }
  }

  /**
   * Determine character type based on segment count
   */
  private determineCharacterType(
    count: number,
    percentage: number
  ): 'main' | 'supporting' | 'minor' {
    if (percentage > 40 || count > 100) return 'main';
    if (percentage > 10 || count > 20) return 'supporting';
    return 'minor';
  }

  /**
   * Process segments with proper character assignment
   */
  private async processSegments(
    utterances: AssemblyAIUtterance[],
    language: string
  ): Promise<ProcessedSegment[]> {
    const segments: ProcessedSegment[] = [];

    for (const utterance of utterances) {
      // Determine speaker and character
      let speakerLabel: string;
      let characterId: string | null = null;
      let speakerColor: string;
      let originalLabel: string | undefined;

      if (utterance.speaker) {
        // Has detected speaker (A, B, C)
        originalLabel = utterance.speaker;
        const char = this.characterMap.get(utterance.speaker);
        if (char) {
          speakerLabel = char.name; // Use character name (e.g., "Speaker A")
          characterId = char.id;
          speakerColor = char.color;
        } else {
          // Fallback if character creation failed
          speakerLabel = `Speaker ${utterance.speaker}`;
          speakerColor = '#9CA3AF';
        }
      } else {
        // No detected speaker - assign to "Unassigned"
        speakerLabel = 'Unassigned';
        const unassignedChar = this.characterMap.get('Unassigned');
        if (unassignedChar) {
          characterId = unassignedChar.id;
          speakerColor = unassignedChar.color;
        } else {
          speakerColor = '#9CA3AF';
        }
      }

      // Transform word timings with sentiment data
      const words = utterance.words?.map(w => ({
        text: w.text,
        startTime: w.start / 1000, // Convert ms to seconds
        endTime: w.end / 1000,
        confidence: w.confidence,
        sentiment: w.sentiment,
        sentimentConfidence: w.sentimentConfidence
      })) || [];

      segments.push({
        text: utterance.text,
        start_time: utterance.start / 1000, // Convert ms to seconds
        end_time: utterance.end / 1000,
        speaker: speakerLabel,
        speaker_color: speakerColor,
        character_id: characterId,
        language: language, // Use detected language, NOT 'auto'
        confidence: utterance.confidence || 0,
        speaker_asr_label: originalLabel,
        words: words.length > 0 ? words : undefined,
        emphasis: utterance.emphasis || 'normal',
        emotion_metadata: utterance.emotion_metadata || null,
        sentiment: utterance.sentiment || null,
        sentiment_confidence: utterance.sentiment_confidence || null
      });
    }

    console.log(`✅ Processed ${segments.length} segments with character links`);
    console.log(`   - ${segments.filter(s => s.character_id && s.speaker !== 'Unassigned').length} assigned to detected speakers`);
    console.log(`   - ${segments.filter(s => s.speaker === 'Unassigned').length} unassigned (need manual assignment)`);

    return segments;
  }

  /**
   * Update video metadata with speaker statistics
   */
  private async updateVideoMetadata(stats: any) {
    const metadata = {
      speaker_detection: {
        detected_speakers: stats.detected,
        unassigned_count: stats.undetectedCount,
        unassigned_percentage: stats.undetectedPercentage,
        total_segments: stats.totalUtterances,
        total_words: stats.totalWords,
        characters_created: Array.from(this.characterMap.keys()),
        processed_at: new Date().toISOString()
      }
    };

    const { error } = await this.supabase
      .from('videos')
      .update({
        metadata: metadata
      })
      .eq('id', this.videoId);

    if (error) {
      console.error('❌ Failed to update video metadata:', error);
    } else {
      console.log(`✅ Updated video metadata: ${stats.detected.length} speakers detected, ${stats.undetectedPercentage.toFixed(1)}% unassigned`);
    }
  }

  /**
   * Helper function to batch save segments to database
   */
  async saveSegmentsToDatabase(segments: ProcessedSegment[]) {
    const batchSize = 50;
    
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      
      const { error } = await this.supabase
        .from('transcript_segments_clean')
        .upsert(batch.map((seg, idx) => ({
          video_id: this.videoId,
          idx: i + idx,
          text: seg.text,
          start_time: seg.start_time,
          end_time: seg.end_time,
          speaker: seg.speaker,
          speaker_color: seg.speaker_color,
          speaker_asr_label: seg.speaker_asr_label,
          character_id: seg.character_id,
          language: seg.language,
          confidence: seg.confidence,
          words: seg.words,
          segment_type: 'dialogue',
          emphasis: seg.emphasis || 'normal',
          pitch: 'normal',
          is_off_camera: false,
          emotion_metadata: seg.emotion_metadata || null,
          sentiment: seg.sentiment || null,
          sentiment_confidence: seg.sentiment_confidence || null,
          created_at: new Date().toISOString()
        })), {
          onConflict: 'video_id,language,idx',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`❌ Error saving batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`✅ Saved batch ${i / batchSize + 1} of ${Math.ceil(segments.length / batchSize)}: ${batch.length} segments`);
      }
    }
  }
}
