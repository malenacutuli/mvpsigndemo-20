/**
 * Axs Video Analyzer Integration
 * 
 * Provides deep video analysis including:
 * - Scene boundary detection
 * - Speaker diarization (enhanced)
 * - Key moment detection (for social clips)
 * - Waveform generation
 * - Visual analysis (objects, emotions, text)
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TwelveLabsAnalysis {
  indexId: string;
  scenes: Array<{
    startTime: number;
    endTime: number;
    description: string;
    confidence: number;
    visualElements: string[];
  }>;
  speakers: Array<{
    startTime: number;
    endTime: number;
    speakerId: string;
    confidence: number;
  }>;
  keyMoments: Array<{
    startTime: number;
    endTime: number;
    score: number; // Viral potential score
    reason: string;
    thumbnail: string;
  }>;
  waveform: number[]; // Amplitude data for timeline
  emotions: Array<{
    startTime: number;
    emotion: string;
    intensity: number;
  }>;
}

/**
 * Index video with Axs Video Analyzer
 * Starts the video analysis process
 */
export async function indexVideo(videoUrl: string, videoId: string): Promise<string> {
  toast.info('Indexing video with Axs Video Analyzer...');
  
  try {
    const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
      body: {
        action: 'index',
        videoUrl,
        videoId,
        indexOptions: {
          visual: true,
          conversation: true,
          text_in_video: true,
          logo: false
        }
      }
    });
    
    if (error) throw error;
    
    // Poll for completion
    const indexId = data.indexId;
    await pollIndexStatus(indexId);
    
    toast.success('Video indexed successfully!');
    return indexId;
  } catch (error) {
    console.error('Video indexing error:', error);
    toast.error('Failed to index video');
    throw error;
  }
}

/**
 * Poll index status until ready or failed
 */
async function pollIndexStatus(indexId: string): Promise<void> {
  const maxAttempts = 60; // 5 minutes (5s intervals)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
        body: { 
          action: 'status',
          indexId 
        }
      });
      
      if (error) throw error;
      
      if (data.status === 'ready') {
        return;
      }
      
      if (data.status === 'failed') {
        throw new Error('Video indexing failed');
      }
      
      // Update progress if available
      if (data.progress) {
        toast.info(`Analyzing video: ${data.progress}%`, { id: 'indexing-progress' });
      }
      
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
      attempts++;
    } catch (error) {
      console.error('Status polling error:', error);
      throw error;
    }
  }
  
  throw new Error('Video indexing timeout');
}

/**
 * Get comprehensive video analysis
 */
export async function analyzeVideo(indexId: string): Promise<TwelveLabsAnalysis> {
  toast.info('Analyzing video content...');
  
  try {
    const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
      body: { 
        action: 'analyze',
        indexId 
      }
    });
    
    if (error) throw error;
    
    toast.success('Video analysis complete!');
    return data;
  } catch (error) {
    console.error('Video analysis error:', error);
    toast.error('Failed to analyze video');
    throw error;
  }
}

/**
 * Detect scene boundaries in the video
 */
export async function detectScenes(
  indexId: string
): Promise<Array<{ startTime: number; endTime: number; description?: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
      body: { 
        action: 'scenes',
        indexId 
      }
    });
    
    if (error) throw error;
    
    return data.scenes || [];
  } catch (error) {
    console.error('Scene detection error:', error);
    throw error;
  }
}

/**
 * Find key moments for social clips
 * Identifies viral-worthy segments based on engagement potential
 */
export async function findKeyMoments(
  indexId: string,
  criteria: {
    minDuration: number;
    maxDuration: number;
    minScore: number;
  }
): Promise<TwelveLabsAnalysis['keyMoments']> {
  try {
    const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
      body: { 
        action: 'keyMoments',
        indexId,
        criteria
      }
    });
    
    if (error) throw error;
    
    return data.keyMoments || [];
  } catch (error) {
    console.error('Key moment detection error:', error);
    throw error;
  }
}

/**
 * Generate waveform data from audio
 * Uses Web Audio API to extract amplitude data for timeline visualization
 */
export async function generateWaveform(audioUrl: string, samples: number = 1000): Promise<number[]> {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Fetch and decode audio
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get raw audio data (first channel)
    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData: number[] = [];
    
    // Calculate average amplitude for each block
    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      
      filteredData.push(sum / blockSize);
    }
    
    // Normalize to 0-1 range
    const max = Math.max(...filteredData);
    const normalizedData = filteredData.map(v => max > 0 ? v / max : 0);
    
    // Close audio context to free resources
    await audioContext.close();
    
    return normalizedData;
  } catch (error) {
    console.error('Waveform generation error:', error);
    
    // Return flat waveform as fallback
    return new Array(samples).fill(0.5);
  }
}

/**
 * Get enhanced speaker diarization
 * More accurate than basic transcription services
 */
export async function getSpeakerDiarization(
  indexId: string
): Promise<Array<{ startTime: number; endTime: number; speakerId: string; confidence: number }>> {
  try {
    const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
      body: { 
        action: 'speakers',
        indexId 
      }
    });
    
    if (error) throw error;
    
    return data.speakers || [];
  } catch (error) {
    console.error('Speaker diarization error:', error);
    throw error;
  }
}

/**
 * Extract emotions from video
 * Detects facial expressions and voice tone
 */
export async function extractEmotions(
  indexId: string
): Promise<Array<{ startTime: number; emotion: string; intensity: number }>> {
  try {
    const { data, error } = await supabase.functions.invoke('twelve-labs-analysis', {
      body: { 
        action: 'emotions',
        indexId 
      }
    });
    
    if (error) throw error;
    
    return data.emotions || [];
  } catch (error) {
    console.error('Emotion extraction error:', error);
    throw error;
  }
}

/**
 * Check if video is already indexed
 */
export async function checkExistingIndex(videoId: string): Promise<{
  indexId: string;
  analysis: TwelveLabsAnalysis;
} | null> {
  try {
    const { data, error } = await supabase
      .from('content_generation_cache')
      .select('generation_params, result_data')
      .eq('video_id', videoId)
      .eq('content_type', 'twelve_labs_analysis')
      .maybeSingle();
    
    if (error || !data) return null;
    
    const params = data.generation_params as { indexId?: string } | null;
    
    return {
      indexId: params?.indexId || '',
      analysis: data.result_data as unknown as TwelveLabsAnalysis
    };
  } catch (error) {
    console.error('Error checking existing index:', error);
    return null;
  }
}

/**
 * Save analysis to cache for future use
 */
export async function saveAnalysisToCache(
  videoId: string,
  indexId: string,
  analysis: TwelveLabsAnalysis
): Promise<void> {
  try {
    const { error } = await supabase
      .from('content_generation_cache')
      .upsert({
        video_id: videoId,
        content_type: 'twelve_labs_analysis',
        generation_params: { indexId } as any,
        result_data: analysis as any,
        language: 'en'
      });
    
    if (error) throw error;
  } catch (error) {
    console.error('Error saving analysis to cache:', error);
    // Non-critical error, don't throw
  }
}
