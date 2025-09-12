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

  // Enhanced visual analysis with timestamp-specific content generation
  const generateContextualDescriptions = async (videoId: string, transcript: any[]): Promise<AudioDescriptionSegment[]> => {
    console.log('🎥 Starting contextual visual analysis for', transcript.length, 'segments');
    
    try {
      // Create timestamp-specific analysis requests
      const analysisRequests = [];
      const gaps = computeGaps(transcript);
      
      console.log('🕳️ Found', gaps.length, 'gaps for visual analysis');
      
      for (const gap of gaps) {
        if (gap.end - gap.start >= 2.0) { // Only analyze gaps of 2+ seconds
          const midpoint = (gap.start + gap.end) / 2;
          analysisRequests.push({
            timestamp: midpoint,
            gapStart: gap.start,
            gapEnd: gap.end,
            duration: gap.end - gap.start
          });
        }
      }
      
      if (analysisRequests.length === 0) {
        console.log('⚠️ No suitable gaps found for audio descriptions');
        return [];
      }
      
      console.log('🎯 Analyzing', analysisRequests.length, 'specific timestamps');
      
      // Generate frame-specific descriptions using OpenAI vision analysis
      const response = await fetch('https://faeyekynudyzeotbjfsj.supabase.co/functions/v1/generate-visual-descriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZXlla3ludWR5emVvdGJqZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDMyMzUsImV4cCI6MjA3MTc3OTIzNX0.ifRh6Lx1AsWMjSchaNqa5ELHnImOLWUMGtYZLGWD1Qw',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZXlla3ludWR5emVvdGJqZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDMyMzUsImV4cCI6MjA3MTc3OTIzNX0.ifRh6Lx1AsWMjSchaNqa5ELHnImOLWUMGtYZLGWD1Qw'
        },
        body: JSON.stringify({ 
          videoId, 
          analysisRequests,
          language: currentLanguage,
          contentType 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Visual analysis failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Generated', data.descriptions?.length || 0, 'contextual descriptions');
      
      return data.descriptions || [];
      
    } catch (error) {
      console.error('❌ Contextual analysis failed:', error);
      throw error;
    }
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
      // Generate contextual descriptions based on actual video content at specific timestamps
      const contextualDescriptions = await generateContextualDescriptions(videoId, transcriptSegments);
      
      if (contextualDescriptions.length === 0) {
        toast.error("No suitable gaps found - The video has continuous dialogue with no gaps for audio descriptions");
        return;
      }
      
      setDescriptions(contextualDescriptions);
      onDescriptionsUpdate?.(contextualDescriptions);
      
      toast.success(`Audio descriptions generated! Created ${contextualDescriptions.length} contextual descriptions synchronized with video content`);
      
      console.log('✅ Generated contextual descriptions:', contextualDescriptions);
      
    } catch (error) {
      console.error('❌ Failed to generate descriptions:', error);
      toast.error("Generation failed - Failed to generate audio descriptions. Please try again.");
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
              <strong>Enhanced Synchronization:</strong> This system analyzes video content at specific timestamps during dialogue gaps to generate perfectly synchronized audio descriptions that match what's actually happening on screen.
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