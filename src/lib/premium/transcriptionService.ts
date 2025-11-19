import { supabase } from '@/integrations/supabase/client';
import { TranscriptGenerationOptions } from '@/types/premium-transcript';

export interface TranscriptionJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  transcriptId?: string;
  segmentCount?: number;
}

export class TranscriptionService {
  // Generate transcript from video
  static async generateTranscript(
    projectId: string,
    audioUrl: string,
    options: TranscriptGenerationOptions
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('premium-transcribe', {
        body: {
          projectId,
          audioUrl,
          language: options.language,
          options: {
            speaker_labels: options.speaker_labels,
            sentiment_analysis: options.sentiment_analysis,
            entity_detection: options.entity_detection,
            auto_highlights: options.auto_highlights
          }
        }
      });

      if (error) throw error;

      return data.jobId;
    } catch (error) {
      console.error('Failed to generate transcript:', error);
      throw error;
    }
  }

  // Check job status
  static async getJobStatus(jobId: string): Promise<TranscriptionJobStatus> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('status, result, error_message')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      const progressMap = {
        pending: 0,
        processing: 50,
        completed: 100,
        failed: 0
      };

      const result = data.result as any;
      
      return {
        status: data.status as any,
        progress: progressMap[data.status as keyof typeof progressMap] || 0,
        error: data.error_message || undefined,
        segmentCount: result?.segmentCount
      };
    } catch (error) {
      console.error('Failed to get job status:', error);
      throw error;
    }
  }

  // Get supported languages
  static getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'nl', name: 'Dutch' },
      { code: 'hi', name: 'Hindi' },
      { code: 'ja', name: 'Japanese' },
      { code: 'zh', name: 'Chinese' },
      { code: 'fi', name: 'Finnish' },
      { code: 'ko', name: 'Korean' },
      { code: 'pl', name: 'Polish' },
      { code: 'ru', name: 'Russian' },
      { code: 'tr', name: 'Turkish' },
      { code: 'uk', name: 'Ukrainian' },
      { code: 'vi', name: 'Vietnamese' }
    ];
  }
}
