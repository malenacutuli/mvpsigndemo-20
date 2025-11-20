import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Music, Upload, Trash2, Play, Pause, AudioWaveform } from 'lucide-react';
import { cn } from '@/lib/utils';
import WaveSurfer from 'wavesurfer.js';
import { toast } from 'sonner';

interface AudioTrack {
  id: string;
  name: string;
  url: string;
  type: 'original' | 'music' | 'voiceover' | 'sfx';
  volume: number;
  muted: boolean;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  fadeIn: number;
  fadeOut: number;
}

interface AudioEditorProps {
  videoFile: File | null;
  audioTracks: AudioTrack[];
  onAudioTracksChange: (tracks: AudioTrack[]) => void;
  currentTime: number;
  videoDuration: number;
}

export const AudioEditor: React.FC<AudioEditorProps> = ({
  videoFile,
  audioTracks,
  onAudioTracksChange,
  currentTime,
  videoDuration,
}) => {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const waveformRefs = useRef<Map<string, WaveSurfer>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTrack = audioTracks.find(t => t.id === selectedTrackId);

  useEffect(() => {
    // Cleanup waveforms on unmount
    return () => {
      waveformRefs.current.forEach(ws => ws.destroy());
      waveformRefs.current.clear();
    };
  }, []);

  const initializeWaveform = (trackId: string, containerRef: HTMLDivElement, audioUrl: string) => {
    // Destroy existing waveform if any
    const existing = waveformRefs.current.get(trackId);
    if (existing) {
      existing.destroy();
    }

    try {
      const wavesurfer = WaveSurfer.create({
        container: containerRef,
        waveColor: 'hsl(var(--primary) / 0.3)',
        progressColor: 'hsl(var(--primary))',
        cursorColor: 'hsl(var(--primary))',
        barWidth: 2,
        barRadius: 2,
        height: 60,
        normalize: true,
        backend: 'WebAudio',
      });

      wavesurfer.load(audioUrl);

      wavesurfer.on('ready', () => {
        const track = audioTracks.find(t => t.id === trackId);
        if (track) {
          wavesurfer.setVolume(track.volume);
          wavesurfer.setMuted(track.muted);
        }
      });

      waveformRefs.current.set(trackId, wavesurfer);
    } catch (error) {
      console.error('Failed to initialize waveform:', error);
    }
  };

  const handleAddAudioTrack = async (file: File, type: AudioTrack['type'] = 'music') => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);

      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = reject;
      });

      const newTrack: AudioTrack = {
        id: `track-${Date.now()}`,
        name: file.name,
        url,
        type,
        volume: 0.7,
        muted: false,
        startTime: 0,
        duration: audio.duration,
        trimStart: 0,
        trimEnd: audio.duration,
        fadeIn: 0,
        fadeOut: 0,
      };

      onAudioTracksChange([...audioTracks, newTrack]);
      setSelectedTrackId(newTrack.id);

      toast.success('Audio track added', {
        description: file.name,
      });
    } catch (error) {
      console.error('Failed to add audio track:', error);
      toast.error('Failed to add audio track');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file');
      return;
    }

    handleAddAudioTrack(file);
  };

  const handleUpdateTrack = (trackId: string, updates: Partial<AudioTrack>) => {
    const updatedTracks = audioTracks.map(t =>
      t.id === trackId ? { ...t, ...updates } : t
    );
    onAudioTracksChange(updatedTracks);

    // Update waveform if volume or mute changed
    const wavesurfer = waveformRefs.current.get(trackId);
    if (wavesurfer) {
      if ('volume' in updates) {
        wavesurfer.setVolume(updates.volume!);
      }
      if ('muted' in updates) {
        wavesurfer.setMuted(updates.muted!);
      }
    }
  };

  const handleDeleteTrack = (trackId: string) => {
    // Destroy waveform
    const wavesurfer = waveformRefs.current.get(trackId);
    if (wavesurfer) {
      wavesurfer.destroy();
      waveformRefs.current.delete(trackId);
    }

    // Remove track
    const track = audioTracks.find(t => t.id === trackId);
    if (track) {
      URL.revokeObjectURL(track.url);
    }

    onAudioTracksChange(audioTracks.filter(t => t.id !== trackId));

    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
    }

    toast.success('Audio track removed');
  };

  const togglePlayPause = () => {
    waveformRefs.current.forEach(ws => {
      if (isPlaying) {
        ws.pause();
      } else {
        ws.play();
      }
    });
    setIsPlaying(!isPlaying);
  };

  const getTrackTypeColor = (type: AudioTrack['type']) => {
    switch (type) {
      case 'original': return 'bg-blue-500/20 text-blue-700';
      case 'music': return 'bg-purple-500/20 text-purple-700';
      case 'voiceover': return 'bg-green-500/20 text-green-700';
      case 'sfx': return 'bg-orange-500/20 text-orange-700';
      default: return 'bg-gray-500/20 text-gray-700';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Audio Editor
            </CardTitle>
            <CardDescription>
              Manage audio tracks and adjust volume levels
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={togglePlayPause}
              size="sm"
              variant="outline"
            >
              {isPlaying ? (
                <><Pause className="w-4 h-4 mr-2" /> Pause</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Preview</>
              )}
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Audio
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio Tracks List */}
        <ScrollArea className="h-[400px] rounded-lg border p-4">
          {audioTracks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <AudioWaveform className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">No audio tracks yet</p>
              <p className="text-xs mt-1">Upload audio files to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {audioTracks.map((track) => (
                <Card
                  key={track.id}
                  className={cn(
                    "p-4 cursor-pointer transition-colors",
                    selectedTrackId === track.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedTrackId(track.id)}
                >
                  <div className="space-y-3">
                    {/* Track Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getTrackTypeColor(track.type)}>
                            {track.type}
                          </Badge>
                          {track.muted && (
                            <Badge variant="secondary">
                              <VolumeX className="w-3 h-3 mr-1" />
                              Muted
                            </Badge>
                          )}
                        </div>
                        <div className="font-medium truncate mt-1">{track.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(track.duration)} · Volume {Math.round(track.volume * 100)}%
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrack(track.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Waveform */}
                    <div
                      ref={(el) => {
                        if (el && !waveformRefs.current.has(track.id)) {
                          initializeWaveform(track.id, el, track.url);
                        }
                      }}
                      className="w-full bg-muted/30 rounded"
                    />

                    {/* Volume Control */}
                    <div className="flex items-center gap-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateTrack(track.id, { muted: !track.muted });
                        }}
                      >
                        {track.muted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                      <Slider
                        value={[track.volume]}
                        min={0}
                        max={1}
                        step={0.01}
                        onValueChange={([value]) =>
                          handleUpdateTrack(track.id, { volume: value })
                        }
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {Math.round(track.volume * 100)}%
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Track Details Editor */}
        {selectedTrack && (
          <Card className="p-4 bg-muted/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Track Settings</Label>
                <Badge variant="outline" className={getTrackTypeColor(selectedTrack.type)}>
                  {selectedTrack.type}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={selectedTrack.startTime}
                    onChange={(e) =>
                      handleUpdateTrack(selectedTrack.id, {
                        startTime: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Duration (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={selectedTrack.duration}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fade In (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={selectedTrack.fadeIn}
                    onChange={(e) =>
                      handleUpdateTrack(selectedTrack.id, {
                        fadeIn: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fade Out (s)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={selectedTrack.fadeOut}
                    onChange={(e) =>
                      handleUpdateTrack(selectedTrack.id, {
                        fadeOut: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Mute Track</Label>
                <Switch
                  checked={selectedTrack.muted}
                  onCheckedChange={(checked) =>
                    handleUpdateTrack(selectedTrack.id, { muted: checked })
                  }
                />
              </div>
            </div>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};
