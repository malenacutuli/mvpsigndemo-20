import { supabase } from '@/integrations/supabase/client';

export interface ClipGenerationParams {
  videoId: string;
  highlightId?: string;
  platform: string;
  startTime: number;
  endTime: number;
  captionStyle: string;
  cropMode: string;
  segments?: string[]; // For multi-segment mode
}

export interface ClipGenerationResponse {
  success: boolean;
  clipId: string;
  videoUrl?: string;
  clipUrl?: string;
  status: string;
  message?: string;
  error?: string;
}

/**
 * Generate a social clip using Supabase Edge Function
 */
export async function generateSocialClip(
  params: ClipGenerationParams
): Promise<ClipGenerationResponse> {
  console.log('🎬 Generating social clip:', params);
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-social-clip', {
      body: params
    });
    
    if (error) {
      console.error('❌ Edge function error:', error);
      throw new Error(error.message || 'Edge function failed');
    }
    
    console.log('✅ Clip generation response:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Clip generation failed:', error);
    throw error;
  }
}

/**
 * Poll for clip completion status
 */
export async function pollClipStatus(
  clipId: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<{ status: string; clipUrl?: string; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data, error } = await supabase
      .from('social_clips')
      .select('status, clip_url, error_message')
      .eq('id', clipId)
      .single();
    
    if (error) {
      console.error('❌ Error polling clip status:', error);
      throw error;
    }
    
    console.log(`⏳ Clip status (attempt ${i + 1}):`, data.status);
    
    if (data.status === 'completed') {
      return { status: 'completed', clipUrl: data.clip_url! };
    }
    
    if (data.status === 'failed') {
      return { status: 'failed', error: data.error_message || 'Unknown error' };
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return { status: 'timeout', error: 'Processing timed out' };
}
