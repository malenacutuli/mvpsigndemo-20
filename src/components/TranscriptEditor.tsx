/**
 * TranscriptEditor Component
 * 
 * CRITICAL: Database-First Architecture for Cross-Device Sync
 * ============================================================
 * 
 * This component uses the Supabase database as the single source of truth for all
 * transcript data. All changes are immediately saved to the database to ensure
 * seamless synchronization across devices and browser sessions.
 * 
 * Key Design Principles:
 * - All transcript segments are saved to `transcript_segments_clean` table via `saveTranscriptData()`
 * - All segments are loaded from database via `loadTranscriptSegments()`
 * - localStorage is only used as a read-through cache for character colors
 * - No sessionStorage is used to prevent stale data
 * - Changes trigger `character-colors-updated` events for real-time UI sync
 * 
 * Cross-Device Behavior:
 * - User edits on Device A → Saved to database → Visible on Device B after refresh/load
 * - Character assignments synced via `CICharacterSync` component
 * - Translations saved per-language in database for reuse
 * 
 * @see CICharacterSync for character color synchronization
 * @see useVideoStorage for database operations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Mic, Globe, Download, Edit, Save, X, Plus, Clock, User, Palette, Volume2, Users, Type, Zap, Upload, HandHelping } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { saveTranscript, loadTranscript, type VideoTranscript } from '@/lib/videoStorage';
import { CharacterManager } from './CharacterManager';
import { WordLevelEditor, type WordData } from './WordLevelEditor';
import { SignLanguageUploader } from './SignLanguageUploader';
import { useVideoStorage, type TranscriptSegment as StorageTranscriptSegment } from '@/hooks/useVideoStorage';
import { VocalIntensityIndicator } from './VocalIntensityIndicator';
import { useVocalIntensityAnalysis } from '@/hooks/useVocalIntensityAnalysis';

// Captions with Intention - Official Color Palette
const CI_MAIN_COLORS = [
  '#E5E517', // Yellow (Main)
  '#17E5E5', // Cyan (Main) 
  '#E51717', // Red (Main)
  '#17E517', // Green (Main)
  '#E517E5', // Magenta (Main)
  '#E58017', // Orange (Main)
];

const CI_SUPPORTING_COLORS = [
  '#E85C2E', '#47C2EB', '#EBC247', '#5E82ED', '#C2EB47', '#8C6BED',
  '#82ED5E', '#CC6BED', '#47EB70', '#EB47C2', '#5EEDC9', '#ED5E82'
];

const PRIORITY_COLORS = [...CI_MAIN_COLORS, ...CI_SUPPORTING_COLORS];

// Get next CI color for speaker assignment
const getNextCISpeakerColor = (index: number): string => {
  return PRIORITY_COLORS[index % PRIORITY_COLORS.length];
};

// ✅ FIX: Normalize speaker color based on speaker name (not DB color)
const getNormalizedSpeakerColor = (speakerName: string | undefined): string => {
  if (!speakerName) return '#9CA3AF'; // Gray for undefined
  
  // Generate deterministic color from speaker name
  const hash = speakerName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return PRIORITY_COLORS[Math.abs(hash) % PRIORITY_COLORS.length];
};

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  speakerColor?: string;
  speakerAsrLabel?: string; // Original AssemblyAI label (A, B, C)
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: 'high' | 'low' | 'normal';
  words?: WordData[]; // Add word-level data support
  vocal_intensity?: 'whisper' | 'normal' | 'yell' | 'shout';
  intensity_confidence?: number;
  auto_styling?: any;
  characterId?: string | null; // Link to characters table (camelCase for frontend)
  character_id?: string | null; // Link to characters table (snake_case for database)
}

interface TranscriptEditorProps {
  videoUrl: string;
  videoId: string;
  initialLanguage?: string;
  onTranscriptUpdate?: (segments: TranscriptSegment[], language: string) => void;
  onContentGenerated?: (content: {
    captions: any[];
    dubbing: any;
  }) => void;
  onLanguageChange?: (language: string) => void;
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  videoUrl,
  videoId,
  initialLanguage = 'en',
  onTranscriptUpdate,
  onContentGenerated,
  onLanguageChange
}) => {
  const [originalTranscript, setOriginalTranscript] = useState<TranscriptSegment[]>([]);
  const [editingTranscript, setEditingTranscript] = useState<TranscriptSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  
  // Sync selectedLanguage with initialLanguage prop changes ONLY on mount, not during edits
  useEffect(() => {
    if (initialLanguage && editingTranscript.length === 0) {
      console.log('🌐 TranscriptEditor: Initial language set to', initialLanguage);
      setSelectedLanguage(initialLanguage);
    }
  }, []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editSpeaker, setEditSpeaker] = useState('');
  const [editSpeakerColor, setEditSpeakerColor] = useState('');
  const [editEmphasis, setEditEmphasis] = useState<'loud' | 'quiet' | 'normal' | 'yelling'>('normal');
  const [editPitch, setEditPitch] = useState<'high' | 'low' | 'normal'>('normal');
  const [editWords, setEditWords] = useState<WordData[]>([]);
  const [useWordLevelEditing, setUseWordLevelEditing] = useState(false);
  const [showIntensity, setShowIntensity] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableCharacters, setAvailableCharacters] = useState<Array<{
    id: string;
    name: string;
    color: string;
    type?: string;
  }>>([]);
  const [editApplyToAll, setEditApplyToAll] = useState(false);
  const [originalSpeaker, setOriginalSpeaker] = useState<string>('');
  const [originalColor, setOriginalColor] = useState<string>('');
  const { toast } = useToast();
  const { saveTranscriptSegments, loadTranscriptSegments, loadCharacters, loadSpeakerMappings, saveSpeakerMappings, updateSegmentIdentity } = useVideoStorage(videoId);
  const { isAnalyzing, analyzeVocalIntensity } = useVocalIntensityAnalysis();

  // ✅ FIX #4: Auto-save timer - saves changes every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      const hasChanges = JSON.stringify(editingTranscript) !== JSON.stringify(originalTranscript);
      
      if (hasChanges && editingTranscript.length > 0) {
        console.log('⏰ FIX #4: Auto-save timer triggered - saving unsaved changes...');
        
        try {
          await saveTranscriptData(editingTranscript, selectedLanguage);
          console.log('✅ Auto-save successful');
          
          // Update originalTranscript to prevent re-saving same changes
          setOriginalTranscript([...editingTranscript]);
        } catch (error) {
          console.error('❌ Auto-save failed:', error);
        }
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [editingTranscript, originalTranscript, selectedLanguage]);

  // ✅ FIX #3: Load characters from DATABASE (not localStorage)
  useEffect(() => {
    const loadCharactersFromStorage = async () => {
      try {
        console.log('📋 FIX #3: Loading characters from database for video:', videoId);
        
        // Load directly from database for accuracy
        const { data: characters, error } = await supabase
          .from('characters')
          .select('id, name, color, type')
          .eq('video_id', videoId)
          .order('name', { ascending: true });
        
        if (error) {
          console.error('❌ Failed to load characters:', error);
          return;
        }
        
        console.log(`✅ Loaded ${characters?.length || 0} characters for dropdown:`, characters?.map(c => c.name));
        
        if (characters) {
          setAvailableCharacters(characters);
        }
      } catch (error) {
        console.error('❌ Failed to load characters:', error);
      }
    };
    
    loadCharactersFromStorage();
  }, [videoId]); // ✅ Added videoId dependency

  // ✅ FIX #3B: Refresh dropdown when characters are updated (direct database query)
  useEffect(() => {
    const handleCharactersUpdated = async (e: any) => {
      try {
        console.log('🔄 FIX #3B: Character list updated, refreshing dropdown...');
        
        // Load directly from database for accuracy
        const { data: characters, error } = await supabase
          .from('characters')
          .select('id, name, color')
          .eq('video_id', videoId)
          .order('name', { ascending: true });
        
        if (error) {
          console.error('❌ Failed to refresh characters:', error);
          return;
        }
        
        if (characters) {
          setAvailableCharacters(characters);
          console.log(`✅ Dropdown refreshed with ${characters.length} characters`);
        }
      } catch (err) {
        console.error('❌ Failed to refresh characters after update event:', err);
      }
    };

    window.addEventListener('character-colors-updated', handleCharactersUpdated as EventListener);
    return () => window.removeEventListener('character-colors-updated', handleCharactersUpdated as EventListener);
  }, [videoId]);
  // Load saved transcript from DATABASE when video or language changes
  useEffect(() => {
    const loadTranscriptData = async () => {
      // PHASE 4: Resolve 'auto' to actual language before querying
      let effectiveLanguage = selectedLanguage;
      
      if (selectedLanguage === 'auto') {
        console.log('⚠️ "auto" language detected - finding actual segment language');
        
        // Find the actual language stored in segments
        const { data: languageCheck } = await supabase
          .from('transcript_segments_clean')
          .select('language')
          .eq('video_id', videoId)
          .limit(1)
          .single();
        
        if (languageCheck?.language) {
          effectiveLanguage = languageCheck.language;
          setSelectedLanguage(effectiveLanguage); // Update UI
          console.log(`✅ Found actual language: ${effectiveLanguage}`);
        } else {
          effectiveLanguage = 'en'; // Fallback
          setSelectedLanguage(effectiveLanguage);
          console.log('⚠️ No segments found - defaulting to "en"');
        }
      }
      
      console.log('📥 Loading transcript from DATABASE for', videoId, 'language:', effectiveLanguage);
      
      // Warn if user has unsaved edits
      if (editingTranscript.length > 0 && originalTranscript.length > 0) {
        const hasChanges = JSON.stringify(editingTranscript) !== JSON.stringify(originalTranscript);
        if (hasChanges) {
          console.warn('⚠️ Language changed with unsaved edits - changes may be lost');
          toast({
            title: "Unsaved changes",
            description: "Your edits will be lost if you don't save them first",
            variant: "destructive"
          });
        }
      }
      
      // Always fetch from database for cross-device sync
      const segments = await loadTranscriptSegments(effectiveLanguage);
      if (segments.length > 0) {
        // ✅ Load characters to enrich segment display
        const { data: characters } = await supabase
          .from('characters')
          .select('id, name, color')
          .eq('video_id', videoId);
        
        const characterMap = new Map(characters?.map(c => [c.id, c]) || []);
        
        const convertedSegments = segments.map(seg => {
          // ✅ If segment has character_id, use character name and color
          const characterId = (seg as any).characterId || (seg as any).character_id;
          const character = characterId ? characterMap.get(characterId) : null;
          
          return {
            ...seg,
            id: seg.id || `segment-${Date.now()}-${Math.random()}`,
            // Override speaker/color with character data if linked
            speaker: character?.name || seg.speaker,
            speakerColor: character?.color || seg.speakerColor,
            speakerAsrLabel: seg.speakerAsrLabel || (seg as any).speaker_asr_label, // ✅ Preserve ASR label
            characterId: characterId
          };
        });
        
        setEditingTranscript(convertedSegments);
        setOriginalTranscript(convertedSegments);
        onTranscriptUpdate?.(convertedSegments, effectiveLanguage);
        console.log('✅ Loaded', segments.length, 'segments from database');
      } else {
        console.log('ℹ️ No segments found in database for language:', effectiveLanguage);
      }
    };
    loadTranscriptData();
  }, [videoId, selectedLanguage]);

  // Save transcript to DATABASE - source of truth for cross-device sync
  const saveTranscriptData = async (segments: TranscriptSegment[], language: string) => {
    console.log('💾 TRANSCRIPT EDITOR: Saving', segments.length, 'segments to DATABASE for video:', videoId, 'language:', language);
    
    const storageSegments: StorageTranscriptSegment[] = segments.map((segment, index) => {
      // ✅ FIX #1: Properly extract character_id from segment
      const charId = (segment as any).character_id || (segment as any).characterId || null;
      
      console.log(`💾 Segment ${index}: speaker="${segment.speaker}", character_id="${charId}"`);
      
      return {
        idx: index,
        text: segment.text,
        startTime: segment.startTime,
        endTime: segment.endTime,
        speaker: segment.speaker,
        speakerColor: segment.speakerColor,
        emphasis: segment.emphasis,
        pitch: segment.pitch,
        words: segment.words,
        isOffCamera: false,
        segmentType: 'dialogue' as const,
        confidence: 0.9,
        characterId: charId
      };
    });
    
    console.log(`💾 Saving ${storageSegments.length} segments with ${storageSegments.filter(s => s.characterId).length} character links`);
    
    try {
      await saveTranscriptSegments(storageSegments, language);
      
      // CRITICAL: Update speaker mappings when speaker names change
      // This ensures character-to-speaker mapping persists across all languages
      await updateSpeakerMappingsFromSegments(segments, language);
      
      console.log('✅ TRANSCRIPT EDITOR: Successfully saved to DATABASE with speaker mappings - synced across all devices');
      
      // Update local state to reflect saved changes
      setOriginalTranscript([...segments]);
      
      toast({
        title: "Changes saved",
        description: "Your transcript is now synced across all devices"
      });
    } catch (error) {
      console.error('❌ TRANSCRIPT EDITOR: Database save failed:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update speaker mappings based on current segment speakers
  const updateSpeakerMappingsFromSegments = async (segments: TranscriptSegment[], language: string) => {
    try {
      // Extract unique speakers from segments
      const uniqueSpeakers = Array.from(new Set(segments.map(s => s.speaker).filter(Boolean)));
      
      // Load existing mappings
      const existingMappings = await loadSpeakerMappings(language);
      
      // Create updated mappings - preserve existing, add new identity mappings for any new speakers
      const updatedMappings: Record<string, string> = { ...existingMappings };
      
      for (const speaker of uniqueSpeakers) {
        if (speaker && !updatedMappings[speaker]) {
          // New speaker detected - create identity mapping
          updatedMappings[speaker] = speaker;
        }
      }
      
      // Save updated mappings for this language
      await saveSpeakerMappings(updatedMappings, language);
      
      console.log('🔄 Updated speaker mappings for', uniqueSpeakers.length, 'speakers in', language);
      
      // CRITICAL: Sync speaker info across ALL languages for consistency
      await syncSpeakerInfoAcrossLanguages(segments, language);
    } catch (error) {
      console.error('Failed to update speaker mappings:', error);
      // Don't throw - this is non-critical for transcript saving
    }
  };

  // ✅ FIX #5: Sync speaker names, colors, AND character_id across all transcript languages using TIME MATCHING
  const syncSpeakerInfoAcrossLanguages = async (sourceSegments: TranscriptSegment[], sourceLanguage: string) => {
    try {
      console.log(`🌐 FIX #5: Starting cross-language character sync from ${sourceLanguage}`);
      
      // Get all languages that have transcripts for this video
      const { data: existingLanguages } = await supabase
        .from('transcript_segments_clean')
        .select('language')
        .eq('video_id', videoId)
        .neq('language', sourceLanguage);

      if (!existingLanguages || existingLanguages.length === 0) {
        console.log('ℹ️ No other languages to sync');
        return;
      }

      const languagesToUpdate = Array.from(new Set(existingLanguages.map(l => l.language)));
      console.log(`🎯 Syncing to ${languagesToUpdate.length} languages: ${languagesToUpdate.join(', ')}`);

      // For each target language, sync speaker info based on time matching
      for (const targetLang of languagesToUpdate) {
        console.log(`🔄 Syncing ${sourceLanguage} → ${targetLang}`);
        
        // Load all segments for target language
        const { data: targetSegments, error: loadError } = await supabase
          .from('transcript_segments_clean')
          .select('id, start_time, end_time, speaker, speaker_color, character_id')
          .eq('video_id', videoId)
          .eq('language', targetLang)
          .order('start_time', { ascending: true });
        
        if (loadError || !targetSegments) {
          console.error(`❌ Failed to load ${targetLang} segments:`, loadError);
          continue;
        }
        
        let updated = 0;
        
        // Match each source segment to target segments by timestamp overlap
        for (const sourceSegment of sourceSegments) {
          // Skip if source segment doesn't have character mapping
          const characterId = (sourceSegment as any).characterId || (sourceSegment as any).character_id;
          if (!characterId) {
            continue;
          }
          
          // Find matching target segments (allow 0.5s tolerance for timestamp differences)
          const matchingTargets = targetSegments.filter(target => {
            const overlap = Math.min(target.end_time, sourceSegment.endTime) - 
                           Math.max(target.start_time, sourceSegment.startTime);
            return overlap > 0.5; // At least 0.5 seconds of overlap
          });
          
          // Update all matching segments
          for (const target of matchingTargets) {
            const { error: updateError } = await supabase
              .from('transcript_segments_clean')
              .update({
                speaker: sourceSegment.speaker,
                speaker_color: sourceSegment.speakerColor,
                character_id: characterId
              })
              .eq('id', target.id);
            
            if (!updateError) {
              updated++;
              console.log(`✅ Updated segment at ${target.start_time}s: "${target.speaker}" → "${sourceSegment.speaker}" (character_id: ${characterId})`);
            } else {
              console.error(`❌ Failed to update segment ${target.id}:`, updateError);
            }
          }
        }
        
        console.log(`✅ Synced ${updated} segments in ${targetLang}`);
      }
      
      console.log('✅ Cross-language character sync complete');
      
    } catch (error) {
      console.error('❌ Failed to sync speaker info across languages:', error);
    }
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
  ];

  // Normalize translated chunks that accidentally repeat sentences (e.g., triplicated output)
  const dedupeSentences = (text: string): string => {
    try {
      if (!text) return text;
      const parts = text
        .split(/(?<=[.!?])\s+/)
        .map(p => p.trim())
        .filter(Boolean);
      const seen = new Set<string>();
      const out: string[] = [];
      for (const p of parts) {
        const norm = p.toLowerCase();
        if (!seen.has(norm)) {
          seen.add(norm);
          out.push(p);
        }
      }
      return out.join(' ');
    } catch {
      return text;
    }
  };

  // Generate original transcript and save to database with proper transcript record
  const generateOriginalTranscript = async () => {
    // Check for existing transcript before re-extracting
    const existingSegments = await loadTranscriptSegments(selectedLanguage);
    
    if (existingSegments.length > 0) {
      const confirmed = window.confirm(
        `⚠️ This video already has a transcript with ${existingSegments.length} segments in ${selectedLanguage}.\n\n` +
        `Re-extracting will:\n` +
        `• Cost API credits ($0.04-$1.50 depending on video size)\n` +
        `• Overwrite any custom edits you've made\n` +
        `• Take 2-5 minutes to complete\n\n` +
        `Continue with re-extraction?`
      );
      
      if (!confirmed) {
        console.log('🚫 Re-extraction cancelled by user');
        return;
      }
    }
    
    setIsGenerating(true);
    try {
      console.log('🌐 TRANSCRIPT EDITOR: Extracting transcript in language:', selectedLanguage);
      const response = await supabase.functions.invoke('transcribe', {
        body: { 
          videoUrl: videoUrl,
          videoId: videoId, // Pass videoId for database saving
          rangeBytes: 200000000, // Increased to 200MB for full transcript extraction
          language: selectedLanguage, // Use selected language from dropdown
          fullTranscript: true, // Request complete transcript
          wordTimestamps: true, // Request word-level timing
          maxDurationMinutes: 60 // Index up to 60 minutes by default
        }
      });

      // Check for errors - the response might have error info in data even if no error object
      if (response.error || response.data?.error) {
        let errorMessage = 'Transcription failed';
        let errorDetails = '';
        
        // If there's response data with error info, use that
        if (response.data?.error) {
          errorMessage = response.data.error;
          errorDetails = response.data.details || '';
          
          // Add size info if available
          if (response.data.sizeMB && response.data.maxSizeMB) {
            errorDetails = `Video size: ${response.data.sizeMB}MB. Maximum supported: ${response.data.maxSizeMB}MB. Please compress your video.`;
          }
        }
        // Otherwise use the error object
        else if (response.error?.message) {
          try {
            // Try parsing as JSON first
            const parsed = JSON.parse(response.error.message);
            errorMessage = parsed.error || response.error.message;
            errorDetails = parsed.details || '';
          } catch {
            // If not JSON, use the message directly
            errorMessage = response.error.message;
            if (response.error.message.includes('413') || response.error.message.includes('too large')) {
              errorDetails = 'Maximum supported size is 5GB. Please compress your video if it exceeds this limit.';
            }
          }
        }
        
        throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      }

      const { data, error } = response;

      // Convert to segments format using actual timing from Whisper API
      const segments: TranscriptSegment[] = [];
      if (data?.words && Array.isArray(data.words)) {
        // Group words into sentences for better readability
        let currentSegment = '';
        let segmentStart = 0;
        let segmentIndex = 0;
        
        data.words.forEach((word: any, index: number) => {
          if (index === 0) {
            segmentStart = word.start || 0;
          }
          
          currentSegment += (currentSegment ? ' ' : '') + word.word;
          
          // End segment on sentence boundaries or every 10-15 words
          const isEndOfSentence = /[.!?]$/.test(word.word);
          const isLongSegment = currentSegment.split(' ').length >= 12;
          const isLastWord = index === data.words.length - 1;
          
          if (isEndOfSentence || isLongSegment || isLastWord) {
            segments.push({
              id: `segment-${segmentIndex}`,
              text: currentSegment.trim(),
              startTime: segmentStart,
              endTime: word.end || (segmentStart + 3),
              speaker: 'Speaker', // Use editable default name instead of 'narrator'
              speakerColor: getNextCISpeakerColor(segmentIndex),
              emphasis: 'normal',
              pitch: 'normal'
            });
            
            currentSegment = '';
            segmentIndex++;
            // Next segment starts after current word
            if (index < data.words.length - 1) {
              segmentStart = data.words[index + 1]?.start || (word.end || segmentStart + 3);
            }
          }
        });
      } else if (data?.text) {
        // Fallback to basic segmentation if word-level timing isn't available
        const sentences = data.text.split(/[.!?]+/).filter(s => s.trim());
        const totalDuration = data.duration || 120; // Use actual duration or fallback
        const segmentDuration = totalDuration / sentences.length;
        
        sentences.forEach((sentence, index) => {
          if (sentence.trim()) {
            segments.push({
              id: `segment-${index}`,
              text: sentence.trim(),
              startTime: index * segmentDuration,
              endTime: (index + 1) * segmentDuration,
              speaker: 'Speaker', // Use editable default name instead of 'narrator'
              speakerColor: getNextCISpeakerColor(index),
              emphasis: 'normal',
              pitch: 'normal'
            });
          }
        });
      }

      console.log('✅ TRANSCRIPT EDITOR: Transcript extracted successfully in', selectedLanguage, 'with', segments.length, 'segments');
      
      setOriginalTranscript(segments);
      setEditingTranscript([...segments]);
      
      // Detect language from response and update state
      const detectedLanguage = data?.language || 'en';
      setSelectedLanguage(detectedLanguage);
      
      // Save to database with proper transcript record (not just localStorage)
      await saveTranscriptData(segments, detectedLanguage);
      onTranscriptUpdate?.(segments, detectedLanguage);

      toast({
        title: "Transcript Generated",
        description: `Generated ${segments.length} segments and saved to database`
      });

    } catch (error) {
      console.error('Transcript generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate transcript",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTranslatedContent = async (targetLanguage: string, force: boolean = false) => {
    if (originalTranscript.length === 0) {
      toast({
        title: "No Original Transcript",
        description: "Generate the original transcript first",
        variant: "destructive"
      });
      return;
    }

    setIsTranslating(true);
    try {
      // If not forcing, try to load existing translation from DB to avoid redundant API calls
      if (!force) {
        console.log('🔍 Checking for existing translation in', targetLanguage);
        const existingSegments = await loadTranscriptSegments(targetLanguage);
        if (existingSegments.length > 0) {
          console.log('✅ Found cached translation:', existingSegments.length, 'segments');
          const convertedSegments = existingSegments.map(seg => ({
            ...seg,
            id: seg.id || `segment-${Date.now()}-${Math.random()}`
          }));
          setEditingTranscript(convertedSegments);
          setSelectedLanguage(targetLanguage);
          onTranscriptUpdate?.(convertedSegments, targetLanguage);
          toast({ title: 'Translation Loaded', description: `Loaded existing ${languages.find(l => l.code === targetLanguage)?.name} translation` });
          setIsTranslating(false);
          return;
        }
      }

      console.log(force ? '🔄 Forcing fresh translation' : '🌐 No cached translation found, translating now', '→', targetLanguage);

      // Translate in batches to avoid token/length limits and preserve order
      const SEPARATOR = '\n---\n';
      const batchSize = 12; // keep small to stay under model limits
      const batches: TranscriptSegment[][] = [];
      for (let i = 0; i < originalTranscript.length; i += batchSize) {
        batches.push(originalTranscript.slice(i, i + batchSize));
      }
      console.log('📦 Created', batches.length, 'batches for translation');

      let successful = 0; let failed = 0;
      const translatedSegments: TranscriptSegment[] = [];

      for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        const batchStartIndex = b * batchSize;
        try {
          console.log(`🔄 Translating batch ${b + 1}/${batches.length} (${batch.length} segments)`);
          const joined = batch.map(s => (s.text || '').trim()).join(SEPARATOR);
          const { data, error } = await supabase.functions.invoke('generate-dubbing', {
            body: { text: joined, targetLanguage, translateOnly: true }
          });
          if (error) throw new Error(error.message || 'Batch translate failed');
          const raw: string = (data?.translatedText || '').trim();
          let pieces = raw.split(SEPARATOR).map((t: string) => t.trim()).filter(Boolean);
          if (pieces.length < batch.length) {
            // Fallback split on newline when separators collapsed
            const alt = raw.split('\n').map((t: string) => t.trim()).filter(Boolean);
            if (alt.length >= batch.length) pieces = alt;
          }
          const mapped = batch.map((seg, i) => ({
            ...seg,
            text: dedupeSentences(pieces[i] || seg.text)
          }));
          translatedSegments.push(...mapped);
          successful++;
        } catch (e) {
          console.error(`❌ Batch ${b + 1} failed:`, e);
          translatedSegments.push(...batch); // keep originals for failed batch
          failed++;
        }
      }

      console.log(`📊 Translation summary: ${successful} successful, ${failed} failed`);

      // Build captions with basic word timings
      const captions = translatedSegments.map(segment => {
        const wordsList = (segment.text || '').split(/\s+/).filter(Boolean);
        const dur = Math.max(0.1, (segment.endTime - segment.startTime));
        const wordDur = Math.max(0.05, dur / Math.max(1, wordsList.length));
        return {
          text: segment.text,
          speaker: segment.speaker || (segment as any).speakerAsrLabel || (segment as any).speaker_asr_label || 'Unknown',
          startTime: segment.startTime,
          endTime: segment.endTime,
          words: wordsList.map((w, i) => ({
            text: w,
            startTime: segment.startTime + i * wordDur,
            endTime: Math.min(segment.endTime, segment.startTime + (i + 1) * wordDur),
            emphasis: segment.emphasis || 'normal' as const,
            pitch: segment.pitch || 'normal' as const,
          }))
        };
      });

      setEditingTranscript(translatedSegments);
      setSelectedLanguage(targetLanguage);

      await saveTranscriptData(translatedSegments, targetLanguage);
      onTranscriptUpdate?.(translatedSegments, targetLanguage);
      onContentGenerated?.({ captions, dubbing: null });

      if (failed > 0) {
        toast({ title: 'Translation completed with warnings', description: `${failed} batch(es) kept original text due to errors.` });
      } else {
        toast({ title: 'Translation complete', description: `Translated ${translatedSegments.length} segments to ${languages.find(l => l.code === targetLanguage)?.name}` });
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast({ title: 'Generation Failed', description: error instanceof Error ? error.message : 'Failed to generate translated content', variant: 'destructive' });
    } finally {
      setIsTranslating(false);
    }
  };

  const startEditing = async (index: number) => {
    const segment = editingTranscript[index];
    
    // Pre-select character name if character_id exists
    let speakerName = segment.speaker || (segment as any).speakerAsrLabel || 'Unknown';
    const characterId = (segment as any).character_id || (segment as any).characterId;
    
    if (characterId) {
      try {
        const { data: char, error } = await supabase
          .from('characters')
          .select('name, color, emphasis, pitch')
          .eq('id', characterId)
          .single();
        
        if (!error && char) {
          speakerName = char.name;
          console.log(`✅ Pre-selected character: "${char.name}" from character_id`);
        }
      } catch (error) {
        console.warn('Failed to fetch character for pre-selection:', error);
      }
    }
    
    setEditingIndex(index);
    setEditText(segment.text);
    setEditStartTime(formatTime(segment.startTime));
    setEditEndTime(formatTime(segment.endTime));
    setEditSpeaker(speakerName);
    setEditSpeakerColor(segment.speakerColor || getNextCISpeakerColor(index));
    setOriginalSpeaker(speakerName);
    setOriginalColor(segment.speakerColor || getNextCISpeakerColor(index));
    setEditEmphasis(segment.emphasis || 'normal');
    setEditPitch(segment.pitch || 'normal');
    setEditWords(segment.words || []);
    setUseWordLevelEditing(false);
    setEditApplyToAll(false);
  };

  // Helper to check if string is a valid UUID
  const isUUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const saveEdit = async () => {
    if (editingIndex === null) return;
    
    const currentSegment = editingTranscript[editingIndex];
    const segmentId = currentSegment.id;
    
    // Find character by selected name
    const selectedChar = availableCharacters.find(c => c.name === editSpeaker);
    
    try {
      // 1️⃣ FIRST: Update text/timing/emphasis/pitch via bulk save
      const updated = [...editingTranscript];
      updated[editingIndex] = {
        ...updated[editingIndex],
        text: editText,
        startTime: parseTimeInput(editStartTime),
        endTime: parseTimeInput(editEndTime),
        emphasis: editEmphasis,
        pitch: editPitch,
        words: editWords
      };
      
      // Sort segments by time after editing timing
      const sortedSegments = sortSegmentsByTime(updated);
      
      // Save text/timing changes to database (creates segment if new)
      await saveTranscriptData(sortedSegments, selectedLanguage);
      
      // 2️⃣ THEN: Update identity via RPC (now segment exists in DB)
      if (editSpeaker && editSpeaker !== currentSegment.speaker) {
        // Compute stable idx for RPC fallback (for new segments with temp IDs)
        const idxForRPC = (currentSegment as any).idx ?? sortedSegments.findIndex(s => s.id === segmentId);
        
        await updateSegmentIdentity({
          segmentId: isUUID(segmentId) ? segmentId : undefined,
          videoId,
          language: selectedLanguage,
          idx: !isUUID(segmentId) ? idxForRPC : undefined,
          characterId: selectedChar?.id,
          characterName: selectedChar ? undefined : editSpeaker,
        });
        
        // Refresh characters if we created a new one
        if (!selectedChar) {
          const updatedChars = await loadCharacters();
          setAvailableCharacters(updatedChars);
        }
      }
      
      // 3️⃣ Reload from database to get updated identity from view
      const reloadedSegments = await loadTranscriptSegments(selectedLanguage);
      if (reloadedSegments.length > 0) {
        const convertedSegments = reloadedSegments.map(s => ({
          ...s,
          id: s.id || `segment-${Date.now()}-${Math.random()}`
        }));
        setEditingTranscript(convertedSegments);
        onTranscriptUpdate?.(convertedSegments, selectedLanguage);
      } else {
        setEditingTranscript(sortedSegments);
        onTranscriptUpdate?.(sortedSegments, selectedLanguage);
      }
      
      resetEditState();
      
      toast({
        title: "Segment Updated",
        description: selectedChar 
          ? `Changes saved with character link (${editSpeaker})`
          : "Changes saved"
      });
    } catch (error) {
      console.error('❌ Failed to save segment:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive"
      });
    }
  };

  const saveAllChanges = async () => {
    try {
      // Save to database first
      await saveTranscriptData(editingTranscript, selectedLanguage);
      
      // Immediately update the video player with changes
      console.log('💾 Saving all transcript changes with speaker info:', editingTranscript.length, 'segments');
      console.log('📝 Transcript segments being saved:', editingTranscript.map(s => ({
        speaker: s.speaker,
        speakerColor: s.speakerColor,
        text: s.text.substring(0, 30) + '...',
        startTime: s.startTime,
        endTime: s.endTime,
        emphasis: s.emphasis,
        pitch: s.pitch
      })));
      
      // Force update by creating new array with timestamp to ensure re-render
      const updatedSegments = editingTranscript.map((segment, index) => ({
        ...segment,
        _lastModified: Date.now() + index // Add timestamp to force updates
      }));
      onTranscriptUpdate?.(updatedSegments, selectedLanguage);
      
      toast({
        title: "All Changes Saved",
        description: "Transcript edits including speaker information have been saved and synced."
      });
    } catch (error) {
      console.error('Error saving transcript changes:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive"
      });
    }
  };

  const cancelEdit = () => {
    resetEditState();
  };

  const resetEditState = () => {
    setEditingIndex(null);
    setEditText('');
    setEditStartTime('');
    setEditEndTime('');
    setEditSpeaker('');
    setEditSpeakerColor('');
    setEditEmphasis('normal');
    setEditPitch('normal');
    setEditWords([]);
    setUseWordLevelEditing(false);
  };

  const findInsertPosition = (segments: TranscriptSegment[], newStartTime: number): number => {
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].startTime > newStartTime) {
        return i;
      }
    }
    return segments.length;
  };

  const sortSegmentsByTime = (segments: TranscriptSegment[]): TranscriptSegment[] => {
    return [...segments].sort((a, b) => a.startTime - b.startTime);
  };

  const addNewSegment = async (insertAfterIndex?: number) => {
    let newStartTime: number;
    
    if (insertAfterIndex !== undefined && editingTranscript[insertAfterIndex]) {
      newStartTime = editingTranscript[insertAfterIndex].endTime + 0.5;
    } else {
      const lastSegment = editingTranscript[editingTranscript.length - 1];
      newStartTime = lastSegment ? lastSegment.endTime : 0;
    }
    
    const newSegment: TranscriptSegment = {
      id: `segment-${Date.now()}`,
      text: 'New segment text...',
      startTime: newStartTime,
      endTime: newStartTime + 3,
      speaker: 'Speaker', // Use 'Speaker' as default instead of 'narrator'
      speakerColor: getNextCISpeakerColor(editingTranscript.length),
      emphasis: 'normal',
      pitch: 'normal'
    };
    
    const insertPosition = findInsertPosition(editingTranscript, newStartTime);
    const updated = [...editingTranscript];
    updated.splice(insertPosition, 0, newSegment);
    
    setEditingTranscript(updated);
    
    // Save to database with proper transcript record
    await saveTranscriptData(updated, selectedLanguage);
    onTranscriptUpdate?.(updated, selectedLanguage);
    
    // Start editing the new segment
    startEditing(insertPosition);
  };

  const deleteSegment = async (index: number) => {
    const updated = editingTranscript.filter((_, i) => i !== index);
    setEditingTranscript(updated);
    
    // Save to database with proper transcript record
    await saveTranscriptData(updated, selectedLanguage);
    onTranscriptUpdate?.(updated, selectedLanguage);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = (seconds % 60).toFixed(1);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
    }
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const parseTimeInput = (timeStr: string): number => {
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      if (parts.length === 3) {
        // HH:MM:SS format
        const [hours, mins, secs] = parts;
        return parseInt(hours) * 3600 + parseInt(mins) * 60 + parseFloat(secs);
      } else if (parts.length === 2) {
        // MM:SS format
        const [mins, secs] = parts;
        return parseInt(mins) * 60 + parseFloat(secs);
      }
    }
    return parseFloat(timeStr) || 0;
  };

  const adjustTime = (currentTime: string, adjustment: number): string => {
    const currentSeconds = parseTimeInput(currentTime);
    const newSeconds = Math.max(0, currentSeconds + adjustment);
    return formatTime(newSeconds);
  };

  const exportTranscript = () => {
    const text = editingTranscript.map(segment => 
      `[${Math.floor(segment.startTime / 60)}:${(segment.startTime % 60).toFixed(0).padStart(2, '0')}] ${segment.text}`
    ).join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${selectedLanguage}-${videoId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleVocalIntensityAnalysis = async () => {
    if (!editingTranscript || editingTranscript.length === 0) return;
    
    try {
      const analyzedSegments = await analyzeVocalIntensity(
        videoId, // Use actual video ID
        editingTranscript
      );
      
      const updatedSegments = analyzedSegments.map((segment: any, index: number) => ({
        id: segment.id || `segment-${Date.now()}-${Math.random()}`,
        text: segment.text,
        startTime: segment.start_time || segment.startTime,
        endTime: segment.end_time || segment.endTime,
        speaker: segment.speaker || segment.speakerAsrLabel || segment.speaker_asr_label || 'Unknown',
        speakerColor: segment.speakerColor || PRIORITY_COLORS[index % PRIORITY_COLORS.length],
        emphasis: segment.emphasis || 'normal' as const,
        pitch: segment.pitch || 'normal' as const,
        vocal_intensity: (segment.vocal_intensity === 'whisper' || segment.vocal_intensity === 'yell' || segment.vocal_intensity === 'shout') ? segment.vocal_intensity : 'normal' as const,
        intensity_confidence: segment.intensity_confidence,
        auto_styling: segment.auto_styling,
      }));
      
      setEditingTranscript(updatedSegments);
      saveTranscriptData(updatedSegments, selectedLanguage);
      onTranscriptUpdate?.(updatedSegments, selectedLanguage);
    } catch (error) {
      console.error('Failed to analyze vocal intensity:', error);
    }
  };

  // Filter segments based on search query
  const filteredSegments = editingTranscript.filter(segment => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      segment.text.toLowerCase().includes(query) ||
      segment.speaker?.toLowerCase().includes(query) ||
      formatTime(segment.startTime).includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-light text-foreground flex items-center justify-between">
            Transcript & Content Generation
            <Badge variant="outline">
              {languages.find(l => l.code === selectedLanguage)?.name || 'English'}
            </Badge>
          </CardTitle>
          <Card className="border-primary/20 bg-primary/5 mt-3">
            <CardContent className="p-4">
              <p className="text-sm font-light leading-relaxed">
                Edit text and intonation word-by-word. Change speakers and customize voice characteristics for each segment.
              </p>
            </CardContent>
          </Card>
        </CardHeader>
        
        <CardContent className="space-y-4">
        {/* Generation Controls */}
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            onClick={generateOriginalTranscript}
            disabled={isGenerating}
            size="sm"
            variant="outline"
          >
            <Mic className="w-4 h-4 mr-2" />
            {isGenerating ? 'Extracting Full Transcript...' : 'Extract Complete Transcript'}
          </Button>
          
          <Button
            onClick={saveAllChanges}
            disabled={editingTranscript.length === 0}
            size="sm"
            variant="default"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes to Video
          </Button>
          
          <Select
            value={selectedLanguage}
            onValueChange={async (value) => {
              if (value !== selectedLanguage) {
                // ✅ FIX #2: Check for unsaved changes FIRST
                const hasUnsavedChanges = JSON.stringify(editingTranscript) !== JSON.stringify(originalTranscript);
                
                if (hasUnsavedChanges) {
                  console.log('💾 FIX #2: Auto-saving changes before language switch...');
                  
                  try {
                    await saveTranscriptData(editingTranscript, selectedLanguage);
                    toast({
                      title: "Changes Auto-Saved",
                      description: `Your ${languages.find(l => l.code === selectedLanguage)?.name} edits have been saved`
                    });
                  } catch (error) {
                    console.error('❌ Auto-save failed:', error);
                    toast({
                      title: "Save Failed",
                      description: "Cannot switch language - please save manually first",
                      variant: "destructive"
                    });
                    return; // Abort language switch if save fails
                  }
                }
                
                // Now safe to switch languages
                onLanguageChange?.(value);
                
                // Load target language segments
                const cached = await loadTranscriptSegments(value);
                if (cached.length > 0) {
                  console.log('📂 Loading cached translation for', value);
                  const convertedCached: TranscriptSegment[] = cached.map(s => ({ 
                    ...s, 
                    id: s.id || `seg-${Date.now()}-${Math.random()}` 
                  }));
                  setEditingTranscript(convertedCached);
                  setOriginalTranscript(convertedCached); // ✅ IMPORTANT: Update originalTranscript too
                  setSelectedLanguage(value);
                  onTranscriptUpdate?.(convertedCached, value);
                  
                  toast({
                    title: "Language Switched",
                    description: `Loaded ${convertedCached.length} segments in ${languages.find(l => l.code === value)?.name}`
                  });
                } else {
                  console.log('🌐 No cache, translating to', value);
                  generateTranslatedContent(value);
                }
              }
            }}
            disabled={isTranslating || originalTranscript.length === 0}
          >
            <SelectTrigger className="w-32">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">
                    {isTranslating ? '...' : languages.find(l => l.code === selectedLanguage)?.name}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={() => {
              console.log('🔄 Re-translating to', selectedLanguage);
              generateTranslatedContent(selectedLanguage, true);
            }}
            disabled={isTranslating || originalTranscript.length === 0}
            size="sm"
            variant="ghost"
          >
            {isTranslating ? 'Translating...' : 'Re-translate'}
          </Button>

          <Button
            onClick={() => addNewSegment()}
            disabled={editingTranscript.length === 0}
            size="sm"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Segment
          </Button>

          <Button
            onClick={exportTranscript}
            disabled={editingTranscript.length === 0}
            size="sm"
            variant="ghost"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button
            onClick={handleVocalIntensityAnalysis}
            disabled={isAnalyzing || editingTranscript.length === 0}
            size="sm"
            variant="outline"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Intensity'}
          </Button>
        </div>

        {/* Transcript Segments */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {editingTranscript.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Generate transcript to start editing</p>
            </div>
          ) : filteredSegments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No segments found matching "{searchQuery}"</p>
              <Button size="sm" variant="ghost" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </div>
          ) : (
            filteredSegments.map((segment, filteredIndex) => {
              // Find the real index in the original array for proper editing
              const realIndex = editingTranscript.findIndex(s => s.id === segment.id);
              return (
               <div key={segment.id} className={`p-3 border rounded-lg ${searchQuery && (segment.text.toLowerCase().includes(searchQuery.toLowerCase()) || segment.speaker?.toLowerCase().includes(searchQuery.toLowerCase())) ? 'bg-yellow-100 border-yellow-300' : 'bg-muted/20'}`}>
                 <div className="flex items-start justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-muted-foreground font-mono">
                       {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                     </span>
                       {segment.speaker && (
                        <div className="flex items-center gap-1">
                          {(() => {
                            // ✅ FIX: Use character name if linked, otherwise show ASR label or generic speaker
                            const hasCharacter = segment.characterId || segment.character_id;
                            const displayedSpeaker = hasCharacter 
                              ? segment.speaker // Already set to character name in loadTranscriptData
                              : (segment.speakerAsrLabel ? `Speaker ${segment.speakerAsrLabel}` : segment.speaker);
                            const displayColor = hasCharacter 
                              ? segment.speakerColor // Use character color
                              : getNormalizedSpeakerColor(displayedSpeaker);
                            
                            return (
                              <Badge 
                                variant="outline" 
                                className="text-xs px-2 py-0"
                                style={{ borderColor: displayColor, color: displayColor }}
                              >
                                {displayedSpeaker}
                              </Badge>
                            );
                          })()}

                          {segment.speakerAsrLabel && (segment.characterId || segment.character_id) && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              ✏️
                            </Badge>
                          )}
                        </div>
                      )}
                     {segment.emphasis !== 'normal' && (
                       <Badge variant="secondary" className="text-xs px-1 py-0">
                         {segment.emphasis}
                       </Badge>
                     )}
                     {segment.pitch !== 'normal' && (
                       <Badge variant="secondary" className="text-xs px-1 py-0">
                         {segment.pitch}
                       </Badge>
                     )}
                   </div>
                   {editingIndex !== realIndex && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditing(realIndex)}
                        className="h-6 w-6 p-0"
                        title="Edit segment"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addNewSegment(realIndex)}
                        className="h-6 w-6 p-0"
                        title="Insert segment after this one"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSegment(realIndex)}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        title="Delete segment"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                   )}
                 </div>
                 
                 {editingIndex === realIndex ? (
                  <div className="space-y-4">
                    {/* Text Editor - Switch between basic and word-level */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Text</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUseWordLevelEditing(!useWordLevelEditing)}
                          className="h-6 text-xs"
                        >
                          <Type className="w-3 h-3 mr-1" />
                          {useWordLevelEditing ? 'Basic Edit' : 'Word-Level Edit'}
                        </Button>
                      </div>
                      
                      {useWordLevelEditing ? (
                        <WordLevelEditor
                          initialText={editText}
                          onWordsChange={setEditWords}
                          className="border rounded-md"
                        />
                      ) : (
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full h-[60px] max-h-[60px] overflow-y-auto resize-none leading-relaxed"
                          rows={2}
                          autoFocus
                        />
                      )}
                    </div>
                    
                    {/* Timing Controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Start Time
                        </Label>
                        <div className="space-y-1">
                          <Input
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            placeholder="0:00.0 or 1:23:45.0"
                            className="text-xs font-mono"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditStartTime(adjustTime(editStartTime, -5))}
                              className="h-6 px-2 text-xs"
                              title="Subtract 5 seconds"
                            >
                              -5s
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditStartTime(adjustTime(editStartTime, -1))}
                              className="h-6 px-2 text-xs"
                              title="Subtract 1 second"
                            >
                              -1s
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditStartTime(adjustTime(editStartTime, 1))}
                              className="h-6 px-2 text-xs"
                              title="Add 1 second"
                            >
                              +1s
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditStartTime(adjustTime(editStartTime, 5))}
                              className="h-6 px-2 text-xs"
                              title="Add 5 seconds"
                            >
                              +5s
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          End Time
                        </Label>
                        <div className="space-y-1">
                          <Input
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            placeholder="0:03.0 or 1:23:45.0"
                            className="text-xs font-mono"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditEndTime(adjustTime(editEndTime, -5))}
                              className="h-6 px-2 text-xs"
                              title="Subtract 5 seconds"
                            >
                              -5s
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditEndTime(adjustTime(editEndTime, -1))}
                              className="h-6 px-2 text-xs"
                              title="Subtract 1 second"
                            >
                              -1s
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditEndTime(adjustTime(editEndTime, 1))}
                              className="h-6 px-2 text-xs"
                              title="Add 1 second"
                            >
                              +1s
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditEndTime(adjustTime(editEndTime, 5))}
                              className="h-6 px-2 text-xs"
                              title="Add 5 seconds"
                            >
                              +5s
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Speaker Selection */}
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Character / Speaker
                      </Label>
                      <Select
                        value={editSpeaker}
                        onValueChange={(value) => {
                          setEditSpeaker(value);
                          const character = availableCharacters.find(c => c.name === value);
                          if (character) {
                            setEditSpeakerColor(character.color);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full border" 
                                style={{ backgroundColor: editSpeakerColor }}
                              />
                              <span className="text-xs">{editSpeaker || 'Select character...'}</span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {availableCharacters.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground">
                              No characters assigned yet. Use Character Manager to create characters.
                            </div>
                          ) : (
                            availableCharacters.map((char) => (
                              <SelectItem key={char.id} value={char.name}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full border" 
                                    style={{ backgroundColor: char.color }}
                                  />
                                  <span className="text-xs">{char.name}</span>
                                  {char.type && (
                                    <Badge variant="outline" className="text-[10px] ml-auto">
                                      {char.type}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Emphasis & Pitch - Only show if not using word-level editing */}
                    {!useWordLevelEditing && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            <Volume2 className="w-3 h-3" />
                            Emphasis
                          </Label>
                          <Select value={editEmphasis} onValueChange={(value) => setEditEmphasis(value as 'loud' | 'quiet' | 'normal' | 'yelling')}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="loud">Loud</SelectItem>
                              <SelectItem value="quiet">Quiet</SelectItem>
                              <SelectItem value="yelling">Yelling (Bold)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Pitch</Label>
                          <Select value={editPitch} onValueChange={(value) => setEditPitch(value as 'high' | 'low' | 'normal')}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                     )}
                     
                     {/* Sign Language Section */}
                     <div className="border-t pt-3">
                       <SignLanguageUploader
                         videoId={videoId}
                         segmentId={segment.id.startsWith('segment-') ? '' : segment.id}
                         startTimeMs={Math.round(segment.startTime * 1000)}
                         endTimeMs={Math.round(segment.endTime * 1000)}
                         onUploadComplete={(clipUrl) => {
                           // Optionally update segment state or refresh data
                           console.log('ASL clip uploaded:', clipUrl);
                         }}
                       />
                     </div>
                     
                     <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit}>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                 ) : (
                   <p className="text-sm whitespace-pre-wrap break-words">
                     {searchQuery ? (
                       segment.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                         part.toLowerCase() === searchQuery.toLowerCase() ? (
                           <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
                         ) : (
                           part
                         )
                       )
                     ) : (
                       segment.text
                     )}
                   </p>
                 )}
               </div>
            );
            })
          )}
        </div>

        {/* Generation Info */}
        {selectedLanguage !== 'en' && editingTranscript.length > 0 && (
          <div className="text-xs text-muted-foreground p-2 bg-accent/10 rounded">
            <p>✓ Transcript translated to {languages.find(l => l.code === selectedLanguage)?.name}</p>
            <p>✓ Captions with intention generated</p>
            <p>✓ Dubbing content prepared</p>
          </div>
        )}
      </CardContent>
    </Card>

    </div>
  );
};