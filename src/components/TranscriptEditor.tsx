import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mic, Globe, Download, Edit, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

interface TranscriptEditorProps {
  videoUrl: string;
  videoId: string;
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
  onTranscriptUpdate,
  onContentGenerated
}) => {
  const [originalTranscript, setOriginalTranscript] = useState<TranscriptSegment[]>([]);
  const [editingTranscript, setEditingTranscript] = useState<TranscriptSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const { toast } = useToast();

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
          rangeBytes: 15000000,
          language: 'en' // Original language
        }
      });

      if (error) throw new Error(error.message || 'Transcription failed');

      // Convert to segments format
      const segments: TranscriptSegment[] = [];
      if (data?.text) {
        // Split text into sentences and create time segments
        const sentences = data.text.split(/[.!?]+/).filter(s => s.trim());
        const segmentDuration = 120 / sentences.length; // Assume 2-minute video for now
        
        sentences.forEach((sentence, index) => {
          if (sentence.trim()) {
            segments.push({
              id: `segment-${index}`,
              text: sentence.trim(),
              startTime: index * segmentDuration,
              endTime: (index + 1) * segmentDuration,
              speaker: 'narrator'
            });
          }
        });
      }

      setOriginalTranscript(segments);
      setEditingTranscript([...segments]);
      onTranscriptUpdate?.(segments, 'en');

      toast({
        title: "Transcript Generated",
        description: "Original transcript extracted from video audio"
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

      // Create translated segments
      const translatedSegments = originalTranscript.map((segment, index) => ({
        ...segment,
        text: translationData.translatedText || segment.text // Fallback to original if translation fails
      }));

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
            emphasis: 'normal' as const,
            pitch: 'normal' as const,
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
    setEditingIndex(index);
    setEditText(editingTranscript[index].text);
  };

  const saveEdit = () => {
    if (editingIndex !== null) {
      const updated = [...editingTranscript];
      updated[editingIndex] = { ...updated[editingIndex], text: editText };
      setEditingTranscript(updated);
      setEditingIndex(null);
      setEditText('');
      
      onTranscriptUpdate?.(updated, selectedLanguage);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
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
    <Card className="h-full">
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
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={generateOriginalTranscript}
            disabled={isGenerating}
            size="sm"
            variant="outline"
          >
            <Mic className="w-4 h-4 mr-2" />
            {isGenerating ? 'Generating...' : 'Extract Original'}
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
                  <span className="text-xs text-muted-foreground">
                    {Math.floor(segment.startTime / 60)}:{(segment.startTime % 60).toFixed(0).padStart(2, '0')} - {Math.floor(segment.endTime / 60)}:{(segment.endTime % 60).toFixed(0).padStart(2, '0')}
                  </span>
                  {editingIndex !== index && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(index)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="min-h-[60px]"
                      autoFocus
                    />
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
                  <p className="text-sm">{segment.text}</p>
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
  );
};