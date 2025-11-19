import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePremiumPlayer } from '@/hooks/premium-editor/usePremiumPlayer';
import { usePremiumTimeline } from '@/hooks/premium-editor/usePremiumTimeline';
import { PremiumVideoPlayer } from './player/PremiumVideoPlayer';
import { MultiTrackTimeline } from './timeline/MultiTrackTimeline';
import { RightPanelTabs } from './RightPanelTabs';

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
  const [selectedTab, setSelectedTab] = useState('ai-tools');

  const videoId = propsVideoId || routeVideoId;
  const projectId = propsProjectId || routeProjectId;

  // Initialize player
  const player = usePremiumPlayer({
    initialVolume: 1,
    initialPlaybackRate: 1
  });

  // Initialize timeline
  const timeline = usePremiumTimeline({
    projectId: projectId || '',
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

  // Load project data
  useEffect(() => {
    if (!projectId && !videoId) return;
    loadProject();
  }, [projectId, videoId]);

  // Sync timeline with player
  useEffect(() => {
    timeline.setCurrentTime(player.currentTime);
  }, [player.currentTime]);

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

      setProject(projectData);
      setVideoUrl(video?.url || video?.storage_path || '');
      
      toast.success('Project loaded');
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

              {/* Timeline */}
              <ResizablePanel defaultSize={40} minSize={20}>
                <MultiTrackTimeline
                  tracks={timeline.state.tracks}
                  clips={timeline.state.clips}
                  currentTime={timeline.state.currentTime}
                  duration={timeline.state.duration}
                  zoom={timeline.state.zoom}
                  scrollLeft={timeline.state.scrollLeft}
                  selectedClipIds={timeline.state.selectedClipIds}
                  onTimeChange={player.onSeek}
                  onClipSelect={timeline.selectClip}
                  onClipMove={timeline.moveClip}
                  onClipTrim={timeline.trimClip}
                  onClipDelete={timeline.deleteClip}
                  onClipSplit={timeline.splitClip}
                  onZoomIn={timeline.zoomIn}
                  onZoomOut={timeline.zoomOut}
                  onScrollChange={timeline.setScrollLeft}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Sidebar - Right Panel Tabs */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full bg-card border-l border-border">
              <RightPanelTabs
                projectId={projectId || ''}
                videoId={videoId || ''}
                videoUrl={videoUrl}
                currentTime={player.currentTime}
                selectedTab={selectedTab}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
