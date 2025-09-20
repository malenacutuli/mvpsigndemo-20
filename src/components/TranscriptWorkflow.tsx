import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Save, Edit, Play, Download, CheckCircle, Users, Volume2, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CaptionSegment } from './CaptionsWithIntention';
import { CharacterManager } from './CharacterManager';
import { WordLevelEditor } from './WordLevelEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';
import { TranscriptUploader } from './TranscriptUploader';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker: string;
  speakerColor: string;
  emphasis: 'normal' | 'loud' | 'quiet' | 'yelling';
  pitch: 'normal' | 'high' | 'low';
  words?: Array<{
    text: string;
    emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
    pitch?: 'high' | 'low' | 'normal';
  }>;
}

interface TranscriptWorkflowProps {
  videoId: string;
  videoUrl: string;
  videoLanguage?: string;
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
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [wordEditingId, setWordEditingId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [audioDescriptions, setAudioDescriptions] = useState<any[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string>(videoLanguage || 'en');
  const [extractionMethod, setExtractionMethod] = useState<'whisper' | 'twelvelabs' | 'upload'>('whisper');
  const [showUploader, setShowUploader] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const { toast } = useToast();

  // Get unique detected speakers from segments
  const getDetectedSpeakers = () => {
    const speakers = Array.from(new Set(segments.map(seg => seg.speaker)));
    return speakers.map(speaker => ({
      name: speaker,
      color: segments.find(seg => seg.speaker === speaker)?.speakerColor || getSpeakerColor(speakers.indexOf(speaker))
    }));
  };

  const detectedSpeakers = getDetectedSpeakers();
  const hasCharacterMapping = characters.length > 0;

  useEffect(() => {
    console.log('🔄 TranscriptWorkflow - Loading existing video data for:', videoId);
    console.log('🔄 TranscriptWorkflow - Video language:', videoLanguage);
    
    // Reset state when switching videos
    setSegments([]);
    setCharacters([]);
    setAudioDescriptions([]);
    setDetectedLanguage(videoLanguage || 'en');
    setIsLoadingExisting(true);
    setHasTranscript(false);
    
    // Load existing data for this video
    loadExistingTranscript();
  }, [videoId, videoLanguage]);

  useEffect(() => {
    // Auto-convert segments to captions when they're loaded/updated
    if (segments.length > 0 && !isSaving) {
      console.log('🔄 Auto-converting segments to captions:', segments.length, 'segments');
      
      const captionSegments: CaptionSegment[] = segments.map(seg => {
        // Use existing word-level data if available, otherwise generate from segment
        const words = seg.words && seg.words.length > 0 
          ? seg.words.map((word, i) => ({
              text: word.text,
              startTime: seg.startTime + (i * (seg.endTime - seg.startTime) / seg.words!.length),
              endTime: seg.startTime + ((i + 1) * (seg.endTime - seg.startTime) / seg.words!.length),
              emphasis: word.emphasis || 'normal',
              pitch: word.pitch || 'normal',
            }))
          : seg.text.split(' ').map((word, i) => ({
              text: word,
              startTime: seg.startTime + (i * (seg.endTime - seg.startTime) / seg.text.split(' ').length),
              endTime: seg.startTime + ((i + 1) * (seg.endTime - seg.startTime) / seg.text.split(' ').length),
              emphasis: seg.emphasis || 'normal',
              pitch: seg.pitch || 'normal',
            }));

        return {
          text: seg.text,
          speaker: seg.speaker,
          startTime: seg.startTime,
          endTime: seg.endTime,
          words: words,
          volume: seg.emphasis === 'loud' ? 80 : seg.emphasis === 'yelling' ? 100 : seg.emphasis === 'quiet' ? 30 : 50,
          pitch: seg.pitch === 'high' ? 200 : seg.pitch === 'low' ? 120 : 160,
          type: 'dialogue',
          isOffCamera: false,
          speakerColor: seg.speakerColor,
        };
      });
      onTranscriptReady(captionSegments);
    }
  }, [segments, isSaving]);

  const loadExistingTranscript = async () => {
    try {
      console.log('🔍 TranscriptWorkflow - Loading existing data for video:', videoId);
      
      let loadedSegments: TranscriptSegment[] = [];
      
      // Load from database
      const { data: dbData, error: dbError } = await supabase
        .from('transcript_segments')
        .select('*')  
        .eq('video_id', videoId)
        .eq('language', detectedLanguage)
        .order('start_time', { ascending: true });
      
      if (!dbError && dbData && dbData.length > 0) {
        loadedSegments = dbData.map((seg, index) => ({
          id: seg.id,
          text: seg.text,
          startTime: Number(seg.start_time),
          endTime: Number(seg.end_time),
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          speakerColor: seg.speaker_color || getSpeakerColor(index),
          emphasis: (seg.emphasis as 'normal' | 'loud' | 'quiet' | 'yelling') || 'normal',
          pitch: (seg.pitch as 'normal' | 'high' | 'low') || 'normal',
        }));
        
        if (dbData[0]?.language) {
          setDetectedLanguage(dbData[0].language);
        }
      }

      if (loadedSegments.length > 0) {
        setSegments(loadedSegments);
        setHasTranscript(true);
        console.log('✅ TranscriptWorkflow - Loaded transcript:', loadedSegments.length, 'segments');
      } else {
        console.log('ℹ️ TranscriptWorkflow - No transcript found for video:', videoId);
      }
      
      setIsLoadingExisting(false);
    } catch (error) {
      console.error('❌ TranscriptWorkflow - Failed to load existing transcript:', error);
      setIsLoadingExisting(false);
    }
  };

  const getSpeakerColor = (index: number) => {
    const colors = ['#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5'];
    return colors[index % colors.length];
  };

  const handleTranscriptUploaded = (uploadedSegments: TranscriptSegment[], language: string) => {
    console.log('📁 Transcript uploaded:', uploadedSegments.length, 'segments in', language);
    setSegments(uploadedSegments);
    setDetectedLanguage(language);
    setHasTranscript(true);
    setShowUploader(false);
    
    // Save to database immediately
    saveTranscript();
    
    toast({
      title: "Transcript Uploaded",
      description: `Successfully uploaded ${uploadedSegments.length} segments`,
    });
  };

  const extractTranscript = async () => {
    setIsExtracting(true);
    try {
      console.log(`🎤 Starting ${extractionMethod} transcript extraction for:`, videoUrl);
      
      let data, error;
      
      if (extractionMethod === 'twelvelabs') {
        console.log('🎬 Using Extended Analysis for advanced video analysis');
        
        toast({
          title: "Starting Extended Analysis",
          description: "Using advanced analysis for speaker identification and audio descriptions",
          variant: "default",
        });
        
        const response = await supabase.functions.invoke('twelve-labs-analysis', {
          body: { 
            videoUrl,
            videoId,
            language: detectedLanguage === 'auto' ? undefined : detectedLanguage
          }
        });
        
        console.log('🎬 Extended Analysis response:', { data: response.data, error: response.error });
        data = response.data;
        error = response.error;
        
        if (data?.error || data?.errorType === 'twelve_labs_error') {
          console.error('🎬 Extended Analysis API error:', data.error);
          error = new Error(data.error || 'Extended Analysis failed');
          data = null;
        }
        
        if (data && !error && data.segments) {
          console.log('✅ Extended Analysis successful, segments received:', data.segments.length);
          toast({
            title: "Extended Analysis Complete",
            description: `Successfully analyzed video with ${data.segments.length} segments`,
            variant: "default",
          });
        }
        
        // Store audio descriptions from Extended Analysis if successful
        if (data?.audioDescriptions) {
          setAudioDescriptions(data.audioDescriptions);
          if (onAudioDescriptionsUpdate) {
            onAudioDescriptionsUpdate(data.audioDescriptions);
          }
        }
      }
      
      // If Extended Analysis failed or we're using Whisper, use Whisper extraction
      if (extractionMethod === 'whisper' || (extractionMethod === 'twelvelabs' && (error || !data))) {
        if (extractionMethod === 'twelvelabs' && (error || !data)) {
          console.warn('⚠️ Extended Analysis failed, falling back to Whisper. Error:', error);
          setExtractionMethod('whisper');
          
          toast({
            title: "Switched to Fast Mode",
            description: `Extended analysis failed: ${error?.message || 'Unknown error'}. Using fast transcription instead.`,
            variant: "destructive",
          });
        }
        
        console.log('🚀 Starting Whisper transcription...');
        
        const response = await supabase.functions.invoke('transcribe', {
          body: { 
            videoUrl,
            videoId,
            rangeBytes: 200000000,
            fullTranscript: true,
            forceReExtract: true,
            language: detectedLanguage === 'auto' ? undefined : detectedLanguage
          }
        });
        
        data = response.data;
        error = response.error;
      }

      console.log('🔍 Transcribe response:', {
        success: !error,
        error: error?.message,
        dataKeys: data ? Object.keys(data) : [],
        hasSegments: !!data?.segments,
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

      // Process transcript data
      let extractedSegments: TranscriptSegment[] = [];

      if (data.segments && Array.isArray(data.segments)) {
        extractedSegments = data.segments.map((segment: any, index: number) => {
          const speaker = segment.speaker || `Speaker ${(index % 3) + 1}`;
          const speakerColor = getSpeakerColor(index);
          
          return {
            id: `segment-${index}`,
            text: segment.text || '',
            startTime: Number(segment.startTime || segment.start || 0),
            endTime: Number(segment.endTime || segment.end || 0),
            speaker,
            speakerColor,
            emphasis: segment.emphasis as 'normal' | 'loud' | 'quiet' | 'yelling' || 'normal',
            pitch: segment.pitch as 'normal' | 'high' | 'low' || 'normal',
            words: segment.words || []
          };
        });
      }

      if (extractedSegments.length === 0) {
        throw new Error('No transcript segments extracted');
      }

      console.log('✅ Transcript extraction complete:', extractedSegments.length, 'segments');
      
      setSegments(extractedSegments);
      setHasTranscript(true);
      
      if (data.language) {
        setDetectedLanguage(data.language);
      }

      // Save to database
      await saveTranscript();

      toast({
        title: "Transcript Extracted Successfully",
        description: `Extracted ${extractedSegments.length} segments`,
        variant: "default",
      });

    } catch (error: any) {
      console.error('❌ Transcript extraction failed:', error);
      toast({
        title: "Extraction Failed",
        description: error.message || 'Failed to extract transcript',
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const saveTranscript = async () => {
    if (segments.length === 0 || isSaving) return;
    
    setIsSaving(true);
    
    try {
      console.log('💾 Saving transcript to database:', segments.length, 'segments');
      
      const segmentsData = segments.map((segment, idx) => ({
        idx,
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
        speaker: segment.speaker,
        speakerColor: segment.speakerColor,
        emphasis: segment.emphasis,
        pitch: segment.pitch,
        segmentType: 'dialogue',
        isOffCamera: false,
        words: segment.words
      }));

      const { error } = await supabase.functions.invoke('transcribe', {
        body: {
          videoId,
          segments: segmentsData,
          language: detectedLanguage,
          saveOnly: true
        }
      });

      if (error) throw error;

      console.log('✅ Transcript saved successfully');
    } catch (error) {
      console.error('❌ Failed to save transcript:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save transcript changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCharactersUpdate = (updatedCharacters: any[]) => {
    setCharacters(updatedCharacters);
    console.log('✅ Characters updated:', updatedCharacters.length, 'characters');
    
    if (onCharactersUpdate) {
      onCharactersUpdate(updatedCharacters);
    }
  };

  const handleAudioDescriptionsUpdate = (updatedDescriptions: any[]) => {
    setAudioDescriptions(updatedDescriptions);
    console.log('✅ Audio descriptions updated:', updatedDescriptions.length, 'descriptions');
    
    if (onAudioDescriptionsUpdate) {
      onAudioDescriptionsUpdate(updatedDescriptions);
    }
  };

  const handleSpeakerChange = (segmentIndex: number, newSpeaker: string) => {
    const updatedSegments = [...segments];
    const character = characters.find(char => char.name === newSpeaker);
    
    if (character) {
      updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        speaker: newSpeaker,
        speakerColor: character.color
      };
      
      setSegments(updatedSegments);
      saveTranscript();
    }
  };

  if (isLoadingExisting) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Loading Transcript Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4 py-8">
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">
              Loading existing transcript...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Transcript & Analysis
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="transcript" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transcript">Transcript & Analysis</TabsTrigger>
            <TabsTrigger value="audio-desc">Audio Descriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="space-y-6">
            {/* Step 1: Extract Complete Transcript */}
            {!hasTranscript && (
              <Card>
                <CardHeader>
                  <CardTitle>1. Extract Complete Transcript</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Extract transcript from your video with detailed timing information.
                  </p>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Extraction Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant={extractionMethod === 'whisper' ? 'default' : 'outline'}
                        onClick={() => {
                          setExtractionMethod('whisper');
                          setShowUploader(false);
                        }}
                        className="text-sm"
                      >
                        Fast Transcription
                      </Button>
                      <Button 
                        variant={extractionMethod === 'twelvelabs' ? 'default' : 'outline'}
                        onClick={() => {
                          setExtractionMethod('twelvelabs');
                          setShowUploader(false);
                        }}
                        className="text-sm"
                      >
                        Advanced Analysis
                      </Button>
                      <Button 
                        variant={extractionMethod === 'upload' ? 'default' : 'outline'}
                        onClick={() => {
                          setExtractionMethod('upload');
                          setShowUploader(true);
                        }}
                        className="text-sm"
                      >
                        Upload Transcript
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {extractionMethod === 'twelvelabs' 
                        ? 'Advanced analysis with speaker identification, visual descriptions & audio descriptions'
                        : extractionMethod === 'upload'
                        ? 'Upload your own transcript file (SRT, VTT, TXT) with timestamps for editing intonation'
                        : 'Fast transcription with basic speaker detection'
                      }
                    </p>
                  </div>
                  
                  {extractionMethod !== 'upload' ? (
                    <Button 
                      onClick={extractTranscript}
                      disabled={isExtracting || !videoUrl}
                      size="lg"
                      className="w-full"
                    >
                      {isExtracting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          {extractionMethod === 'twelvelabs' ? 'Analyzing with AI...' : 'Extracting transcript...'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4" />
                          {extractionMethod === 'twelvelabs' ? 'Start AI Analysis' : 'Extract Complete Transcript'}
                        </div>
                      )}
                    </Button>
                  ) : null}

                  {showUploader && (
                    <TranscriptUploader
                      onTranscriptUploaded={handleTranscriptUploaded}
                      onCancel={() => {
                        setShowUploader(false);
                        setExtractionMethod('whisper');
                      }}
                      className="mt-4"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 2: Character and Speaker Management (Show BEFORE transcript editor) */}
            {hasTranscript && (
              <Card>
                <CardHeader>
                  <CardTitle>2. Character & Speaker Management</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{characters.length} characters</span>
                    <span>•</span>
                    <span>{detectedSpeakers.length} detected speakers</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Character Management */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-3">Create Characters</h4>
                    <CharacterManager
                      videoId={videoId}
                      onCharactersUpdate={handleCharactersUpdate}
                      existingCharacters={characters}
                      language={videoLanguage}
                      existingSpeakers={detectedSpeakers.map(s => s.name)}
                    />
                  </div>

                  {/* Speaker Assignment */}
                  {characters.length > 0 && detectedSpeakers.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-3">3. Identify Speaker Assignment</h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Map each character to a detected transcript speaker. Colors come from Character Management.
                      </p>
                      
                      <div className="grid gap-2">
                        {detectedSpeakers.map(speaker => (
                          <div key={speaker.name} className="flex items-center gap-3 p-2 bg-muted rounded border">
                            <Badge 
                              className="min-w-20 justify-center"
                              style={{ 
                                backgroundColor: speaker.color,
                                color: '#000'
                              }}
                            >
                              {speaker.name}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Select 
                              value={speaker.name}
                              onValueChange={(characterName) => {
                                // Update all segments with this speaker
                                const character = characters.find(char => char.name === characterName);
                                if (character) {
                                  const updatedSegments = segments.map(seg => 
                                    seg.speaker === speaker.name 
                                      ? { ...seg, speaker: characterName, speakerColor: character.color }
                                      : seg
                                  );
                                  setSegments(updatedSegments);
                                  saveTranscript();
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 w-32">
                                <SelectValue placeholder="Assign to..." />
                              </SelectTrigger>
                              <SelectContent>
                                {characters.map(char => (
                                  <SelectItem key={char.id} value={char.name}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-3 h-3 rounded-full border"
                                        style={{ backgroundColor: char.color }}
                                      />
                                      {char.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 3: Editable Full Transcript (Show AFTER character assignment) */}
            {hasTranscript && hasCharacterMapping && (
              <Card>
                <CardHeader>
                  <CardTitle>3. Editable Full Transcript</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Edit text and intonation word-by-word. Change speakers using the dropdown if needed.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {segments.map((segment, index) => (
                      <div key={segment.id} className="border rounded-lg p-3 space-y-2">
                        {/* Speaker and timing info */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Select 
                              value={segment.speaker}
                              onValueChange={(newSpeaker) => handleSpeakerChange(index, newSpeaker)}
                            >
                              <SelectTrigger className="h-6 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {characters.map(char => (
                                  <SelectItem key={char.id} value={char.name}>
                                    <div className="flex items-center gap-1">
                                      <div 
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: char.color }}
                                      />
                                      {char.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <span>{segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s</span>
                        </div>
                        
                        {/* Segment text */}
                        {editingId === segment.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={segment.text}
                              onChange={(e) => {
                                const updatedSegments = [...segments];
                                updatedSegments[index].text = e.target.value;
                                setSegments(updatedSegments);
                              }}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingId(null);
                                  saveTranscript();
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <p 
                              className="text-sm flex-1 cursor-pointer hover:bg-muted/50 p-2 rounded"
                              onClick={() => setEditingId(segment.id)}
                              style={{ color: segment.speakerColor }}
                            >
                              {segment.text}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(segment.id)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show re-extract option if transcript exists */}
            {hasTranscript && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Transcript loaded ({segments.length} segments)
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setHasTranscript(false);
                      setSegments([]);
                      setCharacters([]);
                    }}
                    className="text-xs"
                  >
                    Re-extract Transcript
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="audio-desc">
            <AudioDescriptionEditor
              videoUrl={videoUrl}
              videoId={videoId}
              transcriptSegments={segments}
              onDescriptionsUpdate={handleAudioDescriptionsUpdate}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};