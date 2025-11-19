export interface AIToolRequest {
  tool: 'generate' | 'repurpose' | 'publish' | 'write';
  versionId: string;
  context?: Record<string, any>;
  options?: Record<string, any>;
}

export interface AIToolResponse {
  success: boolean;
  data?: any;
  error?: string;
  creditsUsed: number;
}

export interface GenerateOptions {
  type: 'video' | 'audio' | 'image' | 'text';
  prompt: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5';
  style?: string;
  voice?: string;
  language?: string;
}

export interface RepurposeOptions {
  outputFormat: 'short' | 'reel' | 'story' | 'post' | 'tweet' | 'blog';
  platform: 'youtube' | 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'blog';
  duration?: number;
  includeSubtitles: boolean;
  includeCaptions: boolean;
  brandKit?: string;
}

export interface PublishOptions {
  platform: 'youtube' | 'vimeo' | 'instagram' | 'tiktok' | 'linkedin' | 'twitter';
  title: string;
  description: string;
  tags?: string[];
  thumbnail?: string;
  schedule?: Date;
  visibility: 'public' | 'unlisted' | 'private';
}

export interface WriteOptions {
  type: 'script' | 'description' | 'title' | 'tags' | 'captions' | 'blog';
  tone?: 'professional' | 'casual' | 'friendly' | 'formal' | 'humorous';
  length?: 'short' | 'medium' | 'long';
  keywords?: string[];
  includeEmojis?: boolean;
  seoOptimized?: boolean;
}

export interface AIGenerationJob {
  id: string;
  project_id: string;
  tool: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  credits_used: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface MediaAsset {
  id: string;
  project_id: string;
  type: 'video' | 'audio' | 'image' | 'text';
  name: string;
  url: string;
  thumbnail_url?: string;
  duration?: number;
  size_bytes: number;
  mime_type: string;
  width?: number;
  height?: number;
  metadata?: Record<string, any>;
  source: 'upload' | 'generated' | 'stock' | 'imported';
  created_at: string;
}
