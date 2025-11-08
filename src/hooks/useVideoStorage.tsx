import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WordData {
  text: string;
  start_ms?: number;
  end_ms?: number;
  startTime?: number;
  endTime?: number;
  duration_ms?: number;
  confidence?: number;
  intensity?: 'whisper' | 'quiet' | 'normal' | 'loud' | 'yelling' | 'screaming';
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  sentimentConfidence?: number;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: 'high' | 'low' | 'normal';
}

export interface TranscriptSegment {
  id?: string;
  transcriptId?: string | null; // ✅ Link to transcripts table
  text: string;
  start_ms?: number;
  end_ms?: number;
  startTime: number;
  endTime: number;
  speaker?: string;
  speakerColor?: string;
  speakerAsrLabel?: string; // Original AssemblyAI label (A, B, C)
  speaker_asr_label?: string;
  emphasis?: 'normal' | 'loud' | 'quiet' | 'yelling';
  pitch?: 'normal' | 'high' | 'low';
  words?: WordData[];
  words_source?: string;
  timing_confidence?: number;
  isOffCamera?: boolean;
  segmentType?: 'dialogue' | 'soundeffect' | 'music';
  confidence?: number;
  characterId?: string | null; // ✅ FIX #1: Link to characters table (camelCase)
  character_id?: string | null; // ✅ FIX #1: Link to characters table (snake_case)
  idx?: number; // ✅ Segment index for ordering
  
  // ✅ NEW: Emotion fields
  overall_intensity?: string;
  overallIntensity?: string;
  overall_pitch?: string;
  overallPitch?: string;
  sentiment?: string;
  sentiment_confidence?: number;
  sentimentConfidence?: number;
  emotion_metadata?: any;
  emotionMetadata?: any;
}

export interface AudioDescription {
  id?: string;
  startTime: number;
  endTime: number;
  description: string;
  descriptionType?: 'visual' | 'action' | 'emotion' | 'setting';
  confidence?: number;
}

export interface ContentCache {
  id?: string;
  contentType: 'transcript' | 'captions' | 'audio_description' | 'dubbing' | 'translation';
  generationParams?: any;
  resultData: any;
}

