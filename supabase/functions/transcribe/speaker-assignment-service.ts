// Complete Fix for Speaker Assignment & Manual Character Integration
// Handles both detected speakers (A, B, C) and unassigned segments

interface AssemblyAIUtterance {
  speaker?: string; // May be undefined for majority of segments
  text: string;
  start: number;
  end: number;
  confidence: number;
  words: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
    confidence: number;
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
  speaker_asr_label: string | null; // Keep exact diarization label (e.g., "Speaker A")
  character_id: string | null;
  language: string;
  confidence: number;
  words?: any[];
}

export class SpeakerAssignmentService {
  private supabase: any;
  private videoId: string;
  private characterMap: Map<string, Character> = new Map();
  private speakerToCharacterMap: Map<string, string> = new Map();
  private speakerMappings: Map<string, string> = new Map(); // ASR label -> character name
  
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
    
    // 0. Load existing speaker mappings (user-created)
    await this.loadExistingSpeakerMappings(detectedLanguage);
    
    // 1. Analyze speaker distribution
    const speakerStats = this.analyzeSpeakers(utterances);
    console.log('📊 Speaker Analysis:', speakerStats);

    // 2. Create or get characters for detected speakers
    await this.createCharactersForDetectedSpeakers(speakerStats.detected);

    // 3. Create or get the "Unassigned" character for undetected segments
    const unassignedChar = await this.createOrGetUnassignedCharacter();

    // 4. Load any manually created characters (Photographer, Housekeeper, etc.)
    await this.loadManualCharacters();

    // 5. Process segments with proper character assignment (respects mappings)
    const processedSegments = await this.processSegments(
      utterances,
      detectedLanguage
    );

    // 6. Save speaker statistics to video metadata
    await this.updateVideoMetadata(speakerStats);

    return processedSegments;
  }

  /**
   * Load existing speaker mappings from database
   */
  private async loadExistingSpeakerMappings(language: string) {
    const { data: mappings } = await this.supabase
      .from('speaker_mappings')
      .select('asr_label, character_id')
      .eq('video_id', this.videoId)
      .eq('language', language);

    if (mappings && mappings.length > 0) {
      // Load the character details for each mapping
      for (const mapping of mappings) {
        const { data: char } = await this.supabase
          .from('characters')
          .select('*')
          .eq('id', mapping.character_id)
          .single();

        if (char) {
          this.speakerMappings.set(mapping.asr_label, char.name);
          this.characterMap.set(char.name, char);
          this.speakerToCharacterMap.set(mapping.asr_label, char.id);
          console.log(`✅ Loaded mapping: "${mapping.asr_label}" → "${char.name}"`);
        }
      }
    }
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
   * Process segments with proper character assignment (respects existing mappings)
   */
  private async processSegments(
    utterances: AssemblyAIUtterance[],
    language: string
  ): Promise<ProcessedSegment[]> {
    const segments: ProcessedSegment[] = [];

    for (const utterance of utterances) {
      // Determine ASR label and character_id
      let asrLabel: string | null = null;
      let characterId: string | null = null;

      if (utterance.speaker) {
        // Keep exact diarization label (e.g., "Speaker A", "Speaker B")
        asrLabel = `Speaker ${utterance.speaker}`;
        
        // Check if there's an existing mapping for this ASR label
        const mappedCharacterName = this.speakerMappings.get(utterance.speaker);
        if (mappedCharacterName) {
          const char = this.characterMap.get(mappedCharacterName);
          if (char) {
            characterId = char.id;
            console.log(`🎯 Segment mapped: "${asrLabel}" → character "${char.name}"`);
          }
        }
      }
      // If no speaker detected, leave asrLabel as null (will show as "Unassigned" in view)

      // Transform word timings - preserve all provider data
      const words = utterance.words?.map(w => ({
        text: w.text,
        startTime: w.start / 1000, // Convert ms to seconds
        endTime: w.end / 1000,
        confidence: w.confidence
      })) || [];

      segments.push({
        text: utterance.text,
        start_time: utterance.start / 1000, // Convert ms to seconds
        end_time: utterance.end / 1000,
        speaker_asr_label: asrLabel, // ✅ Keep exact diarization label
        character_id: characterId, // ✅ Set only if explicitly mapped
        language: language,
        confidence: utterance.confidence || 0,
        // DO NOT set speaker_color here; resolved view will supply from character or palette
        // DO NOT default speaker to 'Speaker'
        words: words.length > 0 ? words : undefined
      });
    }

    console.log(`✅ Processed ${segments.length} segments with ASR labels`);
    console.log(`   - ${segments.filter(s => s.character_id).length} mapped to characters`);
    console.log(`   - ${segments.filter(s => !s.speaker_asr_label).length} unassigned (no ASR label)`);

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
        .insert(batch.map((seg, idx) => ({
          video_id: this.videoId,
          idx: i + idx,
          text: seg.text,
          start_time: seg.start_time,
          end_time: seg.end_time,
          speaker_asr_label: seg.speaker_asr_label, // ✅ Keep exact ASR label
          character_id: seg.character_id, // ✅ Set only if explicitly mapped
          language: seg.language,
          confidence: seg.confidence,
          words: seg.words,
          segment_type: 'dialogue',
          emphasis: 'normal',
          pitch: 'normal',
          is_off_camera: false,
          // DO NOT set speaker or speaker_color - view will resolve them
          created_at: new Date().toISOString()
        })));

      if (error) {
        console.error(`❌ Error saving batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`✅ Saved batch ${i / batchSize + 1} of ${Math.ceil(segments.length / batchSize)}: ${batch.length} segments`);
      }
    }
  }
}
