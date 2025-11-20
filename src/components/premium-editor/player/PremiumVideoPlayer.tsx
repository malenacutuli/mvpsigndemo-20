import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SceneElement, CaptionStyle, TimelineMarkers } from '@/types/premium-editor';

interface CurrentCaption {
  text: string;
  speaker: string;
  color: string;
  style: CaptionStyle;
}

interface PremiumVideoPlayerProps {
  // Video source
  videoSrc: string;
  posterSrc?: string;
  
  // Playback state
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  
  // Callbacks
  onTimeUpdate: (time: number) => void;
  onPlayPauseToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSeek: (time: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onDurationChange?: (duration: number) => void;
  
  // Timeline markers
  markers?: TimelineMarkers;
  onSetInPoint?: () => void;
  onSetOutPoint?: () => void;
  
  // Scene elements (overlays)
  elements?: SceneElement[];
  selectedElementId?: string | null;
  onElementSelect?: (id: string | null) => void;
  
  // Caption preview
  currentCaption?: CurrentCaption;
  
  // Accessibility
  showADMarkers?: boolean;
  currentAD?: {
    description: string;
    isPlaying: boolean;
  };
  
  // UI
  className?: string;
  showControls?: boolean;
}

export function PremiumVideoPlayer({
  videoSrc,
  posterSrc,
  currentTime,
  isPlaying,
  volume,
  isMuted,
  playbackRate,
  onTimeUpdate,
  onPlayPauseToggle,
  onVolumeChange,
  onMuteToggle,
  onSeek,
  onPlaybackRateChange,
  onDurationChange,
  markers,
  onSetInPoint,
  onSetOutPoint,
  elements = [],
  selectedElementId,
  onElementSelect,
  currentCaption,
  showADMarkers,
  currentAD,
  className,
  showControls = true
}: PremiumVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const animationFrameRef = useRef<number>();

  // Sync video element with props
  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Play/Pause
    if (isPlaying && video.paused) {
      video.play().catch(console.error);
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
    
    // Volume
    video.volume = volume;
    video.muted = isMuted;
    
    // Playback rate
    video.playbackRate = playbackRate;
    
    // Seek if time difference is significant (> 0.5s)
    if (Math.abs(video.currentTime - currentTime) > 0.5) {
      video.currentTime = currentTime;
    }
  }, [isPlaying, currentTime, volume, isMuted, playbackRate]);

  // Handle video loaded
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (onDurationChange) {
        onDurationChange(video.duration);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [onDurationChange]);

  // Render overlays (elements + captions)
  const renderOverlays = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video dimensions
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render scene elements
    elements.forEach(element => {
      renderElement(ctx, element, selectedElementId === element.id, canvas.width, canvas.height);
    });

