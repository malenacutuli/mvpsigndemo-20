import { supabase } from '@/integrations/supabase/client';
import {
  GenerateOptions,
  RepurposeOptions,
  PublishOptions,
  WriteOptions,
  AIGenerationJob
} from '@/types/premium-ai-tools';

export class AIService {
  // Generate content with AI
  static async generate(
    projectId: string,
    options: GenerateOptions
  ): Promise<AIGenerationJob> {
    try {
      const { data, error } = await supabase.functions.invoke('premium-ai-generate', {
        body: {
          projectId,
          options
        }
      });

      if (error) throw error;

      // Poll for job completion using jobs table
      return data.job;
    } catch (error) {
      console.error('Failed to generate content:', error);
      throw error;
    }
  }

  // Repurpose video for different platforms
  static async repurpose(
    projectId: string,
    options: RepurposeOptions
  ): Promise<AIGenerationJob> {
    try {
      const { data, error } = await supabase.functions.invoke('premium-ai-repurpose', {
        body: {
          projectId,
          options
        }
      });

      if (error) throw error;

      return data.job;
    } catch (error) {
      console.error('Failed to repurpose content:', error);
      throw error;
    }
  }

  // Publish to platform
  static async publish(
    projectId: string,
    options: PublishOptions
  ): Promise<AIGenerationJob> {
    try {
      const { data, error } = await supabase.functions.invoke('premium-ai-publish', {
        body: {
          projectId,
          options
        }
      });

      if (error) throw error;

      return data.job;
    } catch (error) {
      console.error('Failed to publish content:', error);
      throw error;
    }
  }

  // Write content with AI
  static async write(
    projectId: string,
    context: string,
    options: WriteOptions
  ): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('premium-ai-write', {
        body: {
          projectId,
          context,
          options
        }
      });

      if (error) throw error;

      return data.text;
    } catch (error) {
      console.error('Failed to write content:', error);
      throw error;
    }
  }

  // Get job status
  static async getJobStatus(jobId: string): Promise<AIGenerationJob> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    
    const status = data.status === 'running' ? 'processing' : data.status;
    
    return {
      id: data.id,
      project_id: data.video_id,
      tool: data.type,
      status: status as 'pending' | 'processing' | 'completed' | 'failed',
      input_data: (typeof data.payload === 'object' && data.payload !== null) ? data.payload as Record<string, any> : {},
      output_data: (typeof data.result === 'object' && data.result !== null) ? data.result as Record<string, any> : undefined,
      error_message: data.error_message || undefined,
      credits_used: 0,
      created_at: data.created_at,
      updated_at: data.created_at,
      completed_at: data.completed_at || undefined
    };
  }

  // Get all jobs for project
  static async getJobs(projectId: string): Promise<AIGenerationJob[]> {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('video_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(job => {
      const status = job.status === 'running' ? 'processing' : job.status;
      
      return {
        id: job.id,
        project_id: job.video_id,
        tool: job.type,
        status: status as 'pending' | 'processing' | 'completed' | 'failed',
        input_data: (typeof job.payload === 'object' && job.payload !== null) ? job.payload as Record<string, any> : {},
        output_data: (typeof job.result === 'object' && job.result !== null) ? job.result as Record<string, any> : undefined,
        error_message: job.error_message || undefined,
        credits_used: 0,
        created_at: job.created_at,
        updated_at: job.created_at,
        completed_at: job.completed_at || undefined
      };
    });
  }

  // Calculate credits for operation
  static calculateCredits(
    tool: string,
    options: any
  ): number {
    switch (tool) {
      case 'generate':
        if (options.type === 'video') return 10;
        if (options.type === 'audio') return 5;
        if (options.type === 'image') return 2;
        return 1;
      case 'repurpose':
        return 5;
      case 'publish':
        return 2;
      case 'write':
        return 1;
      default:
        return 1;
    }
  }
}
