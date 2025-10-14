// Canvas-based caption rendering to avoid FFmpeg subtitle filter issues
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

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

    // Wait for video to be fully ready
    await new Promise<void>((resolve) => {
      if (video.readyState >= 3) {
        resolve();
      } else {
        video.addEventListener('canplay', () => resolve(), { once: true });
      }
    });

    const canvasStream = (canvas as any).captureStream(30);
    let mixedStream: MediaStream;
    let audioPath: 'captureStream' | 'webAudio' | 'videoOnly' = 'videoOnly';

    // PATH 1: Try to capture audio directly from video element (most reliable)
    try {
      console.log('[Audio] Attempting captureStream path...');
      video.muted = false; // Required for captureStream to include audio
      video.volume = 0; // Silent to user, but audio track is active
      
      const videoStream = (video as any).captureStream?.() || (video as any).mozCaptureStream?.();
      const audioTracks = videoStream?.getAudioTracks() || [];
      
      console.log('[Audio] captureStream audio tracks:', audioTracks.length);
      
      if (audioTracks.length > 0) {
        mixedStream = new MediaStream([
          canvasStream.getVideoTracks()[0],
          ...audioTracks
        ]);
        audioPath = 'captureStream';
        console.log('[Audio] ✓ Using captureStream path');
      } else {
        throw new Error('No audio tracks in captureStream');
      }
    } catch (captureErr) {
      console.warn('[Audio] captureStream failed:', captureErr);
      
      // PATH 2: Fallback to WebAudio with keepalive
      try {
        console.log('[Audio] Attempting WebAudio path...');
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (audioCtx.state === 'suspended') {
          console.log('[Audio] Resuming suspended AudioContext');
          await audioCtx.resume();
        }
        
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        
        // Add keepalive gain node to prevent AudioContext suspension
        const zeroGain = audioCtx.createGain();
        zeroGain.gain.value = 0.00001; // Nearly silent but keeps context alive
        source.connect(zeroGain);
        zeroGain.connect(audioCtx.destination);
        
        // Also connect to destination for recording
        source.connect(dest);
        
        console.log('[Audio] WebAudio pipeline setup complete');
        
        mixedStream = new MediaStream([
          canvasStream.getVideoTracks()[0],
          ...dest.stream.getAudioTracks()
        ]);
        audioPath = 'webAudio';
        console.log('[Audio] ✓ Using WebAudio path');
      } catch (webAudioErr) {
        console.warn('[Audio] WebAudio failed:', webAudioErr);
        
        // PATH 3: Video-only, will mux audio later with FFmpeg
        console.log('[Audio] Will use FFmpeg muxing fallback');
        mixedStream = new MediaStream([canvasStream.getVideoTracks()[0]]);
        audioPath = 'videoOnly';
      }
    }

    // Smart MIME type selection
    const mimeTypes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // Safari/iOS
      'video/webm;codecs=vp9,opus',               // Modern Chrome/Firefox
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    
    const mime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
    console.log('[Export] Selected MIME type:', mime);
    
    // Diagnostics
    console.log('[Export] Video tracks:', mixedStream.getVideoTracks().length);
    console.log('[Export] Audio tracks:', mixedStream.getAudioTracks().length);
    console.log('[Export] Audio path:', audioPath);
    
    const recorder = new MediaRecorder(mixedStream, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
      audioBitsPerSecond: 128_000,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    return new Promise<string>(async (resolve, reject) => {
      recorder.onstop = async () => {
        const out = new Blob(chunks, { type: mime });
        
        // PATH 3 FALLBACK: If we recorded video-only, mux original audio with FFmpeg
        if (audioPath === 'videoOnly' && videoBlob) {
          try {
            console.log('[FFmpeg] Muxing original audio into video...');
            const ffmpeg = new FFmpeg();
            await ffmpeg.load();
            
            // Convert blobs to Uint8Array for FFmpeg
            const canvasBuffer = await out.arrayBuffer();
            const originalBuffer = await videoBlob.arrayBuffer();
            
            await ffmpeg.writeFile('canvas.webm', new Uint8Array(canvasBuffer));
            await ffmpeg.writeFile('original.mp4', new Uint8Array(originalBuffer));
            
            // Mux: take video from canvas, audio from original
            // Use AAC codec for MP4 for better compatibility
            await ffmpeg.exec([
              '-i', 'canvas.webm',
              '-i', 'original.mp4',
              '-map', '0:v:0',
              '-map', '1:a:0',
              '-c:v', 'copy',
              '-c:a', 'aac',
              '-b:a', '128k',
              '-shortest',
              'output.mp4'
            ]);
            
            const outputData = await ffmpeg.readFile('output.mp4');
            // Convert FileData to ArrayBuffer for Blob
            const uint8Data = outputData instanceof Uint8Array ? outputData : new Uint8Array();
            const arrayBuffer = uint8Data.slice().buffer; // Create a new ArrayBuffer
            const finalBlob = new Blob([arrayBuffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(finalBlob);
            
            console.log('[FFmpeg] ✓ Muxing complete, size:', (finalBlob.size / 1024 / 1024).toFixed(2), 'MB');
            resolve(url);
          } catch (ffmpegErr) {
            console.error('[FFmpeg] Muxing failed:', ffmpegErr);
            // Return video-only as last resort
            const url = URL.createObjectURL(out);
            console.warn('[FFmpeg] Returning video without audio due to muxing failure');
            resolve(url);
          }
        } else {
          const url = URL.createObjectURL(out);
          resolve(url);
        }
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