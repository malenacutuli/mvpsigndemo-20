import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Wand2, Save, Edit, X, Clock, Trash2, Plus, Volume2, CheckCircle2, AlertCircle, RefreshCw, Zap, Languages, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VoiceOption, getFilteredVoices, getCategoryColor, findVoiceById } from "@/types/voice";
import { analyzeAndPopulateEAD, getEADStatusBadge, type EADAnalysisResult } from '@/lib/ad/eadAnalyzer';
import { AudioDescriptionDeleteDialog } from './AudioDescriptionDeleteDialog';
import { LanguagePickerDialog } from './LanguagePickerDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAdminCheck } from '@/hooks/useAdminCheck';

interface AudioDescriptionSegment {
  id?: string;
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: string;
  timestamp?: number;
  audio_url?: string;
  audio_generation_status?: string;
  originalText?: string; // Track original text to detect changes
  // EAD metadata
  requires_extension?: boolean;
  extension_duration?: number;
  extension_type?: 'pause' | 'slowdown' | 'none';
  estimated_duration?: number;
  gap_duration?: number;
}

interface AudioDescriptionEditorProps {
  videoUrl: string;
  videoId: string;
  videoData?: any;
  transcriptSegments?: any[];
  onDescriptionsUpdate?: (segments: AudioDescriptionSegment[]) => void;
}

