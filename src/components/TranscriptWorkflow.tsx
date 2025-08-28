import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Save, Edit, Play, Download, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CaptionSegment } from './CaptionsWithIntention';

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
  onTranscriptReady: (segments: CaptionSegment[]) => void;
  onWorkflowComplete: () => void;
}

export const TranscriptWorkflow: React.FC<TranscriptWorkflowProps> = ({
  videoId,
  videoUrl,
  onTranscriptReady,
  onWorkflowComplete
}) => {
  const [currentStep, setCurrentStep] = useState<'extract' | 'edit' | 'save' | 'complete'>('extract');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [extractionComplete, setExtractionComplete] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load existing transcript if available
    loadExistingTranscript();
  }, [videoId]);

  const loadExistingTranscript = async () => {
    try {
      const { data, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedSegments = data.map((seg, index) => ({
          id: seg.id,
          text: seg.text,
          startTime: seg.start_time,
          endTime: seg.end_time,
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          speakerColor: getSpeakerColor(index),
          emphasis: 'normal' as const,
          pitch: 'normal' as const,
        }));
        setSegments(loadedSegments);
        setCurrentStep('edit');
        setExtractionComplete(true);
      }
    } catch (error) {
      console.error('Error loading existing transcript:', error);
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
          wordTimestamps: true
        }
      });

      if (error) throw new Error(error.message || 'Transcription failed');

      console.log('✅ Extraction complete:', data);

      // Process the response to create segments
      const words = data.words || [];
      const transcriptSegments: TranscriptSegment[] = [];
      
      // Group words into meaningful segments (sentences/phrases)
      let currentSegment = { words: [] as any[], startTime: 0, endTime: 0 };
      
      words.forEach((word: any) => {
        if (currentSegment.words.length === 0) {
          currentSegment.startTime = word.start;
        }
        
        currentSegment.words.push(word);
        currentSegment.endTime = word.end;
        
        // End segment on punctuation or after 8-10 words
        const isEndOfSentence = word.word.match(/[.!?]/) || currentSegment.words.length >= 10;
        if (isEndOfSentence) {
          transcriptSegments.push({
            id: `segment-${transcriptSegments.length}`,
            text: currentSegment.words.map(w => w.word).join(' '),
            startTime: currentSegment.startTime,
            endTime: currentSegment.endTime,
            speaker: `Speaker ${(transcriptSegments.length % 3) + 1}`,
            speakerColor: getSpeakerColor(transcriptSegments.length),
            emphasis: 'normal',
            pitch: 'normal',
          });
          currentSegment = { words: [], startTime: 0, endTime: 0 };
        }
      });

      // Handle remaining words
      if (currentSegment.words.length > 0) {
        transcriptSegments.push({
          id: `segment-${transcriptSegments.length}`,
          text: currentSegment.words.map(w => w.word).join(' '),
          startTime: currentSegment.startTime,
          endTime: currentSegment.endTime,
          speaker: `Speaker ${(transcriptSegments.length % 3) + 1}`,
          speakerColor: getSpeakerColor(transcriptSegments.length),
          emphasis: 'normal',
          pitch: 'normal',
        });
      }

      setSegments(transcriptSegments);
      setCurrentStep('edit');
      setExtractionComplete(true);
      
      toast({
        title: "Transcript extracted",
        description: `${transcriptSegments.length} segments extracted successfully`
      });

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

  const saveTranscript = async () => {
    setIsSaving(true);
    try {
      console.log('💾 Saving transcript to database...');

      // First, delete existing segments for this video
      await supabase
        .from('transcript_segments')
        .delete()
        .eq('video_id', videoId);

      // Insert new segments
      const { error } = await supabase
        .from('transcript_segments')
        .insert(segments.map(seg => ({
          video_id: videoId,
          start_time: seg.startTime,
          end_time: seg.endTime,
          text: seg.text,
          speaker: seg.speaker,
          confidence: 0.95 // Default confidence
        })));

      if (error) throw error;

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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Edit Transcript Details</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportTranscript}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
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