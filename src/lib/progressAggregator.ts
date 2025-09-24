// Progress aggregation for multi-stage video export processing
export interface ProgressEvent {
  stage: 'captions' | 'asl' | 'ad' | 'finalizing';
  progress: number; // 0-100
  msg?: string;
}

export interface AggregatedProgress {
  stage: string;
  progress: number; 
  message: string;
}

export type ProgressCallback = (progress: AggregatedProgress) => void;

export function makeProgressAggregator(cb: ProgressCallback) {
  // Weights for different processing stages (should sum to 1.0)
  const weights = { 
    captions: 0.4,   // Canvas rendering is CPU intensive
    asl: 0.35,       // FFmpeg ASL overlay processing
    ad: 0.25         // FFmpeg audio mixing
  };
  
  const state = { captions: 0, asl: 0, ad: 0 };
  
  return (evt: ProgressEvent) => {
    const { stage, progress, msg } = evt;
    
    // Update stage progress (only increase, never decrease)
    if (stage in state) {
      state[stage] = Math.max(state[stage], progress || 0);
    }
    
    // Calculate weighted total progress
    const total = Object.entries(state).reduce((sum, [k, v]) => {
      return sum + (weights[k as keyof typeof weights] || 0) * v;
    }, 0);
    
    // Cap at 100% and round for clean display
    const totalProgress = Math.min(100, Math.round(total));
    
    cb({ 
      stage, 
      progress: totalProgress, 
      message: msg || `Processing ${stage}...`
    });
  };
}