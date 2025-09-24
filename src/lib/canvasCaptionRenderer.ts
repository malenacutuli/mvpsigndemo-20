// Canvas-based caption rendering to avoid FFmpeg subtitle filter issues
export interface CaptionSegment {
  startTime: number;
  endTime: number;
  text: string;
  speakerColor?: string;
}

export interface CaptionStyle {
  fontSize?: number;
  bg?: boolean;
  fontFamily?: string;
}

export class CanvasCaptionRenderer {
  async renderCaptionsOnCanvas(
    videoUrl: string,
    captions: CaptionSegment[],
    style: CaptionStyle = {}
  ): Promise<string> {
    console.log('↪ Rendering captions via Canvas...');

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

    // Audio pipeline
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    await audioCtx.resume();
    const source = audioCtx.createMediaElementSource(video);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);

    const canvasStream = (canvas as any).captureStream(30);
    const mixedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm;codecs=vp8';
    const recorder = new MediaRecorder(mixedStream, {
      mimeType: mime,
      videoBitsPerSecond: 4_000_000,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

    return new Promise<string>((resolve, reject) => {
      recorder.onstop = () => {
        const out = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(out);
        resolve(url);
      };

      // Caption drawing with background
      const drawCaption = (text: string, color = '#ffffff') => {
        const paddingX = 24;
        const paddingY = 12;
        const marginBottom = 40;
        const maxWidth = Math.min(width * 0.9, 900);
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';

        // Word wrap
        const words = text.split(' ');
        const lines: string[] = [];
        let line = '';
        for (const w of words) {
          const test = line ? line + ' ' + w : w;
          if (ctx.measureText(test).width > maxWidth) {
            if (line) lines.push(line);
            line = w;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);

        const lineHeight = fontSize * 1.4;
        const totalHeight = lines.length * lineHeight + paddingY * 2;
        const boxWidth = maxWidth + paddingX * 2;
        const x = width / 2;
        const yStart = height - marginBottom - totalHeight;

        // Background box
        if (bg) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(x - boxWidth / 2, yStart, boxWidth, totalHeight);
        }

        // Text
        ctx.fillStyle = color;
        lines.forEach((ln, i) => {
          const y = yStart + paddingY + (i + 1) * lineHeight;
          ctx.fillText(ln, x, y);
        });
      };

      const renderLoop = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(video as any, 0, 0, width, height);
        const t = video.currentTime;
        
        // Find active caption
        const cap = captions.find(c => t >= c.startTime && t <= c.endTime);
        if (cap) {
          drawCaption(cap.text, cap.speakerColor || '#ffffff');
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