export const useVideoStorage = (videoId: string) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to safely parse words data from database
  const parseWordsData = (wordsJson: any): WordData[] | undefined => {
    if (!wordsJson) return undefined;
    
    try {
      // If it's already an array, validate and return
      if (Array.isArray(wordsJson)) {
        return wordsJson.filter(word => 
          word && 
          typeof word === 'object' && 
          typeof word.text === 'string'
        ) as WordData[];
      }
      return undefined;
    } catch (error) {
      console.error('Failed to parse words data:', error);
      return undefined;
    }
  };

  // Helper function to parse words with duration and emotion data
  const parseWordsWithDuration = (wordsJson: any): WordData[] | undefined => {
    if (!wordsJson) return undefined;
    
    try {
      if (Array.isArray(wordsJson)) {
        return wordsJson
          .filter(word => word && typeof word === 'object' && typeof word.text === 'string')
          .map(w => ({
            text: w.text,
            start_ms: w.start_ms,
            end_ms: w.end_ms,
            startTime: w.start_ms / 1000,
            endTime: w.end_ms / 1000,
            duration_ms: w.end_ms - w.start_ms,
            confidence: w.confidence,
            intensity: w.intensity,
            sentiment: w.sentiment,
            sentimentConfidence: w.sentimentConfidence
          }));
      }
      return undefined;
    } catch (error) {
      console.error('Failed to parse words with duration:', error);
      return undefined;
    }
  };

  const saveTranscriptSegments = async (segments: TranscriptSegment[], language: string = 'en') => {
    if (!user) {
      console.warn('⚠️ User not authenticated - transcript changes will be lost on page refresh');
      const fallbackData = { segments, language, timestamp: Date.now() };
      localStorage.setItem(`transcript_${videoId}_${language}`, JSON.stringify(fallbackData));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('💾 Saving transcript segments to database:', segments.length, 'segments for video:', videoId);

      // ✅ Fetch or CREATE transcript_id for this video+language (FORCE transcript_id to always exist)
      let transcriptId: string;
      
      const { data: latestTranscript } = await supabase
        .from('transcripts')
        .select('id, created_by')
        .eq('video_id', videoId)
        .eq('language', language)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // ✅ CRITICAL: Ensure transcript ownership for RLS
      if (latestTranscript?.id && latestTranscript.created_by === user.id) {
        transcriptId = latestTranscript.id;
        console.log(`💾 Using existing transcript_id: ${transcriptId}`);
      } else {
        if (latestTranscript?.id && latestTranscript.created_by !== user.id) {
          console.log(`🔐 RLS: Creating new transcript for user ${user.id} (existing owned by ${latestTranscript.created_by})`);
        }
        
        // Create new transcript if none exists OR if user doesn't own the existing one
        const { data: newTranscript, error: createError } = await supabase
          .from('transcripts')
          .insert({
            video_id: videoId,
            language,
            created_by: user.id
          })
          .select('id')
          .single();
        
        if (createError || !newTranscript) {
          throw new Error(`Failed to create transcript: ${createError?.message}`);
        }
        
        transcriptId = newTranscript.id;
        console.log(`💾 Created new transcript_id: ${transcriptId}`);
      }

      // Prepare segments with exact millisecond timing (NO quantization)
      const rows = segments.map((seg: TranscriptSegment, i: number) => {
        const startMs = seg.start_ms || Math.floor(seg.startTime * 1000);
        const endMs = seg.end_ms || Math.floor(seg.endTime * 1000);
        
        return {
          video_id: videoId,
          language,
          transcript_id: transcriptId,
          idx: seg.idx ?? i,
          // ✅ NEW: Milliseconds (NO quantization)
          start_ms: startMs,
          end_ms: endMs,
          // ✅ Backwards compatibility: keep old seconds fields
          start_time: startMs / 1000,
          end_time: endMs / 1000,
          text: seg.text,
          emphasis: seg.emphasis ?? null,
          pitch: seg.pitch ?? null,
          words_source: seg.words_source || 'asr',
          timing_confidence: seg.timing_confidence,
          speaker_asr_label: seg.speakerAsrLabel || seg.speaker_asr_label,
          character_id: seg.characterId ?? seg.character_id ?? null,
          speaker: seg.speaker ?? null,
          speaker_color: seg.speakerColor ?? null,
          is_off_camera: seg.isOffCamera ?? false,
          
          // ✅ NEW: Emotion fields
          overall_intensity: seg.overall_intensity || seg.overallIntensity,
          overall_pitch: seg.overall_pitch || seg.overallPitch,
          sentiment: seg.sentiment,
          sentiment_confidence: seg.sentiment_confidence || seg.sentimentConfidence,
          emotion_metadata: seg.emotion_metadata || seg.emotionMetadata,
          
          // ✅ Words with duration
          words: seg.words && seg.words.length > 0 ? seg.words.map(w => ({
            text: w.text,
            start_ms: w.start_ms || Math.floor((w.startTime || 0) * 1000),
            end_ms: w.end_ms || Math.floor((w.endTime || 0) * 1000),
            confidence: w.confidence,
            duration_ms: (w.end_ms || Math.floor((w.endTime || 0) * 1000)) - (w.start_ms || Math.floor((w.startTime || 0) * 1000)),
            intensity: w.intensity,
            sentiment: w.sentiment,
            sentimentConfidence: w.sentimentConfidence
          })) : null
        };
      });

      console.log('[saveTranscriptSegments]',
        { transcriptId, rows: rows.length, sample: rows[0] && { start_ms: rows[0].start_ms, sp: rows[0].speaker } });

      // ✅ STRONGER DEDUPE: By idx (stable identity), with priority selection
      const dedupMap = new Map<string, typeof rows[number]>();
      
      for (const r of rows) {
        // Key by (transcriptId, idx) if idx exists, else by (millisecond timing + text)
        const key = r.idx !== undefined && r.idx !== null
          ? `${r.transcript_id}|${r.idx}`
          : `${r.start_ms}|${r.end_ms}|${r.text.trim()}`;
        
        const existing = dedupMap.get(key);
        
        if (!existing) {
          dedupMap.set(key, r);
        } else {
          // Selection priority: character_id > words > longer duration
          const hasChar = r.character_id && !existing.character_id;
          const hasWords = r.words && !existing.words;
          const longerDuration = (r.end_ms - r.start_ms) > (existing.end_ms - existing.start_ms);
          
          if (hasChar || (hasWords && !existing.character_id) || (longerDuration && !existing.character_id && !existing.words)) {
            dedupMap.set(key, r);
          }
        }
      }
      
      const toSave = Array.from(dedupMap.values());

      if (rows.length !== toSave.length) {
        console.log(`🧹 SAVE DEDUPE: Removed ${rows.length - toSave.length} duplicates before upsert (${rows.length} → ${toSave.length})`);
      }

      // ✅ Use conflict key matching the unique constraint: (video_id, language, idx)
      const conflictKey = 'video_id,language,idx';
      
      console.log(`💾 Upserting ${toSave.length} segments with transcript_id: ${transcriptId}, conflict key: ${conflictKey}`);
      
      const { error: upsertError } = await supabase
        .from('transcript_segments_clean')
        .upsert(toSave, {
          onConflict: conflictKey,
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error('❌ [saveTranscriptSegments] upsert failed:', {
          code: upsertError.code,
          message: upsertError.message,
          hint: (upsertError as any).hint,
          details: (upsertError as any).details,
          sampleRows: toSave.slice(0, 3),
          totalRows: toSave.length
        });
        throw new Error(`Failed to save transcript: ${upsertError.message}`);
      }

      // ✅ Clean up stale rows (segments with idx >= current segment count)
      // CRITICAL: Restrict to current transcript_id to prevent cross-transcript deletes
      const { error: deleteError } = await supabase
        .from('transcript_segments_clean')
        .delete()
        .eq('video_id', videoId)
        .eq('language', language)
        .eq('transcript_id', transcriptId)  // ✅ Restrict to current transcript
        .gte('idx', toSave.length);

      if (deleteError) {
        console.warn('⚠️ Failed to delete stale segments:', deleteError.message);
      } else {
        console.log(`🧹 Cleaned up stale segments for transcript_id: ${transcriptId}`);
      }

      console.log('✅ Transcript saved to database:', toSave.length, 'segments');
      
      // Clear any localStorage fallback since we have database record
      localStorage.removeItem(`transcript_${videoId}_${language}`);
      
      // Notify listeners of transcript update (with delay to allow UI to stabilize)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('transcript-segments-updated', { 
          detail: { videoId, language } 
        }));
      }, 300);
      
    } catch (err) {
      console.error('❌ Failed to save transcript to database:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save transcript';
      setError(errorMessage);
      
      // Show user-friendly toast
      if (typeof window !== 'undefined') {
        const { toast } = await import('@/hooks/use-toast');
        toast({
          title: "Save Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      throw err; // Don't use localStorage fallback for authenticated users
    } finally {
      setLoading(false);
    }
  };

  // Load transcript segments from database using view for display
  const loadTranscriptSegments = async (language: string = 'en'): Promise<TranscriptSegment[]> => {
    setLoading(true);
    setError(null);

    try {
      // For authenticated users, always prioritize database
      if (user) {
        // ✅ STEP 1: Find latest transcript for this video+language
        const { data: latestTranscript } = await supabase
          .from('transcripts')
          .select('id')
          .eq('video_id', videoId)
          .eq('language', language)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        // ✅ STEP 2: Load segments from ONE canonical source only (include transcript_id)
        const segQuery = supabase
          .from('transcript_segments_clean')
          .select(`
            id, transcript_id, idx, start_ms, end_ms, text, 
            words, words_source, timing_confidence,
            speaker, speaker_asr_label, speaker_color, character_id, is_off_camera,
            overall_intensity, overall_pitch,
            sentiment, sentiment_confidence, emotion_metadata,
            characters(id, name, color, is_off_camera, type)
          `)
          .eq('video_id', videoId)
          .eq('language', language)
          .order('idx', { ascending: true });
        
        let rows: any[] | null = null;
        
        if (latestTranscript?.id) {
          // Use ONLY the latest transcript's segments
          const { data: segs, error } = await segQuery.eq('transcript_id', latestTranscript.id);
          if (error) throw error;
          rows = segs || [];
          console.log(`🎯 STORAGE: Using latest transcript segments (transcript_id: ${latestTranscript.id}) - Count: ${rows.length}`);
        } else {
          // Use ONLY base video-level segments (no transcript_id)
          const { data: segs, error } = await segQuery.is('transcript_id', null);
          if (error) throw error;
          rows = segs || [];
          console.log(`🗄️ STORAGE: Using base video-level segments (transcript_id IS NULL) - Count: ${rows.length}`);
        }

        if (rows && rows.length > 0) {
          // ✅ STEP 3: Hide legacy duplicates immediately - group by idx or rounded timing
          const groups = new Map<string, any[]>();
          
          for (const row of rows) {
            // Group by idx if present, else by rounded start|end|text
            const k = Number.isFinite(row.idx) ? row.idx : null;
            const key = k !== null 
              ? `idx:${k}`
              : `time:${Math.round(row.start_time * 100) / 100}|${Math.round(row.end_time * 100) / 100}|${row.text.trim()}`;
            
            const arr = groups.get(key) || [];
            arr.push(row);
            groups.set(key, arr);
          }
          
          // Pick best from each group: character_id > has words > longer duration
          const pickBest = (arr: any[]) => {
            return arr.sort((a, b) => 
              (b.character_id ? 1 : 0) - (a.character_id ? 1 : 0) ||
              ((b.words?.length ? 1 : 0) - (a.words?.length ? 1 : 0)) ||
              ((b.end_time - b.start_time) - (a.end_time - a.start_time))
            )[0];
          };
          
          const cleanedRows = Array.from(groups.values())
            .map(pickBest)
            .sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0) || a.start_time - b.start_time);
          
          if (rows.length !== cleanedRows.length) {
            console.log(`🧹 STORAGE DEDUPE: Removed ${rows.length - cleanedRows.length} duplicates (${rows.length} → ${cleanedRows.length})`);
          }

          // Map results with character data + transcript_id
          const CHARACTER_COLORS: Record<string, string> = {
            main: '#3B82F6',
            supporting: '#8B5CF6',
            minor: '#EC4899'
          };

          const segments: TranscriptSegment[] = cleanedRows.map((r: any) => ({
            id: r.id,
            transcriptId: r.transcript_id, // ✅ Include transcript_id
            idx: r.idx,
            text: r.text,
            start_ms: r.start_ms,
            end_ms: r.end_ms,
            startTime: r.start_ms / 1000,  // ✅ Convert to seconds for render
            endTime: r.end_ms / 1000,
            
            // Speaker/Character
            speaker: r.characters?.name ?? r.speaker ?? 'Unassigned',
            speakerColor: r.characters?.color ?? CHARACTER_COLORS[r.characters?.type] ?? '#3B82F6',
            speakerAsrLabel: r.speaker_asr_label ?? null,
            characterId: r.character_id ?? null,
            character_id: r.character_id ?? null,
            isOffCamera: r.characters?.is_off_camera ?? r.is_off_camera ?? false,
            
            // Timing metadata
            words_source: r.words_source || 'asr',
            timing_confidence: r.timing_confidence,
            
            // ✅ NEW: Emotion
            overall_intensity: r.overall_intensity,
            overall_pitch: r.overall_pitch,
            sentiment: r.sentiment,
            sentiment_confidence: r.sentiment_confidence,
            emotion_metadata: r.emotion_metadata,
            
            // Words
            words: r.words ? parseWordsWithDuration(r.words) : undefined
          }));

          console.log(`✅ STORAGE: Loaded ${segments.length} segments (deduplicated)`);
          localStorage.removeItem(`transcript_${videoId}_${language}`);
          return segments;
        }
      }

      // Fallback to localStorage only for unauthenticated users or when no database data exists
      console.log('📁 FALLBACK: Checking localStorage for transcript data');
      const saved = localStorage.getItem(`transcript_${videoId}_${language}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          const segments = (data.segments || []).map((seg: any) => ({
            ...seg,
            id: seg.id || `temp-${Date.now()}-${Math.random()}`
          }));
          console.log('📁 FALLBACK: Loaded from localStorage:', segments.length, 'segments');
          return segments;
        } catch (error) {
          console.error('Failed to parse localStorage transcript:', error);
        }
      }
      
      console.log('📭 No transcript data found for video:', videoId, 'language:', language);
      return [];
    } catch (err) {
      console.error('Failed to load transcript segments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Save audio descriptions to database
  const saveAudioDescriptions = async (descriptions: AudioDescription[], language: string = 'en') => {
    if (!user) {
      // Fallback to localStorage
      const fallbackData = { segments: descriptions, language, timestamp: Date.now() };
      localStorage.setItem(`audioDescription_${videoId}_${language}`, JSON.stringify(fallbackData));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First verify the user owns this video or has access to it
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('user_id, title')
        .eq('id', videoId)
        .single();

      if (videoError || !videoData) {
        throw new Error('Video not found or access denied');
      }

      // Delete existing descriptions for this video and language
      const { error: deleteError } = await supabase
        .from('audio_descriptions')
        .delete()
        .eq('video_id', videoId)
        .eq('language', language);

      if (deleteError) throw deleteError;

      // Insert new descriptions in batches
      const BATCH_SIZE = 100;
      for (let i = 0; i < descriptions.length; i += BATCH_SIZE) {
        const batch = descriptions.slice(i, i + BATCH_SIZE);
        const dbDescriptions = batch.map(desc => ({
          video_id: videoId,
          start_time: desc.startTime,
          end_time: desc.endTime,
          description: desc.description,
          description_type: desc.descriptionType,
          language: language,
          confidence: desc.confidence
        }));

        const { error: insertError } = await supabase
          .from('audio_descriptions')
          .insert(dbDescriptions);

        if (insertError) throw insertError;
      }

      console.log('✅ Audio descriptions saved to database:', descriptions.length, 'descriptions for video:', videoData.title);
    } catch (err) {
      console.error('Failed to save audio descriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to save audio descriptions');
      
      // Fallback to localStorage
      const fallbackData = { segments: descriptions, language, timestamp: Date.now() };
      localStorage.setItem(`audioDescription_${videoId}_${language}`, JSON.stringify(fallbackData));
      console.log('📁 Audio descriptions saved to localStorage as fallback');
    } finally {
      setLoading(false);
    }
  };

  // PHASE 5: Helper to deduplicate audio descriptions
  const deduplicateDescriptions = (descriptions: any[]) => {
    const seen = new Map();
    return descriptions.filter(desc => {
      const key = `${desc.language}-${Math.round(desc.start_time * 10) / 10}-${Math.round(desc.end_time * 10) / 10}-${desc.description?.substring(0, 50)}`;
      if (seen.has(key)) {
        console.warn(`⚠️ Duplicate AD detected and removed: ${desc.language} @ ${desc.start_time}s`);
        return false;
      }
      seen.set(key, true);
      return true;
    });
  };

  // Load audio descriptions from database
  const loadAudioDescriptions = async (language: string = 'en'): Promise<AudioDescription[]> => {
    if (!user) {
      // Fallback to localStorage
      const saved = localStorage.getItem(`audioDescription_${videoId}_${language}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.segments || [];
        } catch (error) {
          console.error('Failed to parse localStorage audio descriptions:', error);
        }
      }
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', language)
        .order('start_time');

      if (error) {
        console.error('Failed to load audio descriptions:', error);
        throw error;
      }

      if (data) {
        // PHASE 5: Apply deduplication
        const dedupedData = deduplicateDescriptions(data);
        
        const descriptions: AudioDescription[] = (dedupedData || []).map(row => ({
          id: row.id,
          startTime: row.start_time,
          endTime: row.end_time,
          description: row.description,
          descriptionType: (row.description_type as 'visual' | 'action' | 'emotion' | 'setting') || 'visual',
          confidence: row.confidence
        }));

        console.log('📢 Loaded audio descriptions from database:', descriptions.length, 'descriptions');
        return descriptions;
      }
      
      return [];
    } catch (err) {
      console.error('Failed to load audio descriptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load audio descriptions');
      
      // Fallback to localStorage
      const saved = localStorage.getItem(`audioDescription_${videoId}_${language}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.segments || [];
        } catch (error) {
          console.error('Failed to parse localStorage audio descriptions:', error);
        }
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Save content to cache
  const saveToCache = async (contentType: ContentCache['contentType'], resultData: any, generationParams?: any, language: string = 'en') => {
    if (!user) {
      // Fallback to localStorage
      const cacheKey = `cache_${videoId}_${contentType}_${language}`;
      const cacheData = { resultData, generationParams, timestamp: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      return;
    }

    try {
      // Upsert cache entry
      const { error } = await supabase
        .from('content_generation_cache')
        .upsert({
          video_id: videoId,
          language,
          content_type: contentType,
          generation_params: generationParams,
          result_data: resultData
        }, {
          onConflict: 'video_id,content_type,language'
        });

      if (error) throw error;

      console.log('💾 Content cached to database:', contentType);
    } catch (err) {
      console.error('Failed to cache content:', err);
      
      // Fallback to localStorage
      const cacheKey = `cache_${videoId}_${contentType}_${language}`;
      const cacheData = { resultData, generationParams, timestamp: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }
  };

  // Load content from cache
  const loadFromCache = async (contentType: ContentCache['contentType'], language: string = 'en'): Promise<any | null> => {
    if (!user) {
      // Fallback to localStorage
      const cacheKey = `cache_${videoId}_${contentType}_${language}`;
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.resultData;
        } catch (error) {
          console.error('Failed to parse localStorage cache:', error);
        }
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('content_generation_cache')
        .select('*')
        .eq('video_id', videoId)
        .eq('content_type', contentType)
        .eq('language', language)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        console.log('💿 Loaded from cache:', contentType);
        return data.result_data;
      }
      return null;
    } catch (err) {
      console.error('Failed to load from cache:', err);
      
      // Fallback to localStorage
      const cacheKey = `cache_${videoId}_${contentType}_${language}`;
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.resultData;
        } catch (error) {
          console.error('Failed to parse localStorage cache:', error);
        }
      }
      return null;
    }
  };

  // Save characters to database
  const saveCharacters = async (characters: any[]): Promise<void> => {
    if (!user) {
      // Fallback to localStorage for unauthenticated users
      localStorage.setItem(`characters_${videoId}`, JSON.stringify(characters));
      return;
    }

    try {
      // Delete existing characters for this video
      await supabase
        .from('characters')
        .delete()
        .eq('video_id', videoId);

      // Insert new characters
      if (characters.length > 0) {
        const { error } = await supabase
          .from('characters')
          .insert(
            characters.map(char => ({
              video_id: videoId,
              name: char.name,
              type: char.type,
              color: char.color,
              is_off_camera: char.isOffCamera || false,
              voice_id: char.voiceId,
              voice_name: char.voiceName,
              voice_type: char.voiceType,
              emphasis: char.emphasis || 'normal',
              pitch: char.pitch || 'normal'
            }))
          );

        if (error) throw error;
      }

      console.log('💾 Characters saved to database');
    } catch (err) {
      console.error('Failed to save characters:', err);
      // Fallback to localStorage
      localStorage.setItem(`characters_${videoId}`, JSON.stringify(characters));
    }
  };

  // Load characters from database
  const loadCharacters = async (): Promise<any[]> => {
    if (!user) {
      // Fallback to localStorage for unauthenticated users
      const saved = localStorage.getItem(`characters_${videoId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Failed to parse localStorage characters:', error);
        }
      }
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('video_id', videoId)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map rows to app shape
      const raw = (data || []).map(char => ({
        id: char.id,
        name: char.name,
        type: char.type,
        color: char.color,
        isOffCamera: char.is_off_camera,
        voiceId: char.voice_id,
        voiceName: char.voice_name,
        voiceType: char.voice_type,
        emphasis: char.emphasis,
        pitch: char.pitch
      }));

      // Deduplicate by name+type (case-insensitive) keeping the latest
      const dedupMap = new Map<string, any>();
      for (const c of raw) {
        const key = `${(c.name || '').toLowerCase()}|${c.type}`;
        if (!dedupMap.has(key)) dedupMap.set(key, c);
      }
      const characters = Array.from(dedupMap.values());

      console.log('💿 Characters loaded from database:', characters.length);
      return characters;
    } catch (err) {
      console.error('Failed to load characters:', err);
      
      // Fallback to localStorage
      const saved = localStorage.getItem(`characters_${videoId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Failed to parse localStorage characters:', error);
        }
      }
      return [];
    }
  };

  // Save speaker mappings to database with UUID validation
  const saveSpeakerMappings = async (mappings: Record<string, string>, language: string = 'en') => {
    if (!user) {
      // Fallback to localStorage for unauthenticated users
      localStorage.setItem(`speaker-mappings-${videoId}`, JSON.stringify(mappings));
      return;
    }

    try {
      // Load all characters for this video to resolve names to UUIDs
      const { data: chars, error: charsError } = await supabase
        .from('characters')
        .select('id, name')
        .eq('video_id', videoId);
      
      if (charsError) throw charsError;
      
      const nameToId = new Map(chars?.map(c => [c.name, c.id]) || []);
      
      // Build canonical mapping with both ASR labels and full names
      const canonicalMappings: Record<string, string> = {};
      const skipped: string[] = [];
      
      Object.entries(mappings).forEach(([speaker, characterName]) => {
        const characterId = nameToId.get(characterName);
        if (!characterId) {
          console.warn(`⚠️ Character "${characterName}" not found, skipping mapping for "${speaker}"`);
          skipped.push(speaker);
          return;
        }
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(characterId)) {
          console.error(`❌ Invalid UUID for character "${characterName}":`, characterId);
          skipped.push(speaker);
          return;
        }
        
        // Extract ASR label (A/B/C) from "Speaker A" or use as-is if already just "A"
        const asrLabel = speaker.replace(/^Speaker\s+/, '');
        
        // Store both forms: "A" -> uuid AND "Speaker A" -> uuid
        canonicalMappings[asrLabel] = characterId;
        canonicalMappings[speaker] = characterId;
      });
      
      if (skipped.length > 0) {
        console.warn('⚠️ Skipped invalid mappings for:', skipped.join(', '));
      }
      
      console.log('📝 Canonical mappings to save:', canonicalMappings);

      // Use upsert with the composite key (video_id, language)
      const { error: upsertError } = await supabase
        .from('speaker_mappings')
        .upsert({
          video_id: videoId,
          language,
          mappings: canonicalMappings
        }, {
          onConflict: 'video_id,language'
        });

      if (upsertError) throw upsertError;

      console.log('✅ Speaker mappings saved with validated UUIDs:', canonicalMappings);
    } catch (err) {
      console.error('Failed to save speaker mappings:', err);
      // Fallback to localStorage
      localStorage.setItem(`speaker-mappings-${videoId}`, JSON.stringify(mappings));
    }
  };

  // Load speaker mappings from database
  const loadSpeakerMappings = async (language: string = 'en'): Promise<Record<string, string>> => {
    if (!user) {
      // Fallback to localStorage for unauthenticated users
      const saved = localStorage.getItem(`speaker-mappings-${videoId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Failed to parse localStorage speaker mappings:', error);
        }
      }
      return {};
    }

    try {
      // @ts-ignore - Temporary workaround for Supabase types issue after migration
      const result: any = await supabase
        .from('speaker_mappings')
        .select('mappings')
        .eq('video_id', videoId)
        .eq('language', language)
        .maybeSingle();
      
      const { data, error } = result;

      if (error && error.code !== 'PGRST116') throw error;

      const mappings = (data?.mappings as Record<string, string>) || {};
      console.log('💿 Speaker mappings loaded from database:', mappings);
      return mappings;
    } catch (err) {
      console.error('Failed to load speaker mappings:', err);
      
      // Fallback to localStorage
      const saved = localStorage.getItem(`speaker-mappings-${videoId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Failed to parse localStorage speaker mappings:', error);
        }
      }
      return {};
    }
  };

  // Helper to check if DB has transcript data
  const hasTranscriptInDB = async (language: string = 'en'): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { count, error } = await supabase
        .from('transcript_segments_clean')
        .select('id', { count: 'exact', head: true })
        .eq('video_id', videoId)
        .eq('language', language)
        .limit(1);
      
      if (error) throw error;
      return (count ?? 0) > 0;
    } catch (err) {
      console.error('Failed to check DB for transcript:', err);
      return false;
    }
  };

  // Update a single segment's speaker/character (preserves word timing)
  const updateSegmentIdentity = async (opts: {
    segmentId?: string;
    transcriptId?: string | null; // ✅ NEW: transcript_id for precise targeting
    videoId?: string;
    language?: string;
    idx?: number;
    characterId?: string;
    characterName?: string;
  }) => {
    const { segmentId, transcriptId, videoId: vid, language = 'en', idx, characterId, characterName } = opts;

    console.log('🎯 updateSegmentIdentity called with:', { segmentId, transcriptId, idx, characterId, characterName });

    // Optional: guard if frozen
    try {
      const { data: frozen } = await supabase.rpc('is_frozen', {
        p_video_id: vid || videoId,
        p_language: language
      });
      if (frozen) {
        throw new Error('Transcript is frozen. Unfreeze to change speakers.');
      }
    } catch (err) {
      // If is_frozen doesn't exist or fails, continue
      console.warn('Freeze check skipped:', err);
    }

    const { error } = await supabase.rpc('update_segment_identity', {
      p_segment_id: segmentId ?? null,
      p_video_id: vid || videoId,
      p_language: language,
      p_idx: idx ?? null,
      p_character_id: characterId ?? null,
      p_character_name: characterName ?? null,
    });

    if (error) {
      console.error('❌ updateSegmentIdentity RPC failed:', error);
      throw error;
    }
    console.log('✅ updateSegmentIdentity RPC succeeded');
  };

  return {
    loading,
    error,
    saveTranscriptSegments,
    loadTranscriptSegments,
    saveAudioDescriptions,
    loadAudioDescriptions,
    saveCharacters,
    loadCharacters,
    saveSpeakerMappings,
    loadSpeakerMappings,
    saveToCache,
    loadFromCache,
    hasTranscriptInDB,
    updateSegmentIdentity  // ✅ RPC wrapper for safe speaker updates
  };
};