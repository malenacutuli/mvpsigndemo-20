import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Save, Edit, Play, Download, CheckCircle, Users, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CaptionSegment } from './CaptionsWithIntention';
import { CharacterManager } from './CharacterManager';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker: string;
  speakerColor: string;
  emphasis: 'normal' | 'loud' | 'quiet';
  pitch: 'normal' | 'high' | 'low';
}

interface TranscriptWorkflowProps {
  videoId: string;
  videoUrl: string;
  videoLanguage?: string; // Add video language prop
  onTranscriptReady: (segments: CaptionSegment[]) => void;
  onWorkflowComplete: () => void;
  onCharactersUpdate?: (characters: any[]) => void;
  onAudioDescriptionsUpdate?: (descriptions: any[]) => void;
}

export const TranscriptWorkflow: React.FC<TranscriptWorkflowProps> = ({
  videoId,
  videoUrl,
  videoLanguage,
  onTranscriptReady,
  onWorkflowComplete,
  onCharactersUpdate,
  onAudioDescriptionsUpdate
}) => {
  const [currentStep, setCurrentStep] = useState<'extract' | 'edit' | 'save' | 'complete'>('extract');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingLock, setSavingLock] = useState(false); // Prevent concurrent saves
  const [editingId, setEditingId] = useState<string | null>(null);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [characters, setCharacters] = useState<any[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string>(videoLanguage || 'en'); // Initialize with video language
  const { toast } = useToast();

  useEffect(() => {
    // Load existing transcript, audio descriptions, and characters if available
    console.log('🔄 TranscriptWorkflow - Loading existing video data for:', videoId);
    console.log('🔄 TranscriptWorkflow - Video language:', videoLanguage);
    
    // Reset state when switching videos
    setSegments([]);
    setCurrentStep('extract');
    setExtractionComplete(false);
    setEditingId(null);
    setCharacters([]);
    setAudioDescriptions([]);
    setDetectedLanguage(videoLanguage || 'en');
    
    // Load existing data for this video
    loadExistingTranscript();
  }, [videoId, videoLanguage]); // Re-run when videoId OR videoLanguage changes

  useEffect(() => {
    // Auto-convert segments to captions when they're loaded/updated
    if (segments.length > 0) {
      const captionSegments: CaptionSegment[] = segments.map(seg => ({
        text: seg.text,
        speaker: seg.speaker,
        startTime: seg.startTime,
        endTime: seg.endTime,
        words: seg.text.split(' ').map((word, i) => ({
          text: word,
          startTime: seg.startTime + (i * (seg.endTime - seg.startTime) / seg.text.split(' ').length),
          endTime: seg.startTime + ((i + 1) * (seg.endTime - seg.startTime) / seg.text.split(' ').length),
          emphasis: seg.emphasis,
          pitch: seg.pitch,
        })),
        volume: seg.emphasis === 'loud' ? 80 : seg.emphasis === 'quiet' ? 30 : 50,
        pitch: seg.pitch === 'high' ? 200 : seg.pitch === 'low' ? 120 : 160,
        type: 'dialogue',
        isOffCamera: false,
        speakerColor: seg.speakerColor,
      }));
      onTranscriptReady(captionSegments);
    }
  }, [segments, onTranscriptReady]);

  const loadExistingTranscript = async () => {
    try {
      console.log('🔍 TranscriptWorkflow - Starting dual-source loading for video:', videoId);
      console.log('🔍 TranscriptWorkflow - Detected language:', detectedLanguage);
      
      let loadedSegments: TranscriptSegment[] = [];
      let dataSource = 'none';
      
      // FIRST: Try loading from database (all languages)
      console.log('🗄️ Attempting to load from database...');
      const { data: dbData, error: dbError } = await supabase
        .from('transcript_segments')
        .select('*')  
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });
      
      if (dbError) {
        console.error('❌ Database load error:', dbError);
      } else if (dbData && dbData.length > 0) {
        console.log('✅ Found database data:', dbData.length, 'segments');
        dataSource = 'database';
        
        loadedSegments = dbData.map((seg, index) => ({
          id: seg.id,
          text: seg.text,
          startTime: Number(seg.start_time),
          endTime: Number(seg.end_time),
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          speakerColor: seg.speaker_color || getSpeakerColor(index),
          emphasis: (seg.emphasis as 'normal' | 'loud' | 'quiet') || 'normal',
          pitch: (seg.pitch as 'normal' | 'high' | 'low') || 'normal',
        }));
        
        if (dbData[0]?.language) {
          setDetectedLanguage(dbData[0].language);
        }
      }
      
      // FALLBACK: Try loading from localStorage if database failed
      if (loadedSegments.length === 0) {
        console.log('🗃️ Database empty, trying localStorage...');
        
        // Try specific language first
        let localData = null;
        const keys = [
          `transcript_${videoId}_${detectedLanguage}`,
          `transcript_${videoId}_latest`,
          `transcript_${videoId}_en`,
          `transcript_${videoId}_english`
        ];
        
        for (const key of keys) {
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.segments && parsed.segments.length > 0) {
                console.log('✅ Found localStorage data in key:', key, parsed.segments.length, 'segments');
                localData = parsed;
                dataSource = 'localStorage';
                break;
              }
            } catch (e) {
              console.error('❌ Failed to parse localStorage key:', key, e);
            }
          }
        }
        
        if (localData) {
          loadedSegments = localData.segments.map((seg: any, index: number) => ({
            id: seg.id || `segment-${index}`,
            text: seg.text,
            startTime: Number(seg.startTime),
            endTime: Number(seg.endTime),
            speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
            speakerColor: seg.speakerColor || getSpeakerColor(index),
            emphasis: seg.emphasis || 'normal',
            pitch: seg.pitch || 'normal',
          }));
          
          if (localData.language) {
            setDetectedLanguage(localData.language);
          }
        }
      }
      
      console.log('📊 TranscriptWorkflow - Loading summary:', {
        source: dataSource,
        segmentCount: loadedSegments.length,
        language: detectedLanguage,
        firstSegment: loadedSegments[0] ? {
          text: loadedSegments[0].text?.substring(0, 50) + '...',
          startTime: loadedSegments[0].startTime,
          speaker: loadedSegments[0].speaker
        } : null
      });

      if (loadedSegments.length > 0) {
        setSegments(loadedSegments);
        setCurrentStep('edit');
        setExtractionComplete(true);
        
        console.log('✅ TranscriptWorkflow - Loaded transcript from', dataSource, ':', loadedSegments.length, 'segments');
        console.log('✅ TranscriptWorkflow - Current step set to: edit');
        
        // If loaded from localStorage but not in database, try to save to database
        if (dataSource === 'localStorage') {
          console.log('🔄 Found localStorage data, attempting to sync to database...');
          setTimeout(async () => {
            try {
              await saveTranscript();
              console.log('✅ Successfully synced localStorage data to database');
            } catch (error) {
              console.error('❌ Failed to sync to database:', error);
            }
          }, 1000);
        }
      } else {
        console.log('ℹ️ TranscriptWorkflow - No transcript found in database or localStorage for video:', videoId);
        console.log('ℹ️ TranscriptWorkflow - Current step remains: extract');
      }
    } catch (error) {
      console.error('❌ TranscriptWorkflow - Failed to load existing transcript:', error);
    }
  };

  const getSpeakerColor = (index: number) => {
    const colors = ['#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5'];
    return colors[index % colors.length];
  };

  const extractTranscript = async () => {
    setIsExtracting(true);
    try {
      console.log('🎤 Starting transcript extraction for:', videoUrl);
      
      // Add detailed logging for debugging
      console.log('📋 Request details:', {
        videoId,
        videoUrl: videoUrl.substring(0, 100) + '...',
        language: detectedLanguage,
        rangeBytes: 200000000
      });
      
      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: { 
          videoUrl,
          videoId, // Pass videoId for database saving
          rangeBytes: 200000000,
          fullTranscript: true,
          forceReExtract: true, // Always force re-extract when user clicks the button
          language: detectedLanguage === 'auto' ? undefined : detectedLanguage
        }
      });

      console.log('🔍 Transcribe response:', {
        success: !error,
        error: error?.message,
        dataKeys: data ? Object.keys(data) : [],
        hasSegments: !!data?.segments,
        hasWords: !!data?.words,
        language: data?.language
      });

      if (error) {
        console.error('❌ Transcription API error:', {
          message: error.message,
          code: error.code,
          details: error.details || error
        });
        throw new Error(`Transcription failed: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No transcription data received');
      }

      console.log('✅ Extraction complete:', data);

      // Detect and store language
      const language = data.language || 'en';
      setDetectedLanguage(language);
      console.log('🌐 Detected language:', language);

      // Debug: Log the structure of the received data
      console.log('🔍 Data structure analysis:', {
        hasSegments: !!data.segments,
        segmentsLength: data.segments?.length || 0,
        hasWords: !!data.words,
        wordsLength: data.words?.length || 0,
        hasText: !!data.text,
        textLength: data.text?.length || 0,
        language: language,
        allKeys: Object.keys(data || {})
      });

      // Process the response to create segments
      let transcriptSegments: TranscriptSegment[] = [];
      
      if (data.segments && Array.isArray(data.segments)) {
        // Use segments if available (better structure)
        transcriptSegments = data.segments.map((seg: any, index: number) => ({
          id: `segment-${index}`,
          text: seg.text || '',
          startTime: Number(seg.start) || 0,
          endTime: Number(seg.end) || 0,
          speaker: `Speaker ${(index % 3) + 1}`,
          speakerColor: getSpeakerColor(index),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        }));
      } else if (data.words && Array.isArray(data.words)) {
        // Fallback to words processing
        const words = data.words;
        let currentSegment = { words: [] as any[], startTime: 0, endTime: 0 };
        
        words.forEach((word: any) => {
          if (currentSegment.words.length === 0) {
            currentSegment.startTime = Number(word.start) || 0;
          }
          
          currentSegment.words.push(word);
          currentSegment.endTime = Number(word.end) || 0;
          
          // End segment on punctuation or after 8-10 words
          const isEndOfSentence = word.word?.match(/[.!?]/) || currentSegment.words.length >= 10;
          if (isEndOfSentence) {
            transcriptSegments.push({
              id: `segment-${transcriptSegments.length}`,
              text: currentSegment.words.map(w => w.word || '').join(' '),
              startTime: currentSegment.startTime,
              endTime: currentSegment.endTime,
              speaker: `Speaker ${(transcriptSegments.length % 3) + 1}`,
              speakerColor: getSpeakerColor(transcriptSegments.length),
              emphasis: 'normal' as const,
              pitch: 'normal' as const,
            });
            currentSegment = { words: [], startTime: 0, endTime: 0 };
          }
        });

        // Handle remaining words
        if (currentSegment.words.length > 0) {
          transcriptSegments.push({
            id: `segment-${transcriptSegments.length}`,
            text: currentSegment.words.map(w => w.word || '').join(' '),
            startTime: currentSegment.startTime,
            endTime: currentSegment.endTime,
            speaker: `Speaker ${(transcriptSegments.length % 3) + 1}`,
            speakerColor: getSpeakerColor(transcriptSegments.length),
            emphasis: 'normal' as const,
            pitch: 'normal' as const,
          });
        }
      } else if (data.text) {
        // Fallback to simple text
        transcriptSegments = [{
          id: 'segment-0',
          text: data.text,
          startTime: 0,
          endTime: 30, // Default duration
          speaker: 'Speaker 1',
          speakerColor: getSpeakerColor(0),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        }];
      }

      setSegments(transcriptSegments);
      setExtractionComplete(true);
      
      toast({
        title: "Transcript extracted",
        description: `${transcriptSegments.length} segments extracted successfully. Saving...`
      });

      // Immediately trigger auto-save
      try {
        await saveTranscript();
        setCurrentStep('edit');
        toast({
          title: "Transcript saved",
          description: `Successfully saved ${transcriptSegments.length} segments to database`
        });
      } catch (saveError) {
        console.error('❌ Auto-save failed:', saveError);
        setCurrentStep('edit'); // Still allow editing even if save failed
        toast({
          title: "Save failed",
          description: "Transcript extracted but failed to save. You can try saving manually.",
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ Extraction error:', error);
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const updateSegment = (id: string, field: string, value: any) => {
    setSegments(prev => {
      const updated = prev.map(seg => 
        seg.id === id ? { ...seg, [field]: value } : seg
      );
      
      // Don't auto-save changes to avoid concurrent save conflicts
      // Manual save will handle all changes
      console.log('✏️ Segment updated, manual save required');
      
      return updated;
    });
  };

  const handleCharactersUpdate = (updatedCharacters: any[]) => {
    setCharacters(updatedCharacters);
    onCharactersUpdate?.(updatedCharacters);
    
    // Apply character properties to transcript segments
    const updatedSegments = segments.map(seg => {
      const character = updatedCharacters.find(char => char.name === seg.speaker);
      if (character) {
        return {
          ...seg,
          speakerColor: character.color,
          emphasis: character.emphasis || seg.emphasis,
          pitch: character.pitch || seg.pitch,
        };
      }
      return seg;
    });
    
    if (JSON.stringify(updatedSegments) !== JSON.stringify(segments)) {
      setSegments(updatedSegments);
      console.log('🔄 Segments refreshed with character updates');
    }
  };

  const handleAudioDescriptionsUpdate = (descriptions: any[]) => {
    setAudioDescriptions(descriptions);
    onAudioDescriptionsUpdate?.(descriptions);
    console.log('🔄 Audio descriptions updated and passed to parent');
  };

  const saveTranscript = async () => {
    if (segments.length === 0) {
      console.warn("⚠️ Attempted to save, but segments are empty.");
      return;
    }
    
    // Prevent concurrent saves
    if (savingLock) {
      console.log('🔒 Save operation already in progress, skipping...');
      return;
    }
    
    setSavingLock(true);
    setIsSaving(true);
    
    try {
      console.log('💾 Starting SIMPLIFIED save process...', segments.length, 'segments');

      // ALWAYS save to localStorage first
      const localStorageData = {
        segments: segments.map(seg => ({
          id: seg.id,
          text: seg.text,
          startTime: seg.startTime,
          endTime: seg.endTime,
          speaker: seg.speaker,
          speakerColor: seg.speakerColor,
          emphasis: seg.emphasis,
          pitch: seg.pitch
        })),
        language: detectedLanguage,
        videoId: videoId,
        timestamp: Date.now()
      };
      
      // Save to multiple localStorage keys for maximum reliability
      const keys = [
        `transcript_${videoId}_${detectedLanguage}`,
        `transcript_${videoId}_latest`,
        `transcript_${videoId}_backup`,
        `transcript_${videoId}_en`,
        `transcript_${videoId}_english`
      ];
      
      keys.forEach(key => {
        localStorage.setItem(key, JSON.stringify(localStorageData));
      });
      
      console.log('✅ Saved to localStorage with', keys.length, 'different keys');

      // Try database save, but don't fail if it doesn't work
      try {
        // Use a completely different approach - manual cleanup then simple insert
        console.log('🔄 Attempting database save...');
        
        // First, manually remove all existing segments
        const { error: deleteError } = await supabase
          .from('transcript_segments')
          .delete()
          .eq('video_id', videoId);
          
        if (deleteError) {
          console.warn('Delete error (may be expected if no existing data):', deleteError);
        }
        
        // Wait for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create new segments with guaranteed unique identifiers
        const now = Date.now();
        const segmentsToSave = segments.map((seg, index) => ({
          video_id: videoId,
          start_time: seg.startTime,
          end_time: seg.endTime,
          text: seg.text,
          speaker: seg.speaker || 'Speaker',
          speaker_color: seg.speakerColor || '#3B82F6',
          emphasis: seg.emphasis || 'normal',
          pitch: seg.pitch || 'normal',
          language: detectedLanguage,
          confidence: 0.95,
          segment_type: 'dialogue',
          is_off_camera: false
        }));

        // Single insert operation
        const { data, error } = await supabase
          .from('transcript_segments')
          .insert(segmentsToSave)
          .select();

        if (error) {
          console.error('❌ Database insert failed:', error);
          throw error;
        }

        console.log('✅ Database save successful:', data?.length || 0, 'segments');
        
        toast({
          title: "✅ Transcript saved to database!",
          description: `${data?.length || 0} segments saved successfully`
        });
        
      } catch (dbError) {
        console.error('❌ Database save failed, but localStorage succeeded:', dbError);
        toast({
          title: "✅ Transcript saved locally!",
          description: "Data is safe in localStorage, will sync to database later"
        });
      }

    } catch (error: any) {
      console.error('❌ Save operation failed:', error);
      toast({
        title: "❌ Save failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
      setSavingLock(false);
    }
  };

  const exportTranscript = () => {
    const text = segments.map(seg => 
      `[${seg.startTime.toFixed(1)}s - ${seg.endTime.toFixed(1)}s] ${seg.speaker}: ${seg.text}`
    ).join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${videoId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStepBadgeVariant = (step: string) => {
    if (currentStep === step) return 'default';
    if ((step === 'extract' && extractionComplete) || 
        (step === 'edit' && currentStep === 'complete') ||
        (step === 'save' && currentStep === 'complete')) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Transcript Workflow
        </CardTitle>
        <div className="flex gap-2">
          <Badge variant={getStepBadgeVariant('extract')}>1. Extract</Badge>
          <Badge variant={getStepBadgeVariant('edit')}>2. Edit</Badge>
          <Badge variant={getStepBadgeVariant('save')}>3. Save</Badge>
          <Badge variant={currentStep === 'complete' ? 'default' : 'outline'}>4. Complete</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentStep === 'extract' && (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Extract transcript from your video with detailed timing information
            </p>
            <Button 
              onClick={extractTranscript} 
              disabled={isExtracting}
              size="lg"
            >
              {isExtracting ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                  Extracting...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Extract Transcript
                </>
              )}
            </Button>
          </div>
        )}

        {currentStep === 'edit' && (
          <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Transcript
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Characters
              </TabsTrigger>
              <TabsTrigger value="audio-desc" className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Audio Descriptions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transcript" className="mt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Edit Transcript Details</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportTranscript}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                    {segments.length > 0 ? (
                      <Button onClick={saveTranscript} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save & Continue
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => {
                          setCurrentStep('complete');
                          onWorkflowComplete();
                        }}
                        variant="outline"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Workflow
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {segments.map((segment) => (
                    <Card key={segment.id} className="p-4">
                      <div className="grid gap-3">
                        <div className="flex items-center gap-2">
                          <Badge style={{ backgroundColor: segment.speakerColor, color: '#000' }}>
                            {segment.speaker}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(editingId === segment.id ? null : segment.id)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        {editingId === segment.id ? (
                          <div className="grid gap-2">
                            <Textarea
                              value={segment.text}
                              onChange={(e) => updateSegment(segment.id, 'text', e.target.value)}
                              rows={2}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-muted-foreground">Speaker</label>
                                <Input
                                  value={segment.speaker}
                                  onChange={(e) => updateSegment(segment.id, 'speaker', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Color</label>
                                <input
                                  type="color"
                                  value={segment.speakerColor}
                                  onChange={(e) => updateSegment(segment.id, 'speakerColor', e.target.value)}
                                  className="w-full h-8 rounded border"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-muted-foreground">Emphasis</label>
                                <Select value={segment.emphasis} onValueChange={(value) => updateSegment(segment.id, 'emphasis', value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="quiet">Quiet</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="loud">Loud</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Pitch</label>
                                <Select value={segment.pitch} onValueChange={(value) => updateSegment(segment.id, 'pitch', value)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm">{segment.text}</p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="characters" className="mt-4">
              <CharacterManager
                videoId={videoId}
                onCharactersUpdate={handleCharactersUpdate}
                existingCharacters={characters}
              />
            </TabsContent>

            <TabsContent value="audio-desc" className="mt-4">
              <AudioDescriptionEditor
                videoUrl={videoUrl}
                videoId={videoId}
                currentLanguage={detectedLanguage} // Use detected language instead of hardcoded 'en'
                contentType="education"
                transcriptSegments={segments}
                onDescriptionsUpdate={handleAudioDescriptionsUpdate}
              />
            </TabsContent>
          </Tabs>
        )}

        {currentStep === 'complete' && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-green-700">Transcript Ready!</h3>
              <p className="text-muted-foreground">
                Your transcript has been saved with all accessibility features enabled
              </p>
            </div>
            <Button onClick={onWorkflowComplete} size="lg">
              <Play className="w-4 h-4 mr-2" />
              Continue to Video Player
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};