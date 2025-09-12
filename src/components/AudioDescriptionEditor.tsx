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
import { Loader2, Wand2, Save, Edit, X, Clock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AudioDescriptionSegment {
  id?: string;
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: 'passionate' | 'warm' | 'authoritative' | 'encouraging';
  timestamp?: number; // Optional timestamp for sync reference
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
  console.log('🎬 AudioDescriptionEditor rendered with:', {
    videoId,
    currentLanguage,
    contentType,
    transcriptSegmentsCount: transcriptSegments?.length || 0,
    transcriptSegments: transcriptSegments?.slice(0, 2) // Show first 2 for debugging
  });
  const [descriptions, setDescriptions] = useState<AudioDescriptionSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editVoiceStyle, setEditVoiceStyle] = useState<'passionate' | 'warm' | 'authoritative' | 'encouraging'>('warm');
  const [selectedVoice, setSelectedVoice] = useState<{ id: string; name: string; description: string } | null>(null);

  const language = currentLanguage || 'en';

  // Voice style determination
  const determineVoiceStyle = (text: string, contentType?: string): 'passionate' | 'warm' | 'authoritative' | 'encouraging' => {
    const lowerText = text.toLowerCase();
    
    if (contentType === 'recipe') {
      if (lowerText.includes('sizzl') || lowerText.includes('heat') || lowerText.includes('flame')) return 'passionate';
      if (lowerText.includes('gentle') || lowerText.includes('stir') || lowerText.includes('mix')) return 'warm';
      return 'authoritative';
    }
    
    if (lowerText.includes('learn') || lowerText.includes('student') || lowerText.includes('practice')) return 'encouraging';
    if (lowerText.includes('demonstrate') || lowerText.includes('show') || lowerText.includes('explain')) return 'authoritative';
    
    return 'warm';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVoiceStyleColor = (style: string): string => {
    switch (style) {
      case 'passionate': return 'text-red-600';
      case 'authoritative': return 'text-blue-600';
      case 'warm': return 'text-orange-600';
      case 'encouraging': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Estimate duration needed to read a description (seconds)
  const estimateDurationForText = (text: string): number => {
    const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
    const wps = 2.6; // ~2.6 words/sec for clarity
    return Math.min(5.0, Math.max(1.2, words / wps));
  };

  // Compute non-dialogue gaps with enhanced precision and overlap prevention
  const computeGaps = (segments: any[]): { start: number; end: number }[] => {
    if (!segments || segments.length === 0) return [{ start: 0, end: 9999 }];
    
    const sorted = [...segments]
      .filter(s => typeof s.startTime === 'number' && typeof s.endTime === 'number')
      .sort((a, b) => a.startTime - b.startTime);

    const gaps: { start: number; end: number }[] = [];
    const pad = 0.5; // Increased padding for better separation from dialogue

    console.log('🔍 Computing gaps from', sorted.length, 'segments with', pad, 'second padding');

    // Pre-roll gap with minimum duration check
    if (sorted[0].startTime > 2.0) {
      const preGap = { start: 0, end: Math.max(0, sorted[0].startTime - pad) };
      if (preGap.end - preGap.start >= 2.0) { // Minimum 2 seconds for meaningful description
        gaps.push(preGap);
        console.log(`📍 Pre-roll gap: ${preGap.start.toFixed(1)}s-${preGap.end.toFixed(1)}s (${(preGap.end - preGap.start).toFixed(1)}s)`);
      }
    }

    // Inter-segment gaps
    for (let i = 0; i < sorted.length - 1; i++) {
      const end = sorted[i].endTime + pad;
      const nextStart = sorted[i + 1].startTime - pad;
      
      // Require minimum gap of 2.0s for meaningful descriptions with better sync
      if (nextStart - end >= 2.0) {
        const gap = { start: end, end: nextStart };
        gaps.push(gap);
        console.log(`📍 Inter-segment gap ${i}: ${gap.start.toFixed(1)}s-${gap.end.toFixed(1)}s (${(gap.end - gap.start).toFixed(1)}s)`);
      } else {
        console.log(`⏭️ Gap ${i} too small: ${(nextStart - end).toFixed(1)}s (need 2.0s minimum)`);
      }
    }

    // Post-roll gap
    const lastSegment = sorted[sorted.length - 1];
    if (lastSegment.endTime < 9999) {
      const postGap = { start: lastSegment.endTime + pad, end: 9999 };
      if (postGap.end - postGap.start >= 2.0) {
        gaps.push(postGap);
        console.log(`📍 Post-roll gap: ${postGap.start.toFixed(1)}s-${postGap.end.toFixed(1)}s`);
      }
    }

    console.log(`✅ Found ${gaps.length} suitable gaps for audio descriptions`);
    return gaps;
  };

  // Simple transcript-based AD generation (working approach)
  const generateDescriptionsFromTranscript = async (videoId: string, transcript: any[]): Promise<AudioDescriptionSegment[]> => {
    console.log('📝 Generating AD from transcript gaps for', transcript.length, 'segments');

    // 1) Compute safe non-dialogue gaps
    const gaps = computeGaps(transcript);
    if (gaps.length === 0) {
      console.log('⚠️ No gaps available');
      return [];
    }

    // 2) Generate contextual descriptions using the transcript content (not video analysis)
    const segmentsPayload = transcript
      .filter(s => typeof s.text === 'string')
      .map(s => ({
        text: String(s.text || ''),
        startTime: Number(s.startTime || 0),
        endTime: Number(s.endTime || 0),
      }))
      .slice(0, 200);

    const { data, error } = await supabase.functions.invoke('generate-ad', {
      body: {
        contentType: 'general', // Use general content type to avoid cooking bias
        language: language,
        segments: segmentsPayload,
      }
    });

    if (error) {
      console.error('❌ generate-ad failed:', error);
      throw new Error(error.message || 'AD generation failed');
    }

    const proposals: Array<{ text: string; voiceStyle?: AudioDescriptionSegment['voiceStyle'] }> = (data as any)?.descriptions || [];
    if (!proposals.length) return [];

    // 3) Schedule proposals into gaps with durations estimated from text
    const scheduled: AudioDescriptionSegment[] = [];
    let gapIndex = 0;
    let cursor = gaps[0]?.start || 0;

    for (const p of proposals) {
      // Advance to next usable gap if current is exhausted
      while (gapIndex < gaps.length && cursor + 0.01 >= gaps[gapIndex].end) {
        gapIndex++;
        if (gapIndex < gaps.length) cursor = gaps[gapIndex].start;
      }
      if (gapIndex >= gaps.length) break;

      const gap = gaps[gapIndex];
      const dur = estimateDurationForText(p.text);
      const available = gap.end - cursor;

      if (available < 1.0) {
        // Too tight; move to next gap
        gapIndex++;
        if (gapIndex < gaps.length) cursor = gaps[gapIndex].start;
        continue;
      }

      const actualDur = Math.min(dur, available);
      const start = cursor;
      const end = start + actualDur;

      scheduled.push({
        text: p.text,
        startTime: start,
        endTime: end,
        voiceStyle: (p.voiceStyle as any) || determineVoiceStyle(p.text, 'general'),
        timestamp: (start + end) / 2,
      });

      // Small breathing room between items
      cursor = end + 0.2;
    }

    console.log(`✅ Scheduled ${scheduled.length} descriptions across ${gaps.length} gaps`);
    return scheduled;
  };

  const generateAIDescriptions = async () => {
    console.log('🎬 Generate AI Descriptions clicked!');
    console.log('📝 transcriptSegments:', transcriptSegments);
    console.log('📊 transcriptSegments length:', transcriptSegments?.length || 0);
    
    if (!transcriptSegments || transcriptSegments.length === 0) {
      toast.error("No transcript available - Please generate a transcript first to create audio descriptions");
      return;
    }

    setIsGenerating(true);
    try {
      const scheduled = await generateDescriptionsFromTranscript(videoId, transcriptSegments);

      if (scheduled.length === 0) {
        toast.error("No suitable silent gaps found to place audio descriptions");
        return;
      }

      setDescriptions(scheduled);
      onDescriptionsUpdate?.(scheduled);

      toast.success(`Audio descriptions generated! Placed ${scheduled.length} items in silence windows`);

      console.log('✅ Generated AD (scheduled):', scheduled);
    } catch (error) {
      console.error('❌ Failed to generate descriptions:', error);
      toast.error("Generation failed - Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditText(descriptions[index].text);
    setEditVoiceStyle(descriptions[index].voiceStyle);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;

    const updatedDescriptions = [...descriptions];
    updatedDescriptions[editingIndex] = {
      ...updatedDescriptions[editingIndex],
      text: editText,
      voiceStyle: editVoiceStyle,
      endTime: updatedDescriptions[editingIndex].startTime + estimateDurationForText(editText)
    };

    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    setEditingIndex(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const deleteDescription = (index: number) => {
    const updatedDescriptions = descriptions.filter((_, i) => i !== index);
    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Audio Description Generator ({language === 'es' ? 'Spanish' : 'English'})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Transcript-guided:</strong> We analyze the transcript to find silence windows and generate creative, on-screen descriptions that fit naturally into those gaps.
            </p>
          </div>

          <Button 
            onClick={generateAIDescriptions} 
            className="w-full" 
            disabled={isGenerating || !transcriptSegments || transcriptSegments.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Video Content...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate AI Descriptions ({transcriptSegments?.length || 0} transcript segments available)
              </>
            )}
          </Button>

          {descriptions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Generated Audio Descriptions ({descriptions.length})</h4>
                {descriptions.map((desc, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Voice Style</Label>
                          <Select value={editVoiceStyle} onValueChange={(value) => setEditVoiceStyle(value as any)}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="passionate">Passionate</SelectItem>
                              <SelectItem value="warm">Warm</SelectItem>
                              <SelectItem value="authoritative">Authoritative</SelectItem>
                              <SelectItem value="encouraging">Encouraging</SelectItem>
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
                            {desc.timestamp && (
                              <Badge variant="outline" className="text-xs">
                                @{desc.timestamp.toFixed(1)}s
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground">{desc.text}</p>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-2">
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
                            onClick={() => deleteDescription(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
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
    </div>
  );
};