    // Render current caption
    if (currentCaption) {
      renderCaption(ctx, currentCaption, canvas.width, canvas.height);
    }
  }, [elements, selectedElementId, currentCaption]);

  // Animation loop for overlay rendering
  useEffect(() => {
    const animate = () => {
      renderOverlays();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderOverlays]);

  // Render element on canvas
  function renderElement(
    ctx: CanvasRenderingContext2D,
    element: SceneElement,
    isSelected: boolean,
    canvasWidth: number,
    canvasHeight: number
  ) {
    ctx.save();

    // Calculate absolute positions
    const x = (element.x / 100) * canvasWidth;
    const y = (element.y / 100) * canvasHeight;
    const width = (element.width / 100) * canvasWidth;
    const height = (element.height / 100) * canvasHeight;

    // Apply transformations
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.globalAlpha = element.opacity;

    // Draw based on type
    switch (element.type) {
      case 'text':
        renderTextElement(ctx, element, width, height);
        break;
      case 'shape':
        renderShapeElement(ctx, element, width, height);
        break;
      case 'image':
        // Image rendering would require preloading
        break;
    }

    // Draw selection outline
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(-width / 2, -height / 2, width, height);
    }

    ctx.restore();
  }

  function renderTextElement(
    ctx: CanvasRenderingContext2D,
    element: SceneElement,
    width: number,
    height: number
  ) {
    const style = element.style || {};
    ctx.font = `${style.fontWeight || 400} ${style.fontSize || 24}px ${style.fontFamily || 'Arial'}`;
    ctx.fillStyle = style.color || '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(element.content || '', 0, 0);
  }

  function renderShapeElement(
    ctx: CanvasRenderingContext2D,
    element: SceneElement,
    width: number,
    height: number
  ) {
    const style = element.style || {};
    ctx.fillStyle = style.backgroundColor || '#000000';
    
    switch (element.content) {
      case 'rectangle':
        ctx.fillRect(-width / 2, -height / 2, width, height);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, Math.min(width, height) / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  function renderCaption(
    ctx: CanvasRenderingContext2D,
    caption: CurrentCaption,
    canvasWidth: number,
    canvasHeight: number
  ) {
    const style = caption.style;
    
    // Caption positioning
    const margin = style.position.marginBottom || 60;
    const y = canvasHeight - margin;
    
    // Font setup
    ctx.font = `${style.font.weight} ${style.font.size}px ${style.font.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    
    // Background
    if (style.background.enabled) {
      const metrics = ctx.measureText(caption.text);
      const padding = style.background.padding || 12;
      const bgWidth = metrics.width + padding * 2;
      const bgHeight = style.font.size * style.font.lineHeight + padding * 2;
      
      ctx.fillStyle = `${style.background.color}${Math.round(style.background.opacity * 255).toString(16)}`;
      ctx.fillRect(
        canvasWidth / 2 - bgWidth / 2,
        y - bgHeight,
        bgWidth,
        bgHeight
      );
    }
    
    // Text
    const color = style.colors.useCharacterColors ? caption.color : style.colors.fallbackColor;
    ctx.fillStyle = color;
    ctx.fillText(caption.text, canvasWidth / 2, y);
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't trigger when typing in inputs
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          onPlayPauseToggle();
          break;
        case 'k':
          e.preventDefault();
          onPlayPauseToggle();
          break;
        case 'j':
          e.preventDefault();
          onSeek(Math.max(0, currentTime - 10));
          break;
        case 'l':
          e.preventDefault();
          onSeek(currentTime + 10);
          break;
        case 'i':
          e.preventDefault();
          onSetInPoint?.();
          break;
        case 'o':
          e.preventDefault();
          onSetOutPoint?.();
          break;
        case 'm':
          e.preventDefault();
          onMuteToggle();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, onPlayPauseToggle, onSeek, onSetInPoint, onSetOutPoint, onMuteToggle]);

  // Error handling
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = e.currentTarget;
    console.error('❌ Video load error:', {
      error: video.error,
      networkState: video.networkState,
      readyState: video.readyState,
      src: videoSrc
    });
    
    setHasError(true);
    
    if (video.error) {
      switch (video.error.code) {
        case 1:
          setErrorMessage('Video loading aborted');
          break;
        case 2:
          setErrorMessage('Network error - check your connection');
          break;
        case 3:
          setErrorMessage('Video format not supported');
          break;
        case 4:
          setErrorMessage('Video source not found or not accessible');
          break;
        default:
          setErrorMessage('Unknown video error');
      }
    }
  };

  const handleCanPlay = () => {
    console.log('✅ Video can play:', videoSrc);
    setHasError(false);
  };

  const duration = videoRef.current?.duration || 0;

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center text-white p-6 max-w-md">
          <p className="text-lg font-semibold mb-2">Failed to load video</p>
          <p className="text-sm text-red-400 mb-4">{errorMessage}</p>
          <p className="text-xs text-muted-foreground break-all">Source: {videoSrc}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full h-full bg-black group', className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterSrc}
        className="w-full h-full object-contain"
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
        onClick={onPlayPauseToggle}
        onError={handleVideoError}
        onCanPlay={handleCanPlay}
        playsInline
        crossOrigin="anonymous"
      />

      {/* Canvas overlay for elements */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none object-contain"
        style={{ mixBlendMode: 'normal' }}
      />

      {/* Clickable elements overlay */}
      {elements.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {elements.map(element => (
            <div
              key={element.id}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${element.x}%`,
                top: `${element.y}%`,
                width: `${element.width}%`,
                height: `${element.height}%`,
                zIndex: element.zIndex
              }}
              onClick={(e) => {
                e.stopPropagation();
                onElementSelect?.(element.id);
              }}
            />
          ))}
        </div>
      )}

      {/* AD marker */}
      {showADMarkers && currentAD?.isPlaying && (
        <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          <span className="text-sm font-medium">Audio Description</span>
        </div>
      )}

      {/* Controls */}
      {showControls && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300',
            isHovering || !isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="p-4 space-y-3">
            {/* Progress bar */}
            <div className="relative group/progress">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
              />
              
              {/* In/Out point markers */}
              {markers?.inPoint !== null && (
                <div
                  className="absolute top-0 w-1 h-4 bg-green-500 -translate-y-1/2"
                  style={{ left: `${(markers.inPoint / duration) * 100}%` }}
                />
              )}
              {markers?.outPoint !== null && (
                <div
                  className="absolute top-0 w-1 h-4 bg-red-500 -translate-y-1/2"
                  style={{ left: `${(markers.outPoint / duration) * 100}%` }}
                />
              )}
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={onPlayPauseToggle}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                {/* Volume */}
                <div
                  className="relative flex items-center gap-2"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    onClick={onMuteToggle}
                    className="text-white hover:text-blue-400 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  
                  {showVolumeSlider && (
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  )}
                </div>

                {/* Time display */}
                <div className="text-white text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Playback rate */}
                <select
                  value={playbackRate}
                  onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
                  className="bg-white/10 text-white text-sm px-2 py-1 rounded border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>

                {/* Set In/Out points */}
                {onSetInPoint && (
                  <button
                    onClick={onSetInPoint}
                    className="text-white hover:text-green-400 transition-colors text-sm font-medium"
                    title="Set In Point (I)"
                  >
                    [ I ]
                  </button>
                )}
                {onSetOutPoint && (
                  <button
                    onClick={onSetOutPoint}
                    className="text-white hover:text-red-400 transition-colors text-sm font-medium"
                    title="Set Out Point (O)"
                  >
                    [ O ]
                  </button>
                )}

                {/* Settings */}
                <button className="text-white hover:text-blue-400 transition-colors">
                  <Settings className="w-5 h-5" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={() => {
                    if (containerRef.current) {
                      if (document.fullscreenElement) {
                        document.exitFullscreen();
                      } else {
                        containerRef.current.requestFullscreen();
                      }
                    }
                  }}
                  className="text-white hover:text-blue-400 transition-colors"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {!videoRef.current?.readyState && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
