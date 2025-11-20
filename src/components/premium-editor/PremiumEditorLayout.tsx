import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Download, ArrowLeft, Play, Pause, SkipBack, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePremiumPlayer } from '@/hooks/premium-editor/usePremiumPlayer';
import { usePremiumTimeline } from '@/hooks/premium-editor/usePremiumTimeline';
import { useProjectScenes } from '@/hooks/useSceneComposition';
import { PremiumVideoPlayer } from './player/PremiumVideoPlayer';
import { MultiTrackTimeline } from './timeline/MultiTrackTimeline';
import { Timeline } from '@/components/Timeline/Timeline';
import { RightPanelTabs } from './RightPanelTabs';
import type { Track } from '@/components/Timeline/types';

interface PremiumEditorLayoutProps {
  videoId?: string;
  projectId?: string;
}

export function PremiumEditorLayout({ videoId: propsVideoId, projectId: propsProjectId }: PremiumEditorLayoutProps) {
  const { projectId: routeProjectId, id: routeVideoId } = useParams<{ projectId?: string; id?: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [timelineTracks, setTimelineTracks] = useState<Track[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoId = propsVideoId || routeVideoId;
  const projectId = propsProjectId || routeProjectId;

  // Initialize player
  const player = usePremiumPlayer({
    initialVolume: 1,
    initialPlaybackRate: 1
  });

  // Initialize timeline
  const timeline = usePremiumTimeline({
    projectId: project?.id || '',
    onSceneSelect: (sceneId) => {
      setSelectedSceneId(sceneId);
      // Sync player time to scene start
      if (sceneId) {
        const clip = timeline.state.clips.find(c => c.sceneId === sceneId);
        if (clip) {
          player.onSeek(clip.startTime);
        }
      }
    }
  });

  // Load project scenes
  const { data: projectScenes } = useProjectScenes(project?.id || '');

  // Load project data
  useEffect(() => {
    if (!projectId && !videoId) return;
    loadProject();
  }, [projectId, videoId]);

  // Sync timeline with player
  useEffect(() => {
    timeline.setCurrentTime(player.currentTime);
  }, [player.currentTime]);

  // Convert project scenes to timeline tracks
  useEffect(() => {
    if (!projectScenes || projectScenes.length === 0) return;

    const videoTrack: Track = {
      id: 'video-track',
      name: 'Video Scenes',
      type: 'video',
      clips: projectScenes.map(scene => ({
        id: scene.id,
        trackId: 'video-track',
        startTime: scene.timeline_start || 0,
        endTime: scene.timeline_end || (scene.timeline_start || 0) + (scene.duration_seconds || 10),
        label: scene.name || `Scene ${scene.scene_order + 1}`,
        color: getSceneColor(scene.layout_type),
        source: scene
      })),
      locked: false,
      muted: false,
      visible: true,
      height: 80
    };

    setTimelineTracks([videoTrack]);
  }, [projectScenes]);

  // Generate waveform data
  useEffect(() => {
    if (videoUrl && !waveformData.length) {
      generateWaveform(videoUrl).then(setWaveformData).catch(console.error);
    }
  }, [videoUrl]);

  // Sync video player with timeline
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = player.currentTime;
    }
  }, [player.currentTime]);

  // Sync play/pause state
  useEffect(() => {
    if (videoRef.current) {
      if (player.isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [player.isPlaying]);

  const loadProject = async () => {
    setIsLoading(true);
    
    try {
      let projectData;
      let video;

      if (projectId) {
        // Load existing project
        const { data, error } = await supabase
          .from('premium_projects')
          .select('*, videos(*)')
          .eq('id', projectId)
          .single();

        if (error) throw error;
        projectData = data;
        video = data.videos;
      } else if (videoId) {
        // Load video and find/create project
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoId)
          .single();

        if (videoError) throw videoError;
        video = videoData;

        // Check for existing project
        const { data: existingProject } = await supabase
          .from('premium_projects')
          .select('*')
          .eq('video_id', videoId)
          .maybeSingle();

        if (existingProject) {
          projectData = { ...existingProject, videos: video };
        } else {
          // Create new project
          const { data: newProject, error: createError } = await supabase
            .from('premium_projects')
            .insert({
              video_id: videoId,
              name: video.title || 'Untitled Project',
              canvas_width: 1920,
              canvas_height: 1080,
              canvas_fps: 30
            })
            .select()
            .single();

          if (createError) throw createError;
          projectData = { ...newProject, videos: video };
        }
      }

      // Resolve proper video URL from storage_path
      let resolvedVideoUrl = '';
      if (video?.storage_path) {
        const { data: publicUrl } = supabase.storage
          .from('videos')
          .getPublicUrl(video.storage_path);

        if (publicUrl?.publicUrl) {
          resolvedVideoUrl = publicUrl.publicUrl;
        } else {
          // Fallback to manual URL construction
          resolvedVideoUrl = `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${video.storage_path}`;
        }
      } else if (video?.url) {
        resolvedVideoUrl = video.url;
      }

      setProject(projectData);
      setVideoUrl(resolvedVideoUrl);
      
      console.log('PremiumEditor: Resolved video URL:', resolvedVideoUrl);
      
      if (!resolvedVideoUrl) {
        console.warn('PremiumEditor: No video URL resolved for project', projectData?.id);
        toast.error('Could not resolve video URL');
      } else {
        toast.success('Project loaded');
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!project) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('premium_projects')
        .update({
          updated_at: new Date().toISOString()
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
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  const handleSceneReorder = async (sceneId: string, newStartTime: number) => {
    const scene = projectScenes?.find(s => s.id === sceneId);
    if (!scene) return;

    try {
      const duration = (scene.timeline_end || 0) - (scene.timeline_start || 0);
      const { error } = await supabase
        .from('project_scenes')
        .update({
          timeline_start: newStartTime,
          timeline_end: newStartTime + duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', sceneId);

      if (error) throw error;
      toast.success('Scene position updated');
    } catch (error) {
      console.error('Failed to reorder scene:', error);
      toast.error('Failed to update scene position');
    }
  };

  const handleAddScene = () => {
    toast.info('Add scene functionality coming soon');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getSceneColor = (layoutType: string | null) => {
    const colors: Record<string, string> = {
      fullscreen: '#3B82F6',
      'split-horizontal': '#10B981',
      'split-vertical': '#F59E0B',
      'pip-corner': '#EF4444',
      'pip-side': '#8B5CF6',
      'grid-2x2': '#EC4899'
    };
    return colors[layoutType || 'fullscreen'] || '#3B82F6';
  };

  async function generateWaveform(videoUrl: string): Promise<number[]> {
    try {
      const audioContext = new AudioContext();
      const response = await fetch(videoUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = 200;
      const blockSize = Math.floor(channelData.length / samples);
      
      const waveform: number[] = [];
      for (let i = 0; i < samples; i++) {
        const start = blockSize * i;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[start + j]);
        }
        waveform.push(sum / blockSize);
      }
      
      return waveform;
    } catch (error) {
      console.error('Failed to generate waveform:', error);
      return [];
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load project</p>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Premium Editor</h1>
          <span className="text-sm text-muted-foreground">
            {project.name || 'Untitled Project'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving}
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
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Player + Timeline */}
          <ResizablePanel defaultSize={70} minSize={50}>
            <ResizablePanelGroup direction="vertical">
              {/* Player */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full bg-black flex items-center justify-center">
                  {videoUrl ? (
                    <PremiumVideoPlayer
                      videoSrc={videoUrl}
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
                  ) : (
                    <div className="text-center">
                      <p className="text-muted-foreground">No video source</p>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Timeline with Controls */}
              <ResizablePanel defaultSize={40} minSize={20}>
                <div className="h-full flex flex-col bg-background">
                  {/* Timeline Controls */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={player.onPlayPauseToggle}
                    >
                      {player.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    
                    <span className="text-sm font-mono">
                      {formatTime(player.currentTime)} / {formatTime(player.duration)}
                    </span>
                    
                    <Separator orientation="vertical" className="h-6" />
                    
                    <Button size="sm" variant="ghost" onClick={() => player.onSeek(0)}>
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    
                    <Button size="sm" variant="ghost" onClick={handleAddScene}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Scene
                    </Button>
                    
                    <Separator orientation="vertical" className="h-6" />
                    
                    <span className="text-xs text-muted-foreground">
                      {projectScenes?.length || 0} scenes
                    </span>
                  </div>

                  {/* Timeline Component */}
                  <div className="flex-1 overflow-hidden">
                    <Timeline
                      tracks={timelineTracks}
                      duration={player.duration || project?.total_duration || 100}
                      currentTime={player.currentTime}
                      onSeek={player.onSeek}
                      onTracksChange={setTimelineTracks}
                    />
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Sidebar - Right Panel Tabs */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full bg-card border-l border-border">
              {project && (
            <RightPanelTabs
              projectId={project.id}
              videoId={videoId || ''}
              videoUrl={videoUrl}
              currentTime={player.currentTime}
            />
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
