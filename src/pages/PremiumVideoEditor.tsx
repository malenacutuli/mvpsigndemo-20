import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { CaptionTemplateGallery } from '@/components/premium-editor/CaptionTemplateGallery';
import { Timeline } from '@/components/premium-editor/Timeline';
import { SceneLayoutPanel } from '@/components/premium-editor/SceneLayoutPanel';
import { TextBasedEditor } from '@/components/premium-editor/TextBasedEditor';
import { AIAssistant } from '@/components/premium-editor/AIAssistant';

export default function PremiumVideoEditor() {
  const { id: videoId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canAccess, tier, isAdmin, isLoading: accessLoading } = usePremiumAccess();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scenes, setScenes] = useState<any[]>([]);

  // Sync video playback when currentTime changes from external source
  React.useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Load or create project
  useEffect(() => {
    if (!videoId || !canAccess) return;
    loadOrCreateProject();
  }, [videoId, canAccess]);

  const loadOrCreateProject = async () => {
    try {
      setIsLoading(true);
      
      // Get video details
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      setVideo(videoData);

      // Check for existing project
      const { data: existingProject } = await supabase
        .from('premium_projects')
        .select('*')
        .eq('video_id', videoId)
        .maybeSingle();

      if (existingProject) {
        setProject(existingProject);
        console.log('Loaded existing project:', existingProject.id);
      } else {
        // Create new project
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: newProject, error: createError } = await supabase
          .from('premium_projects')
          .insert({
            video_id: videoId,
            user_id: user?.id,
            name: videoData.title || 'Untitled Project',
            total_duration: videoData.duration_seconds || 0
          })
          .select()
          .single();

        if (createError) throw createError;
        setProject(newProject);
        toast.success('Created new premium project');
        console.log('Created new project:', newProject.id);
      }
    } catch (error: any) {
      console.error('Project load error:', error);
      toast.error('Failed to load project: ' + error.message);
      navigate(`/videos/${videoId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading Premium Editor...</p>
        </div>
      </div>
    );
  }

  // No access state
  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Premium Feature</h2>
          <p className="text-muted-foreground mb-6">
            The Premium Video Editor is available for Standard, Advanced, and Enterprise plans.
          </p>
          <Button 
            onClick={() => navigate('/pricing')}
            className="w-full"
          >
            Upgrade to Standard
          </Button>
          <Button 
            variant="ghost"
            onClick={() => navigate(`/videos/${videoId}`)}
            className="w-full mt-2"
          >
            Back to Video
          </Button>
        </Card>
      </div>
    );
  }

  // Premium Editor UI
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Premium Editor</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {project?.name}
              </span>
              {isAdmin && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  Admin Access
                </span>
              )}
            </div>
            <Button variant="outline" onClick={() => navigate(`/videos/${videoId}`)}>
              Exit Editor
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r overflow-y-auto">
          <Tabs defaultValue="ai" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="ai">AI</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>
            <TabsContent value="ai" className="mt-0 h-[calc(100vh-200px)]">
              <AIAssistant
                projectId={project?.id || ''}
                videoId={videoId!}
                currentContext="premium-editor"
              />
            </TabsContent>
            <TabsContent value="text" className="mt-0 h-[calc(100vh-200px)]">
              <TextBasedEditor
                videoId={videoId!}
                videoUrl={video?.url || ''}
                currentTime={currentTime}
                onTimeUpdate={(time) => setCurrentTime(time)}
              />
            </TabsContent>
            <TabsContent value="layout" className="mt-0">
              <SceneLayoutPanel />
            </TabsContent>
            <TabsContent value="templates" className="mt-0">
              <CaptionTemplateGallery 
                open={true}
                premiumVideoId={videoId}
                projectId={project?.id}
                userTier={tier}
                onTemplateApply={(templateId) => {
                  console.log('Applied template:', templateId);
                  toast.success('Template applied');
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Video Preview */}
        <div className="flex-1 bg-black relative flex items-center justify-center">
          {video?.url && (
            <video
              ref={videoRef}
              src={video.url}
              className="max-w-full max-h-full"
              controls
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          )}
        </div>
      </div>
      
      {/* Timeline */}
      <div className="h-72 border-t">
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
    </div>
  );
}
