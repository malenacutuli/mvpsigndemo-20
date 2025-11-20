import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock, Download, Save, Undo, Redo, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { SubscriptionGate } from '@/components/premium-editor/SubscriptionGate';
import { LoadingScreen } from '@/components/premium-editor/LoadingScreen';
import { CaptionTemplateGallery } from '@/components/premium-editor/CaptionTemplateGallery';
import { Timeline } from '@/components/premium-editor/Timeline';
import { SceneLayoutPanel } from '@/components/premium-editor/SceneLayoutPanel';
import { TextBasedEditor } from '@/components/premium-editor/TextBasedEditor';
import { AIAssistant } from '@/components/premium-editor/AIAssistant';
import { FillerWordDetector } from '@/components/premium-editor/FillerWordDetector';
import { AdvancedExportModal } from '@/components/premium-editor/AdvancedExportModal';
import { EnhancedVideoPlayer } from '@/components/EnhancedVideoPlayer';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { useVideoProject } from '@/hooks/useVideoProject';

export default function PremiumVideoEditor() {
  const { id: videoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canAccess, tier, isAdmin, isLoading: accessLoading } = usePremiumAccess();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scenes, setScenes] = useState<any[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');

  // Use the new hooks for video and project data
  const { project, isLoading: projectLoading, error: projectError } = useVideoProject(undefined, videoId);
  const [video, setVideo] = useState<any>(null);

  const {
    scenes: storeScenes,
    playback,
    selectedSceneId,
    togglePlayback,
    setCurrentTime: setStoreTime,
    addScene: addStoreScene,
    deleteScene: deleteStoreScene,
    selectScene
  } = usePremiumEditor();

  // Load video data
  useEffect(() => {
    if (!videoId) return;

    const loadVideo = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .maybeSingle();

      if (error) {
        console.error('Error loading video:', error);
        toast.error('Failed to load video');
        return;
      }

      if (!data) {
        toast.error('Video not found');
        navigate('/videos');
        return;
      }

      setVideo(data);
    };

    loadVideo();
  }, [videoId, navigate]);

  // Sync video playback when currentTime changes from external source
  React.useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Keyboard shortcuts - MUST be before conditional returns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (project) saveProject();
      }
      
      // Space to play/pause
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlayback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, togglePlayback]);

  // Handle missing videoId
  if (!videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Video Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The requested video could not be found.
          </p>
          <Button onClick={() => navigate('/videos')}>
            Back to Videos
          </Button>
        </Card>
      </div>
    );
  }

  // Loading state (subscription/access + video/project)
  if (accessLoading || projectLoading || !video) {
    return <LoadingScreen message="Preparing your premium editor workspace..." />;
  }

  // Show subscription gate for insufficient tier
  if (!canAccess) {
    toast.error('Premium Editor requires Standard plan or higher', {
      description: 'Upgrade your plan to access advanced editing features',
      duration: 5000
    });
    return <SubscriptionGate currentTier={tier || 'Free'} videoId={videoId} />;
  }

  // Save project function with debounce
  const saveProject = async () => {
    if (!project) {
      toast.error('No project to save');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('video_projects')
        .update({ 
          updated_at: new Date().toISOString(),
          name: project.name 
        })
        .eq('id', project.id);

      if (error) throw error;
      
      toast.success('Project saved successfully');
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Failed to save project: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Premium Editor UI
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-muted/30">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/videos/${videoId}`)}
          >
            <Home className="w-4 h-4 mr-2" />
            Exit Editor
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <h1 className="font-semibold">
            {project?.name || 'Premium Editor'}
          </h1>
          {isAdmin && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              Admin Access
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.info('Undo coming soon')}
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toast.info('Redo coming soon')}
          >
            <Redo className="w-4 h-4" />
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={saveProject}
            disabled={isSaving}
          >
            {isSaving ? (
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
            size="sm"
            onClick={() => setExportModalOpen(true)}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Panel - Tools */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full border-r overflow-hidden flex flex-col">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="w-full rounded-none border-b grid grid-cols-5">
                  <TabsTrigger value="ai">AI</TabsTrigger>
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="fillers">Fillers</TabsTrigger>
                  <TabsTrigger value="layout">Layout</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                </TabsList>
                
                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="ai" className="mt-0 h-full">
                    <AIAssistant
                      projectId={project?.id || ''}
                      videoId={videoId!}
                      currentContext="premium-editor"
                    />
                  </TabsContent>
                  
                  <TabsContent value="text" className="mt-0 h-full overflow-y-auto">
                    <TextBasedEditor
                      videoId={videoId!}
                      videoUrl={video?.url || ''}
                      currentTime={currentTime}
                      onTimeUpdate={(time) => setCurrentTime(time)}
                    />
                  </TabsContent>
                  
                  <TabsContent value="fillers" className="mt-0 h-full overflow-y-auto">
                    <FillerWordDetector
                      videoId={videoId!}
                      onSeek={(time) => {
                        setCurrentTime(time);
                        if (videoRef.current) {
                          videoRef.current.currentTime = time;
                          videoRef.current.play();
                        }
                      }}
                    />
                  </TabsContent>
                  
                  <TabsContent value="layout" className="mt-0 h-full overflow-y-auto">
                    <SceneLayoutPanel />
                  </TabsContent>
                  
                  <TabsContent value="templates" className="mt-0 h-full overflow-y-auto">
                    <CaptionTemplateGallery 
                      videoId={videoId}
                      projectId={project?.id}
                      userTier={tier}
                      onTemplateSelect={(template) => {
                        console.log('Applied template:', template.name);
                        toast.success(`Template "${template.name}" applied`);
                      }}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center - Video Player */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full bg-black relative flex items-center justify-center">
              {video?.url && (
                <EnhancedVideoPlayer
                  videoSrc={video.url}
                  posterSrc={video.thumbnail_url}
                  title={video.title}
                  videoId={videoId!}
                  language={video.language || 'en'}
                  contentType="education"
                  className="w-full h-full"
                />
              )}
              
              {/* Playback time overlay */}
              <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-1 rounded text-sm font-mono">
                {formatTime(playback.currentTime)} / {formatTime(video?.duration_seconds || 0)}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Properties */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full border-l p-4 overflow-y-auto">
              <h3 className="font-semibold mb-4">Properties</h3>
              
              {selectedSceneId ? (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Scene Selected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {storeScenes.find(s => s.id === selectedSceneId) && (
                        <div className="space-y-2 text-sm">
                          <p className="font-medium">
                            {storeScenes.find(s => s.id === selectedSceneId)!.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(storeScenes.find(s => s.id === selectedSceneId)!.startTime)} - 
                            {formatTime(storeScenes.find(s => s.id === selectedSceneId)!.endTime)}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => {
                      if (selectedSceneId) {
                        deleteStoreScene(selectedSceneId);
                        toast.success('Scene removed');
                      }
                    }}
                  >
                    Delete Selected
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a scene to view properties
                </p>
              )}

              {/* Project Info */}
              <div className="mt-8 pt-8 border-t">
                <h4 className="font-medium mb-2">Project Info</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Duration: {formatTime(video?.duration_seconds || 0)}</p>
                  <p>Scenes: {storeScenes.length}</p>
                  <p>Resolution: 1920x1080</p>
                  <p>Frame Rate: 30fps</p>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Bottom - Timeline */}
      <div className="h-64 border-t">
        <Timeline
          scenes={scenes}
          currentTime={currentTime}
          duration={video?.duration_seconds || 0}
          isPlaying={isPlaying}
          onSceneSelect={(sceneId) => console.log('Scene selected:', sceneId)}
          onSceneReorder={(sceneId, newTime) => console.log('Scene reordered:', sceneId, newTime)}
          onSeek={(time) => setCurrentTime(time)}
          onTimeChange={(time) => setCurrentTime(time)}
        />
      </div>

      {/* Export Modal */}
      {exportModalOpen && (
        <AdvancedExportModal
          open={exportModalOpen}
          onOpenChange={setExportModalOpen}
          projectId={project?.id || ''}
          videoId={videoId!}
        />
      )}
    </div>
  );
}
