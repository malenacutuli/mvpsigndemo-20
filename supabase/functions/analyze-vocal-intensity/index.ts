import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[Vocal Intensity] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

// Audio analysis utilities
class AudioIntensityAnalyzer {
  static analyzeAmplitude(audioBuffer: Float32Array): number {
    let sumSquares = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      sumSquares += audioBuffer[i] * audioBuffer[i];
    }
    return Math.sqrt(sumSquares / audioBuffer.length); // RMS amplitude
  }

  static analyzeFrequencySpread(audioBuffer: Float32Array, sampleRate: number): number {
    // Simple frequency analysis using zero-crossing rate
    let zeroCrossings = 0;
    for (let i = 1; i < audioBuffer.length; i++) {
      if ((audioBuffer[i] >= 0) !== (audioBuffer[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    return zeroCrossings / audioBuffer.length * sampleRate / 2;
  }

  static analyzeDynamicRange(audioBuffer: Float32Array): number {
    const windowSize = Math.floor(audioBuffer.length / 10); // 10 windows
    const energyLevels = [];
    
    for (let i = 0; i < audioBuffer.length; i += windowSize) {
      const window = audioBuffer.slice(i, Math.min(i + windowSize, audioBuffer.length));
      const energy = this.analyzeAmplitude(window);
      energyLevels.push(energy);
    }
    
    const maxEnergy = Math.max(...energyLevels);
    const minEnergy = Math.min(...energyLevels);
    return maxEnergy - minEnergy; // Dynamic range
  }

  static classifyIntensity(amplitude: number, frequencySpread: number, dynamicRange: number): {
    level: 'whisper' | 'normal' | 'yell' | 'shout';
    confidence: number;
    metadata: any;
  } {
    const features = {
      amplitude,
      frequencySpread,
      dynamicRange,
      normalizedAmplitude: Math.min(amplitude / 0.3, 1), // Normalize to 0-1
    };

    // Classification thresholds based on audio characteristics
    let level: 'whisper' | 'normal' | 'yell' | 'shout';
    let confidence: number;

    if (amplitude < 0.05 && dynamicRange < 0.02) {
      level = 'whisper';
      confidence = Math.min(0.95, 1 - (amplitude / 0.05));
    } else if (amplitude > 0.4 || dynamicRange > 0.15) {
      if (amplitude > 0.6 || dynamicRange > 0.25) {
        level = 'shout';
        confidence = Math.min(0.95, amplitude / 0.6);
      } else {
        level = 'yell';
        confidence = Math.min(0.9, (amplitude - 0.3) / 0.3);
      }
    } else {
      level = 'normal';
      confidence = 0.8;
    }

    return {
      level,
      confidence: Math.max(0.5, confidence),
      metadata: features
    };
  }
}

// Decode base64 audio to Float32Array
function decodeAudioData(base64Audio: string): Float32Array {
  try {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to 16-bit PCM and then to Float32Array
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0; // Normalize to -1 to 1
    }
    
    return floatData;
  } catch (error) {
    logStep('Audio decode error', { error: error.message });
    throw new Error('Failed to decode audio data');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting vocal intensity analysis');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Parse request body
    const body = await req.json();
    const { video_id, video_url, segments, audio_data, sample_rate = 24000 } = body;

    if (!video_id || !segments) {
      throw new Error('Missing required fields: video_id and segments');
    }

    logStep('Processing segments', { 
      segmentCount: segments.length, 
      hasAudioData: !!audio_data,
      hasVideoUrl: !!video_url
    });

    const analyzedSegments = [];

    for (const segment of segments) {
      try {
        let intensityAnalysis = null;

        // If we have audio data for this segment, analyze it
        if (audio_data && segment.audio_chunk) {
          const audioBuffer = decodeAudioData(segment.audio_chunk);
          const amplitude = AudioIntensityAnalyzer.analyzeAmplitude(audioBuffer);
          const frequencySpread = AudioIntensityAnalyzer.analyzeFrequencySpread(audioBuffer, sample_rate);
          const dynamicRange = AudioIntensityAnalyzer.analyzeDynamicRange(audioBuffer);
          
          intensityAnalysis = AudioIntensityAnalyzer.classifyIntensity(
            amplitude, 
            frequencySpread, 
            dynamicRange
          );

          logStep('Segment analysis', {
            segmentId: segment.id,
            text: segment.text?.substring(0, 50),
            amplitude,
            level: intensityAnalysis.level,
            confidence: intensityAnalysis.confidence
          });
        } else {
          // Enhanced text-based analysis for intensity detection
          const text = segment.text || '';
          const textLower = text.toLowerCase();
          const textUpper = text.toUpperCase();
          
          // Enhanced pattern detection
          const patterns = {
            shout: /!{3,}|SHOUT|SCREAM|YELL|[A-Z\s]{15,}/i,
            yell: /!{2}|[A-Z\s]{8,}|[!?]{2,}|\b[A-Z]{4,}\b/,
            whisper: /\*whisper\*|\*quiet\*|\.{3,}|\bshh\b|\bpss\b|^\s*\([^)]*\)\s*$|quiet|soft/i,
            normal: /[.!?]$/
          };

          // Analyze text characteristics
          const hasMultipleExclamations = (text.match(/!/g) || []).length >= 3;
          const hasAllCapsWords = /\b[A-Z]{4,}\b/.test(text);
          const isLongAllCaps = text.length > 10 && text === textUpper && /[A-Z]/.test(text);
          const hasWhisperIndicators = patterns.whisper.test(text);
          
          if (patterns.shout.test(text) || isLongAllCaps || hasMultipleExclamations) {
            intensityAnalysis = {
              level: 'shout' as const,
              confidence: 0.8,
              metadata: { 
                source: 'enhanced_text_analysis', 
                reason: 'strong_emphasis_patterns',
                hasMultipleExclamations, 
                isLongAllCaps 
              }
            };
          } else if (patterns.yell.test(text) || hasAllCapsWords) {
            intensityAnalysis = {
              level: 'yell' as const,
              confidence: 0.7,
              metadata: { 
                source: 'enhanced_text_analysis', 
                reason: 'moderate_emphasis_patterns',
                hasAllCapsWords 
              }
            };
          } else if (hasWhisperIndicators || (text.length < 15 && textLower.includes('quiet'))) {
            intensityAnalysis = {
              level: 'whisper' as const,
              confidence: 0.6,
              metadata: { 
                source: 'enhanced_text_analysis', 
                reason: 'whisper_indicators',
                hasWhisperIndicators 
              }
            };
          } else {
            // Default to normal with confidence based on text length and punctuation
            const confidence = text.length > 50 ? 0.8 : 0.6;
            intensityAnalysis = {
              level: 'normal' as const,
              confidence,
              metadata: { 
                source: 'enhanced_text_analysis', 
                reason: 'default_classification',
                textLength: text.length 
              }
            };
          }
        }

        // Determine styling based on intensity level
        const styling = getIntensityStyling(intensityAnalysis.level, intensityAnalysis.confidence);

        const analyzedSegment = {
          ...segment,
          vocal_intensity: intensityAnalysis.level,
          intensity_confidence: intensityAnalysis.confidence,
          intensity_metadata: intensityAnalysis.metadata,
          auto_styling: styling
        };

        analyzedSegments.push(analyzedSegment);

        // Update the transcript segment with intensity data
        if (segment.id) {
          await supabase
            .from('transcript_segments')
            .update({
              metadata: {
                ...(segment.metadata || {}),
                vocal_intensity: intensityAnalysis.level,
                intensity_confidence: intensityAnalysis.confidence,
                auto_styling: styling
              }
            })
            .eq('id', segment.id);
        }

      } catch (segmentError) {
        logStep('Segment processing error', { 
          segmentId: segment.id, 
          error: segmentError.message 
        });
        
        // Add segment with default values if analysis fails
        analyzedSegments.push({
          ...segment,
          vocal_intensity: 'normal',
          intensity_confidence: 0.5,
          auto_styling: getIntensityStyling('normal', 0.5)
        });
      }
    }

    logStep('Analysis complete', { processedSegments: analyzedSegments.length });

    return new Response(JSON.stringify({
      success: true,
      video_id,
      analyzed_segments: analyzedSegments,
      summary: {
        total_segments: analyzedSegments.length,
        whisper_count: analyzedSegments.filter(s => s.vocal_intensity === 'whisper').length,
        normal_count: analyzedSegments.filter(s => s.vocal_intensity === 'normal').length,
        yell_count: analyzedSegments.filter(s => s.vocal_intensity === 'yell').length,
        shout_count: analyzedSegments.filter(s => s.vocal_intensity === 'shout').length,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('Error in vocal intensity analysis', { error: error.message });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getIntensityStyling(level: string, confidence: number) {
  const baseIntensity = Math.max(0.3, confidence);
  
  switch (level) {
    case 'whisper':
      return {
        fontSize: `${Math.max(0.7, 1 - baseIntensity * 0.4)}em`,
        fontWeight: 'normal',
        opacity: Math.max(0.6, 1 - baseIntensity * 0.3),
        textTransform: 'none',
        color: 'hsl(var(--muted-foreground))',
        fontStyle: 'italic'
      };
      
    case 'yell':
      return {
        fontSize: `${1 + baseIntensity * 0.3}em`,
        fontWeight: '600',
        textTransform: 'none',
        color: 'hsl(var(--primary))',
        textShadow: '0 0 8px hsl(var(--primary) / 0.3)'
      };
      
    case 'shout':
      return {
        fontSize: `${1 + baseIntensity * 0.5}em`,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: 'hsl(var(--destructive))',
        textShadow: '0 0 12px hsl(var(--destructive) / 0.4)',
        animation: 'pulse 1s infinite'
      };
      
    default: // normal
      return {
        fontSize: '1em',
        fontWeight: 'normal',
        textTransform: 'none',
        color: 'hsl(var(--foreground))'
      };
  }
}