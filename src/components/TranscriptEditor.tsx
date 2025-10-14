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

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  speakerColor?: string;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: 'high' | 'low' | 'normal';
  words?: WordData[]; // Add word-level data support
  vocal_intensity?: 'whisper' | 'normal' | 'yell' | 'shout';
  intensity_confidence?: number;
  auto_styling?: any;
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
}

export const TranscriptEditor: React.FC<TranscriptEditorProps> = ({
  videoUrl,
  videoId,
  initialLanguage = 'en',
  onTranscriptUpdate,
  onContentGenerated
}) => {
  const [originalTranscript, setOriginalTranscript] = useState<TranscriptSegment[]>([]);
  const [editingTranscript, setEditingTranscript] = useState<TranscriptSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  
  // Sync selectedLanguage with initialLanguage prop changes
  useEffect(() => {
    if (initialLanguage && initialLanguage !== selectedLanguage) {
      console.log('🌐 TranscriptEditor: Updating language from', selectedLanguage, 'to', initialLanguage);
      setSelectedLanguage(initialLanguage);
    }
  }, [initialLanguage]);
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
  const [availableCharacters, setAvailableCharacters] = useState<{ name: string; color: string }[]>([]);
  const [editApplyToAll, setEditApplyToAll] = useState(false);
  const [originalSpeaker, setOriginalSpeaker] = useState<string>('');
  const [originalColor, setOriginalColor] = useState<string>('');
  const { toast } = useToast();
  const { saveTranscriptSegments, loadTranscriptSegments, loadCharacters } = useVideoStorage(videoId);
  const { isAnalyzing, analyzeVocalIntensity } = useVocalIntensityAnalysis();

  // Load characters from localStorage
  useEffect(() => {
    const loadCharactersFromStorage = async () => {
      try {
        const characters = await loadCharacters();
        setAvailableCharacters(characters.map(c => ({ name: c.name, color: c.color })));
      } catch (error) {
        console.error('Failed to load characters:', error);
      }
    };
    loadCharactersFromStorage();
  }, []);

  // Keep character list in sync when CharacterManager saves or CI sync updates
  useEffect(() => {
    const handleCharactersUpdated = async (e: any) => {
      try {
        // Prefer characters passed via event detail to avoid an extra DB read
        if (e?.detail?.characters && Array.isArray(e.detail.characters)) {
          setAvailableCharacters(e.detail.characters.map((c: any) => ({ name: c.name, color: c.color })));
        } else {
          const characters = await loadCharacters();
          setAvailableCharacters(characters.map(c => ({ name: c.name, color: c.color })));
        }
      } catch (err) {
        console.error('Failed to refresh characters after update event:', err);
      }
    };

    window.addEventListener('character-colors-updated', handleCharactersUpdated as EventListener);
    return () => window.removeEventListener('character-colors-updated', handleCharactersUpdated as EventListener);
  }, [videoId]);
  // Load saved transcript on component mount
  useEffect(() => {
    const loadTranscriptData = async () => {
      const segments = await loadTranscriptSegments(selectedLanguage);
      if (segments.length > 0) {
        const convertedSegments = segments.map(seg => ({
          ...seg,
          id: seg.id || `segment-${Date.now()}-${Math.random()}`
        }));
        setEditingTranscript(convertedSegments);
        setOriginalTranscript(convertedSegments);
        onTranscriptUpdate?.(convertedSegments, selectedLanguage);
      }
    };
    loadTranscriptData();
  }, [videoId]);

  // Load saved transcript when language changes
  useEffect(() => {
    const loadTranscriptData = async () => {
      const segments = await loadTranscriptSegments(selectedLanguage);
      if (segments.length > 0) {
        const convertedSegments = segments.map(seg => ({
          ...seg,
          id: seg.id || `segment-${Date.now()}-${Math.random()}`
        }));
        setEditingTranscript(convertedSegments);
        onTranscriptUpdate?.(convertedSegments, selectedLanguage);
      }
    };
    loadTranscriptData();
  }, [selectedLanguage]);

  // Save transcript when it changes - database-first approach
  const saveTranscriptData = async (segments: TranscriptSegment[], language: string) => {
    console.log('💾 TRANSCRIPT EDITOR: Saving', segments.length, 'segments to database for video:', videoId);
    
    const storageSegments: StorageTranscriptSegment[] = segments.map(segment => ({
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
      confidence: 0.9
    }));
    
    try {
      await saveTranscriptSegments(storageSegments, language);
      console.log('✅ TRANSCRIPT EDITOR: Successfully saved to database with proper transcript record');
    } catch (error) {
      console.error('❌ TRANSCRIPT EDITOR: Database save failed:', error);
      throw error; // Re-throw to show user the error
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

  const generateTranslatedContent = async (targetLanguage: string) => {
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
      // CACHE CHECK: Load existing translation from database first to avoid redundant API calls
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
        
        toast({
          title: 'Translation Loaded',
          description: `Loaded existing ${languages.find(l => l.code === targetLanguage)?.name} translation from database`
        });
        setIsTranslating(false);
        return; // Exit early - no API call needed
      }
      
      console.log('🌐 No cached translation found, calling translation API for', targetLanguage);
      
      // 1: Join segments with a strong separator to preserve 1:1 mapping
      const SEPARATOR = '\n---\n';
      const joined = originalTranscript.map(s => (s.text || '').trim()).join(SEPARATOR);
      
      // 2: Translate ONLY (no TTS) to avoid failures and speed up
      const { data: translationData, error: translationError } = await supabase.functions.invoke('generate-dubbing', {
        body: {
          text: joined,
          targetLanguage,
          translateOnly: true
        }
      });

      if (translationError) throw new Error(translationError.message || 'Translation failed');

      // 3: Split back using the same separator to keep segment alignment
      const raw = (translationData?.translatedText || '').trim();
      let translatedArray = raw.split(SEPARATOR).map((t: string) => t.trim());
      
      // Fallback: if model collapsed separators, try splitting on newlines first
      if (translatedArray.length < originalTranscript.length) {
        const alt = raw.split('\n').map((t: string) => t.trim()).filter(Boolean);
        if (alt.length >= originalTranscript.length) translatedArray = alt;
      }

      // 4: Map 1:1 to original segments (preserve exact timing) and dedupe any repeated sentences
      const translatedSegments = originalTranscript.map((segment, index) => {
        const translatedText = translatedArray[index] || segment.text;
        return {
          ...segment,
          text: dedupeSentences(translatedText) // Remove accidental duplicates
        };
      });

      // 5: Generate word timings for each segment from translated text
      const captions = translatedSegments.map(segment => {
        const wordsList = (segment.text || '').split(/\s+/).filter(Boolean);
        const dur = Math.max(0.1, (segment.endTime - segment.startTime));
        const wordDur = Math.max(0.05, dur / Math.max(1, wordsList.length));
        return {
          text: segment.text,
          speaker: segment.speaker || 'Speaker',
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
      
      // 6: Persist translated transcript to database (per-language)
      await saveTranscriptData(translatedSegments, targetLanguage);
      
      onTranscriptUpdate?.(translatedSegments, targetLanguage);
      onContentGenerated?.({ captions, dubbing: translationData });

      toast({
        title: 'Content Generated',
        description: `Transcript and captions generated for ${languages.find(l => l.code === targetLanguage)?.name}`
      });

    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate translated content',
        variant: 'destructive'
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const startEditing = (index: number) => {
    const segment = editingTranscript[index];
    setEditingIndex(index);
    setEditText(segment.text);
    setEditStartTime(formatTime(segment.startTime));
    setEditEndTime(formatTime(segment.endTime));
    setEditSpeaker(segment.speaker || 'Speaker'); // Use 'Speaker' as default instead of 'narrator'
    setEditSpeakerColor(segment.speakerColor || getNextCISpeakerColor(index));
    setOriginalSpeaker(segment.speaker || 'Speaker');
    setOriginalColor(segment.speakerColor || getNextCISpeakerColor(index));
    setEditEmphasis(segment.emphasis || 'normal');
    setEditPitch(segment.pitch || 'normal');
    setEditWords(segment.words || []);
    setUseWordLevelEditing(false); // Reset to segment-level editing by default
    setEditApplyToAll(false); // Default: do NOT propagate changes unless explicitly enabled
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;
    
    const updated = [...editingTranscript];
    
    // Apply edits to the current segment only (no automatic propagation)
    updated[editingIndex] = {
      ...updated[editingIndex],
      text: editText,
      startTime: parseTimeInput(editStartTime),
      endTime: parseTimeInput(editEndTime),
      speaker: editSpeaker,
      speakerColor: editSpeakerColor,
      emphasis: useWordLevelEditing ? 'normal' : editEmphasis,
      pitch: useWordLevelEditing ? 'normal' : editPitch,
      words: useWordLevelEditing ? editWords : undefined,
    };

    const nextSegments = updated;
    
    // Sort segments by time after editing timing
    const sortedSegments = sortSegmentsByTime(nextSegments);
    setEditingTranscript(sortedSegments);
    
    // Save immediately to database with proper transcript record
    await saveTranscriptData(sortedSegments, selectedLanguage);
    onTranscriptUpdate?.(sortedSegments, selectedLanguage);
    resetEditState();
  };

  const saveAllChanges = () => {
    saveTranscriptData(editingTranscript, selectedLanguage);
    
    // Immediately update the video player with changes
    console.log('💾 Saving all transcript changes and updating video player:', editingTranscript.length, 'segments');
    console.log('📝 Transcript segments being saved with properties:', editingTranscript.map(s => ({
      speaker: s.speaker,
      text: s.text.substring(0, 30) + '...',
      startTime: s.startTime,
      endTime: s.endTime,
      speakerColor: s.speakerColor,
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
      description: "Transcript edits have been saved and applied to the video player."
    });
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
        speaker: segment.speaker || 'Speaker',
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
                // Try to load cached translation first, only translate if not cached
                const cached = await loadTranscriptSegments(value);
                if (cached.length > 0) {
                  console.log('📂 Loading cached translation for', value);
                  const convertedCached: TranscriptSegment[] = cached.map(s => ({ 
                    ...s, 
                    id: s.id || `seg-${Date.now()}-${Math.random()}` 
                  }));
                  setEditingTranscript(convertedCached);
                  setSelectedLanguage(value);
                  onTranscriptUpdate?.(convertedCached, value);
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
                       <Badge 
                         variant="outline" 
                         className="text-xs px-2 py-0"
                         style={{ borderColor: segment.speakerColor, color: segment.speakerColor }}
                       >
                         {segment.speaker}
                       </Badge>
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
                          className="min-h-[60px]"
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
                              No characters assigned yet. Use the Speaker Assignment section below to create characters.
                            </div>
                          ) : (
                            availableCharacters.map((char) => (
                              <SelectItem key={char.name} value={char.name}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full border" 
                                    style={{ backgroundColor: char.color }}
                                  />
                                  <span className="text-xs">{char.name}</span>
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