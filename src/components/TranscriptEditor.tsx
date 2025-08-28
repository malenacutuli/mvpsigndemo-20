import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mic, Globe, Download, Edit, Save, X, Plus, Clock, User, Palette, Volume2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { saveTranscript, loadTranscript, type VideoTranscript } from '@/lib/videoStorage';
import { CharacterManager } from './CharacterManager';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  speakerColor?: string;
  emphasis?: 'loud' | 'quiet' | 'normal';
  pitch?: 'high' | 'low' | 'normal';
}

interface TranscriptEditorProps {
  videoUrl: string;
  videoId: string;
  initialLanguage?: string;
  onTranscriptUpdate?: (segments: TranscriptSegment[], language: string) => void;
  onContentGenerated?: (content: {
    captions: any[];
    audioDescription: any[];
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editSpeaker, setEditSpeaker] = useState('');
  const [editSpeakerColor, setEditSpeakerColor] = useState('');
  const [editEmphasis, setEditEmphasis] = useState<'loud' | 'quiet' | 'normal'>('normal');
  const [editPitch, setEditPitch] = useState<'high' | 'low' | 'normal'>('normal');
  const { toast } = useToast();

  // Load saved transcript on component mount
  useEffect(() => {
    const savedTranscript = loadTranscript(videoId, selectedLanguage);
    if (savedTranscript) {
      setEditingTranscript(savedTranscript.segments);
      setOriginalTranscript(savedTranscript.segments);
      onTranscriptUpdate?.(savedTranscript.segments, selectedLanguage);
    }
  }, [videoId]);

  // Load saved transcript when language changes
  useEffect(() => {
    const savedTranscript = loadTranscript(videoId, selectedLanguage);
    if (savedTranscript) {
      setEditingTranscript(savedTranscript.segments);
      onTranscriptUpdate?.(savedTranscript.segments, selectedLanguage);
    }
  }, [selectedLanguage]);

  // Save transcript when it changes
  const saveTranscriptData = (segments: TranscriptSegment[], language: string) => {
    const transcriptData: VideoTranscript = {
      videoId,
      language,
      segments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveTranscript(transcriptData);
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

  const generateOriginalTranscript = async () => {
      setIsGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke('transcribe', {
          body: { 
            videoUrl: videoUrl,
            rangeBytes: 200000000, // Increased to 200MB for full transcript extraction
            language: 'auto', // Auto-detect language
            fullTranscript: true, // Request complete transcript
            wordTimestamps: true // Request word-level timing
          }
        });

      if (error) throw new Error(error.message || 'Transcription failed');

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
              speaker: 'narrator',
              speakerColor: '#3B82F6',
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
              speaker: 'narrator',
              speakerColor: '#3B82F6',
              emphasis: 'normal',
              pitch: 'normal'
            });
          }
        });
      }

      setOriginalTranscript(segments);
      setEditingTranscript([...segments]);
      
      // Detect language from response and update state
      const detectedLanguage = data?.language || 'en';
      setSelectedLanguage(detectedLanguage);
      saveTranscriptData(segments, detectedLanguage); // Save to storage
      onTranscriptUpdate?.(segments, detectedLanguage);

      toast({
        title: "Transcript Generated",
        description: `Original transcript extracted in ${languages.find(l => l.code === detectedLanguage)?.name || detectedLanguage}`
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
      // Translate transcript
      const transcriptText = originalTranscript.map(s => s.text).join(' ');
      
      const { data: translationData, error: translationError } = await supabase.functions.invoke('generate-dubbing', {
        body: {
          text: transcriptText,
          targetLanguage: targetLanguage
        }
      });

      if (translationError) throw new Error(translationError.message || 'Translation failed');

      // Create translated segments by splitting the translated text
      let translatedSegments = originalTranscript;
      if (translationData.translatedText) {
        // Split translated text proportionally to original segments
        const translatedSentences = translationData.translatedText.split(/[.!?]+/).filter(s => s.trim());
        const segmentRatio = translatedSentences.length / originalTranscript.length;
        
        translatedSegments = originalTranscript.map((segment, index) => {
          const translatedIndex = Math.floor(index * segmentRatio);
          const translatedText = translatedSentences[translatedIndex] || segment.text;
          return {
            ...segment,
            text: translatedText.trim()
          };
        });
      }

      // Generate captions from translated segments
      const captions = translatedSegments.map(segment => ({
        text: segment.text,
        speaker: segment.speaker || 'narrator',
        startTime: segment.startTime,
        endTime: segment.endTime,
        words: segment.text.split(' ').map((word, wordIndex, wordArray) => {
          const wordDuration = (segment.endTime - segment.startTime) / wordArray.length;
          return {
            text: word,
            startTime: segment.startTime + (wordIndex * wordDuration),
            endTime: segment.startTime + ((wordIndex + 1) * wordDuration),
            emphasis: segment.emphasis || 'normal' as const,
            pitch: segment.pitch || 'normal' as const,
          };
        })
      }));

      // Generate audio descriptions
      const { data: adData, error: adError } = await supabase.functions.invoke('generate-ad', {
        body: {
          contentType: 'education',
          segments: translatedSegments.map(s => ({
            text: s.text,
            startTime: s.startTime,
            endTime: s.endTime
          }))
        }
      });

      const audioDescription = adError ? [] : (adData?.descriptions || []);

      setEditingTranscript(translatedSegments);
      setSelectedLanguage(targetLanguage);
      saveTranscriptData(translatedSegments, targetLanguage); // Save to storage
      
      onTranscriptUpdate?.(translatedSegments, targetLanguage);
      onContentGenerated?.({
        captions,
        audioDescription,
        dubbing: translationData
      });

      toast({
        title: "Content Generated",
        description: `Transcript, captions, and audio descriptions generated for ${languages.find(l => l.code === targetLanguage)?.name}`
      });

    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate translated content",
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const startEditing = (index: number) => {
    const segment = editingTranscript[index];
    setEditingIndex(index);
    setEditText(segment.text);
    setEditStartTime(segment.startTime.toString());
    setEditEndTime(segment.endTime.toString());
    setEditSpeaker(segment.speaker || 'narrator');
    setEditSpeakerColor(segment.speakerColor || '#3B82F6');
    setEditEmphasis(segment.emphasis || 'normal');
    setEditPitch(segment.pitch || 'normal');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const updated = [...editingTranscript];
    updated[editingIndex] = {
      ...updated[editingIndex],
      text: editText,
      startTime: parseTimeInput(editStartTime),
      endTime: parseTimeInput(editEndTime),
      speaker: editSpeaker,
      speakerColor: editSpeakerColor,
      emphasis: editEmphasis,
      pitch: editPitch,
    };
    
    // Sort segments by time after editing timing
    const sortedSegments = sortSegmentsByTime(updated);
    setEditingTranscript(sortedSegments);
    resetEditState();
  };

  const saveAllChanges = () => {
    saveTranscriptData(editingTranscript, selectedLanguage);
    
    // Immediately update the video player with changes
    console.log('💾 Saving all transcript changes and updating video player');
    onTranscriptUpdate?.(editingTranscript, selectedLanguage);
    
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

  const addNewSegment = (insertAfterIndex?: number) => {
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
      speaker: 'narrator',
      speakerColor: '#3B82F6',
      emphasis: 'normal',
      pitch: 'normal'
    };
    
    const insertPosition = findInsertPosition(editingTranscript, newStartTime);
    const updated = [...editingTranscript];
    updated.splice(insertPosition, 0, newSegment);
    
    setEditingTranscript(updated);
    onTranscriptUpdate?.(updated, selectedLanguage);
    
    // Start editing the new segment
    startEditing(insertPosition);
  };

  const deleteSegment = (index: number) => {
    const updated = editingTranscript.filter((_, i) => i !== index);
    setEditingTranscript(updated);
    saveTranscriptData(updated, selectedLanguage); // Save to storage
    onTranscriptUpdate?.(updated, selectedLanguage);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const parseTimeInput = (timeStr: string): number => {
    if (timeStr.includes(':')) {
      const [mins, secs] = timeStr.split(':');
      return parseInt(mins) * 60 + parseFloat(secs);
    }
    return parseFloat(timeStr) || 0;
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Transcript & Content Generation</CardTitle>
            <Badge variant="outline">
              {languages.find(l => l.code === selectedLanguage)?.name || 'English'}
            </Badge>
          </div>
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
            onValueChange={(value) => {
              if (value !== selectedLanguage) {
                generateTranslatedContent(value);
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
        </div>

        {/* Transcript Segments */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {editingTranscript.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Generate transcript to start editing</p>
            </div>
          ) : (
            editingTranscript.map((segment, index) => (
              <div key={segment.id} className="p-3 border rounded-lg bg-muted/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
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
                  {editingIndex !== index && (
                   <div className="flex gap-1">
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={() => startEditing(index)}
                       className="h-6 w-6 p-0"
                       title="Edit segment"
                     >
                       <Edit className="w-3 h-3" />
                     </Button>
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={() => addNewSegment(index)}
                       className="h-6 w-6 p-0"
                       title="Insert segment after this one"
                     >
                       <Plus className="w-3 h-3" />
                     </Button>
                     <Button
                       size="sm"
                       variant="ghost"
                       onClick={() => deleteSegment(index)}
                       className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                       title="Delete segment"
                     >
                       <X className="w-3 h-3" />
                     </Button>
                   </div>
                  )}
                </div>
                
                {editingIndex === index ? (
                  <div className="space-y-4">
                    {/* Text Editor */}
                    <div className="space-y-2">
                      <Label className="text-xs">Text</Label>
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[60px]"
                        autoFocus
                      />
                    </div>
                    
                    {/* Timing Controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Start Time
                        </Label>
                        <Input
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                          placeholder="0:00.0"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          End Time
                        </Label>
                        <Input
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                          placeholder="0:03.0"
                          className="text-xs"
                        />
                      </div>
                    </div>
                    
                    {/* Speaker & Styling */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Speaker
                        </Label>
                        <Input
                          value={editSpeaker}
                          onChange={(e) => setEditSpeaker(e.target.value)}
                          placeholder="narrator"
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Palette className="w-3 h-3" />
                          Color
                        </Label>
                        <Input
                          type="color"
                          value={editSpeakerColor}
                          onChange={(e) => setEditSpeakerColor(e.target.value)}
                          className="h-8 p-1"
                        />
                      </div>
                    </div>
                    
                    {/* Emphasis & Pitch */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          Emphasis
                        </Label>
                        <Select value={editEmphasis} onValueChange={(value) => setEditEmphasis(value as 'loud' | 'quiet' | 'normal')}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="loud">Loud</SelectItem>
                            <SelectItem value="quiet">Quiet</SelectItem>
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
                  <p 
                    className="text-sm" 
                    style={{ color: segment.speakerColor }}
                  >
                    {segment.text}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Generation Info */}
        {selectedLanguage !== 'en' && editingTranscript.length > 0 && (
          <div className="text-xs text-muted-foreground p-2 bg-accent/10 rounded">
            <p>✓ Transcript translated to {languages.find(l => l.code === selectedLanguage)?.name}</p>
            <p>✓ Captions with intention generated</p>
            <p>✓ Audio descriptions created</p>
            <p>✓ Dubbing content prepared</p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Character Management */}
    {editingTranscript.length > 0 && (
      <CharacterManager 
        videoId={videoId}
        onCharactersUpdate={(characters) => {
          // Update transcript segments with character assignments
          const updatedSegments = editingTranscript.map(segment => {
            const matchedCharacter = characters.find(c => 
              c.name.toLowerCase() === (segment.speaker || 'narrator').toLowerCase()
            );
            return {
              ...segment,
              speaker: matchedCharacter?.name || segment.speaker || 'narrator',
              speakerColor: matchedCharacter?.color || segment.speakerColor || '#3B82F6'
            };
          });
          
          setEditingTranscript(updatedSegments);
          saveTranscriptData(updatedSegments, selectedLanguage);
          onTranscriptUpdate?.(updatedSegments, selectedLanguage);
        }}
        existingCharacters={
          // Extract unique characters from transcript
          Array.from(new Set(editingTranscript.map(s => s.speaker || 'narrator')))
            .map(speaker => ({
              id: `char-${speaker}`,
              name: speaker,
              type: 'main' as const,
              color: editingTranscript.find(s => s.speaker === speaker)?.speakerColor || '#3B82F6'
            }))
        }
      />
    )}
    </div>
  );
};