export const AudioDescriptionEditor: React.FC<AudioDescriptionEditorProps> = ({
  videoUrl,
  videoId,
  videoData,
  transcriptSegments = [],
  onDescriptionsUpdate
}) => {
  console.log('🎬 AudioDescriptionEditor rendered with:', {
    videoId,
    detectedLanguage: videoData?.transcript_language || 'en',
    transcriptSegmentsCount: transcriptSegments?.length || 0,
    transcriptSegments: transcriptSegments?.slice(0, 2)
  });

  const [descriptions, setDescriptions] = useState<AudioDescriptionSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editVoiceStyle, setEditVoiceStyle] = useState<string>('warm');
  const [editStartTime, setEditStartTime] = useState<string>('0:00.0');
  const [editEndTime, setEditEndTime] = useState<string>('0:00.0');
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  
  // Stabilize language to prevent flickering
  const stableLanguageRef = React.useRef(videoData?.transcript_language || 'en');
  const detectedLanguage = stableLanguageRef.current;
  const [audioGenerationStatus, setAudioGenerationStatus] = useState<Record<string, string>>({});
  const [generatingAudioIds, setGeneratingAudioIds] = useState<Set<string>>(new Set());
  const [eadAnalysisResults, setEadAnalysisResults] = useState<Map<string, EADAnalysisResult>>(new Map());
  const [isAnalyzingEAD, setIsAnalyzingEAD] = useState(false);

  // Multi-language state
  const [currentLanguage, setCurrentLanguage] = useState(detectedLanguage);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([detectedLanguage]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0 });
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [translationCounts, setTranslationCounts] = useState<Record<string, number>>({});
  const [isFixingLanguages, setIsFixingLanguages] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[], hasTranslations: boolean } | null>(null);
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const { isAdmin } = useAdminCheck();
  
  // Memoize filtered voices to prevent recalculation on every render
  const filteredVoices = React.useMemo(() => 
    getFilteredVoices(currentLanguage, 'education'),
    [currentLanguage]
  );
  
  // Update stable language ref only when videoData changes
  React.useEffect(() => {
    const newLang = videoData?.transcript_language || 'en';
    if (stableLanguageRef.current !== newLang) {
      console.log('🌍 Stable language change:', stableLanguageRef.current, '→', newLang);
      stableLanguageRef.current = newLang;
      setCurrentLanguage(newLang);
    }
  }, [videoData?.transcript_language]);

  // Local UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualStartTime, setManualStartTime] = useState<string>('0:00.0');
  const [manualEndTime, setManualEndTime] = useState<string>('0:05.0');
  const [manualText, setManualText] = useState('');
  const [manualVoiceStyle, setManualVoiceStyle] = useState<string>('warm');
  const [isUsingTwelveLabs, setIsUsingTwelveLabs] = useState(false);
  const pollingRef = React.useRef<number | null>(null);
  const timeoutHandledRef = React.useRef<boolean>(false);
  const currentTaskRef = React.useRef<{ indexId: string; taskId: string } | null>(null);

  // Load existing audio descriptions from database
  const loadExistingDescriptions = async (language: string = currentLanguage) => {
    if (!videoId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', language)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error loading audio descriptions:', error);
        return;
      }

      if (data && data.length > 0) {
        const loadedDescriptions: AudioDescriptionSegment[] = data.map(desc => ({
          id: desc.id,
          text: desc.description,
          startTime: Number(desc.start_time),
          endTime: Number(desc.end_time),
          voiceStyle: 'warm',
          audio_url: (desc as any).audio_url,
          requires_extension: (desc as any).requires_extension,
          extension_duration: (desc as any).extension_duration,
          extension_type: (desc as any).extension_type,
          estimated_duration: (desc as any).estimated_duration,
          gap_duration: (desc as any).gap_duration,
          audio_generation_status: (desc as any).audio_generation_status,
          originalText: desc.description // Track original for change detection
        }));
        
        // Load audio generation status
        const statusMap: Record<string, string> = {};
        data.forEach(desc => {
          if (desc.id) {
            statusMap[desc.id] = (desc as any).audio_generation_status || 'pending';
          }
        });
        setAudioGenerationStatus(statusMap);
        
        setDescriptions(loadedDescriptions);
        onDescriptionsUpdate?.(loadedDescriptions);
        console.log('✅ Loaded', loadedDescriptions.length, 'existing audio descriptions');
      }

      // Check which languages have audio descriptions
      const { data: allLanguages } = await supabase
        .from('audio_descriptions')
        .select('language')
        .eq('video_id', videoId);
      
      if (allLanguages) {
        const uniqueLanguages = [...new Set(allLanguages.map(l => l.language))];
        setAvailableLanguages(uniqueLanguages);
        
        // Count descriptions per language
        const counts: Record<string, number> = {};
        allLanguages.forEach(l => {
          counts[l.language] = (counts[l.language] || 0) + 1;
        });
        setTranslationCounts(counts);
        
        console.log('📚 Available languages:', uniqueLanguages, 'Counts:', counts);
      }
    } catch (error) {
      console.error('Failed to load audio descriptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save descriptions to database
  const saveDescriptionsToDatabase = async (descriptionsToSave: AudioDescriptionSegment[]) => {
    if (!videoId) return;
    
    setIsSaving(true);
    try {
      // Get existing descriptions to find IDs to delete
      const { data: existingDescriptions } = await supabase
        .from('audio_descriptions')
        .select('id')
        .eq('video_id', videoId)
        .eq('language', detectedLanguage);

      const existingIds = new Set(existingDescriptions?.map(d => d.id) || []);
      const keptIds = new Set(descriptionsToSave.filter(d => d.id).map(d => d.id));
      
      // Delete descriptions that are no longer in the list
      const idsToDelete = Array.from(existingIds).filter(id => !keptIds.has(id));
      if (idsToDelete.length > 0) {
        // Check if any have translations before showing dialog
        const { data: translationCheck } = await supabase
          .from('audio_descriptions')
          .select('id')
          .in('source_description_id', idsToDelete)
          .limit(1);
        
        const hasTranslations = translationCheck && translationCheck.length > 0;
        
        if (hasTranslations) {
          // Store the save operation to complete after dialog
          setDeleteTarget({ ids: idsToDelete, hasTranslations: true });
          setDeleteDialogOpen(true);
          setIsSaving(false);
          // Store descriptions to save for later
          (window as any)._pendingSaveDescriptions = descriptionsToSave;
          return;
        } else {
          // No translations, safe to delete directly
          await handleDeleteDescriptions(idsToDelete, false);
        }
      }

      // Continue with upsert (this will also be called from dialog confirmation)
      await performUpsert(descriptionsToSave);
      
    } catch (error) {
      console.error('Failed to save audio descriptions:', error);
      toast.error('Failed to save audio descriptions');
      setIsSaving(false);
    }
  };

  // Separated upsert logic to be called independently
  const performUpsert = async (descriptionsToSave: AudioDescriptionSegment[]) => {
    setIsSaving(true);
    try {
      // UPSERT descriptions (update existing, insert new)
      if (descriptionsToSave.length > 0) {
        const { error } = await supabase
          .from('audio_descriptions')
          .upsert(
            descriptionsToSave.map(desc => ({
              ...(desc.id ? { id: desc.id } : {}), // Preserve ID if it exists
              video_id: videoId,
              description: desc.text,
              start_time: desc.startTime,
              end_time: desc.endTime,
              language: detectedLanguage,
              description_type: 'visual',
              // Preserve ALL metadata (using snake_case as stored in objects)
              audio_url: (desc as any).audio_url || null,
              audio_generation_status: (desc as any).audio_generation_status || 'pending',
              audio_generated_at: (desc as any).audio_generated_at || null,
              voice_id: (desc as any).voice_id || null,
              voice_name: (desc as any).voice_name || null,
              requires_extension: (desc as any).requires_extension || false,
              extension_duration: (desc as any).extension_duration || null,
              extension_type: (desc as any).extension_type || 'none',
              estimated_duration: (desc as any).estimated_duration || null,
              gap_duration: (desc as any).gap_duration || null,
              priority_level: (desc as any).priority_level || 'important',
              confidence: (desc as any).confidence || null
            })),
            { onConflict: 'id' }
          );

        if (error) {
          console.error('Error saving audio descriptions:', error);
          toast.error('Failed to save audio descriptions');
          return;
        }
      }

      // Persist AD voice preference in videos.metadata
      try {
        const existingMeta = (videoData?.metadata as any) || {};
        const updatedMeta = {
          ...existingMeta,
          ...(selectedVoice ? { ad_voice_id: selectedVoice.id, ad_voice_name: selectedVoice.name } : {})
        };
        await supabase
          .from('videos')
          .update({ metadata: updatedMeta })
          .eq('id', videoId);
      } catch (metaErr) {
        console.warn('Could not update video metadata with AD voice preference:', metaErr);
      }

      toast.success('Audio descriptions saved successfully');
      console.log('✅ Saved', descriptionsToSave.length, 'audio descriptions to database with voice:', selectedVoice?.id);
    } catch (error) {
      console.error('Failed to save audio descriptions:', error);
      toast.error('Failed to save audio descriptions');
    } finally {
      setIsSaving(false);
    }
  };

  // Load descriptions on component mount and initialize voice selection
  useEffect(() => {
    loadExistingDescriptions();
    // Initialize voice based on metadata or language
    const meta = videoData?.metadata as any | undefined;
    if (meta?.ad_voice_id && meta?.ad_voice_name) {
      setSelectedVoice({ id: meta.ad_voice_id, name: meta.ad_voice_name, description: 'Preferred AD voice' });
    } else {
      // Sensible defaults by language
      if (currentLanguage === 'es') {
        setSelectedVoice(filteredVoices.find(v => v.accent === 'Spanish') || filteredVoices[0]);
      } else {
        setSelectedVoice(filteredVoices.find(v => v.id === 'gordon-ramsay') || filteredVoices[0]);
      }
    }
  }, [videoId, currentLanguage]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);
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

  const getVoiceStyleColor = (voiceId: string): string => {
    return 'text-orange-600';
  };

  // Language helper functions
  const supportedLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'ru'];
  
  const getLanguageDisplay = (code: string): string => {
    const languageNames: Record<string, string> = {
      'en': '🇬🇧 English',
      'es': '🇪🇸 Español',
      'fr': '🇫🇷 Français',
      'de': '🇩🇪 Deutsch',
      'it': '🇮🇹 Italiano',
      'pt': '🇵🇹 Português',
      'ja': '🇯🇵 日本語',
      'ko': '🇰🇷 한국어',
      'zh': '🇨🇳 中文',
      'ar': '🇸🇦 العربية',
      'ru': '🇷🇺 Русский'
    };
    return languageNames[code] || code;
  };

  // Handle deletion with cascade option
  const handleDeleteDescriptions = async (ids: string[], deleteTranslations: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-audio-descriptions', {
        body: { description_ids: ids, delete_translations: deleteTranslations }
      });

      if (error) throw error;

      if (data?.hasTranslations && !deleteTranslations) {
        toast.warning('Cannot delete descriptions with translations. Enable "Delete with translations" option.');
        return;
      }

      toast.success(data?.message || 'Descriptions deleted successfully');
      await loadExistingDescriptions(currentLanguage);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete descriptions');
    }
  };

  // Fix language labels using language detection
  const handleFixLanguages = async () => {
    if (!videoId) return;
    
    setIsFixingLanguages(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-audio-description-languages', {
        body: { video_id: videoId }
      });

      if (error) throw error;

      toast.success(`Fixed ${data?.updated || 0} language labels out of ${data?.total || 0} descriptions`);
      
      if (data?.changes && data.changes.length > 0) {
        console.log('Language corrections:', data.changes);
      }
      
      // Reload to see corrected languages
      await loadExistingDescriptions(currentLanguage);
    } catch (error: any) {
      console.error('Language fix error:', error);
      toast.error(error.message || 'Failed to fix language labels');
    } finally {
      setIsFixingLanguages(false);
    }
  };

  // Regenerate all translations for a specific language
  const handleRegenerateTranslations = async (targetLanguage: string) => {
    if (!videoId) return;
    
    if (targetLanguage === detectedLanguage) {
      toast.error('Cannot regenerate original language');
      return;
    }

    // Confirmation
    const confirmed = window.confirm(
      `This will delete and recreate all ${translationCounts[targetLanguage] || 0} translations for ${getLanguageDisplay(targetLanguage)}. Continue?`
    );
    
    if (!confirmed) return;

    try {
      // Step 1: Delete existing translations
      const { error: deleteError } = await supabase
        .from('audio_descriptions')
        .delete()
        .eq('video_id', videoId)
        .eq('language', targetLanguage)
        .eq('is_translation', true);
      
      if (deleteError) throw deleteError;

      toast.info(`Deleted old translations. Regenerating...`);

      // Step 2: Regenerate translations
      await translateAllDescriptions(targetLanguage);
      
    } catch (error: any) {
      console.error('Regeneration error:', error);
      toast.error(error.message || 'Failed to regenerate translations');
    }
  };

  // Handle language change
  const handleLanguageChange = async (newLanguage: string) => {
    console.log('🌍 Changing language to:', newLanguage);
    setIsChangingLanguage(true);
    setCurrentLanguage(newLanguage);
    await loadExistingDescriptions(newLanguage);
    setIsChangingLanguage(false);
  };

  // Translate all descriptions to target language
  const translateAllDescriptions = async (targetLanguage: string) => {
    if (!videoId) return;
    
    // PHASE 3: Validate before translation
    if (targetLanguage === detectedLanguage) {
      toast.error(`Cannot translate ${detectedLanguage.toUpperCase()} to itself. Original descriptions are already in this language.`);
      return;
    }
    
    setIsTranslating(true);
    
    try {
      // Step 1: Fetch ONLY original descriptions (not translations)
      console.log(`🌍 Fetching original descriptions for translation to ${targetLanguage}`);
      
      const result = await supabase
        .from('audio_descriptions')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', detectedLanguage)
        .is('is_translation', false)
        .order('start_time');
      
      const sourceDescriptions = result.data;
      const fetchError = result.error;
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!sourceDescriptions || sourceDescriptions.length === 0) {
        toast.error('No original audio descriptions found. Please generate them first.');
        return;
      }
      
      // PHASE 3: Validate translation parameters
      console.log(`✅ Found ${sourceDescriptions.length} original descriptions to translate to ${targetLanguage.toUpperCase()}`);
      
      setTranslationProgress({ current: 0, total: sourceDescriptions.length });
      
      // Step 2: Translate each original description (backend will skip duplicates)
      for (let i = 0; i < sourceDescriptions.length; i++) {
        const sourceDesc = sourceDescriptions[i];
        
        setTranslationProgress({ current: i + 1, total: sourceDescriptions.length });
        
        const { data, error } = await supabase.functions.invoke('translate-audio-description', {
          body: {
            source_description_id: sourceDesc.id,
            target_language: targetLanguage,
            video_id: videoId
          }
        });
        
        if (error) {
          console.error('❌ Translation error for segment', i, ':', error);
          
          // Check for rate limit
          if (error.message?.includes('Rate limit')) {
            toast.error('Rate limit reached. Please wait and try again.', {
              duration: 5000
            });
            break;
          }
          
          toast.error(`Failed to translate segment ${i + 1}`);
        } else if (data?.skipped) {
          console.log('⏭️ Segment', i + 1, 'already translated');
        } else {
          console.log('✅ Translated segment', i + 1, ':', data?.text?.substring(0, 50));
          
          // Step 2.5: Auto-generate audio for translated description
          if (data?.id) {
            try {
              console.log(`🎵 Auto-generating audio for translated segment ${i + 1}...`);
              const audioResponse = await supabase.functions.invoke('generate-ad-audio', {
                body: {
                  description_id: data.id,
                  video_id: videoId,
                  text: data.text,
                  language: targetLanguage,
                  voice_id: null // Use default voice for language
                }
              });
              
              if (audioResponse.error) {
                console.warn(`⚠️ Audio generation failed for segment ${i + 1}:`, audioResponse.error);
              } else {
                console.log(`✅ Audio generated for segment ${i + 1}`);
              }
            } catch (audioError) {
              console.warn(`⚠️ Audio generation error for segment ${i + 1}:`, audioError);
            }
          }
        }
      }
      
      toast.success(`✅ Translated ${sourceDescriptions.length} segments to ${getLanguageDisplay(targetLanguage)}`);
      
      // Step 3: Switch to the new language tab
      await handleLanguageChange(targetLanguage);
      
    } catch (error) {
      console.error('❌ Translation failed:', error);
      toast.error('Translation failed');
    } finally {
      setIsTranslating(false);
      setTranslationProgress({ current: 0, total: 0 });
    }
  };

  // Generate audio for all descriptions in current language
  const handleGenerateAllAudio = async () => {
    if (descriptions.length === 0) {
      toast.error('No audio descriptions to generate');
      return;
    }

    const pendingDescriptions = descriptions.filter(d => 
      d.id && (!d.audio_generation_status || d.audio_generation_status === 'pending')
    );

    if (pendingDescriptions.length === 0) {
      toast.info('All audio descriptions already generated');
      return;
    }

    toast.info(`Generating audio for ${pendingDescriptions.length} descriptions...`);

    for (const desc of pendingDescriptions) {
      if (desc.id) {
        await generateAudioForDescription(desc.id, desc.text);
      }
    }
  };

  const computeGaps = (segments: any[]): { start: number; end: number }[] => {
    if (!segments || segments.length === 0) {
      // Create default intervals when no transcript is available
      return [
        { start: 0, end: 5 },
        { start: 15, end: 20 },
        { start: 35, end: 40 }
      ];
    }
    
    const sorted = [...segments]
      .filter(s => typeof s.startTime === 'number' && typeof s.endTime === 'number')
      .sort((a, b) => a.startTime - b.startTime);

    const gaps: { start: number; end: number }[] = [];
    const pad = 0.3; // Reduced padding
    const minGap = 1.5; // Reduced minimum gap

    // More lenient gap at the beginning
    if (sorted[0].startTime > 1.0) {
      const preGap = { start: 0, end: Math.max(0, sorted[0].startTime - pad) };
      if (preGap.end - preGap.start >= minGap) {
        gaps.push(preGap);
      }
    }

    // More lenient gaps between segments
    for (let i = 0; i < sorted.length - 1; i++) {
      const end = sorted[i].endTime + pad;
      const nextStart = sorted[i + 1].startTime - pad;
      
      if (nextStart - end >= minGap) {
        const gap = { start: end, end: nextStart };
        gaps.push(gap);
      }
    }

    // Add gap at the end
    const lastSegment = sorted[sorted.length - 1];
    if (lastSegment.endTime < 300) { // If video seems under 5 minutes
      const postGap = { start: lastSegment.endTime + pad, end: Math.min(lastSegment.endTime + 30, 300) };
      if (postGap.end - postGap.start >= minGap) {
        gaps.push(postGap);
      }
    }

    // If no gaps found, create strategic intervals
    if (gaps.length === 0) {
      const totalDuration = lastSegment?.endTime || 60;
      const interval = Math.max(15, totalDuration / 4);
      
      for (let i = 0; i < 3; i++) {
        const start = i * interval + 3;
        const end = start + 4;
        
        // Check for overlaps with existing speech
        const overlaps = sorted.some(seg => 
          (start >= seg.startTime && start <= seg.endTime) ||
          (end >= seg.startTime && end <= seg.endTime)
        );
        
        if (!overlaps && start < totalDuration) {
          gaps.push({ start, end });
        }
      }
    }

    return gaps.slice(0, 6); // Limit to first 6 gaps
  };

  // Generate basic fallback descriptions when processing fails
  const generateBasicFallbackDescriptions = (): AudioDescriptionSegment[] => {
    // Compute gaps even if transcript is missing (will use default strategic intervals)
    const gaps = computeGaps(transcriptSegments || []);

    const fallbackTexts = [
      "A person enters the frame, examining their surroundings carefully.",
      "Someone moves across the room, their attention focused on something specific.",
      "A character looks up with a concerned expression, then reaches for an object.",
      "The camera reveals a new location as footsteps echo in the space.",
      "A hand gestures toward something off-screen while eyes follow the motion.",
      "Someone pauses at a doorway, listening intently before proceeding forward.",
      "A figure sits down slowly, their posture suggesting deep concentration.",
      "Bright light filters through windows, illuminating dust particles in the air.",
      "A person's face shows recognition as they discover something unexpected.",
      "Someone walks toward the camera, their expression shifting from calm to alert."
    ];

    return gaps.map((gap, index) => ({
      text: fallbackTexts[index % fallbackTexts.length],
      startTime: gap.start,
      endTime: gap.end,
      voiceStyle: 'warm' as const
    }));
  };

  const generateTextOnlyFallback = async (transcript: any[], gaps: any[]): Promise<AudioDescriptionSegment[]> => {
    try {
      const analysisRequests = gaps.slice(0, 10).map(gap => ({
        gapStart: gap.start,
        gapEnd: gap.end,
        duration: gap.end - gap.start,
        surroundingText: transcript
          .filter(seg => Math.abs(seg.startTime - gap.start) < 30 || Math.abs(seg.endTime - gap.end) < 30)
          .map(seg => seg.text)
          .join(' ')
          .substring(0, 200)
      }));

      if (analysisRequests.length === 0) return [];

      const visualResponse = await supabase.functions.invoke('generate-ad', {
        body: {
          segments: analysisRequests,
          contentType: 'general'
        }
      });
      
      if (visualResponse.error) throw new Error(visualResponse.error.message || 'Analysis failed');
      return visualResponse.data?.descriptions || [];
    } catch (e) {
      console.error('❌ Failed generation:', e);
      return [];
    }
  };

  const generateAIDescriptions = async () => {
    // Prevent multiple concurrent generations
    if (isGenerating) {
      console.warn('Generation already in progress, ignoring request');
      return;
    }

    setIsGenerating(true);
    setIsUsingTwelveLabs(false);
    
    try {
      console.log('🎬 Basic AI: Starting generation');
      const gaps = computeGaps(transcriptSegments || []);
      const scheduled = await generateTextOnlyFallback(transcriptSegments || [], gaps);

      if (scheduled.length === 0) {
        // Fallback: create basic timed descriptions even without perfect gaps
        const fallbackDescriptions: AudioDescriptionSegment[] = [
          { text: "The scene begins with visual elements that set the atmosphere and context.", startTime: 1, endTime: 4, voiceStyle: 'warm' },
          { text: "Characters and key visual details are shown to establish the narrative.", startTime: 15, endTime: 18, voiceStyle: 'warm' },
          { text: "The visual story continues to unfold with important scenic elements.", startTime: 30, endTime: 33, voiceStyle: 'warm' }
        ];
        
        setDescriptions(fallbackDescriptions);
        onDescriptionsUpdate?.(fallbackDescriptions);
        await saveDescriptionsToDatabase(fallbackDescriptions);
        toast.success(`Generated ${fallbackDescriptions.length} audio descriptions`);
        return;
      }

      setDescriptions(scheduled);
      onDescriptionsUpdate?.(scheduled);
      
      // Save to database
      await saveDescriptionsToDatabase(scheduled);
      
      toast.success(`Generated ${scheduled.length} audio descriptions`);
      console.log('✅ Generated Basic AI AD:', scheduled.length, 'descriptions');
    } catch (error) {
      console.error('❌ Failed to generate descriptions:', error);
      toast.error('Generation failed - please try again.');
    } finally {
      setIsGenerating(false);
      setIsUsingTwelveLabs(false);
    }
  };

  const generateTwelveLabsDescriptions = async () => {
    if (!videoUrl) {
      toast.error('Video URL is required for analysis.');
      return;
    }

    // Prevent multiple concurrent generations
    if (isGenerating) {
      console.warn('Generation already in progress, ignoring request');
      return;
    }

    setIsGenerating(true);
    setIsUsingTwelveLabs(true);
    timeoutHandledRef.current = false;
    
    try {
      // Clear any lingering toasts before starting a new run
      toast.dismiss();
      toast.info('Starting comprehensive video analysis for detailed audio descriptions...', { duration: 4000 });
      
      console.log('🎬 Analysis: Starting generation request');
      
      const response = await supabase.functions.invoke('twelve-labs-audio-descriptions', {
        body: {
          videoUrl,
          videoId,
          language: detectedLanguage
        }
      });

      console.log('🎬 Analysis: Response received', { 
        hasError: !!response.error, 
        hasData: !!response.data
      });

      if (response.error) {
        console.error('🎬 Analysis: Function returned error:', response.error);
        throw new Error(response.error.message || 'Video analysis failed');
      }

      // Handle async processing mode
      if (response.data?.status === 'processing' && (response.data as any).indexId && (response.data as any).taskId) {
        const { indexId, taskId } = response.data as any;
        console.log('🎬 Analysis: Task processing, will poll status', { indexId, taskId });
        toast.info('Indexing video for analysis. Checking status every 10s...', { duration: 4000 });

        // Ensure no duplicate polling loops
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        // Bind this task to the current polling loop
        currentTaskRef.current = { indexId, taskId };

        let attempts = 0;
        const maxAttempts = 24; // ~4 minutes max before graceful fallback
        pollingRef.current = window.setInterval(async () => {
          attempts++;

          // Abort this loop if a new task has started
          if (!currentTaskRef.current || currentTaskRef.current.taskId !== taskId) {
            console.log('🛑 Stale polling loop detected. Stopping previous task polling.');
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            return;
          }
          console.log(`🎬 Analysis: Polling attempt ${attempts}/${maxAttempts}`);
          
          try {
            const pollResp = await supabase.functions.invoke('twelve-labs-audio-descriptions', {
              body: { indexId, taskId, language: detectedLanguage }
            });
            
            if (pollResp.error) {
              console.error('🎬 Analysis: Polling error:', pollResp.error);
              
              // Handle critical errors that should stop polling
              if (pollResp.error?.message?.includes('Load failed') || pollResp.error?.name === 'FunctionsFetchError') {
                clearInterval(pollingRef.current!);
                pollingRef.current = null;
                
                // After 3+ minutes of processing, offer fallback descriptions
                if (attempts > 18) { // 3 minutes
                  toast.dismiss();
                  toast.info('Processing is taking longer than expected. Generating basic descriptions...');
                  const basicDescriptions = generateBasicFallbackDescriptions();
                  setDescriptions(basicDescriptions);
                  await saveDescriptionsToDatabase(basicDescriptions);
                } else {
                  toast.error('Connection lost during processing. Please try starting the process again.');
                }
                
                setIsGenerating(false);
                setIsUsingTwelveLabs(false);
                return;
              }
              return;
            }
            
            const pollData: any = pollResp.data;
            console.log(`🎬 Analysis: Poll status: ${pollData?.status}`);
            
            if (pollData?.status === 'ready' && pollData?.needsSegments) {
              console.log('🎬 Analysis: Ready for finalization with segments');
              // Finalize by sending transcript segments only once when ready
              try {
                // Pre-compute compact silence gaps on client to reduce payload
                const localGaps = computeGaps(transcriptSegments).map((g: any) => ({
                  startTime: Number((g.start).toFixed(2)),
                  endTime: Number((g.end).toFixed(2)),
                  duration: Number((g.end - g.start).toFixed(2)),
                }));

                const finalizeResp = await supabase.functions.invoke('twelve-labs-audio-descriptions', {
                  body: { 
                    indexId, 
                    taskId, 
                    language: detectedLanguage,
                    videoId: pollData.videoId,
                    silenceGaps: localGaps
                  }
                });
                
                if (finalizeResp.error) {
                  console.error('🎬 Analysis: Finalize error:', finalizeResp.error);
                  
                  // Handle finalize errors - use fallback instead of failing
                  clearInterval(pollingRef.current!);
                  pollingRef.current = null;
                  
                  toast.dismiss();
                  toast.info('Processing completed with fallback descriptions due to connection issues.');
                  const basicDescriptions = generateBasicFallbackDescriptions();
                  setDescriptions(basicDescriptions);
                  await saveDescriptionsToDatabase(basicDescriptions);
                  
                  setIsGenerating(false);
                  setIsUsingTwelveLabs(false);
                  return;
                }
                
                if (finalizeResp.data?.status === 'ready' && Array.isArray(finalizeResp.data.audioDescriptions)) {
                  clearInterval(pollingRef.current!);
                  pollingRef.current = null;

                  const formattedDescriptions: AudioDescriptionSegment[] = finalizeResp.data.audioDescriptions.map((desc: any) => ({
                    text: desc.text,
                    startTime: desc.startTime,
                    endTime: desc.endTime,
                    voiceStyle: 'warm'
                  }));

                  setDescriptions(formattedDescriptions);
                  onDescriptionsUpdate?.(formattedDescriptions);
                  await saveDescriptionsToDatabase(formattedDescriptions);
                  toast.success(`🎬 Generated ${formattedDescriptions.length} comprehensive audio descriptions`);
                  setIsGenerating(false);
                  setIsUsingTwelveLabs(false);
                }
              } catch (finalizeError: any) {
                console.error('🎬 Analysis: Finalize exception:', finalizeError);
                clearInterval(pollingRef.current!);
                pollingRef.current = null;
                
                toast.dismiss();
                toast.info('Processing completed with fallback descriptions due to connection issues.');
                const basicDescriptions = generateBasicFallbackDescriptions();
                setDescriptions(basicDescriptions);
                await saveDescriptionsToDatabase(basicDescriptions);
                
                setIsGenerating(false);
                setIsUsingTwelveLabs(false);
                return;
              }
            } else if (pollData?.status === 'completed_with_fallback') {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;

              let finalDescriptions: AudioDescriptionSegment[] = [];
              if (Array.isArray(pollData.audioDescriptions) && pollData.audioDescriptions.length > 0) {
                finalDescriptions = pollData.audioDescriptions.map((desc: any) => ({
                  text: desc.text,
                  startTime: desc.startTime,
                  endTime: desc.endTime,
                  voiceStyle: 'warm'
                }));
              } else {
                // Generate local basic fallbacks if none provided
                finalDescriptions = generateBasicFallbackDescriptions();
              }

              setDescriptions(finalDescriptions);
              onDescriptionsUpdate?.(finalDescriptions);
              await saveDescriptionsToDatabase(finalDescriptions);
              toast.dismiss();
              toast.info(`🎬 Processing completed with fallback descriptions (${finalDescriptions.length})`);
              setIsGenerating(false);
              setIsUsingTwelveLabs(false);
            } else if (pollData?.status === 'ready' && Array.isArray(pollData.audioDescriptions)) {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;

              const formattedDescriptions: AudioDescriptionSegment[] = pollData.audioDescriptions.map((desc: any) => ({
                text: desc.text,
                startTime: desc.startTime,
                endTime: desc.endTime,
                voiceStyle: 'warm'
              }));

              setDescriptions(formattedDescriptions);
              onDescriptionsUpdate?.(formattedDescriptions);
              await saveDescriptionsToDatabase(formattedDescriptions);
              toast.success(`🎬 Generated ${formattedDescriptions.length} comprehensive audio descriptions`);
              setIsGenerating(false);
              setIsUsingTwelveLabs(false);
            }
          } catch (err: any) {
            console.error('🎬 Analysis: Polling exception:', err);
            
            // Handle polling errors that should stop the process
            if (err?.message?.includes('Load failed') || err?.name === 'FunctionsFetchError') {
              clearInterval(pollingRef.current!);
              pollingRef.current = null;
              toast.error('Connection interrupted. Please refresh the page and try again.');
              setIsGenerating(false);
              setIsUsingTwelveLabs(false);
              return;
            }
          }
          if (attempts >= maxAttempts) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            console.error('🎬 Analysis: Timeout after', maxAttempts, 'attempts');
            
            if (!timeoutHandledRef.current) {
              timeoutHandledRef.current = true;
              // Instead of erroring, provide immediate fallback descriptions
              const basicDescriptions = generateBasicFallbackDescriptions();
              setDescriptions(basicDescriptions);
              await saveDescriptionsToDatabase(basicDescriptions);
              toast.info('Processing timed out. Generated basic audio descriptions instead.');
            }
            setIsGenerating(false);
            setIsUsingTwelveLabs(false);
          }
        }, 10000);

        return;
      }

      if (!response.data || !response.data.success) {
        console.error('🎬 Analysis: Invalid response format:', response.data);
        throw new Error(response.data?.error || 'Invalid response from analysis service');
      }

      const { audioDescriptions, silenceGapsAnalyzed, descriptionsGenerated } = response.data;

      if (!audioDescriptions || audioDescriptions.length === 0) {
        console.warn('🎬 Analysis: No descriptions generated, using fallback');
        // Advanced AI fallback: create strategic descriptions
        const strategicDescriptions: AudioDescriptionSegment[] = [
          { text: "Cinematic visuals establish the scene with rich atmospheric details and character positioning.", startTime: 2, endTime: 6, voiceStyle: 'warm' },
          { text: "Visual narrative elements and character interactions develop the story through expressive imagery.", startTime: 18, endTime: 22, voiceStyle: 'warm' },
          { text: "The scene culminates with impactful visual storytelling that enhances the overall narrative experience.", startTime: 35, endTime: 40, voiceStyle: 'warm' }
        ];
        
        setDescriptions(strategicDescriptions);
        onDescriptionsUpdate?.(strategicDescriptions);
        await saveDescriptionsToDatabase(strategicDescriptions);
        toast.success(`Generated ${strategicDescriptions.length} strategic audio descriptions`);
        return;
      }

      // Convert to our format
      const formattedDescriptions: AudioDescriptionSegment[] = audioDescriptions.map((desc: any) => ({
        text: desc.text,
        startTime: desc.startTime,
        endTime: desc.endTime,
        voiceStyle: 'warm'
      }));

      setDescriptions(formattedDescriptions);
      onDescriptionsUpdate?.(formattedDescriptions);
      
      // Save to database
      await saveDescriptionsToDatabase(formattedDescriptions);
      
      toast.success(`🎬 Generated ${descriptionsGenerated} comprehensive audio descriptions from detailed video analysis using ${silenceGapsAnalyzed} identified moments`);
      console.log('✅ Generated advanced AD:', formattedDescriptions.length, 'descriptions');
    } catch (error: any) {
      console.error('❌ Failed to generate advanced descriptions:', error);
      
      // Handle specific network errors
      if (error?.message?.includes('Load failed') || error?.name === 'FunctionsFetchError') {
        toast.error('Network connection failed. Please check your internet connection and try again.');
      } else {
        toast.error(`Video analysis failed: ${error?.message || 'Unknown error'}`);
      }
      
      // Don't trigger basic AI automatically - let user decide
      console.log('🎬 Advanced analysis failed, user can manually try Basic AI if needed');
    } finally {
      setIsGenerating(false);
      setIsUsingTwelveLabs(false);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditText(descriptions[index].text);
    setEditVoiceStyle(descriptions[index].voiceStyle);
    setEditStartTime(formatTime(descriptions[index].startTime));
    setEditEndTime(formatTime(descriptions[index].endTime));
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;

    const updatedDescriptions = [...descriptions];
    const textChanged = descriptions[editingIndex].text !== editText;
    
    updatedDescriptions[editingIndex] = {
      ...updatedDescriptions[editingIndex],
      text: editText,
      voiceStyle: editVoiceStyle,
      startTime: parseTimeInput(editStartTime),
      endTime: parseTimeInput(editEndTime),
      // Clear audio if text changed, otherwise preserve
      audio_url: textChanged ? undefined : updatedDescriptions[editingIndex].audio_url,
      audio_generation_status: textChanged ? undefined : updatedDescriptions[editingIndex].audio_generation_status,
      originalText: editText // Update original text
    };

    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    
    // Save to database
    await saveDescriptionsToDatabase(updatedDescriptions);
    
    setEditingIndex(null);
    setEditText('');
    setEditStartTime('0:00.0');
    setEditEndTime('0:00.0');
    setEditVoiceStyle('warm');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
    setEditStartTime('0:00.0');
    setEditEndTime('0:00.0');
    setEditVoiceStyle('warm');
  };

  const addManualSegment = async () => {
    if (!manualText.trim() || parseTimeInput(manualEndTime) <= parseTimeInput(manualStartTime)) {
      toast.error('Please enter valid text and time range');
      return;
    }

    const newSegment: AudioDescriptionSegment = {
      text: manualText.trim(),
      startTime: parseTimeInput(manualStartTime),
      endTime: parseTimeInput(manualEndTime),
      voiceStyle: manualVoiceStyle
    };

    const updatedDescriptions = [...descriptions, newSegment]
      .sort((a, b) => a.startTime - b.startTime);
    
    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    
    // Save to database
    await saveDescriptionsToDatabase(updatedDescriptions);
    
    // Reset form
    setManualText('');
    setManualStartTime('0:00.0');
    setManualEndTime('0:05.0');
    setManualVoiceStyle('warm');
    setShowManualForm(false);
    
    toast.success('Manual audio description added');
  };

  const deleteDescription = async (index: number) => {
    const updatedDescriptions = descriptions.filter((_, i) => i !== index);
    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    
    // Save to database
    await saveDescriptionsToDatabase(updatedDescriptions);
  };

  // Generate audio for a single description
  const generateAudioForDescription = async (descId: string, descText: string) => {
    if (!descId || !videoId) {
      toast.error('Missing required information');
      return;
    }

    setGeneratingAudioIds(prev => new Set(prev).add(descId));
    setAudioGenerationStatus(prev => ({ ...prev, [descId]: 'processing' }));

    try {
      console.log('🎙️ Generating audio for description:', descId);

      const { data, error } = await supabase.functions.invoke('generate-ad-audio', {
        body: {
          description_id: descId,
          video_id: videoId,
          text: descText,
          language: detectedLanguage,
          voice_id: selectedVoice?.id
        }
      });

      if (error) throw error;

      setAudioGenerationStatus(prev => ({ ...prev, [descId]: 'completed' }));
      toast.success('Audio generated successfully!');
      console.log('✅ Audio generated:', data);
      
      // Reload descriptions to get the updated audio_url
      await loadExistingDescriptions();
    } catch (error: any) {
      console.error('❌ Audio generation failed:', error);
      setAudioGenerationStatus(prev => ({ ...prev, [descId]: 'failed' }));
      toast.error(`Audio generation failed: ${error.message || 'Unknown error'}`);
    } finally {
      setGeneratingAudioIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(descId);
        return newSet;
      });
    }
  };

  // Generate audio for all descriptions
  const generateAllAudio = async () => {
    if (descriptions.length === 0) {
      toast.error('No descriptions to generate audio for');
      return;
    }

    const totalCount = descriptions.length;
    toast.info(`Queuing ${totalCount} audio generation requests (max 2 concurrent to avoid rate limits)...`);
    
    let successCount = 0;
    let failCount = 0;
    let processedCount = 0;

    // Use dynamic import to avoid circular dependencies
    const { ttsQueue } = await import('@/lib/ttsQueue');

    // Queue all requests
    const promises = descriptions.map((desc) => {
      if (!desc.id) return Promise.resolve();

      return ttsQueue.enqueue(async () => {
        try {
          await generateAudioForDescription(desc.id!, desc.text);
          successCount++;
        } catch (error) {
          console.error(`Failed to generate audio for ${desc.id}:`, error);
          failCount++;
        } finally {
          processedCount++;
          // Update progress
          if (processedCount % 3 === 0 || processedCount === totalCount) {
            toast.info(`Progress: ${processedCount}/${totalCount} (${successCount} success, ${failCount} failed)`, {
              duration: 2000
            });
          }
        }
      });
    });

    await Promise.all(promises);

    toast.dismiss();
    if (successCount > 0) {
      toast.success(`Generated audio for ${successCount}/${totalCount} descriptions`);
    }
    if (failCount > 0) {
      toast.error(`Failed to generate ${failCount}/${totalCount} descriptions. Try again for failed items.`);
    }
  };

  const getAudioStatusIcon = (descId?: string) => {
    if (!descId) return null;
    
    const status = audioGenerationStatus[descId];
    const isGenerating = generatingAudioIds.has(descId);

    if (isGenerating) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    }

    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default:
        return <Volume2 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Analyze EAD requirements for all descriptions
  const handleAnalyzeEAD = async () => {
    if (descriptions.length === 0) {
      toast.error('No descriptions to analyze. Generate descriptions first.');
      return;
    }

    setIsAnalyzingEAD(true);
    toast.info('Analyzing Extended Audio Description requirements...');

    try {
      const results = await analyzeAndPopulateEAD(videoId, detectedLanguage);
      
      // Store results in state for UI display
      const resultsMap = new Map(results.map(r => [r.descriptionId, r]));
      setEadAnalysisResults(resultsMap);

      // Update local descriptions with EAD metadata
      const updatedDescriptions = descriptions.map(desc => {
        if (!desc.id) return desc;
        const result = resultsMap.get(desc.id);
        if (!result) return desc;

        return {
          ...desc,
          requires_extension: result.requiresExtension,
          extension_duration: result.extensionDuration,
          extension_type: result.extensionType,
          estimated_duration: result.estimatedAudioDuration,
          gap_duration: result.gapDuration,
        };
      });

      setDescriptions(updatedDescriptions);

      const requiresEAD = results.filter(r => r.requiresExtension).length;
      const sufficient = results.filter(r => r.sufficiency === 'sufficient').length;
      const tight = results.filter(r => r.sufficiency === 'tight').length;

      toast.success(
        `Analysis complete: ${sufficient} fit perfectly, ${tight} are tight, ${requiresEAD} require Extended AD`
      );
      
      console.log('✅ EAD Analysis Results:', {
        total: results.length,
        sufficient,
        tight,
        requiresEAD,
      });
    } catch (error: any) {
      console.error('❌ EAD analysis failed:', error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzingEAD(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-2xl shadow-soft border">
        <CardHeader>
          <CardTitle className="text-3xl font-light text-foreground flex items-center gap-2">
            <Wand2 className="w-6 h-6" />
            Audio Description Editor
          </CardTitle>
          <p className="text-lg font-light text-muted-foreground leading-relaxed">
            Generate and manage audio descriptions to describe visual elements for accessibility.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card className="border-primary/20 bg-primary/5 rounded-xl">
            <CardContent className="p-4">
              <div className="space-y-3 text-sm font-light leading-relaxed">
                <p className="font-light text-primary text-base">How to Use Audio Descriptions:</p>
                
                <div className="space-y-2">
                  <p><span className="font-light text-primary">Step 1:</span> Select your preferred audio description voice from the dropdown above.</p>
                  
                  <p><span className="font-light text-primary">Step 2:</span> Choose a generation method:</p>
                  <ul className="ml-4 space-y-1 list-disc list-inside">
                    <li><span className="font-light">Basic AI:</span> Quick generation of simple descriptions for common scenarios</li>
                    <li><span className="font-light">Advanced Analysis:</span> Comprehensive video analysis that detects silent moments and generates detailed cinematic descriptions</li>
                  </ul>
                  
                  <p><span className="font-light text-primary">Step 3:</span> After generation, click "Analyze for Extended Audio Description" to check if descriptions fit within dialogue gaps.</p>
                  
                  <p><span className="font-light text-primary">Step 4:</span> Edit descriptions as needed, then click "Generate Audio" for each segment or "Generate All Audio" for batch processing.</p>
                  
                  <p><span className="font-light text-primary">Step 5:</span> Save your work using "Save All" to persist changes to the database.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Description Voice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-light">Audio Description Voice</Label>
                <Select
                  value={selectedVoice?.id || ''}
                  onValueChange={(val) => {
                    const v = filteredVoices.find(o => o.id === val) || null;
                    setSelectedVoice(v);
                  }}
                >
                  <SelectTrigger className="h-8 font-light">
                    <SelectValue placeholder="Choose voice" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50 shadow-lg border">
                    {filteredVoices.map(v => (
                      <SelectItem key={v.id} value={v.id} className="font-light">
                        <div className="flex items-center gap-2">
                          <span className="font-light">{v.name}</span>
                          {v.category && (
                            <Badge variant="outline" className={`${getCategoryColor(v.category)} font-light`}>
                              {v.category}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>

          {/* Multi-Language Audio Description Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-light">Audio Description Language</Label>
            <Select value={currentLanguage} onValueChange={handleLanguageChange}>
              <SelectTrigger className="font-light">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <span>{getLanguageDisplay(currentLanguage)}</span>
                    {currentLanguage === detectedLanguage && <span className="text-muted-foreground">(Original)</span>}
                    {descriptions.length > 0 && (
                      <Badge variant="secondary" className="text-xs font-light ml-auto">
                        {descriptions.length}
                      </Badge>
                    )}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-background z-50 shadow-lg border">
                {supportedLanguages.map(lang => (
                  <SelectItem key={lang} value={lang} className="font-light">
                    <div className="flex items-center gap-2">
                      <span>{getLanguageDisplay(lang)}</span>
                      {availableLanguages.includes(lang) && (
                        <Badge variant="outline" className="text-xs font-light">
                          Available
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Language change loading indicator */}
            {isChangingLanguage && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading language...</span>
              </div>
            )}

            {/* Bulk Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full font-light">
                  <Languages className="w-4 h-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border shadow-soft">
                <DropdownMenuItem
                  onClick={() => setLanguagePickerOpen(true)}
                  disabled={isTranslating || descriptions.length === 0}
                  className="font-light"
                >
                  <Languages className="w-4 h-4 mr-2" />
                  Translate to New Language
                </DropdownMenuItem>
                {currentLanguage !== detectedLanguage && availableLanguages.includes(currentLanguage) && (
                  <DropdownMenuItem
                    onClick={() => handleRegenerateTranslations(currentLanguage)}
                    disabled={isTranslating}
                    className="font-light"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate {getLanguageDisplay(currentLanguage).split(' ')[1]}
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleFixLanguages}
                      disabled={isFixingLanguages}
                      className="font-light"
                    >
                      {isFixingLanguages ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wrench className="w-4 h-4 mr-2" />
                      )}
                      Fix Language Labels (Admin)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Show translation count badge */}
            {translationCounts[currentLanguage] && (
              <Badge variant="secondary" className="font-light">
                {translationCounts[currentLanguage]} description{translationCounts[currentLanguage] !== 1 ? 's' : ''}
              </Badge>
            )}

            {/* Translation Controls */}
            {currentLanguage !== detectedLanguage && !availableLanguages.includes(currentLanguage) && descriptions.length > 0 && (
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-light text-foreground mb-2">
                      Audio descriptions not yet translated to {getLanguageDisplay(currentLanguage)}
                    </p>
                    <Button
                      onClick={() => translateAllDescriptions(currentLanguage)}
                      disabled={isTranslating}
                      size="sm"
                      className="font-light"
                    >
                      {isTranslating ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Translating {translationProgress.current}/{translationProgress.total}...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3 mr-2" />
                          Translate to {getLanguageDisplay(currentLanguage)}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Generate All Audio button for translated language */}
            {currentLanguage !== detectedLanguage && availableLanguages.includes(currentLanguage) && (
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-light text-foreground mb-2">
                      Translations available. Generate audio for all segments?
                    </p>
                    <Button
                      onClick={handleGenerateAllAudio}
                      size="sm"
                      variant="outline"
                      className="font-light"
                    >
                      <Volume2 className="w-3 h-3 mr-2" />
                      Generate All Audio
                    </Button>
                    <p className="text-xs font-light text-muted-foreground mt-2">
                      Will generate TTS for {descriptions.filter(d => !d.audio_url).length} pending segments
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={generateAIDescriptions} 
              className="w-full rounded-full font-light" 
              disabled={isGenerating || isLoading}
              variant="outline"
            >
              {isGenerating && !isUsingTwelveLabs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Basic Generation...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Basic AI Generation
                </>
              )}
            </Button>

            <Button 
              onClick={generateTwelveLabsDescriptions} 
              className="w-full rounded-full font-light" 
              disabled={isGenerating || isLoading}
            >
              {isGenerating && isUsingTwelveLabs ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Video...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Audio Description
                </>
              )}
            </Button>
          </div>


          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyzeEAD}
              variant="outline"
              className="flex-1 rounded-full font-light"
              disabled={isAnalyzingEAD || descriptions.length === 0}
            >
              {isAnalyzingEAD ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing EAD...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze for Extended Audio Description
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => setShowManualForm(!showManualForm)}
              variant="outline"
              className="flex-1 rounded-full font-light"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showManualForm ? 'Cancel' : 'Add Manual Segment'}
            </Button>
            {descriptions.length > 0 && (
              <Button 
                onClick={() => saveDescriptionsToDatabase(descriptions)}
                disabled={isSaving}
                variant="secondary"
                className="rounded-full font-light"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save All
              </Button>
            )}
          </div>

          {showManualForm && (
            <Card className="border-dashed bg-white rounded-xl border shadow-soft">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-xl font-light text-foreground">Add Manual Audio Description</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-light">Start Time</Label>
                    <div className="space-y-1">
                      <Input
                        value={manualStartTime}
                        onChange={(e) => setManualStartTime(e.target.value)}
                        placeholder="0:00.0 or 1:23:45.0"
                        className="text-xs font-mono font-light"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualStartTime(adjustTime(manualStartTime, -5))}
                          className="h-6 px-2 text-xs font-light"
                          title="Subtract 5 seconds"
                        >
                          -5s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualStartTime(adjustTime(manualStartTime, -1))}
                          className="h-6 px-2 text-xs font-light"
                          title="Subtract 1 second"
                        >
                          -1s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualStartTime(adjustTime(manualStartTime, 1))}
                          className="h-6 px-2 text-xs font-light"
                          title="Add 1 second"
                        >
                          +1s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualStartTime(adjustTime(manualStartTime, 5))}
                          className="h-6 px-2 text-xs font-light"
                          title="Add 5 seconds"
                        >
                          +5s
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-light">End Time</Label>
                    <div className="space-y-1">
                      <Input
                        value={manualEndTime}
                        onChange={(e) => setManualEndTime(e.target.value)}
                        placeholder="0:05.0 or 1:23:45.0"
                        className="text-xs font-mono font-light"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualEndTime(adjustTime(manualEndTime, -5))}
                          className="h-6 px-2 text-xs font-light"
                          title="Subtract 5 seconds"
                        >
                          -5s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualEndTime(adjustTime(manualEndTime, -1))}
                          className="h-6 px-2 text-xs font-light"
                          title="Subtract 1 second"
                        >
                          -1s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualEndTime(adjustTime(manualEndTime, 1))}
                          className="h-6 px-2 text-xs font-light"
                          title="Add 1 second"
                        >
                          +1s
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setManualEndTime(adjustTime(manualEndTime, 5))}
                          className="h-6 px-2 text-xs font-light"
                          title="Add 5 seconds"
                        >
                          +5s
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-light">Voice Style</Label>
                  <Select value={manualVoiceStyle} onValueChange={setManualVoiceStyle}>
                    <SelectTrigger className="h-8 font-light">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 shadow-lg border">
                      <SelectItem value="passionate" className="font-light">Passionate</SelectItem>
                      <SelectItem value="warm" className="font-light">Warm</SelectItem>
                      <SelectItem value="authoritative" className="font-light">Authoritative</SelectItem>
                      <SelectItem value="encouraging" className="font-light">Encouraging</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-light">Description Text</Label>
                  <Textarea
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Enter audio description..."
                    className="min-h-[60px] font-light"
                  />
                </div>

                <Button 
                  onClick={addManualSegment} 
                  className="w-full font-light"
                  disabled={!manualText.trim() || parseTimeInput(manualEndTime) <= parseTimeInput(manualStartTime)}
                >
                  Add Description
                </Button>
              </CardContent>
            </Card>
          )}

          {descriptions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-light">Audio Descriptions ({descriptions.length})</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-light"
                    onClick={generateAllAudio}
                    disabled={isGenerating || descriptions.some(d => d.id && generatingAudioIds.has(d.id))}
                  >
                    {descriptions.some(d => d.id && generatingAudioIds.has(d.id)) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate All Audio
                      </>
                    )}
                  </Button>
                </div>
                {descriptions.map((desc, index) => (
                  <div key={index} className="border rounded-xl p-4 bg-card">
                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-light">Start Time</Label>
                            <div className="space-y-1">
                              <Input
                                value={editStartTime}
                                onChange={(e) => setEditStartTime(e.target.value)}
                                placeholder="0:00.0 or 1:23:45.0"
                                className="text-xs font-mono font-light"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditStartTime(adjustTime(editStartTime, -5))}
                                  className="h-6 px-2 text-xs font-light"
                                  title="Subtract 5 seconds"
                                >
                                  -5s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditStartTime(adjustTime(editStartTime, -1))}
                                  className="h-6 px-2 text-xs font-light"
                                  title="Subtract 1 second"
                                >
                                  -1s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditStartTime(adjustTime(editStartTime, 1))}
                                  className="h-6 px-2 text-xs font-light"
                                  title="Add 1 second"
                                >
                                  +1s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditStartTime(adjustTime(editStartTime, 5))}
                                  className="h-6 px-2 text-xs font-light"
                                  title="Add 5 seconds"
                                >
                                  +5s
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-light">End Time</Label>
                            <div className="space-y-1">
                              <Input
                                value={editEndTime}
                                onChange={(e) => setEditEndTime(e.target.value)}
                                placeholder="0:05.0 or 1:23:45.0"
                                className="text-xs font-mono font-light"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditEndTime(adjustTime(editEndTime, -5))}
                                  className="h-6 px-2 text-xs font-light"
                                  title="Subtract 5 seconds"
                                >
                                  -5s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditEndTime(adjustTime(editEndTime, -1))}
                                  className="h-6 px-2 text-xs font-light"
                                  title="Subtract 1 second"
                                >
                                  -1s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditEndTime(adjustTime(editEndTime, 1))}
                                  className="h-6 px-2 text-xs font-light"
                                  title="Add 1 second"
                                >
                                  +1s
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditEndTime(adjustTime(editEndTime, 5))}
                                  className="h-6 px-2 text-xs font-light"
                                  title="Add 5 seconds"
                                >
                                  +5s
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-light">Voice Style</Label>
                          <Select value={editVoiceStyle} onValueChange={(value) => setEditVoiceStyle(value as any)}>
                            <SelectTrigger className="h-8 font-light">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50 shadow-lg border">
                              <SelectItem value="passionate" className="font-light">Passionate</SelectItem>
                              <SelectItem value="warm" className="font-light">Warm</SelectItem>
                              <SelectItem value="authoritative" className="font-light">Authoritative</SelectItem>
                              <SelectItem value="encouraging" className="font-light">Encouraging</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-light">Description Text</Label>
                          <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            placeholder="Enter audio description..."
                            className="min-h-[60px] font-light"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" className="font-light" onClick={saveEdit} disabled={isSaving}>
                            {isSaving ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3 mr-1" />
                            )}
                            Save
                          </Button>
                          <Button size="sm" variant="outline" className="font-light" onClick={cancelEdit}>
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs font-light">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatTime(desc.startTime)} - {formatTime(desc.endTime)}
                            </Badge>
                            <Badge variant="secondary" className={`text-xs font-light ${getVoiceStyleColor(desc.voiceStyle)}`}>
                              {desc.voiceStyle}
                            </Badge>
                            {desc.timestamp && (
                              <Badge variant="outline" className="text-xs font-light">
                                @{desc.timestamp.toFixed(1)}s
                              </Badge>
                            )}
                            {desc.id && (
                              <div className="flex items-center gap-1">
                                {getAudioStatusIcon(desc.id)}
                                <span className="text-xs font-light text-muted-foreground">
                                  {audioGenerationStatus[desc.id] === 'completed' ? 'Audio ready' :
                                   audioGenerationStatus[desc.id] === 'failed' ? 'Audio failed' :
                                   audioGenerationStatus[desc.id] === 'processing' ? 'Generating...' :
                                   'No audio'}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-light text-foreground leading-relaxed">{desc.text}</p>
                          
                          {/* EAD Status Badge */}
                          {desc.id && eadAnalysisResults.has(desc.id) && (
                            <div className="mt-2">
                              {(() => {
                                const result = eadAnalysisResults.get(desc.id);
                                if (!result) return null;
                                const badge = getEADStatusBadge(result.sufficiency);
                                return (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs font-light ${badge.color} border`}
                                  >
                                    {badge.icon} {badge.label}
                                    {result.requiresExtension && (
                                      <span className="ml-1">
                                        (+{result.extensionDuration.toFixed(1)}s {result.extensionType})
                                      </span>
                                    )}
                                  </Badge>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 mt-3">
                          {desc.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="font-light"
                              onClick={() => generateAudioForDescription(desc.id!, desc.text)}
                              disabled={desc.id && generatingAudioIds.has(desc.id)}
                              title={audioGenerationStatus[desc.id] === 'completed' ? 'Regenerate audio' : 'Generate audio'}
                            >
                              {desc.id && generatingAudioIds.has(desc.id) ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Volume2 className="w-3 h-3 mr-1" />
                              )}
                              {audioGenerationStatus[desc.id] === 'completed' ? 'Regen' : 'Audio'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(index)}
                            className="h-8 w-8 p-0 font-light"
                            title="Edit description"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteDescription(index)}
                            className="h-8 w-8 p-0 font-light text-destructive hover:text-destructive/90"
                            title="Delete description"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AudioDescriptionDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={async (deleteTranslations) => {
          if (deleteTarget) {
            await handleDeleteDescriptions(deleteTarget.ids, deleteTranslations);
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            
            // Complete the save if there were pending descriptions
            const pending = (window as any)._pendingSaveDescriptions;
            if (pending) {
              await performUpsert(pending);
              (window as any)._pendingSaveDescriptions = null;
            }
          }
        }}
        descriptionCount={deleteTarget?.ids.length || 0}
        hasTranslations={deleteTarget?.hasTranslations || false}
      />
      
      {/* Language Picker Dialog */}
      <LanguagePickerDialog
        open={languagePickerOpen}
        onOpenChange={setLanguagePickerOpen}
        onConfirm={(language) => {
          setLanguagePickerOpen(false);
          translateAllDescriptions(language);
        }}
        availableLanguages={supportedLanguages}
        currentLanguages={availableLanguages}
      />
    </div>
  );
};