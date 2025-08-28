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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [characters, setCharacters] = useState<any[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string>(videoLanguage || 'en'); // Initialize with video language
  const { toast } = useToast();

  useEffect(() => {
    // Load existing transcript if available
    loadExistingTranscript();
  }, [videoId]);

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
      console.log('🔍 Loading existing transcript from database for video:', videoId);
      
      const { data, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });

      console.log('📊 Database query result:', { 
        error, 
        segmentCount: data?.length || 0,
        firstSegment: data?.[0] ? {
          text: data[0].text?.substring(0, 50) + '...',
          startTime: data[0].start_time,
          speaker: data[0].speaker
        } : null
      });

      if (error) {
        console.error('❌ Database query error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('✅ Found existing transcript with', data.length, 'segments');
        const loadedSegments = data.map((seg, index) => ({
          id: seg.id,
          text: seg.text,
          startTime: Number(seg.start_time),
          endTime: Number(seg.end_time),
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          speakerColor: getSpeakerColor(index),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        }));
        setSegments(loadedSegments);
        setCurrentStep('edit');
        setExtractionComplete(true);
        console.log('✅ Loaded existing transcript:', loadedSegments.length, 'segments');
      } else {
        console.log('ℹ️ No existing transcript found in database for video:', videoId);
      }
    } catch (error) {
      console.error('❌ Failed to load existing transcript:', error);
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
      
      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: { 
          videoUrl,
          rangeBytes: 200000000,
          fullTranscript: true,
          wordTimestamps: true,
          language: 'auto'
        }
      });

      console.log('🔍 Transcribe response:', { data, error });

      if (error) {
        console.error('❌ Transcribe error:', error);
        throw new Error(error.message || 'Transcription failed');
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
    setSegments(prev => prev.map(seg => 
      seg.id === id ? { ...seg, [field]: value } : seg
    ));
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
    
    setIsSaving(true);
    try {
      console.log('💾 Saving transcript to database...', segments.length, 'segments');

      // First, delete existing segments for this video
      const { error: deleteError } = await supabase
        .from('transcript_segments')
        .delete()
        .eq('video_id', videoId);

      if (deleteError) {
        console.error('❌ Delete error:', deleteError);
        throw deleteError;
      }

      // Insert new segments
      const segmentsToInsert = segments.map(seg => ({
        video_id: videoId,
        start_time: seg.startTime,
        end_time: seg.endTime,
        text: seg.text,
        speaker: seg.speaker,
        confidence: 0.95 // Default confidence
      }));

      console.log('📦 Segments to insert:', JSON.stringify(segmentsToInsert, null, 2));
      console.log('🔍 Video ID for insert:', videoId);

      const { data, error } = await supabase
        .from('transcript_segments')
        .insert(segmentsToInsert)
        .select();

      if (error) {
        console.error('❌ Insert error:', error.message, error.details, 'Segments attempted:', segmentsToInsert);
        console.error('🔍 Full error object:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Successfully saved', data?.length || 0, 'segments to database');

      // Convert to CaptionSegment format for the player
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
      setCurrentStep('complete');

      toast({
        title: "Transcript saved",
        description: "All changes have been saved to the database"
      });

    } catch (error: any) {
      console.error('❌ Save error:', error);
      toast({
        title: "Save failed", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
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