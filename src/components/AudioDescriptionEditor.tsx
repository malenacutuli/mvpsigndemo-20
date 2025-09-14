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
import { Loader2, Wand2, Save, Edit, X, Clock, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AudioDescriptionSegment {
  id?: string;
  text: string;
  startTime: number;
  endTime: number;
  voiceStyle: string; // ElevenLabs voice ID
  timestamp?: number; // Optional timestamp for sync reference
}

interface AudioDescriptionEditorProps {
  videoUrl: string;
  videoId: string;
  videoData?: any; // Video data including transcript_language
  transcriptSegments?: any[];
  onDescriptionsUpdate?: (segments: AudioDescriptionSegment[]) => void;
}

export const AudioDescriptionEditor: React.FC<AudioDescriptionEditorProps> = ({
  videoUrl,
  videoId,
  videoData,
  transcriptSegments = [],
  onDescriptionsUpdate
}) => {
  console.log('🎬 AudioDescriptionEditor rendered with:', {
    videoId,
    detectedLanguage: videoData?.transcript_language || 'en',
    transcriptSegmentsCount: transcriptSegments?.length || 0,
    transcriptSegments: transcriptSegments?.slice(0, 2) // Show first 2 for debugging
  });
  const [descriptions, setDescriptions] = useState<AudioDescriptionSegment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editVoiceStyle, setEditVoiceStyle] = useState<string>('EXAVITQu4vr4xnSDxMaL'); // Default to Sarah (English)
  const [selectedVoice, setSelectedVoice] = useState<{ id: string; name: string; description: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<'openai' | 'huggingface' | 'enhanced'>('enhanced');

  const detectedLanguage = videoData?.transcript_language || 'en';

  // Get ElevenLabs native voice for detected language
  const getLanguageNativeVoice = (language: string): string => {
    const languageVoices = {
      'en': 'EXAVITQu4vr4xnSDxMaL', // Sarah - English
      'es': 'VR6AewLTigWG4xSOukaG', // Pablo - Spanish  
      'fr': 'ThT5KcBeYPX3keUQqHPh', // Alain - French
      'de': 'TxGEqnHWrfWFTfGW9XjX', // Klaus - German
      'it': 'XrExE9yKIg1WjnnlVkGX', // Matilda - Italian
      'pt': 'TxGEqnHWrfWFTfGW9XjX', // Portuguese variant
      'nl': 'bVMeCyTHy58xNoL34h3p', // Dutch
      'pl': 'EXAVITQu4vr4xnSDxMaL', // Polish (fallback to English)
      'zh': 'onwK4e9ZLuTAKqWW03F9', // Chinese
      'ja': 'pNInz6obpgDQGcFmaJgB', // Japanese
      'ko': 'pFZP5JQG7iQjIQuC4Bku'  // Korean
    };
    return languageVoices[language] || languageVoices['en'];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVoiceStyleColor = (voiceId: string): string => {
    // Color coding based on voice characteristics  
    if (voiceId.includes('VR6AewLTigWG4xSOukaG')) return 'text-blue-600'; // Spanish
    if (voiceId.includes('ThT5KcBeYPX3keUQqHPh')) return 'text-purple-600'; // French
    if (voiceId.includes('TxGEqnHWrfWFTfGW9XjX')) return 'text-green-600'; // German
    return 'text-orange-600'; // Default/English
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

  // Frame-grounded AD generation with visual analysis
  const generateDescriptionsFromTranscript = async (videoId: string, transcript: any[]): Promise<AudioDescriptionSegment[]> => {
    console.log('📝 Generating frame-grounded AD for', transcript.length, 'segments');

    // 1) Compute safe non-dialogue gaps
    const gaps = computeGaps(transcript);
    if (gaps.length === 0) {
      console.log('⚠️ No gaps available');
      return [];
    }

    console.log('🎬 Extracting keyframes for', gaps.length, 'gaps');

    // 2) Extract keyframes for each gap and generate visual analysis requests
    const analysisRequests = [];
    
    for (const gap of gaps.slice(0, 5)) { // Limit to first 5 gaps for performance
      const midTime = gap.start + ((gap.end - gap.start) / 2);
      
      try {
        // Create a video element to extract frames from
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        // Extract keyframes around the gap midpoint
        const frameDataUrls: string[] = [];
        const frameTimes = [
          Math.max(0, midTime - 1), // 1 second before mid
          midTime, // at midpoint  
          Math.min(midTime + 1, gap.end - 0.5) // 1 second after or near gap end
        ].filter(time => time >= gap.start && time <= gap.end - 0.5);

        console.log(`🎥 Extracting ${frameTimes.length} frames for gap ${gap.start.toFixed(1)}-${gap.end.toFixed(1)}s`);

        // Extract frames sequentially to avoid racing issues
        for (const frameTime of frameTimes) {
          try {
            const frameDataUrl = await extractFrameAtTime(video, frameTime);
            if (frameDataUrl) {
              frameDataUrls.push(frameDataUrl);
            }
          } catch (frameError) {
            console.warn(`⚠️ Failed to extract frame at ${frameTime}s:`, frameError);
          }
        }
        
        analysisRequests.push({
          timestamp: midTime,
          gapStart: gap.start,
          gapEnd: gap.end,
          duration: gap.end - gap.start,
          frameDataUrls,
          surroundingText: getSurroundingTranscriptText(gap.start, gap.end, transcript)
        });
        
      } catch (error) {
        console.error('❌ Failed to extract frames for gap', gap.start, '-', gap.end, ':', error);
        
        // Fallback: text-only analysis for this gap
        analysisRequests.push({
          timestamp: midTime,
          gapStart: gap.start,
          gapEnd: gap.end,
          duration: gap.end - gap.start,
          surroundingText: getSurroundingTranscriptText(gap.start, gap.end, transcript)
        });
      }
    }

    if (analysisRequests.length === 0) {
      console.log('⚠️ No analysis requests created');
      return [];
    }

    // 3) Send requests to visual description function with frames
    console.log('🖼️ Sending', analysisRequests.length, 'frame analysis requests');
    
    try {
        const visualResponse = await supabase.functions.invoke('generate-visual-descriptions', {
          body: {
            videoId,
            analysisRequests,
            language: detectedLanguage,
            contentType: 'general' // Always use general to avoid bias
          }
        });

      if (visualResponse.error) {
        throw new Error(visualResponse.error.message || 'Failed to generate visual descriptions');
      }

      const descriptions = visualResponse.data?.descriptions || [];
      console.log('✅ Generated', descriptions.length, 'frame-grounded descriptions');
      return descriptions;

    } catch (error) {
      console.error('❌ Frame-grounded analysis failed:', error);
      
      // Final fallback: simple text-based generation
      return generateTextOnlyFallback(transcript, gaps);
    }
  };

  // Helper function to extract frame at specific time
  const extractFrameAtTime = (video: HTMLVideoElement, timeInSeconds: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        resolve(null);
        return;
      }
      
      video.currentTime = timeInSeconds;
      
      const onSeeked = () => {
        try {
          canvas.width = Math.min(video.videoWidth || 640, 512);
          canvas.height = Math.min(video.videoHeight || 360, 512);
          
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        } catch (error) {
          console.error('Frame extraction error:', error);
          resolve(null);
        } finally {
          video.removeEventListener('seeked', onSeeked);
        }
      };
      
      video.addEventListener('seeked', onSeeked);
      
      video.onerror = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve(null);
      };
      
      // Timeout fallback
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        resolve(null);
      }, 3000);
    });
  };

  // Fallback for when frame extraction fails
  const generateTextOnlyFallback = async (transcript: any[], gaps: { start: number; end: number }[]): Promise<AudioDescriptionSegment[]> => {
    console.log('📝 Using text-only fallback generation');
    
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
            contentType: 'general',
            language: detectedLanguage,
            segments: segmentsPayload,
          }
        });

    if (error) {
      console.error('❌ generate-ad failed:', error);
      throw new Error(error.message || 'AD generation failed');
    }

    const proposals: Array<{ text: string; voiceStyle?: AudioDescriptionSegment['voiceStyle'] }> = (data as any)?.descriptions || [];
    if (!proposals.length) return [];

    // Schedule proposals into gaps
    const scheduled: AudioDescriptionSegment[] = [];
    let gapIndex = 0;
    let cursor = gaps[0]?.start || 0;

    for (const p of proposals) {
      while (gapIndex < gaps.length && cursor + 0.01 >= gaps[gapIndex].end) {
        gapIndex++;
        if (gapIndex < gaps.length) cursor = gaps[gapIndex].start;
      }
      if (gapIndex >= gaps.length) break;

      const gap = gaps[gapIndex];
      const dur = estimateDurationForText(p.text);
      const available = gap.end - cursor;

      if (available < 1.0) {
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
          voiceStyle: getLanguageNativeVoice(detectedLanguage),
          timestamp: (start + end) / 2,
        });

      cursor = end + 0.2;
    }

    console.log(`✅ Fallback: Scheduled ${scheduled.length} descriptions`);
    return scheduled;
  };

  // Enhanced multi-frame analysis using GPT-5 Vision
  const generateEnhancedDescriptions = async (videoUrl: string, transcript: any[]): Promise<AudioDescriptionSegment[]> => {
    console.log('🎯 Enhanced Analysis: Using GPT-5 Vision with multi-frame context');

    // 1) Compute safe non-dialogue gaps
    const gaps = computeGaps(transcript);
    if (gaps.length === 0) {
      console.log('⚠️ No gaps available for enhanced analysis');
      return [];
    }

    console.log('🎬 Processing gaps with enhanced multi-frame analysis:', gaps.length);

    // 2) Extract frames on client side for each gap
    const frames = [];
    
    for (const gap of gaps.slice(0, 6)) { // Limit for performance
      try {
        const midTime = gap.start + ((gap.end - gap.start) / 2);
        
        // Create a video element to extract frames from
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        const frameDataUrl = await extractFrameAtTime(video, midTime);
        
        if (frameDataUrl) {
          frames.push({
            timestamp: midTime,
            frameDataUrl,
            gapStart: gap.start,
            gapEnd: gap.end
          });
        }
        
      } catch (error) {
        console.error('❌ Failed to extract frame for gap', gap.start, '-', gap.end, ':', error);
      }
    }

    if (frames.length === 0) {
      console.log('⚠️ No frames extracted for enhanced analysis');
      return [];
    }

    console.log('🖼️ Extracted', frames.length, 'frames, sending to enhanced analysis');

    try {
      const enhancedResponse = await supabase.functions.invoke('enhanced-video-analysis', {
        body: {
          videoId,
          frames,
          transcript,
          detectedLanguage
        }
      });

      if (enhancedResponse.error) {
        throw new Error(enhancedResponse.error.message || 'Enhanced analysis failed');
      }

      const descriptions = enhancedResponse.data?.descriptions || [];
      console.log('✅ Enhanced GPT-5 Vision generated', descriptions.length, 'contextual descriptions');
      
      return descriptions;

    } catch (error) {
      console.error('❌ Enhanced analysis failed:', error);
      throw error;
    }
  };

  // New open source video analysis function
  const generateDescriptionsWithHuggingFace = async (videoId: string, transcript: any[]): Promise<AudioDescriptionSegment[]> => {
    console.log('🤗 Generating descriptions with Hugging Face open source models');

    // 1) Compute safe non-dialogue gaps
    const gaps = computeGaps(transcript);
    if (gaps.length === 0) {
      console.log('⚠️ No gaps available for Hugging Face analysis');
      return [];
    }

    console.log('🎬 Extracting frames for Hugging Face analysis:', gaps.length, 'gaps');

    // 2) Extract keyframes for each gap 
    const analysisRequests = [];
    
    for (const gap of gaps.slice(0, 8)) { // Process more gaps since HF is faster
      const midTime = gap.start + ((gap.end - gap.start) / 2);
      const estimatedDuration = Math.min(gap.end - gap.start, estimateDurationForText("Scene description"));
      
      try {
        // Extract a single representative frame for each gap
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        const frameDataUrl = await extractFrameAtTime(video, midTime);
        
        if (frameDataUrl) {
          analysisRequests.push({
            timestamp: midTime,
            frameDataUrl,
            duration: estimatedDuration,
            context: getSurroundingTranscriptText(gap.start, gap.end, transcript)
          });
        }
        
      } catch (error) {
        console.error('❌ Failed to extract frame for HF analysis at', midTime, ':', error);
      }
    }

    if (analysisRequests.length === 0) {
      console.log('⚠️ No frames extracted for Hugging Face analysis');
      return [];
    }

    // 3) Send to Hugging Face analysis function
    console.log('🤗 Sending', analysisRequests.length, 'requests to Hugging Face');
    
    try {
      const hfResponse = await supabase.functions.invoke('huggingface-video-analysis', {
        body: {
          videoId,
          analysisRequests,
          detectedLanguage
        }
      });

      if (hfResponse.error) {
        throw new Error(hfResponse.error.message || 'Hugging Face analysis failed');
      }

      const descriptions = hfResponse.data?.descriptions || [];
      console.log('✅ Hugging Face generated', descriptions.length, 'descriptions');
      
      return descriptions;

    } catch (error) {
      console.error('❌ Hugging Face analysis failed:', error);
      throw error;
    }
  };

  // Fallback when no transcript: sample frames across the whole video timeline
  const generateDescriptionsWithoutTranscript = async (): Promise<AudioDescriptionSegment[]> => {
    try {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;

      // Wait for metadata to get duration
      await new Promise((resolve, reject) => {
        const onLoaded = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          resolve(null);
        };
        const onError = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          reject(new Error('Failed to load video metadata'));
        };
        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('error', onError, { once: true });
      });

      const duration = Math.max(0, video.duration || 0);
      if (!duration || !isFinite(duration)) throw new Error('Invalid video duration');

      // Sample roughly every 8-10 seconds, minimum 6 samples
      const targetSamples = Math.max(6, Math.ceil(duration / 10));
      const interval = duration / targetSamples;

      const analysisRequests: any[] = [];
      for (let i = 0; i < targetSamples; i++) {
        const t = Math.min(duration - 0.5, Math.max(0.5, i * interval + interval / 2));
        const frame = await extractFrameAtTime(video, t);
        if (frame) {
          analysisRequests.push({
            timestamp: t,
            frameDataUrl: frame,
            frameDataUrls: [frame],
            duration: Math.min(4, interval)
          });
        }
      }

      if (analysisRequests.length === 0) return [];

      // Route to selected model
      if (selectedModel === 'huggingface') {
        const hfResponse = await supabase.functions.invoke('huggingface-video-analysis', {
          body: {
            videoId,
            analysisRequests,
            detectedLanguage
          }
        });
        if (hfResponse.error) throw new Error(hfResponse.error.message || 'HF analysis failed');
        return hfResponse.data?.descriptions || [];
      } else {
        const visualResponse = await supabase.functions.invoke('generate-visual-descriptions', {
          body: {
            videoId,
            analysisRequests,
            language: detectedLanguage,
            contentType: 'general'
          }
        });
        if (visualResponse.error) throw new Error(visualResponse.error.message || 'OpenAI analysis failed');
        return visualResponse.data?.descriptions || [];
      }
    } catch (e) {
      console.error('❌ Failed no-transcript generation:', e);
      return [];
    }
  };
  const getSurroundingTranscriptText = (gapStart: number, gapEnd: number, transcript: any[]): string => {
    return transcript
      .filter(seg => Math.abs(seg.startTime - gapStart) < 30 || Math.abs(seg.endTime - gapEnd) < 30)
      .map(seg => seg.text)
      .join(' ')
      .substring(0, 200);
  };

  const generateAIDescriptions = async () => {
    console.log('🎬 Generate AI Descriptions clicked!');
    console.log('📝 transcriptSegments:', transcriptSegments);
    console.log('📊 transcriptSegments length:', transcriptSegments?.length || 0);

    if (!transcriptSegments || transcriptSegments.length === 0) {
      toast.error('Please generate a transcript first to place audio descriptions.');
      return;
    }

    setIsGenerating(true);
    try {
      const gaps = computeGaps(transcriptSegments);
      const scheduled = await generateTextOnlyFallback(transcriptSegments, gaps);

      if (scheduled.length === 0) {
        toast.error('No suitable silent gaps found to place audio descriptions');
        return;
      }

      setDescriptions(scheduled);
      onDescriptionsUpdate?.(scheduled);
      toast.success(`OpenAI GPT-4o mini generated ${scheduled.length} descriptions`);
      console.log('✅ Generated AD (scheduled):', scheduled);
    } catch (error) {
      console.error('❌ Failed to generate descriptions:', error);
      toast.error('OpenAI generation failed - please try again.');
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
      voiceStyle: editVoiceStyle
      // Note: startTime and endTime are updated directly in the component above
    };

    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    setEditingIndex(null);
    setEditText('');
    toast.success('Audio description saved successfully');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  const deleteDescription = (index: number) => {
    const updatedDescriptions = descriptions.filter((_, i) => i !== index);
    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    toast.success('Audio description deleted');
  };

  const addNewDescription = () => {
    const newDescription: AudioDescriptionSegment = {
      text: '',
      startTime: 0,
      endTime: 2,
      voiceStyle: getLanguageNativeVoice(detectedLanguage),
      timestamp: 0
    };
    
    const updatedDescriptions = [...descriptions, newDescription];
    setDescriptions(updatedDescriptions);
    onDescriptionsUpdate?.(updatedDescriptions);
    
    // Start editing the new description immediately
    setEditingIndex(updatedDescriptions.length - 1);
    setEditText('');
    setEditVoiceStyle(newDescription.voiceStyle);
  };

  const saveAllDescriptions = async () => {
    if (descriptions.length === 0) {
      toast.error('No descriptions to save');
      return;
    }

    setIsSaving(true);
    try {
      // Save all descriptions to database
      for (let i = 0; i < descriptions.length; i++) {
        const desc = descriptions[i];
        await supabase
          .from('audio_descriptions')
          .upsert({
            video_id: videoId,
            description: desc.text,
            start_time: desc.startTime,
            end_time: desc.endTime,
            voice_style: desc.voiceStyle,
            language: detectedLanguage
          });
      }
      
      toast.success(`Successfully saved ${descriptions.length} audio descriptions`);
    } catch (error) {
      console.error('Failed to save audio descriptions:', error);
      toast.error('Failed to save audio descriptions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Audio Description Generator ({detectedLanguage === 'es' ? 'Spanish' : 'English'})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              We analyze the transcript to find silence windows and generate concise, creative descriptions for your video.
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={generateAIDescriptions} 
              className="flex-1" 
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating with OpenAI GPT-4o mini...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Audio Descriptions ({transcriptSegments?.length || 0} transcript segments available)
                </>
              )}
            </Button>
            
            <Button 
              onClick={addNewDescription}
              variant="outline"
              disabled={isGenerating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Manual
            </Button>
            
            <Button
              onClick={saveAllDescriptions}
              variant="default"
              disabled={isGenerating || isSaving || descriptions.length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Changes
                </>
              )}
            </Button>
          </div>

          {descriptions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Generated Audio Descriptions ({descriptions.length})</h4>
                {descriptions.map((desc, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    {editingIndex === index ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium">Start Time (seconds)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={descriptions[index].startTime}
                              onChange={(e) => {
                                const newStartTime = parseFloat(e.target.value) || 0;
                                const updatedDescriptions = [...descriptions];
                                updatedDescriptions[index] = {
                                  ...updatedDescriptions[index],
                                  startTime: newStartTime
                                };
                                setDescriptions(updatedDescriptions);
                                onDescriptionsUpdate?.(updatedDescriptions);
                              }}
                              className="h-8"
                              placeholder="0.0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium">End Time (seconds)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={descriptions[index].endTime}
                              onChange={(e) => {
                                const newEndTime = parseFloat(e.target.value) || 0;
                                const updatedDescriptions = [...descriptions];
                                updatedDescriptions[index] = {
                                  ...updatedDescriptions[index],
                                  endTime: newEndTime
                                };
                                setDescriptions(updatedDescriptions);
                                onDescriptionsUpdate?.(updatedDescriptions);
                              }}
                              className="h-8"
                              placeholder="2.0"
                            />
                          </div>
                        </div>
                        
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
                            <Badge variant="outline" className="text-xs">
                              @{desc.startTime.toFixed(1)}s
                            </Badge>
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