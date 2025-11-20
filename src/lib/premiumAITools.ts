import { supabase } from '@/integrations/supabase/client';
import type {
  AIToolRequest,
  AIToolResponse,
  GenerateOptions,
  RepurposeOptions,
  PublishOptions,
  WriteOptions,
  AIGenerationJob,
} from '@/types/premium-ai-tools';

export async function generateContent(
  versionId: string,
  options: GenerateOptions
): Promise<AIToolResponse> {
  try {
    const request: AIToolRequest = {
      tool: 'generate',
      versionId,
      options,
    };

    const { data, error } = await supabase.functions.invoke('premium-ai-generate', {
      body: request,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Generate content error:', error);
    throw error;
  }
}

export async function repurposeContent(
  versionId: string,
  options: RepurposeOptions
): Promise<AIToolResponse> {
  try {
    const request: AIToolRequest = {
      tool: 'repurpose',
      versionId,
      options,
    };

    const { data, error } = await supabase.functions.invoke('premium-ai-repurpose', {
      body: request,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Repurpose content error:', error);
    throw error;
  }
}

export async function publishContent(
  versionId: string,
  options: PublishOptions
): Promise<AIToolResponse> {
  try {
    const request: AIToolRequest = {
      tool: 'publish',
      versionId,
      options,
    };

    const { data, error } = await supabase.functions.invoke('premium-ai-publish', {
      body: request,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Publish content error:', error);
    throw error;
  }
}

export async function writeContent(
  versionId: string,
  options: WriteOptions
): Promise<AIToolResponse> {
  try {
    const request: AIToolRequest = {
      tool: 'write',
      versionId,
      options,
    };

    const { data, error } = await supabase.functions.invoke('premium-ai-write', {
      body: request,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Write content error:', error);
    throw error;
  }
}

export async function getJobStatus(jobId: string): Promise<AIGenerationJob> {
  try {
    const { data, error } = await supabase
      .from('premium_video_edits')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    return data as unknown as AIGenerationJob;
  } catch (error) {
    console.error('Get job status error:', error);
    throw error;
  }
}

export function pollJobStatus(
  jobId: string,
  onUpdate: (job: AIGenerationJob) => void,
  intervalMs: number = 2000
): () => void {
  const interval = setInterval(async () => {
    try {
      const job = await getJobStatus(jobId);
      onUpdate(job);
      
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Poll job status error:', error);
      clearInterval(interval);
    }
  }, intervalMs);

  return () => clearInterval(interval);
}
