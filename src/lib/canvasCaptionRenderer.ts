// Canvas-based caption rendering to avoid FFmpeg subtitle filter issues
export interface WordSegment {
  text: string;
  startTime: number;
  endTime: number;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: 'high' | 'low' | 'normal';
}

export interface CaptionSegment {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  speakerColor?: string;
  words?: WordSegment[];
  vocal_intensity?: 'whisper' | 'normal' | 'yell' | 'shout';
  intensity_confidence?: number;
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling';
  pitch?: number | 'high' | 'low' | 'normal';
  volume?: number;
}

export interface CaptionStyle {
  fontSize?: number;
  bg?: boolean;
  fontFamily?: string;
}

export type ProgressCallback = (percent: number) => void;

/**
 * Calculate font size based on vocal intensity, volume, or emphasis - matching CWI
 */
const getIntonationBasedFontSize = (
  screenHeight: number, 
  vocalIntensity?: 'whisper' | 'normal' | 'yell' | 'shout',
  volume?: number,
  emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling'
): number => {
  const baseSize = Math.max(20, screenHeight * 0.0286);
  const minSize = Math.max(12, screenHeight * 0.015);
  const maxSize = Math.max(31, screenHeight * 0.0455);
  
  // Priority 1: Use vocal intensity analysis if available
  if (vocalIntensity) {
    switch (vocalIntensity) {
      case 'whisper':
        return minSize;
      case 'yell':
        return baseSize * 1.2;
      case 'shout':
        return baseSize * 1.4;
      case 'normal':
      default:
        return baseSize;
    }
  }
  
  // Priority 2: Use manual emphasis from transcript editing
  if (emphasis) {
    switch (emphasis) {
      case 'quiet':
        return minSize;
      case 'loud':
        return baseSize * 1.2;
      case 'yelling':
        return baseSize * 1.4;
      case 'normal':
      default:
        return baseSize;
    }
  }
  
  // Fallback: Use volume level
  if (volume !== undefined) {
    if (volume <= 30) return minSize + ((volume / 30) * (baseSize - minSize));
    if (volume >= 85) return baseSize * 1.4;
    return baseSize + (((volume - 30) / 55) * (baseSize * 1.4 - baseSize));
  }
  
  return baseSize;
};

/**
 * Get word-specific font size based on emphasis
 */
const getWordFontSize = (baseSize: number, emphasis?: 'loud' | 'quiet' | 'normal' | 'yelling'): number => {
  if (!emphasis || emphasis === 'normal') return baseSize;
  
  switch (emphasis) {
    case 'loud':
      return baseSize * 1.4;
    case 'yelling':
      return baseSize * 1.6;
    case 'quiet':
      return baseSize * 0.7;
    default:
      return baseSize;
  }
};

/**
 * Get typography style based on pitch
 */
const getPitchBasedStyle = (pitch?: number | 'high' | 'low' | 'normal'): { weight: number; stretch: number } => {
  let pitchHz: number;
  
  if (typeof pitch === 'string') {
    switch (pitch) {
      case 'high': pitchHz = 220; break;
      case 'low': pitchHz = 100; break;
      case 'normal': 
      default: pitchHz = 180; break;
    }
  } else {
    pitchHz = pitch || 180;
  }
  
  // Baseline: 160-200 Hz uses Regular 400 weight
  if (pitchHz >= 160 && pitchHz <= 200) {
    return { weight: 400, stretch: 1 };
  }
  
  // Lower pitch (80-160 Hz): heavier weight, expanded width
  if (pitchHz < 160) {
    const weight = Math.max(500, 700 - ((pitchHz - 80) / 80) * 200);
    const stretch = 1 + ((160 - pitchHz) / 80) * 0.25;
    return { weight, stretch };
  }
  
  // Higher pitch (200+ Hz): lighter weight, condensed width
  const weight = Math.max(200, 400 - ((pitchHz - 200) / 50) * 200);
  const stretch = Math.max(0.75, 1 - ((pitchHz - 200) / 50) * 0.25);
  
  return { weight, stretch };
};

