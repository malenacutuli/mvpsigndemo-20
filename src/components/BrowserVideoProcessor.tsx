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
      const outputBlob = new Blob([outputData], { type: 'video/mp4' });
      const outputUrl = URL.createObjectURL(outputBlob);
      
      setProcessedVideoUrl(outputUrl);
      setProgress(100);
      setStatus('Processing complete!');
      
      onComplete?.(outputUrl);
      
    } catch (error) {
      console.error('Video processing failed:', error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (!processedVideoUrl) return;
    
    const a = document.createElement('a');
    a.href = processedVideoUrl;
    a.download = `${videoId}_with_captions.mp4`;
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
                Download MP4
              </Button>
              <Button variant="outline" onClick={previewVideo}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        )}

        {!isProcessing && !processedVideoUrl && (
          <Button 
            onClick={processVideo} 
            className="w-full"
            disabled={!captions || captions.length === 0}
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Process Video with Captions
          </Button>
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