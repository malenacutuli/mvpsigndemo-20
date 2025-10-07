import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, PlayCircle } from 'lucide-react';

interface Caption {
  startTime: number;
  endTime: number;
  text: string;
  speaker?: string;
  speakerColor?: string;
}

interface BrowserVideoProcessorProps {
  videoUrl: string;
  videoId: string;
  captions: Caption[];
  onComplete?: (processedVideoUrl: string) => void;
}

export const BrowserVideoProcessor = ({ 
  videoUrl, 
  videoId, 
  captions, 
  onComplete 
}: BrowserVideoProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [outputExt, setOutputExt] = useState<'mp4' | 'webm'>('mp4');
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const initFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });

    ffmpeg.on('progress', ({ progress }) => {
      setProgress(Math.round(progress * 100));
    });

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const generateSubtitleFile = (captions: Caption[]): string => {
    let srt = '';
    captions.forEach((caption, index) => {
      const startTime = formatSRTTime(caption.startTime);
      const endTime = formatSRTTime(caption.endTime);
      
      srt += `${index + 1}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${caption.text}\n\n`;
    });
    return srt;
  };

  const formatSRTTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const processVideo = async () => {
    if (!captions || captions.length === 0) {
      alert('No captions available to burn in');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatus('Initializing FFmpeg...');

    try {
      const ffmpeg = await initFFmpeg();
      
      setStatus('Downloading video...');
      // Download the video file
      const videoData = await fetchFile(videoUrl);
      await ffmpeg.writeFile('input.mp4', videoData);
      
      setStatus('Generating subtitles...');
      // Generate subtitle file
      const subtitleContent = generateSubtitleFile(captions);
      await ffmpeg.writeFile('subtitles.srt', new TextEncoder().encode(subtitleContent));
      
      setStatus('Processing video with captions...');
      setProgress(10);
      
      // FFmpeg command to burn in subtitles with styling
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', `subtitles=subtitles.srt:force_style='FontSize=24,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,BackColour=&H80000000,Shadow=1,MarginV=50'`,
        '-c:a', 'copy',
        '-y',
        'output.mp4'
      ]);
      
      setStatus('Generating download...');
      setProgress(90);
      
      // Read the output file
      const outputData = await ffmpeg.readFile('output.mp4');
      const outputArray = outputData instanceof Uint8Array 
        ? new Uint8Array(outputData) 
        : new TextEncoder().encode(String(outputData));
      const outputBlob = new Blob([outputArray], { type: 'video/mp4' });
      const outputUrl = URL.createObjectURL(outputBlob);
      
      setProcessedVideoUrl(outputUrl);
      setProgress(100);
      setStatus('Processing complete!');
      
      onComplete?.(outputUrl);
      
    } catch (error) {
      console.error('Video processing failed:', error);
      setStatus(`FFmpeg path failed: ${error.message}. You can try Quick Export (WebM) below.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick WebM export fallback via Canvas + MediaRecorder (keeps original audio)
  const quickBurnWithCanvas = async () => {
    if (!captions || captions.length === 0) {
      alert('No captions available to burn in');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setStatus('Preparing quick export (WebM)...');
      setOutputExt('webm');

      // Fetch the video as a blob to avoid CORS tainting
      const resp = await fetch(videoUrl);
      if (!resp.ok) throw new Error(`Failed to fetch video (${resp.status})`);
      const videoBlob = await resp.blob();

      const video = document.createElement('video');
      video.src = URL.createObjectURL(videoBlob);
      video.crossOrigin = 'anonymous';
      video.playsInline = true;
      video.muted = true; // allow autoplay

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
      // Do not connect to audioCtx.destination to keep it silent while recording

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
      recorder.onstop = () => {
        const out = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(out);
        setProcessedVideoUrl(url);
        setStatus('Processing complete!');
        setProgress(100);
        onComplete?.(url);
      };

      // Simple wrapped text drawing with background
      const drawCaption = (text: string, color = '#ffffff') => {
        const paddingX = 24;
        const paddingY = 12;
        const marginBottom = 40;
        const maxWidth = Math.min(width * 0.9, 900);
        ctx.font = 'bold 28px Arial';
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

        const lineHeight = 36;
        const totalHeight = lines.length * lineHeight + paddingY * 2;
        const boxWidth = maxWidth + paddingX * 2;
        const x = width / 2;
        const yStart = height - marginBottom - totalHeight;

        // Background box
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x - boxWidth / 2, yStart, boxWidth, totalHeight);

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
        // find active caption
        const cap = captions.find(c => t >= c.startTime && t <= c.endTime);
        if (cap) drawCaption(cap.text, cap.speakerColor || '#ffffff');
        setProgress(Math.max(1, Math.round((t / (video.duration || 1)) * 100)));
        if (!video.ended) requestAnimationFrame(renderLoop);
      };

      recorder.start(500);
      video.currentTime = 0;
      await video.play();
      requestAnimationFrame(renderLoop);

      video.onended = () => {
        recorder.stop();
      };

    } catch (err: any) {
      console.error('Quick export failed:', err);
      setStatus(`Quick export failed: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (!processedVideoUrl) return;
    
    const a = document.createElement('a');
    a.href = processedVideoUrl;
    a.download = `${videoId}_with_captions.${outputExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const previewVideo = () => {
    if (!processedVideoUrl) return;
    window.open(processedVideoUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          Browser Video Processor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Process video with burned-in captions directly in your browser. No server required!
        </div>
        
        {captions && captions.length > 0 && (
          <div className="text-sm">
            <strong>{captions.length} captions</strong> ready to burn in
          </div>
        )}

        {isProcessing && (
          <div className="space-y-2">
            <div className="text-sm font-medium">{status}</div>
            <Progress value={progress} className="w-full" />
            <div className="text-xs text-muted-foreground">
              {progress}% complete
            </div>
          </div>
        )}

        {processedVideoUrl && !isProcessing && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-green-600">
              ✅ Video processed successfully!
            </div>
            <div className="flex gap-2">
              <Button onClick={downloadVideo} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" onClick={previewVideo}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        )}

        {!isProcessing && !processedVideoUrl && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button 
              onClick={processVideo} 
              className="w-full"
              disabled={!captions || captions.length === 0}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              FFmpeg (MP4)
            </Button>
            <Button 
              variant="outline"
              onClick={quickBurnWithCanvas}
              className="w-full"
              disabled={!captions || captions.length === 0}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Quick Export (WebM)
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>• Processing happens entirely in your browser</p>
          <p>• No data is sent to external servers</p>
          <p>• Large videos may take longer to process</p>
        </div>
      </CardContent>
    </Card>
  );
};