import { supabase } from '@/integrations/supabase/client';

interface FillerInstance {
  segmentId: string;
  wordIndex: number;
  startTime: number;
  endTime: number;
}

export async function removeFillerWords(
  videoId: string,
  fillerInstances: FillerInstance[]
) {
  try {
    // Group instances by segment
    const instancesBySegment = new Map<string, FillerInstance[]>();
    
    fillerInstances.forEach(instance => {
      if (!instancesBySegment.has(instance.segmentId)) {
        instancesBySegment.set(instance.segmentId, []);
      }
      instancesBySegment.get(instance.segmentId)!.push(instance);
    });

    // Process each segment
    for (const [segmentId, instances] of instancesBySegment) {
      // Fetch segment
      const { data: segment, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('id', segmentId)
        .maybeSingle();

      if (error || !segment) continue;

      const words = (segment.words || []) as any[];
      
      // Mark words for removal
      instances.forEach(instance => {
        if (words[instance.wordIndex]) {
          words[instance.wordIndex].remove = true;
        }
      });

      // Filter out removed words
      const filteredWords = words.filter((w: any) => !w.remove);
      
      // Update segment
      const newText = filteredWords.map((w: any) => w.word || w.text || '').join(' ');
      
      await supabase
        .from('transcript_segments')
        .update({
          text: newText,
          words: filteredWords,
          updated_at: new Date().toISOString()
        })
        .eq('id', segmentId);
    }

    return { success: true, removed: fillerInstances.length };
  } catch (error) {
    console.error('Filler word removal error:', error);
    throw error;
  }
}
