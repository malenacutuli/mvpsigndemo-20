import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Volume1, Mic, Save, Play, Pause } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TranscriptSegment {
  id: string;
  text: string;
  start_time: number;
  end_time: number;
  speaker: string;
  speaker_color: string;
  emphasis: string;
  pitch: string;
  words?: Array<{
    text: string;
    start: number;
    end: number;
    emphasis?: string;
    pitch?: string;
  }>;
}

interface IntonationEditorProps {
  videoId: string;
  language?: string;
  segments?: TranscriptSegment[];
  onSegmentUpdate?: (segmentId: string, updates: any) => void;
}

export const IntonationEditor: React.FC<IntonationEditorProps> = ({
  videoId,
  language = 'en',
  segments: propSegments,
  onSegmentUpdate
}) => {
  const [segments, setSegments] = useState<TranscriptSegment[]>(propSegments || []);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const { toast } = useToast();

  // Load transcript segments if not provided
  useEffect(() => {
    if (!propSegments || propSegments.length === 0) {
      loadSegments();
    }
  }, [videoId, language]);

  const loadSegments = async () => {
    try {
      const { data } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', language)
        .order('start_time');

      if (data) {
        // Convert database segments to our interface format
        const convertedSegments = data.map((segment: any) => ({
          ...segment,
          words: segment.words && typeof segment.words === 'object' && Array.isArray(segment.words) 
            ? segment.words 
            : []
        }));
        setSegments(convertedSegments);
      }
    } catch (error) {
      console.error('Failed to load segments:', error);
    }
  };

  const emphasisOptions = [
    { value: 'normal', label: 'Normal', icon: Volume1 },
    { value: 'soft', label: 'Soft', icon: VolumeX },
    { value: 'loud', label: 'Loud', icon: Volume2 },
    { value: 'whisper', label: 'Whisper', icon: Mic },
    { value: 'yell', label: 'Yell', icon: Volume2 }
  ];

  const pitchOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'low', label: 'Low' },
    { value: 'rising', label: 'Rising ↗' },
    { value: 'falling', label: 'Falling ↘' }
  ];

  const updateSegmentIntonation = (segmentId: string, field: 'emphasis' | 'pitch', value: string) => {
    const updatedSegments = segments.map(segment =>
      segment.id === segmentId ? { ...segment, [field]: value } : segment
    );
    setSegments(updatedSegments);

    // Notify parent component
    if (onSegmentUpdate) {
      const segment = segments.find(s => s.id === segmentId);
      if (segment) {
        onSegmentUpdate(segmentId, { [field]: value });
      }
    }
  };

  const updateWordIntonation = (segmentId: string, wordIndex: number, field: 'emphasis' | 'pitch', value: string) => {
    const updatedSegments = segments.map(segment => {
      if (segment.id === segmentId && segment.words) {
        const updatedWords = segment.words.map((word, index) =>
          index === wordIndex ? { ...word, [field]: value } : word
        );
        return { ...segment, words: updatedWords };
      }
      return segment;
    });
    setSegments(updatedSegments);

    // Notify parent component
    if (onSegmentUpdate) {
      const segment = segments.find(s => s.id === segmentId);
      if (segment) {
        onSegmentUpdate(segmentId, { words: updatedSegments.find(s => s.id === segmentId)?.words });
      }
    }
  };

  const saveIntonationChanges = async () => {
    try {
      // Prepare segment updates for the API
      const segmentUpdates = segments.map(segment => ({
        segment_id: segment.id,
        emphasis: segment.emphasis,
        pitch: segment.pitch,
        words: segment.words || []
      }));

      const response = await supabase.functions.invoke('video-analysis-workflow', {
        body: {
          videoId,
          action: 'save_intonation_settings',
          payload: {
            segment_updates: segmentUpdates,
            language
          }
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Intonation Saved",
        description: `Updated ${segmentUpdates.length} segments with new intonation settings`,
        variant: "default"
      });

      // Trigger captions refresh
      window.dispatchEvent(new CustomEvent('refresh-video-captions', { 
        detail: { videoId, language } 
      }));

    } catch (error: any) {
      console.error('Failed to save intonation:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save intonation changes. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEmphasisIcon = (emphasis: string) => {
    const option = emphasisOptions.find(opt => opt.value === emphasis);
    return option ? option.icon : Volume1;
  };

  const getEmphasisColor = (emphasis: string) => {
    switch (emphasis) {
      case 'whisper': return 'hsl(var(--muted))';
      case 'soft': return 'hsl(var(--primary) / 0.7)';
      case 'normal': return 'hsl(var(--primary))';
      case 'loud': return 'hsl(var(--warning))';
      case 'yell': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--primary))';
    }
  };

  const getPitchColor = (pitch: string) => {
    switch (pitch) {
      case 'high': return 'hsl(var(--secondary))';
      case 'low': return 'hsl(var(--accent))';
      case 'rising': return 'hsl(var(--success))';
      case 'falling': return 'hsl(var(--info))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Intonation Editor
          </CardTitle>
          <Button 
            onClick={saveIntonationChanges}
            className="flex items-center gap-2"
            variant="default"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Customize how each segment and individual words are emphasized and pitched according to Captions with Intention protocol.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">Emphasis: Normal → Soft → Loud → Whisper → Yell</Badge>
              <Badge variant="outline">Pitch: Normal → High → Low → Rising ↗ → Falling ↘</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {segments.map((segment, index) => {
          const EmphasisIcon = getEmphasisIcon(segment.emphasis);
          
          return (
            <Card 
              key={segment.id} 
              className={`transition-all ${selectedSegment === segment.id ? 'ring-2 ring-primary' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge 
                      style={{ backgroundColor: segment.speaker_color }}
                      className="text-white text-xs"
                    >
                      {segment.speaker}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EmphasisIcon 
                      className="h-4 w-4"
                      style={{ color: getEmphasisColor(segment.emphasis) }}
                    />
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getPitchColor(segment.pitch) }}
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Segment Text with Word Selection */}
                <div 
                  className="p-3 bg-muted/50 rounded-md cursor-pointer text-sm leading-relaxed"
                  onClick={() => setSelectedSegment(segment.id)}
                >
                  {segment.words && segment.words.length > 0 ? (
                    segment.words.map((word, wordIndex) => (
                      <span
                        key={wordIndex}
                        className={`inline-block mr-1 px-1 rounded cursor-pointer transition-colors ${
                          selectedSegment === segment.id && selectedWordIndex === wordIndex 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                        style={{
                          color: word.emphasis ? getEmphasisColor(word.emphasis) : 'inherit',
                          textDecoration: word.pitch && word.pitch !== 'normal' ? 'underline' : 'none'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSegment(segment.id);
                          setSelectedWordIndex(wordIndex);
                        }}
                      >
                        {word.text}
                      </span>
                    ))
                  ) : (
                    <span>{segment.text}</span>
                  )}
                </div>

                {/* Segment-Level Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Segment Emphasis</label>
                    <Select
                      value={segment.emphasis}
                      onValueChange={(value) => updateSegmentIntonation(segment.id, 'emphasis', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {emphasisOptions.map(option => {
                          const Icon = option.icon;
                          return (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-3 w-3" />
                                {option.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Segment Pitch</label>
                    <Select
                      value={segment.pitch}
                      onValueChange={(value) => updateSegmentIntonation(segment.id, 'pitch', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pitchOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Word-Level Controls (when word selected) */}
                {selectedSegment === segment.id && selectedWordIndex !== null && segment.words && (
                  <div className="border-t pt-3 mt-3">
                    <div className="text-xs font-medium mb-2">
                      Word: "{segment.words[selectedWordIndex]?.text}"
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium mb-1 block">Word Emphasis</label>
                        <Select
                          value={segment.words[selectedWordIndex]?.emphasis || 'normal'}
                          onValueChange={(value) => updateWordIntonation(segment.id, selectedWordIndex, 'emphasis', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {emphasisOptions.map(option => {
                              const Icon = option.icon;
                              return (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-3 w-3" />
                                    {option.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-medium mb-1 block">Word Pitch</label>
                        <Select
                          value={segment.words[selectedWordIndex]?.pitch || 'normal'}
                          onValueChange={(value) => updateWordIntonation(segment.id, selectedWordIndex, 'pitch', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pitchOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {segments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Volume2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transcript segments found. Please generate a transcript first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};