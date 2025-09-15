import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Mic, Globe, Download, Edit, Save, X, Plus, Clock, User, Palette, Volume2, Users, Type, Zap, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { saveTranscript, loadTranscript, type VideoTranscript } from '@/lib/videoStorage';
import { CharacterManager } from './CharacterManager';
import { WordLevelEditor, type WordData } from './WordLevelEditor';
import { useVideoStorage, type TranscriptSegment as StorageTranscriptSegment } from '@/hooks/useVideoStorage';
import { VocalIntensityIndicator } from './VocalIntensityIndicator';
import { useVocalIntensityAnalysis } from '@/hooks/useVocalIntensityAnalysis';
import { TranscriptUploader } from './TranscriptUploader';

interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
  speakerColor?: string;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: 'high' | 'low' | 'normal';
}

interface TranscriptEditorProps {
  videoUrl: string;
  videoId: string;
  initialLanguage?: string;
  onTranscriptUpdate?: (segments: TranscriptSegment[]) => void;
  onContentGenerated?: (content: any) => void;
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ca', name: 'Catalan' }
];

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
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [showUploader, setShowUploader] = useState(false);
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
  const [showAllSegments, setShowAllSegments] = useState(false);
  const { toast } = useToast();
  const { saveTranscriptSegments, loadTranscriptSegments } = useVideoStorage(videoId);
  const { isAnalyzing, analyzeVocalIntensity } = useVocalIntensityAnalysis();

  // Window and defer large transcript lists to avoid UI freezes on big videos
  const displayedSegmentsRaw = useMemo(() => (
    showAllSegments ? editingTranscript : editingTranscript.slice(-200)
  ), [editingTranscript, showAllSegments]);
  const displayedSegments = useDeferredValue(displayedSegmentsRaw);

  useEffect(() => {
    const loadTranscriptData = async () => {
      // Only load if we don't already have transcript data
      if (originalTranscript.length === 0) {
        const segments = await loadTranscriptSegments(selectedLanguage);
        if (segments.length > 0) {
          const transcriptSegments = segments.map(seg => ({
            id: seg.id,
            text: seg.text,
            startTime: seg.startTime,
            endTime: seg.endTime,
            speaker: seg.speaker || 'Speaker 1',
            speakerColor: seg.speakerColor || '#E5E517',
            emphasis: (seg.emphasis as any) || 'normal',
            pitch: (seg.pitch as any) || 'normal'
          }));
          setOriginalTranscript(transcriptSegments);
          setEditingTranscript([...transcriptSegments]);
          console.log('✅ Loaded existing transcript:', transcriptSegments.length, 'segments');
        }
      }
    };
    
    loadTranscriptData();
  }, [videoId, selectedLanguage, loadTranscriptSegments, originalTranscript.length]);

  const generateOriginalTranscript = async () => {
    setIsGenerating(true);
    try {
      console.log('🚀 Starting transcript generation for video:', videoUrl);
      
      const response = await supabase.functions.invoke('transcribe', {
        body: { 
          videoUrl,
          videoId,
          language: selectedLanguage === 'auto' ? undefined : selectedLanguage,
          rangeBytes: 200000000,
          fullTranscript: true
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to generate transcript');
      }
      
      const data = response.data;
      console.log('✅ Transcript generated:', data);
      
      if (data.segments) {
        const segments = data.segments.map((seg: any, index: number) => ({
          id: `segment-${index}`,
          text: seg.text,
          startTime: seg.start,
          endTime: seg.end,
          speaker: seg.speaker || `Speaker ${(index % 3) + 1}`,
          speakerColor: getSpeakerColor(index),
          emphasis: 'normal' as const,
          pitch: 'normal' as const
        }));
        
        setOriginalTranscript(segments);
        setEditingTranscript([...segments]);
        
        toast({
          title: "Transcript Generated",
          description: `Generated ${segments.length} transcript segments`,
        });
      }
      
    } catch (error) {
      console.error('❌ Transcript generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate transcript. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getSpeakerColor = (index: number) => {
    const colors = ['#E5E517', '#17E5E5', '#E51717', '#E58017', '#17E517', '#E517E5'];
    return colors[index % colors.length];
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}:${remainingSeconds.padStart(4, '0')}`;
  };

  const parseTimeString = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseFloat(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return parseFloat(timeStr) || 0;
  };

  const startEditing = (index: number) => {
    const segment = editingTranscript[index];
    setEditingIndex(index);
    setEditText(segment.text);
    setEditStartTime(formatTime(segment.startTime));
    setEditEndTime(formatTime(segment.endTime));
    setEditSpeaker(segment.speaker || '');
    setEditSpeakerColor(segment.speakerColor || '#E5E517');
    setEditEmphasis(segment.emphasis || 'normal');
    setEditPitch(segment.pitch || 'normal');
    
    const words = segment.text.split(' ').map((word, i) => ({
      text: word,
      emphasis: segment.emphasis || 'normal',
      pitch: segment.pitch || 'normal'
    }));
    setEditWords(words);
  };

  const saveEdit = async () => {
    if (editingIndex === null) return;
    
    const updatedSegment = {
      ...editingTranscript[editingIndex],
      text: editText,
      startTime: parseTimeString(editStartTime),
      endTime: parseTimeString(editEndTime),
      speaker: editSpeaker,
      speakerColor: editSpeakerColor,
      emphasis: editEmphasis,
      pitch: editPitch
    };
    
    const updatedTranscript = [...editingTranscript];
    updatedTranscript[editingIndex] = updatedSegment;
    setEditingTranscript(updatedTranscript);
    setEditingIndex(null);
    
    // Removed auto-save to prevent UI freezes from frequent full saves.
    // Changes are kept locally until you click "Save Changes to Video" above.
    // If needed, we can add an optional toggle to re-enable auto-save later.
    // await saveTranscriptSegments(updatedTranscript.map(seg => ({
    //   id: seg.id,
    //   text: seg.text,
    //   startTime: seg.startTime,
    //   endTime: seg.endTime,
    //   speaker: seg.speaker || '',
    //   speakerColor: seg.speakerColor || '#E5E517',
    //   emphasis: seg.emphasis || 'normal',
    //   pitch: seg.pitch || 'normal'
    // })), selectedLanguage);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  const addNewSegment = (afterIndex: number) => {
    const newSegment: TranscriptSegment = {
      id: `segment-${Date.now()}`,
      text: '',
      startTime: editingTranscript[afterIndex]?.endTime || 0,
      endTime: (editingTranscript[afterIndex]?.endTime || 0) + 3,
      speaker: 'Speaker 1',
      speakerColor: '#E5E517',
      emphasis: 'normal',
      pitch: 'normal'
    };
    
    const updatedTranscript = [...editingTranscript];
    updatedTranscript.splice(afterIndex + 1, 0, newSegment);
    setEditingTranscript(updatedTranscript);
    
    // Start editing the new segment immediately
    setTimeout(() => startEditing(afterIndex + 1), 100);
  };

  const deleteSegment = (index: number) => {
    if (editingTranscript.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "You must have at least one transcript segment.",
        variant: "destructive"
      });
      return;
    }
    
    const updatedTranscript = editingTranscript.filter((_, i) => i !== index);
    setEditingTranscript(updatedTranscript);
    
    toast({
      title: "Segment Deleted", 
      description: "Transcript segment has been removed.",
    });
  };

  const saveAllChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      console.log('💾 Saving all transcript changes to database...');
      
      // Save to video storage
      await saveTranscriptSegments(editingTranscript.map(seg => ({
        id: seg.id,
        text: seg.text,
        startTime: seg.startTime,
        endTime: seg.endTime,
        speaker: seg.speaker || '',
        speakerColor: seg.speakerColor || '#E5E517',
        emphasis: seg.emphasis || 'normal',
        pitch: seg.pitch || 'normal'
      })), selectedLanguage);
      
      toast({
        title: "Changes Saved",
        description: "All transcript changes have been saved successfully.",
      });

      // Notify the player in this tab to refresh (single source of truth)
      try {
        window.dispatchEvent(new CustomEvent('transcript-saved', { detail: { videoId, language: selectedLanguage } }));
      } catch {}
      
      // Avoid calling onTranscriptUpdate here to prevent double refresh/work
    } catch (error) {
      console.error('❌ Failed to save changes:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateTranslatedContent = async (targetLanguage: string) => {
    if (originalTranscript.length === 0) return;
    
    setIsTranslating(true);
    try {
      console.log('🌍 Generating translated content for:', targetLanguage);
      
      const response = await supabase.functions.invoke('generate-dubbing', {
        body: {
          originalSegments: originalTranscript,
          targetLanguage,
          videoId
        }
      });
      
      if (response.error) throw response.error;
      
      const translatedSegments = response.data.segments || [];
      setEditingTranscript(translatedSegments);
      setSelectedLanguage(targetLanguage);
      
      if (onContentGenerated) {
        onContentGenerated(response.data);
      }
      
      toast({
        title: "Translation Complete",
        description: `Content translated to ${languages.find(l => l.code === targetLanguage)?.name}`,
      });
      
    } catch (error) {
      console.error('❌ Translation failed:', error);
      toast({
        title: "Translation Failed",
        description: "Failed to generate translated content.",
        variant: "destructive"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const downloadTranscript = () => {
    const content = editingTranscript
      .map(segment => `${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}: [${segment.speaker}] ${segment.text}`)
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transcript-${videoId}-${selectedLanguage}.txt`;
    link.click();
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
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose how to create your transcript with timestamps for editing intonation and captions with intention.
            </p>
            
            {/* Two Options Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Option 1: Extract Transcript */}
              <Card className="p-4 border-2 hover:border-primary/50 transition-colors">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Mic className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-medium">1. Extract Complete Transcript</h4>
                  <p className="text-xs text-muted-foreground">
                    Connect to API function for automated transcription with speaker identification
                  </p>
                  <Button
                    onClick={generateOriginalTranscript}
                    disabled={isGenerating}
                    size="sm"
                    variant="default"
                    className="w-full"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Extracting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Extract Transcript
                      </div>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Option 2: Upload Transcript */}
              <Card className="p-4 border-2 hover:border-primary/50 transition-colors">
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5 text-secondary" />
                  </div>
                  <h4 className="font-medium">2. Upload Your Own Transcript</h4>
                  <p className="text-xs text-muted-foreground">
                    Upload transcript with timestamps (SRT, VTT, TXT formats)
                  </p>
                  <Button
                    onClick={() => setShowUploader(!showUploader)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {showUploader ? 'Cancel Upload' : 'Choose File'}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Upload Interface */}
            {showUploader && (
              <Card className="p-4 bg-blue-50 border-blue-200 mb-4">
                <h4 className="font-medium mb-3 text-blue-800">Upload Your Transcript File</h4>
                <TranscriptUploader
                  onTranscriptUploaded={(segments, language) => {
                    console.log('📁 Transcript uploaded to editor:', segments.length, 'segments');
                    // Convert to the format expected by TranscriptEditor
                    const editorSegments = segments.map(seg => ({
                      id: seg.id,
                      text: seg.text,
                      startTime: seg.startTime,
                      endTime: seg.endTime,
                      speaker: seg.speaker || 'Speaker 1',
                      speakerColor: seg.speakerColor || '#E5E517',
                      emphasis: seg.emphasis || 'normal',
                      pitch: seg.pitch || 'normal'
                    }));
                    
                    setOriginalTranscript(editorSegments);
                    setEditingTranscript([...editorSegments]);
                    setSelectedLanguage(language);
                    setShowUploader(false);
                    
                    toast({
                      title: "Transcript Uploaded",
                      description: `Successfully uploaded ${segments.length} segments`,
                    });
                  }}
                  onCancel={() => setShowUploader(false)}
                />
              </Card>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap items-center">
              <Button
                onClick={saveAllChanges}
                disabled={editingTranscript.length === 0 || isSaving}
                size="sm"
                variant="default"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving…' : 'Save Changes to Video'}
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
                onClick={downloadTranscript}
                disabled={editingTranscript.length === 0}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              
              <Button
                onClick={() => analyzeVocalIntensity(videoId, editingTranscript)}
                disabled={isAnalyzing || editingTranscript.length === 0}
                size="sm"
                variant="outline"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isAnalyzing ? 'Analyzing...' : 'Analyze Intensity'}
              </Button>

              <Button
                onClick={() => setShowAllSegments((v) => !v)}
                size="sm"
                variant="outline"
              >
                {showAllSegments ? 'Show recent 200' : 'Show all segments'}
              </Button>
            </div>
          </div>

          {/* Transcript Segments */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {editingTranscript.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Generate transcript to start editing</p>
              </div>
            ) : (
              <>
                {!showAllSegments && editingTranscript.length > 200 && (
                  <div className="text-xs text-muted-foreground">
                    Showing the most recent 200 of {editingTranscript.length} segments. Use "Show all segments" if needed.
                  </div>
                )}
                {displayedSegments.map((segment, localIndex) => {
                  const baseIndex = editingTranscript.length - displayedSegments.length;
                  const index = baseIndex + localIndex;
                  return (
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
                                placeholder="Speaker name"
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
                  );
                })}
              </>
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
    </div>
  );
};
