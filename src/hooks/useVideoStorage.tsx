import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface WordData {
  text: string;
  startTime?: number;
  endTime?: number;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: 'high' | 'low' | 'normal';
}

export interface TranscriptSegment {
  id?: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  speakerColor?: string;
  emphasis?: 'normal' | 'loud' | 'quiet' | 'yelling';
  pitch?: 'normal' | 'high' | 'low';
  words?: WordData[];
  isOffCamera?: boolean;
  segmentType?: 'dialogue' | 'soundeffect' | 'music';
  confidence?: number;
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
  const loadingCache = useRef(new Map<string, any>());

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

  // Save transcript segments to database with proper transaction handling
  const saveTranscriptSegments = async (segments: TranscriptSegment[], language: string = 'en') => {
    if (!user) {
      console.warn('User not authenticated, falling back to localStorage');
      const fallbackData = { segments, language, timestamp: Date.now() };
      localStorage.setItem(`transcript_${videoId}_${language}`, JSON.stringify(fallbackData));
      return;
    }

    setLoading(true);
    setError(null);

    // Sanitize values to satisfy DB constraints
    const sanitizeEmphasis = (
      e: TranscriptSegment['emphasis']
    ): 'normal' | 'loud' | 'quiet' => {
      if (e === 'loud' || e === 'quiet' || e === 'normal') return e;
      if (e === 'yelling') return 'loud';
      return 'normal';
    };
    const sanitizePitch = (
      p: TranscriptSegment['pitch']
    ): 'normal' | 'high' | 'low' => (p === 'high' || p === 'low' ? p : 'normal');
    const sanitizeSegmentType = (
      t: TranscriptSegment['segmentType']
    ): 'dialogue' | 'soundeffect' | 'music' =>
      t === 'soundeffect' || t === 'music' ? t : 'dialogue';

    const buildDbSegments = () =>
      segments.map((segment, index) => ({
        idx: index,
        text: segment.text,
        startTime: segment.startTime,
        endTime: segment.endTime,
        speaker: segment.speaker || 'Speaker',
        speakerColor: segment.speakerColor || '#3B82F6',
        emphasis: sanitizeEmphasis(segment.emphasis || 'normal'),
        pitch: sanitizePitch(segment.pitch || 'normal'),
        words: segment.words ? JSON.parse(JSON.stringify(segment.words)) : null,
        isOffCamera: !!segment.isOffCamera,
        segmentType: sanitizeSegmentType(segment.segmentType || 'dialogue'),
        confidence: segment.confidence ?? 0.95,
      }));

    try {
      // Prefer RPC upsert if available
      console.log(
        '💾 Saving transcript segments with word-level data:',
        segments.length,
        'segments'
      );

      const dbSegments = buildDbSegments();

      const { error } = await supabase.rpc('upsert_transcript_segments', {
        p_video_id: videoId,
        p_language: language,
        p_created_by: user.id,
        p_segments: dbSegments,
      });

      if (error) throw error;

      console.log(
        '✅ Transcript segments with word-level data saved to database:',
        segments.length,
        'segments'
      );

      // Mirror to localStorage for robust fallback
      try {
        const fallbackData = { segments, language, timestamp: Date.now() };
        localStorage.setItem(`transcript_${videoId}_${language}`, JSON.stringify(fallbackData));
      } catch {}

    } catch (err) {
      console.warn('RPC upsert failed, attempting direct save...', err);
      try {
        // Verify ownership
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('user_id, title')
          .eq('id', videoId)
          .maybeSingle();

        if (videoError || !videoData || videoData.user_id !== user.id) {
          throw videoError || new Error('Video not found or access denied');
        }

        // Delete existing segments for this video/language
        const { error: deleteError } = await supabase
          .from('transcript_segments')
          .delete()
          .eq('video_id', videoId)
          .eq('language', language);
        if (deleteError) throw deleteError;

        // Insert new segments in batches
        const BATCH_SIZE = 100;
        const rows = segments.map((segment, index) => ({
          video_id: videoId,
          language,
          start_time: segment.startTime,
          end_time: segment.endTime,
          text: segment.text,
          idx: index,
          speaker: segment.speaker || 'Speaker',
          speaker_color: segment.speakerColor || '#3B82F6',
          emphasis: sanitizeEmphasis(segment.emphasis || 'normal'),
          pitch: sanitizePitch(segment.pitch || 'normal'),
          words: segment.words ? JSON.parse(JSON.stringify(segment.words)) : null,
          is_off_camera: !!segment.isOffCamera,
          segment_type: sanitizeSegmentType(segment.segmentType || 'dialogue'),
          confidence: segment.confidence ?? 0.95,
        }));

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const { error: insertError } = await supabase
            .from('transcript_segments')
            .insert(batch);
          if (insertError) throw insertError;
        }

        console.log(
          '✅ Transcript segments saved via direct table operations:',
          segments.length
        );

        // Mirror to localStorage for robust fallback
        try {
          const fallbackData = { segments, language, timestamp: Date.now() };
          localStorage.setItem(`transcript_${videoId}_${language}`, JSON.stringify(fallbackData));
        } catch {}

      } catch (innerErr) {
        console.error('Direct save also failed:', innerErr);
        setError(
          innerErr instanceof Error ? innerErr.message : 'Failed to save transcript'
        );

        // Fallback to localStorage
        const fallbackData = { segments, language, timestamp: Date.now() };
        localStorage.setItem(
          `transcript_${videoId}_${language}`,
          JSON.stringify(fallbackData)
        );
        console.log('📁 Transcript segments saved to localStorage as fallback');

        // Re-throw the error so the calling code knows it failed
        throw innerErr;
      }
    } finally {
      setLoading(false);
    }
  };
  // Load transcript segments from database
  const loadTranscriptSegments = async (language: string = 'en'): Promise<TranscriptSegment[]> => {
    const cacheKey = `transcript_segments_${videoId}_${language}`;
    
    // Check if we already have this data to prevent duplicates
    if (loadingCache.current.has(cacheKey)) {
      console.log(`🔄 Using cached transcript for ${videoId} in ${language}, avoiding duplicate load...`);
      return loadingCache.current.get(cacheKey) || [];
    }

    if (!user) {
      // Fallback to localStorage
      const saved = localStorage.getItem(`transcript_${videoId}_${language}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          const segments = data.segments || [];
          loadingCache.current.set(cacheKey, segments);
          return segments;
        } catch (error) {
          console.error('Failed to parse localStorage transcript:', error);
        }
      }
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', language)
        .order('start_time');

      if (error) throw error;

      let rows = data || [];

      // Fallback: if no rows for requested language, load any available language to avoid empty state
      if (rows.length === 0) {
        const { data: anyLangData, error: anyLangError } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('video_id', videoId)
          .order('start_time');
        if (!anyLangError && anyLangData && anyLangData.length > 0) {
          rows = anyLangData;
          console.warn(`⚠️ No transcript for language "${language}". Loaded ${anyLangData.length} segments from available language instead.`);
        }
      }

      const segments: TranscriptSegment[] = (rows || []).map(row => ({
        id: row.id,
        text: row.text,
        startTime: row.start_time,
        endTime: row.end_time,
        speaker: row.speaker,
        speakerColor: row.speaker_color,
        emphasis: (row.emphasis as 'normal' | 'loud' | 'quiet' | 'yelling') || 'normal',
        pitch: (row.pitch as 'normal' | 'high' | 'low') || 'normal',
        words: row.words ? parseWordsData(row.words) : undefined,
        isOffCamera: row.is_off_camera,
        segmentType: (row.segment_type as 'dialogue' | 'soundeffect' | 'music') || 'dialogue',
        confidence: row.confidence
      }));

      // Fallback to latest local backup if still empty
      let finalSegments: TranscriptSegment[] = segments;
      if (finalSegments.length === 0) {
        try {
          let latest: { segments: TranscriptSegment[]; timestamp: number } | null = null;
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(`transcript_${videoId}_`)) {
              const raw = localStorage.getItem(k);
              if (!raw) continue;
              const parsed = JSON.parse(raw);
              const ts = parsed.timestamp || 0;
              if (!latest || ts > latest.timestamp) {
                latest = { segments: parsed.segments || [], timestamp: ts };
              }
            }
          }
          if (latest && latest.segments && latest.segments.length > 0) {
            finalSegments = latest.segments;
            console.warn(`⚠️ Using localStorage transcript backup with ${finalSegments.length} segments`);
          }
        } catch (e) {
          console.error('Local transcript fallback failed:', e);
        }
      }

      // Cache the result to prevent duplicate loading
      loadingCache.current.set(cacheKey, finalSegments);
      
      console.log('📖 Loaded transcript segments from database:', finalSegments.length, 'segments');
      return finalSegments;
    } catch (err) {
      console.error('Failed to load transcript segments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
      
      // Fallback to localStorage
      const saved = localStorage.getItem(`transcript_${videoId}_${language}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.segments || [];
        } catch (error) {
          console.error('Failed to parse localStorage transcript:', error);
        }
      }
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

      if (error) throw error;

      const descriptions: AudioDescription[] = (data || []).map(row => ({
        id: row.id,
        startTime: row.start_time,
        endTime: row.end_time,
        description: row.description,
        descriptionType: (row.description_type as 'visual' | 'action' | 'emotion' | 'setting') || 'visual',
        confidence: row.confidence
      }));

      console.log('📢 Loaded audio descriptions from database:', descriptions.length, 'descriptions');
      return descriptions;
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

  // Save speaker mappings to database
  const saveSpeakerMappings = async (mappings: Record<string, string>, language: string = 'en') => {
    if (!user) {
      // Fallback to localStorage for unauthenticated users
      localStorage.setItem(`speaker-mappings-${videoId}`, JSON.stringify(mappings));
      return;
    }

    try {
      // Ensure idempotent save without relying on a DB unique constraint
      const { data: existing, error: selectError } = await supabase
        .from('speaker_mappings')
        .select('id')
        .eq('video_id', videoId)
        .eq('language', language)
        .eq('created_by', user.id)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') throw selectError;

      let opError = null as any;
      if (existing?.id) {
        const { error } = await supabase
          .from('speaker_mappings')
          .update({ mappings })
          .eq('id', existing.id);
        opError = error;
      } else {
        const { error } = await supabase
          .from('speaker_mappings')
          .insert({
            video_id: videoId,
            language,
            mappings,
            created_by: user.id,
          });
        opError = error;
      }

      if (opError) throw opError;

      // Mirror to localStorage so the AxessiblePlayer final mapping gate can use it instantly
      try {
        localStorage.setItem(`speaker-mappings-${videoId}`, JSON.stringify(mappings));
      } catch {}

      console.log('💾 Speaker mappings saved to database');
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
      const { data, error } = await supabase
        .from('speaker_mappings')
        .select('mappings, updated_at')
        .eq('video_id', videoId)
        .eq('language', language)
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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

  return {
    loading,
    error,
    saveTranscriptSegments,
    loadTranscriptSegments,
    // Force a fresh DB load (bypasses in-memory cache)
    loadTranscriptSegmentsFresh: async (language: string = 'en') => {
      const cacheKey = `transcript_segments_${videoId}_${language}`;
      loadingCache.current.delete(cacheKey);
      return await loadTranscriptSegments(language);
    },
    saveAudioDescriptions,
    loadAudioDescriptions,
    saveCharacters,
    loadCharacters,
    saveSpeakerMappings,
    loadSpeakerMappings,
    saveToCache,
    loadFromCache
  };
};