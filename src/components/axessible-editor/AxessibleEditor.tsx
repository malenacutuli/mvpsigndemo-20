import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Download, ArrowLeft, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input, ALL_FORMATS, BlobSource, VideoSampleSink } from 'mediabunny';

interface AxessibleEditorProps {
  videoId: string;
}

interface MediaBunnyInput {
  input: Input | null;
  videoTrack: any | null;
  audioTrack: any | null;
  videoSink: VideoSampleSink | null;
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export function AxessibleEditor({ videoId }: AxessibleEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mediaInput, setMediaInput] = useState<MediaBunnyInput>({
    input: null,
    videoTrack: null,
    audioTrack: null,
    videoSink: null,
    duration: 0,
    width: 1920,
    height: 1080,
    fps: 30,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [transcriptSegments, setTranscriptSegments] = useState<any[]>([]);
  const { project, setProject } = usePremiumEditor();
  const navigate = useNavigate();
  const animationFrameRef = useRef<number | null>(null);

  // Load video and initialize MediaBunny
  useEffect(() => {
    if (!videoId) return;

    loadVideoIntoEditor(videoId);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoId]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying || !mediaInput.videoSink || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();
    
    const loop = async () => {
      const now = performance.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      const newTime = Math.min(currentTime + deltaTime, mediaInput.duration);
      setCurrentTime(newTime);

      // Draw current frame
      try {
        const sample = await mediaInput.videoSink!.getSample(newTime);
        if (sample && ctx && canvasRef.current) {
          // Clear canvas
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Draw video frame
          sample.draw(ctx, 0, 0);

          // Draw captions overlay
          drawCaptionsAtTime(ctx, newTime);
        }
      } catch (error) {
        console.error('Error rendering frame:', error);
      }

      // Stop at end
      if (newTime >= mediaInput.duration) {
        setIsPlaying(false);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, mediaInput, transcriptSegments]);

  async function loadVideoIntoEditor(videoId: string) {
    setIsLoading(true);

    try {
      // 1. Fetch video metadata from Supabase
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      if (!video) throw new Error('Video not found');

      // 2. Fetch transcript segments
      const { data: segments } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', 'en')
        .order('start_time');

      if (segments) {
        setTranscriptSegments(segments);
      }

      // 3. Construct video URL and fetch as blob
      const videoUrl = constructStorageUrl(video.storage_path);
      console.log('Loading video from:', videoUrl);

      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Failed to fetch video');
      
      const blob = await response.blob();
      console.log('Video blob loaded:', blob.size, 'bytes');

      // 4. Initialize MediaBunny Input
      const input = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(blob),
      });

      // 5. Extract video metadata
      const duration = await input.computeDuration();
      const videoTrack = await input.getPrimaryVideoTrack();
      const audioTrack = await input.getPrimaryAudioTrack();

      let width = 1920;
      let height = 1080;
      let fps = 30;

      if (videoTrack) {
        width = videoTrack.displayWidth;
        height = videoTrack.displayHeight;

        // Estimate FPS
        const packetStats = await videoTrack.computePacketStats(100);
        fps = Math.round(packetStats.averagePacketRate);

        console.log('Video track:', { width, height, fps, duration });
      }

      // 6. Create video sink for frame extraction
      let videoSink: VideoSampleSink | null = null;
      if (videoTrack) {
        const decodable = await videoTrack.canDecode();
        if (decodable) {
          videoSink = new VideoSampleSink(videoTrack);
        } else {
          toast.warning('Video codec not supported for decoding');
        }
      }

      // 7. Update MediaBunny state
      setMediaInput({
        input,
        videoTrack,
        audioTrack,
        videoSink,
        duration,
        width,
        height,
        fps,
      });

      // 8. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // 9. Create or load premium project
      const { data: premiumProject, error: projectError } = await supabase
        .from('premium_projects')
        .upsert({
          video_id: videoId,
          name: video.title,
          user_id: user.id,
          canvas_width: width,
          canvas_height: height,
          canvas_fps: fps,
          total_duration: duration,
        }, { 
          onConflict: 'video_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 10. Set project in store
      setProject({
        id: premiumProject.id,
        videoId: video.id,
        videoUrl,
        duration,
        name: video.title,
        thumbnailUrl: video.thumbnail_url,
        createdAt: video.created_at,
        updatedAt: video.updated_at,
      });

      toast.success(`Video loaded: ${formatDuration(duration)}`);
    } catch (error) {
      console.error('Failed to load video:', error);
      toast.error('Failed to load video into editor');
    } finally {
      setIsLoading(false);
    }
  }

  function drawCaptionsAtTime(ctx: CanvasRenderingContext2D, time: number) {
    if (!canvasRef.current) return;

    // Find active caption at current time
    const activeSegment = transcriptSegments.find(
      seg => seg.start_time <= time && seg.end_time >= time
    );

    if (!activeSegment) return;

    // Draw caption with CWI color
    const text = activeSegment.text;
    const color = activeSegment.speaker_color || '#FFFFFF';

    ctx.save();
    
    // Caption styling
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const x = canvasRef.current.width / 2;
    const y = canvasRef.current.height - 60;

    // Background
    const metrics = ctx.measureText(text);
    const padding = 20;
    const bgX = x - metrics.width / 2 - padding;
    const bgY = y - 32 - padding;
    const bgWidth = metrics.width + padding * 2;
    const bgHeight = 32 + padding * 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 8);
    ctx.fill();

    // Text with character color
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);

    ctx.restore();
  }

  function constructStorageUrl(path: string): string {
    if (!path) return '';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${cleanPath}`;
  }

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!mediaInput.duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const newTime = percent * mediaInput.duration;

    setCurrentTime(Math.max(0, Math.min(newTime, mediaInput.duration)));
    setIsPlaying(false); // Pause on seek
  }

  async function handleSave() {
    if (!project?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('premium_projects')
        .update({
          updated_at: new Date().toISOString(),
          last_opened_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Project saved');
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    toast.info('Export functionality coming soon - will use MediaBunny Output API');
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Top Toolbar */}
      <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/video/${videoId}`)}
          className="text-slate-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <h1 className="text-xl font-semibold text-white">
          {project?.name || 'Axessible Editor'}
        </h1>

