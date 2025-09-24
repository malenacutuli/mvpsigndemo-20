export interface ExportOptions {
  captions: boolean;
  audioDescription: boolean;
  signLanguage: boolean;
}

export interface VideoExport {
  id: string;
  video_id: string;
  user_id: string;
  export_options: ExportOptions;
  status: 'processing' | 'completed' | 'failed';
  storage_path: string;
  file_size_bytes?: number;
  duration_seconds?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ExportAssets {
  video: {
    id: string;
    storage_path?: string;
    duration_seconds?: number;
    title: string;
  };
  transcriptSegments: Array<{
    id: string;
    start_time: number;
    end_time: number;
    text: string;
    speaker?: string;
    speaker_color?: string;
    emphasis?: string;
    words?: any;
  }>;
  audioDescriptions: Array<{
    start_time: number;
    end_time: number;
    description: string;
    audio_url?: string;
  }>;
  signLanguageClips: Array<{
    id: string;
    start_time_ms: number;
    end_time_ms: number;
    clip_url: string;
  }>;
}

export interface RenderProgress {
  stage: 'preparing' | 'processing' | 'uploading' | 'finalizing';
  progress: number; // 0-100
  message: string;
}

export type ProgressCallback = (progress: RenderProgress) => void;