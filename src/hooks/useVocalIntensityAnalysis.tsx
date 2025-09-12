import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface VocalIntensityAnalysis {
  vocal_intensity: 'whisper' | 'normal' | 'yell' | 'shout';
  intensity_confidence: number;
  intensity_metadata: any;
  auto_styling: any;
}

interface AnalyzedSegment {
  id?: string;
  text: string;
  start_time: number;
  end_time: number;
  audio_chunk?: string;
  vocal_intensity?: string;
  intensity_confidence?: number;
  auto_styling?: any;
}

interface UseVocalIntensityAnalysisReturn {
  isAnalyzing: boolean;
  analyzeVocalIntensity: (videoId: string, segments: any[], audioData?: string) => Promise<AnalyzedSegment[]>;
  getIntensityStyles: (level?: string, confidence?: number) => React.CSSProperties;
}

export const useVocalIntensityAnalysis = (): UseVocalIntensityAnalysisReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeVocalIntensity = async (
    videoId: string, 
    segments: any[], 
    audioData?: string
  ): Promise<AnalyzedSegment[]> => {
    setIsAnalyzing(true);
    
    try {
      console.log('Starting vocal intensity analysis', { 
        videoId, 
        segmentCount: segments.length,
        hasAudioData: !!audioData
      });

      const { data, error } = await supabase.functions.invoke('analyze-vocal-intensity', {
        body: {
          video_id: videoId,
          segments: segments,
          audio_data: audioData,
          sample_rate: 24000
        }
      });

      if (error) {
        console.error('Vocal intensity analysis error:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Analysis failed');
      }

      console.log('Vocal intensity analysis complete', {
        processedSegments: data.analyzed_segments?.length,
        summary: data.summary
      });

      toast({
        title: "Vocal Intensity Analysis Complete",
        description: `Analyzed ${data.summary?.total_segments} segments. Found ${data.summary?.yell_count + data.summary?.shout_count} intense moments.`,
      });

      return data.analyzed_segments || segments;

    } catch (error) {
      console.error('Failed to analyze vocal intensity:', error);
      
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Failed to analyze vocal intensity',
        variant: "destructive",
      });

      // Return segments with default styling
      return segments.map(segment => ({
        ...segment,
        vocal_intensity: 'normal',
        intensity_confidence: 0.5,
        auto_styling: getDefaultStyling('normal')
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getIntensityStyles = (level?: string, confidence: number = 0.7): React.CSSProperties => {
    if (!level) return getDefaultStyling('normal');
    
    const baseIntensity = Math.max(0.3, confidence);
    
    switch (level) {
      case 'whisper':
        return {
          fontSize: `${Math.max(0.7, 1 - baseIntensity * 0.4)}em`,
          fontWeight: 'normal',
          opacity: Math.max(0.6, 1 - baseIntensity * 0.3),
          color: 'hsl(var(--muted-foreground))',
          fontStyle: 'italic',
          transition: 'all 0.3s ease'
        };
        
      case 'yell':
        return {
          fontSize: `${1 + baseIntensity * 0.3}em`,
          fontWeight: '600',
          color: 'hsl(var(--primary))',
          textShadow: '0 0 8px hsl(var(--primary) / 0.3)',
          transition: 'all 0.3s ease'
        };
        
      case 'shout':
        return {
          fontSize: `${1 + baseIntensity * 0.5}em`,
          fontWeight: '700',
          textTransform: 'uppercase' as const,
          color: 'hsl(var(--destructive))',
          textShadow: '0 0 12px hsl(var(--destructive) / 0.4)',
          animation: 'pulse 1s infinite',
          transition: 'all 0.3s ease'
        };
        
      default:
        return getDefaultStyling('normal');
    }
  };

  return {
    isAnalyzing,
    analyzeVocalIntensity,
    getIntensityStyles
  };
};

function getDefaultStyling(level: string): React.CSSProperties {
  return {
    fontSize: '1em',
    fontWeight: 'normal',
    color: 'hsl(var(--foreground))',
    transition: 'all 0.3s ease'
  };
}