        {mediaInput.duration > 0 && (
          <div className="text-sm text-slate-400">
            {mediaInput.width}x{mediaInput.height} @ {mediaInput.fps}fps
          </div>
        )}
        
        <div className="flex-1" />
        
        <Button
          onClick={handleSave}
          disabled={saving || !project?.id}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
        
        <Button
          onClick={handleExport}
          disabled={!project?.id}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center bg-slate-950">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-slate-300 text-lg">Loading video with MediaBunny...</p>
              <p className="text-slate-500 text-sm mt-2">Analyzing media format and extracting metadata</p>
            </div>
          </div>
        ) : (
          <>
            {/* Video Canvas */}
            <div className="flex-1 flex items-center justify-center bg-black">
              <canvas
                ref={canvasRef}
                width={mediaInput.width}
                height={mediaInput.height}
                className="max-w-full max-h-full"
                style={{ objectFit: 'contain' }}
              />
            </div>

            {/* Playback Controls */}
            <div className="h-24 bg-slate-800 border-t border-slate-700 flex flex-col p-4">
              {/* Timeline */}
              <div
                className="flex-1 bg-slate-700 rounded cursor-pointer relative mb-3"
                onClick={handleSeek}
              >
                {/* Progress bar */}
                <div
                  className="absolute top-0 left-0 h-full bg-blue-600 rounded"
                  style={{
                    width: `${mediaInput.duration > 0 ? (currentTime / mediaInput.duration) * 100 : 0}%`
                  }}
                />
                
                {/* Caption markers */}
                {transcriptSegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 h-full w-1 bg-yellow-500 opacity-50"
                    style={{
                      left: `${(seg.start_time / mediaInput.duration) * 100}%`
                    }}
                    title={`${seg.speaker}: ${seg.text}`}
                  />
                ))}

                {/* Playhead */}
                <div
                  className="absolute top-0 w-0.5 h-full bg-white shadow-lg"
                  style={{
                    left: `${mediaInput.duration > 0 ? (currentTime / mediaInput.duration) * 100 : 0}%`
                  }}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!mediaInput.videoSink}
                  className="text-white hover:bg-slate-700"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </Button>

                <div className="text-white text-sm font-mono">
                  {formatDuration(currentTime)} / {formatDuration(mediaInput.duration)}
                </div>

                <div className="flex-1" />

                <div className="text-slate-400 text-xs">
                  {transcriptSegments.length} captions loaded
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
