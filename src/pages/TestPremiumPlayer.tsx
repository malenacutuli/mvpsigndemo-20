import { PremiumVideoPlayer } from '@/components/premium-editor/player/PremiumVideoPlayer';
import { usePremiumPlayer } from '@/hooks/premium-editor/usePremiumPlayer';

export default function TestPremiumPlayer() {
  const player = usePremiumPlayer();

  // Test video URL
  const TEST_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-16 bg-card flex items-center px-6 border-b border-border">
        <h1 className="text-foreground text-xl font-bold">Premium Video Player Test</h1>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl aspect-video">
          <PremiumVideoPlayer
            videoSrc={TEST_VIDEO_URL}
            currentTime={player.currentTime}
            isPlaying={player.isPlaying}
            volume={player.volume}
            isMuted={player.isMuted}
            playbackRate={player.playbackRate}
            onTimeUpdate={player.onTimeUpdate}
            onPlayPauseToggle={player.onPlayPauseToggle}
            onVolumeChange={player.onVolumeChange}
            onMuteToggle={player.onMuteToggle}
            onSeek={player.onSeek}
            onPlaybackRateChange={player.onPlaybackRateChange}
            onDurationChange={player.onDurationChange}
            markers={player.markers}
            onSetInPoint={player.onSetInPoint}
            onSetOutPoint={player.onSetOutPoint}
          />
        </div>
      </div>

      {/* Debug panel */}
      <div className="h-48 bg-card border-t border-border p-4 overflow-auto">
        <h2 className="text-foreground font-bold mb-2">Player State:</h2>
        <pre className="text-muted-foreground text-sm font-mono">
          {JSON.stringify({
            currentTime: player.currentTime.toFixed(2),
            duration: player.duration.toFixed(2),
            isPlaying: player.isPlaying,
            volume: player.volume.toFixed(2),
            isMuted: player.isMuted,
            playbackRate: player.playbackRate,
            markers: player.markers
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
