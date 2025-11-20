import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Download, ArrowLeft, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  Input, 
  ALL_FORMATS, 
  BlobSource, 
  VideoSampleSink,
  AudioSampleSink,
  EncodedPacketSink,
  type InputVideoTrack,
  type InputAudioTrack,
} from 'mediabunny';

interface AxessibleEditorProps {
  videoId: string;
}

interface MediaBunnyInput {
  input: Input | null;
  videoTrack: InputVideoTrack | null;
  audioTrack: InputAudioTrack | null;
  videoSink: VideoSampleSink | null;
  audioSink: AudioSampleSink | null;
  // For transmuxing (copying packets without re-encoding)
  videoPacketSink: EncodedPacketSink | null;
  audioPacketSink: EncodedPacketSink | null;
  // Metadata needed for output sources
  decoderConfig: any | null;
  audioDecoderConfig: any | null;
  duration: number;
  width: number;
  height: number;
  fps: number;
  rotation: number;
  startTime: number;
}

export function AxessibleEditor({ videoId }: AxessibleEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mediaInput, setMediaInput] = useState<MediaBunnyInput>({
    input: null,
    videoTrack: null,
    audioTrack: null,
    videoSink: null,
    audioSink: null,
    videoPacketSink: null,
    audioPacketSink: null,
    decoderConfig: null,
    audioDecoderConfig: null,
    duration: 0,
    width: 1920,
    height: 1080,
    fps: 30,
    rotation: 0,
    startTime: 0,
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

      console.log('Video metadata:', {
        title: video.title,
        storage_path: video.storage_path,
        duration: video.duration_seconds,
      });

      // 2. Fetch transcript segments for captions
      const { data: segments } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', videoId)
        .eq('language', 'en')
        .order('start_time');

      if (segments && segments.length > 0) {
        setTranscriptSegments(segments);
        console.log(`Loaded ${segments.length} transcript segments`);
      }

      // 3. Construct video URL and fetch as blob
      const videoUrl = constructStorageUrl(video.storage_path);
      console.log('Fetching video from:', videoUrl);

      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Video blob loaded:', {
        size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        type: blob.type,
      });

      // 4. Initialize MediaBunny Input with format detection
      const input = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(blob, {
          maxCacheSize: 16 * 1024 * 1024, // 16 MB cache for smooth scrubbing
        }),
      });

      // 5. Get format information
      const format = await input.getFormat();
      const mimeType = await input.getMimeType();
      console.log('Detected format:', {
        format: format.constructor.name,
        mimeType,
      });

      // 6. Extract file-level metadata
      const duration = await input.computeDuration();
      console.log('Video duration:', formatDuration(duration));

      // 7. Get metadata tags (title, artist, etc.)
      try {
        const tags = await input.getMetadataTags();
        console.log('Metadata tags:', tags);
      } catch (e) {
        console.log('No metadata tags available');
      }

      // 8. Get all tracks
      const allTracks = await input.getTracks();
      console.log(`Found ${allTracks.length} tracks:`, allTracks.map(t => ({
        type: t.type,
        codec: t.codec || 'unknown',
        language: t.languageCode,
      })));

      // 9. Get primary video track
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        throw new Error('No video track found in file');
      }

      // 10. Extract video track metadata
      const width = videoTrack.displayWidth;
      const height = videoTrack.displayHeight;
      const rotation = videoTrack.rotation;
      const codecString = await videoTrack.getCodecParameterString();

      console.log('Video track info:', {
        codec: videoTrack.codec || 'unknown',
        codecString,
        displaySize: `${width}x${height}`,
        codedSize: `${videoTrack.codedWidth}x${videoTrack.codedHeight}`,
        rotation: `${rotation}°`,
        timeResolution: videoTrack.timeResolution,
      });

      // 11. Compute accurate frame rate from packets
      console.log('Computing packet statistics...');
      const packetStats = await videoTrack.computePacketStats(100); // Sample first 100 frames
      const fps = Math.round(packetStats.averagePacketRate * 100) / 100; // Round to 2 decimals

      console.log('Packet statistics:', {
        frameCount: packetStats.packetCount,
        fps: `${fps} fps`,
        bitrate: `${(packetStats.averageBitrate / 1_000_000).toFixed(2)} Mbps`,
      });

      // 12. Get track timing info (important for proper playback)
      const trackStartTime = await videoTrack.getFirstTimestamp();
      const trackDuration = await videoTrack.computeDuration();

      console.log('Track timing:', {
        startTime: trackStartTime,
        duration: trackDuration,
        endTime: trackStartTime + trackDuration,
      });

      if (trackStartTime !== 0) {
        console.warn('Video track has non-zero start time:', trackStartTime);
      }

      // 13. Check if video can be decoded
      const decodable = await videoTrack.canDecode();
      if (!decodable) {
        throw new Error(`Video codec not supported: ${videoTrack.codec || 'unknown'}`);
      }

      console.log('Video is decodable ✓');

      // 14. Get decoder config for WebCodecs
      const decoderConfig = await videoTrack.getDecoderConfig();
      console.log('Decoder config:', decoderConfig);

      // 15. Check color space and HDR
      try {
        const colorSpace = await videoTrack.getColorSpace();
        const isHDR = await videoTrack.hasHighDynamicRange();
        console.log('Color space:', { colorSpace, isHDR });
      } catch (e) {
        console.log('Color space info not available');
      }

      // 16. Get primary audio track info
      const audioTrack = await input.getPrimaryAudioTrack();
      let audioSink: AudioSampleSink | null = null;
      let audioPacketSink: EncodedPacketSink | null = null;
      let audioDecoderConfig: any = null;

      if (audioTrack) {
        const audioDecodable = await audioTrack.canDecode();
        audioDecoderConfig = await audioTrack.getDecoderConfig();
        
        console.log('Audio track info:', {
          codec: audioTrack.codec || 'unknown',
          codecString: await audioTrack.getCodecParameterString(),
          channels: audioTrack.numberOfChannels,
          sampleRate: `${audioTrack.sampleRate} Hz`,
          decodable: audioDecodable,
        });

        if (audioDecodable) {
          // Create sinks for both decoded samples and encoded packets
          audioSink = new AudioSampleSink(audioTrack);
          audioPacketSink = new EncodedPacketSink(audioTrack);
          console.log('Created audio sinks (sample + packet)');
        }
      } else {
        console.log('No audio track found');
      }

      // 17. Create video sinks for both decoded frames and encoded packets
      const videoSink = new VideoSampleSink(videoTrack);
      const videoPacketSink = new EncodedPacketSink(videoTrack);
      console.log('Created video sinks (sample + packet)');

      // 18. Update MediaBunny state with all sinks and metadata
      // This structure is compatible with mediabunny output sources:
      // - Use EncodedPacketSink -> EncodedVideoPacketSource for transmuxing (fast, no quality loss)
      // - Use VideoSampleSink -> VideoSampleSource for re-encoding (when effects applied)
      setMediaInput({
        input,
        videoTrack,
        audioTrack,
        videoSink,
        audioSink,
        videoPacketSink,
        audioPacketSink,
        decoderConfig,
        audioDecoderConfig,
        duration,
        width,
        height,
        fps,
        rotation,
        startTime: trackStartTime,
      });

      // 19. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // 20. Create or load premium project
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

      console.log('Premium project:', premiumProject.id);

      // 21. Set project in store
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

      toast.success(`Video loaded successfully`, {
        description: `${width}x${height} @ ${fps}fps • ${formatDuration(duration)}`,
      });

    } catch (error: any) {
      console.error('Failed to load video:', error);
      
      let errorMessage = 'Failed to load video into editor';
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, {
        description: 'Check console for details',
        duration: 10000,
      });
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
    if (!mediaInput.input || !mediaInput.videoTrack) {
      toast.error('No video loaded');
      return;
    }

    toast.info('Export functionality coming soon', {
      description: 'Will use MediaBunny Output API with multiple format options',
    });

    // TODO: Implement export using MediaBunny Output API
    // 
    // Available Output Formats:
    // 
    // 1. MP4 (Mp4OutputFormat) - Most common format
    //    - Options: fastStart ('in-memory', 'reserve', 'fragmented', false)
    //    - 'fragmented': Good for streaming, append-only, requires packet buffering
    //    - 'in-memory': Best quality, higher memory usage
    //    - Supports video rotation metadata
    //    - Callbacks: onFtyp, onMoov, onMdat, onMoof
    //
    // 2. QuickTime (MovOutputFormat) - Apple ecosystem
    //    - Same options as MP4
    //    - Better for ProRes, higher quality workflows
    //
    // 3. WebM (WebMOutputFormat) - Web-optimized, open format
    //    - Options: appendOnly, minimumClusterDuration
    //    - Supports transparency (VP8/VP9 with alpha)
    //    - Good for web streaming
    //    - Callbacks: onEbmlHeader, onSegmentHeader, onCluster
    //
    // 4. Matroska (MkvOutputFormat) - Universal container
    //    - Same options as WebM
    //    - Supports more codecs than WebM
    //
    // 5. Audio-only formats:
    //    - MP3 (Mp3OutputFormat): xingHeader option
    //    - WAVE (WavOutputFormat): large (RF64), metadataFormat
    //    - Ogg (OggOutputFormat): Append-only by default
    //    - ADTS (AdtsOutputFormat): Raw AAC
    //    - FLAC (FlacOutputFormat): Lossless
    //
    // Export Strategy:
    //
    // A. For simple cuts/trims without effects (FAST, NO QUALITY LOSS):
    //    - Use EncodedVideoPacketSource + EncodedAudioPacketSource
    //    - Loop through videoPacketSink.packets() and audioPacketSink.packets()
    //    - Transmux (copy) packets without re-encoding
    //
    // B. For edits with effects/overlays/captions (SLOWER, RE-ENCODED):
    //    - Use VideoSampleSource + AudioSampleSource
    //    - Loop through videoSink.samples() and audioSink.samples()
    //    - Apply canvas effects during re-encoding
    //    - Can burn in captions with CWI colors
    //
    // Example: Transmuxing to MP4 with Fast Start
    // 
    // import { 
    //   Output, 
    //   Mp4OutputFormat, 
    //   BufferTarget,
    //   EncodedVideoPacketSource,
    //   EncodedAudioPacketSource,
    // } from 'mediabunny';
    //
    // const output = new Output({
    //   format: new Mp4OutputFormat({ 
    //     fastStart: 'in-memory', // or 'fragmented' for streaming
    //     onMoov: (data, position) => {
    //       console.log(`Metadata written at byte ${position}`);
    //     },
    //   }),
    //   target: new BufferTarget(), // or StreamTarget for uploads
    // });
    //
    // // Add video track (transmux)
    // const videoSource = new EncodedVideoPacketSource(
    //   mediaInput.videoTrack.codec?.name || 'avc'
    // );
    // output.addVideoTrack(videoSource);
    //
    // // Add audio track if present
    // if (mediaInput.audioTrack && mediaInput.audioPacketSink) {
    //   const audioSource = new EncodedAudioPacketSource(
    //     mediaInput.audioTrack.codec?.name || 'aac'
    //   );
    //   output.addAudioTrack(audioSource);
    // }
    //
    // // Set metadata tags
    // output.setMetadataTags({
    //   title: project?.name || 'Exported Video',
    //   encoder: 'Axessible Editor',
    // });
    //
    // await output.start();
    //
    // // Copy video packets
    // let firstVideoPacket = true;
    // for await (const packet of mediaInput.videoPacketSink!.packets(trimStart, trimEnd)) {
    //   const meta = firstVideoPacket ? { decoderConfig: mediaInput.decoderConfig } : undefined;
    //   await videoSource.add(packet, meta);
    //   firstVideoPacket = false;
    // }
    // videoSource.close();
    //
    // // Copy audio packets
    // if (mediaInput.audioPacketSink) {
    //   let firstAudioPacket = true;
    //   for await (const packet of mediaInput.audioPacketSink.packets(trimStart, trimEnd)) {
    //     const meta = firstAudioPacket ? { decoderConfig: mediaInput.audioDecoderConfig } : undefined;
    //     await audioSource.add(packet, meta);
    //     firstAudioPacket = false;
    //   }
    //   audioSource.close();
    // }
    //
    // await output.finalize();
    //
    // // Get the file
    // const exportedFile = new Blob([output.target.buffer!], { 
    //   type: output.format.mimeType 
    // });
    //
    // // Download
    // const url = URL.createObjectURL(exportedFile);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = `${project?.name || 'video'}${output.format.fileExtension}`;
    // a.click();
    // URL.revokeObjectURL(url);
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