export class CanvasCaptionRenderer {
  async renderCaptionsOnCanvas(
    videoUrl: string,
    captions: CaptionSegment[],
    style: CaptionStyle = {},
    onProgress?: ProgressCallback
  ): Promise<string> {
    console.log('↪ Rendering captions via Canvas with CWI styling...');

    const { fontSize = 24, bg = true, fontFamily = 'Arial' } = style;

    // Fetch the video as a blob to avoid CORS tainting
    const resp = await fetch(videoUrl);
    if (!resp.ok) throw new Error(`Failed to fetch video (${resp.status})`);
    const videoBlob = await resp.blob();

    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video metadata'));
    });

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    // PHASE 3: Enhanced audio pipeline with proper state management
    // Wait for video to be fully ready
    await new Promise<void>((resolve) => {
      if (video.readyState >= 3) {
        resolve();
      } else {
        video.addEventListener('canplay', () => resolve(), { once: true });
      }
    });

    // Create audio context with proper state management
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Ensure context is running
    if (audioCtx.state === 'suspended') {
      console.log('[Audio] Resuming suspended AudioContext');
      await audioCtx.resume();
    }
    
    // Add state change monitoring
    audioCtx.addEventListener('statechange', () => {
      console.log('[Audio] Context state changed to:', audioCtx.state);
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(err => console.error('[Audio] Resume failed:', err));
      }
    });

    let source: MediaElementAudioSourceNode;
    let dest: MediaStreamAudioDestinationNode;
    
    try {
      source = audioCtx.createMediaElementSource(video);
      dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      
      // Add analyzer for audio signal verification
      const analyzer = audioCtx.createAnalyser();
      source.connect(analyzer);
      
      // Check for audio signal periodically
      const checkAudio = () => {
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);
        const hasSignal = dataArray.some(value => value > 0);
        console.log('[Audio] Signal detected:', hasSignal);
      };
      
      const audioCheckInterval = setInterval(checkAudio, 2000);
      video.addEventListener('ended', () => clearInterval(audioCheckInterval), { once: true });
      
      console.log('[Audio] Pipeline setup complete');
    } catch (error) {
      console.error('[Audio] Pipeline setup failed:', error);
      throw new Error('Audio setup failed - try re-exporting');
    }

    const canvasStream = (canvas as any).captureStream(30);
    const mixedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm;codecs=vp8';
    
    // Verify tracks before recording
    console.log('[Export] Video tracks:', mixedStream.getVideoTracks().length);
    console.log('[Export] Audio tracks:', mixedStream.getAudioTracks().length);
    
    if (mixedStream.getAudioTracks().length === 0) {
      throw new Error('No audio tracks available for recording');
    }
    
    const recorder = new MediaRecorder(mixedStream, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000, // Explicit audio bitrate
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    return new Promise<string>((resolve, reject) => {
      recorder.onstop = () => {
        const out = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(out);
        resolve(url);
      };

      // PHASE 2: CWI Caption drawing with word-by-word highlighting
      const drawCaptionWithIntention = (segment: CaptionSegment, currentTime: number) => {
        const paddingX = 24;
        const paddingY = 16;
        const marginBottom = 60;
        const maxWidth = Math.min(width * 0.9, 900);
        
        // Calculate base font size from vocal intensity
        const baseFontSize = getIntonationBasedFontSize(
          height,
          segment.vocal_intensity,
          segment.volume,
          segment.emphasis
        );
        
        // Synthesize word timing if missing
        let words = segment.words;
        if (!words || words.length === 0) {
          const textWords = segment.text.trim().split(/\s+/).filter(Boolean);
          const duration = segment.endTime - segment.startTime;
          const avgWordDuration = duration / textWords.length;
          
          words = textWords.map((word, index) => ({
            text: word,
            startTime: segment.startTime + (index * avgWordDuration),
            endTime: segment.startTime + ((index + 1) * avgWordDuration),
            emphasis: 'normal' as const,
            pitch: 'normal' as const
          }));
        }
        
        // Find active word
        const TIMING_TOLERANCE = 0.06;
        let activeWordIndex = words.findIndex(word => 
          currentTime >= (word.startTime - TIMING_TOLERANCE) && 
          currentTime <= (word.endTime + TIMING_TOLERANCE)
        );
        
        // Fallback: proportional progress
        if (activeWordIndex < 0 && currentTime >= segment.startTime && currentTime <= segment.endTime) {
          const progress = (currentTime - segment.startTime) / Math.max(0.001, segment.endTime - segment.startTime);
          activeWordIndex = Math.min(words.length - 1, Math.max(0, Math.floor(progress * words.length)));
        }
        
        // Build caption line with appropriate styling
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        
        const x = width / 2;
        let yPos = height - marginBottom - paddingY;
        
        // Render words with spacing
        const wordSpacing = 8;
        let lineWords: Array<{ text: string; isActive: boolean; wordSize: number; color: string; style: any }> = [];
        
        words.forEach((word, index) => {
          const isActive = index === activeWordIndex;
          const wordColor = isActive ? (segment.speakerColor || '#FFFFFF') : 'rgba(255, 255, 255, 0.7)';
          const wordSize = isActive ? getWordFontSize(baseFontSize, word.emphasis) : baseFontSize;
          const pitchStyle = getPitchBasedStyle(word.pitch);
          
          lineWords.push({ text: word.text, isActive, wordSize, color: wordColor, style: pitchStyle });
        });
        
        // Calculate total width for centering
        let totalWidth = 0;
        lineWords.forEach(({ text, wordSize }) => {
          ctx.font = `bold ${wordSize}px ${fontFamily}`;
          totalWidth += ctx.measureText(text).width + wordSpacing;
        });
        
        // Draw background box
        if (bg) {
          const boxHeight = baseFontSize * 1.6 + paddingY * 2;
          const boxWidth = Math.min(totalWidth + paddingX * 2, maxWidth + paddingX * 2);
          const boxX = x - boxWidth / 2;
          const boxY = yPos - baseFontSize * 1.4 - paddingY;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        }
        
        // Draw words
        let currentX = x - totalWidth / 2;
        lineWords.forEach(({ text, isActive, wordSize, color, style }) => {
          ctx.font = `${style.weight} ${wordSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          
          // Add text shadow for active words
          if (isActive) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          } else {
            ctx.shadowBlur = 0;
          }
          
          const wordWidth = ctx.measureText(text).width;
          ctx.fillText(text, currentX + wordWidth / 2, yPos);
          currentX += wordWidth + wordSpacing;
        });
        
        // Reset shadow
        ctx.shadowBlur = 0;
      };

      const renderLoop = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(video as any, 0, 0, width, height);
        const t = video.currentTime;
        
        // PHASE 4: Report progress
        if (onProgress && video.duration > 0) {
          const percent = (t / video.duration) * 100;
          onProgress(percent);
        }
        
        // Find active caption with CWI rendering
        const cap = captions.find(c => t >= c.startTime && t <= c.endTime);
        if (cap) {
          drawCaptionWithIntention(cap, t);
        }
        
        if (!video.ended) {
          requestAnimationFrame(renderLoop);
        }
      };

      recorder.start(500);
      video.currentTime = 0;
      video.play().then(() => {
        requestAnimationFrame(renderLoop);
      }).catch(reject);

      video.onended = () => {
        recorder.stop();
      };

      video.onerror = () => {
        reject(new Error('Video playback error during caption rendering'));
      };
    });
  }
}

export const canvasCaptionRenderer = new CanvasCaptionRenderer();