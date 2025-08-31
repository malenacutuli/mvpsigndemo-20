import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Edit, Save, X, Plus, Trash2, Volume2, Clock, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { getNativeVoices, saveAudioDescription, loadAudioDescription, type VideoAudioDescription } from '@/lib/videoStorage';
import { useVideoStorage, type AudioDescription as StorageAudioDescription } from '@/hooks/useVideoStorage';

interface AudioDescriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging';
}

interface AudioDescriptionEditorProps {
  videoUrl: string;
  videoId: string;
  currentLanguage?: string;
  contentType?: 'recipe' | 'education';
  transcriptSegments?: any[];
  onDescriptionsUpdate?: (segments: AudioDescriptionSegment[]) => void;
}

export const AudioDescriptionEditor: React.FC<AudioDescriptionEditorProps> = ({
  videoUrl,
  videoId,
  currentLanguage = 'en',
  contentType = 'education',
  transcriptSegments = [],
  onDescriptionsUpdate
}) => {
  const [descriptions, setDescriptions] = useState<AudioDescriptionSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editVoiceStyle, setEditVoiceStyle] = useState<'passionate' | 'warm' | 'authoritative' | 'encouraging'>('warm');
  const { toast } = useToast();
  const { saveAudioDescriptions, loadAudioDescriptions } = useVideoStorage(videoId);

  // Load saved audio descriptions on component mount or language change
  useEffect(() => {
    const loadDescriptionsData = async () => {
      const loadedDescriptions = await loadAudioDescriptions(currentLanguage);
      if (loadedDescriptions.length > 0) {
        const convertedDescriptions = loadedDescriptions.map(desc => ({
          id: desc.id || `ad-${Date.now()}-${Math.random()}`,
          text: desc.description,
          startTime: desc.startTime,
          endTime: desc.endTime,
          voiceStyle: (desc.descriptionType === 'emotion' ? 'passionate' : 'warm') as any
        }));
        setDescriptions(convertedDescriptions);
        onDescriptionsUpdate?.(convertedDescriptions);
      } else {
        setDescriptions([]);
        onDescriptionsUpdate?.([]);
      }
    };
    loadDescriptionsData();
  }, [videoId, currentLanguage]);

  // Save audio descriptions when they change
  const saveDescriptions = async (segments: AudioDescriptionSegment[]) => {
    const storageDescriptions: StorageAudioDescription[] = segments.map(segment => ({
      startTime: segment.startTime,
      endTime: segment.endTime,
      description: segment.text,
      descriptionType: segment.voiceStyle === 'passionate' ? 'emotion' : 'visual' as const,
      confidence: 0.9
    }));
    
    await saveAudioDescriptions(storageDescriptions, currentLanguage);
  };

  // Get native voices for current language
  const nativeVoices = getNativeVoices(currentLanguage);
  
  const voiceStyles = [
    { value: 'passionate', label: 'Passionate', color: 'text-orange-400' },
    { value: 'warm', label: 'Warm', color: 'text-yellow-400' },
    { value: 'authoritative', label: 'Authoritative', color: 'text-red-400' },
    { value: 'encouraging', label: 'Encouraging', color: 'text-green-400' },
  ];

  const generateAIDescriptions = async () => {
    if (!transcriptSegments || transcriptSegments.length === 0) {
      toast({
        title: "No transcript available",
        description: "Please generate a transcript first before creating audio descriptions.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ad', {
        body: { 
          segments: transcriptSegments,
          contentType: contentType,
          language: currentLanguage,
          voiceOptions: nativeVoices // Include native voice options
        }
      });

      if (error) throw new Error(error.message || 'Audio description generation failed');

      if (data?.descriptions) {
        const aiDescriptions: AudioDescriptionSegment[] = data.descriptions.map((desc: any, index: number) => ({
          id: `ad-${Date.now()}-${index}`,
          text: desc.text,
          startTime: desc.startTime,
          endTime: desc.endTime,
          voiceStyle: desc.voiceStyle || 'warm'
        }));

        setDescriptions(aiDescriptions);
        saveDescriptions(aiDescriptions); // Save to storage
        onDescriptionsUpdate?.(aiDescriptions);
        
        toast({
          title: "Audio descriptions generated!",
          description: `Created ${aiDescriptions.length} descriptions using AI.`,
        });
      }
    } catch (error: any) {
      console.error('Audio description generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || 'Failed to generate audio descriptions',
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = (index: number) => {
    const segment = descriptions[index];
    setEditingIndex(index);
    setEditText(segment.text);
    setEditStartTime(formatTime(segment.startTime));
    setEditEndTime(formatTime(segment.endTime));
    setEditVoiceStyle(segment.voiceStyle);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    const updatedDescriptions = [...descriptions];
    updatedDescriptions[editingIndex] = {
      ...updatedDescriptions[editingIndex],
      text: editText,
      startTime: parseTimeInput(editStartTime),
      endTime: parseTimeInput(editEndTime),
      voiceStyle: editVoiceStyle,
    };
    
    // Sort segments by time after editing timing
    const sortedDescriptions = sortSegmentsByTime(updatedDescriptions);
    setDescriptions(sortedDescriptions);
    saveDescriptions(sortedDescriptions); // Save to storage
    onDescriptionsUpdate?.(sortedDescriptions);
    resetEditState();
    
    toast({
      title: "Description updated",
      description: "Audio description has been saved successfully.",
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
    setEditVoiceStyle('warm');
  };

  const findInsertPosition = (segments: AudioDescriptionSegment[], newStartTime: number): number => {
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].startTime > newStartTime) {
        return i;
      }
    }
    return segments.length;
  };

  const sortSegmentsByTime = (segments: AudioDescriptionSegment[]): AudioDescriptionSegment[] => {
    return [...segments].sort((a, b) => a.startTime - b.startTime);
  };

  const addNewSegment = (insertAfterIndex?: number) => {
    let newStartTime: number;
    
    if (insertAfterIndex !== undefined && descriptions[insertAfterIndex]) {
      newStartTime = descriptions[insertAfterIndex].endTime + 0.5;
    } else {
      const lastSegment = descriptions[descriptions.length - 1];
      newStartTime = lastSegment ? lastSegment.endTime + 0.5 : 0;
    }
    
    const newSegment: AudioDescriptionSegment = {
      id: `ad-${Date.now()}`,
      text: 'New audio description...',
      startTime: newStartTime,
      endTime: newStartTime + 3,
      voiceStyle: 'warm'
    };
    
    const insertPosition = findInsertPosition(descriptions, newStartTime);
    const updatedDescriptions = [...descriptions];
    updatedDescriptions.splice(insertPosition, 0, newSegment);
    
    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    
    // Start editing the new segment
    setTimeout(() => startEditing(insertPosition), 0);
  };

  const deleteSegment = (index: number) => {
    const updatedDescriptions = descriptions.filter((_, i) => i !== index);
    setDescriptions(updatedDescriptions);
    saveDescriptions(updatedDescriptions); // Save to storage
    onDescriptionsUpdate?.(updatedDescriptions);
    
    toast({
      title: "Description deleted",
      description: "Audio description segment has been removed.",
    });
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${minutes.toString().padStart(2, '0')}:${parseFloat(secs).toFixed(2).padStart(5, '0')}`;
  };

  const parseTimeInput = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return parseFloat(timeStr) || 0;
  };

  const exportDescriptions = () => {
    const voiceSection = nativeVoices.map(voice => 
      `${voice.name} (${voice.id}): ${voice.description}`
    ).join('\n');
    
    const content = `Audio Descriptions for Video: ${videoId}\nLanguage: ${currentLanguage}\nGenerated: ${new Date().toLocaleDateString()}\n\nNative Voices Available:\n${voiceSection}\n\nDescriptions:\n\n${descriptions.map(desc => 
      `[${formatTime(desc.startTime)} - ${formatTime(desc.endTime)}] (${desc.voiceStyle}): ${desc.text}`
    ).join('\n\n')}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-descriptions-${currentLanguage}-${videoId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Audio descriptions exported for ${currentLanguage}`
    });
  };

  const getVoiceStyleColor = (style: string) => {
    const styleObj = voiceStyles.find(v => v.value === style);
    return styleObj?.color || 'text-muted-foreground';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5" />
          Audio Description Editor
        </CardTitle>
        <div className="flex gap-2">
          <Button
            onClick={generateAIDescriptions}
            disabled={isGenerating || transcriptSegments.length === 0}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate AI Descriptions'}
          </Button>
          <Button
            variant="outline"
            onClick={() => addNewSegment()}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Description
          </Button>
          {descriptions.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => saveDescriptions(descriptions)}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save All
              </Button>
              <Button
                variant="outline"
                onClick={exportDescriptions}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export ({currentLanguage.toUpperCase()})
              </Button>
            </>
          )}
        </div>
        
        {/* Voice Information */}
        {nativeVoices.length > 0 && (
          <div className="text-xs bg-accent/10 rounded-lg p-3">
            <p className="font-medium mb-1">Native Voices Available ({currentLanguage.toUpperCase()}):</p>
            <div className="flex gap-2 flex-wrap">
              {nativeVoices.slice(0, 3).map(voice => (
                <Badge key={voice.id} variant="secondary" className="text-xs">
                  {voice.name}
                </Badge>
              ))}
              {nativeVoices.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{nativeVoices.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {descriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Volume2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No audio descriptions yet.</p>
              <p className="text-sm">Generate AI descriptions or add manual segments.</p>
            </div>
          ) : (
            descriptions.map((desc, index) => (
              <div key={desc.id}>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  {editingIndex === index ? (
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Start Time</Label>
                          <Input
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            placeholder="MM:SS.ms"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End Time</Label>
                          <Input
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            placeholder="MM:SS.ms"
                            className="h-8"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Voice Style</Label>
                        <Select value={editVoiceStyle} onValueChange={(value: any) => setEditVoiceStyle(value)}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {voiceStyles.map((style) => (
                              <SelectItem key={style.value} value={style.value}>
                                <span className={style.color}>{style.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Description Text</Label>
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          placeholder="Enter audio description..."
                          className="min-h-[60px]"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(desc.startTime)} - {formatTime(desc.endTime)}
                          </Badge>
                          <Badge variant="secondary" className={`text-xs ${getVoiceStyleColor(desc.voiceStyle)}`}>
                            {desc.voiceStyle}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">{desc.text}</p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addNewSegment(index)}
                          className="h-8 w-8 p-0"
                          title="Insert description after this one"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSegment(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {transcriptSegments.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Generate a transcript first to enable AI-powered audio description generation with native {currentLanguage.toUpperCase()} voices.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};