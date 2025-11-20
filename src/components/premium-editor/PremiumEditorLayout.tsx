import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Download, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { useProjectScenes } from '@/hooks/useSceneComposition';
import { TextBasedEditor } from './TextBasedEditor';
import { Timeline } from './Timeline';
import { ScenePropertiesPanel } from './ScenePropertiesPanel';
import { EnhancedVideoPlayer } from '@/components/EnhancedVideoPlayer';
import { generateScenesFromTranscript } from '@/hooks/useVideoProject';

interface PremiumEditorLayoutProps {
  videoId?: string;
  projectId?: string;
}

export function PremiumEditorLayout({ videoId: propsVideoId, projectId: propsProjectId }: PremiumEditorLayoutProps) {
  const { projectId: routeProjectId, id: routeVideoId } = useParams<{ projectId?: string; id?: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [videoData, setVideoData] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const videoId = propsVideoId || routeVideoId;
  const projectId = propsProjectId || routeProjectId;

  // Premium editor store
  const { 
    project, 
    setProject, 
    playback, 
    setCurrentTime, 
    togglePlayback,
    selectedSceneId,
    selectScene
  } = usePremiumEditor();

  // Load project scenes
  const { data: projectScenes = [] } = useProjectScenes(project?.id || '');

  // Load project and video on mount
  useEffect(() => {
    if (videoId) {
      loadVideoProject(videoId);
    }
  }, [videoId]);

  async function loadVideoProject(videoId: string) {
    setIsLoading(true);
    
    try {
      console.log('🎬 Loading video project for video:', videoId);

      // 1. Fetch video data
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      if (videoError) throw videoError;
      if (!video) throw new Error('Video not found');

      console.log('📹 Video loaded:', video);
      setVideoData(video);

      // 2. Construct video URL from storage_path (videos table uses storage_path, not video_url)
      let videoUrl = '';
      if (video.storage_path) {
        const { data: publicUrl } = supabase.storage
          .from('videos')
          .getPublicUrl(video.storage_path);

        videoUrl = publicUrl?.publicUrl || 
          `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${video.storage_path}`;
      }

      if (!videoUrl) {
        throw new Error('No video URL found');
      }

      console.log('🎥 Video URL resolved:', videoUrl);

      // 3. Create or load premium_project
      let { data: premiumProject } = await supabase
        .from('premium_projects')
        .select('*')
        .eq('video_id', videoId)
        .maybeSingle();

      if (!premiumProject) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          throw new Error('User not authenticated');
        }

        const { data: newProject, error: createError } = await supabase
          .from('premium_projects')
          .insert({
            video_id: videoId,
            name: video.title || 'Untitled Project',
            user_id: userId,
            canvas_width: 1920,
            canvas_height: 1080,
            canvas_fps: 30,
            total_duration: video.duration_seconds
          })
          .select()
          .single();

        if (createError) throw createError;
        premiumProject = newProject;
        console.log('✨ Created new premium project:', premiumProject.id);
        toast.success('Project created');
      } else {
        console.log('✅ Loaded existing premium project:', premiumProject.id);
      }

      // 4. Set project in store
      setProject({
        id: premiumProject.id,
        name: premiumProject.name,
        videoId: video.id,
        videoUrl: videoUrl,
        thumbnailUrl: video.thumbnail_url,
        duration: video.duration_seconds || 0,
        createdAt: premiumProject.created_at,
        updatedAt: premiumProject.updated_at
      });

      // 5. Check if we have scenes
      const { data: existingScenes } = await supabase
        .from('project_scenes')
        .select('id')
        .eq('project_id', premiumProject.id)
        .limit(1);

      // 6. Auto-generate scenes if none exist
      if (!existingScenes || existingScenes.length === 0) {
        console.log('🎬 No scenes found, generating from transcript...');
        toast.info('Generating scenes from transcript...');
        
        try {
          await generateScenesFromTranscript(premiumProject.id, videoId);
          toast.success('Scenes generated successfully');
          // Scenes will be loaded automatically via useProjectScenes
        } catch (error) {
          console.error('Failed to generate scenes:', error);
          toast.error('Could not generate scenes. Please ensure video has a transcript.');
        }
      }

      toast.success('Project loaded');
    } catch (error) {
      console.error('❌ Failed to load project:', error);
      toast.error('Failed to load project: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
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
  }

  function handleExport() {
    toast.info('Export functionality coming soon');
  }

  function handleSceneUpdate(sceneId: string, updates: any) {
    // Update scene in database
    supabase
      .from('project_scenes')
      .update(updates)
      .eq('id', sceneId)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update scene:', error);
          toast.error('Failed to update scene');
        } else {
          toast.success('Scene updated');
        }
      });
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

  if (!project || !videoData) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load project</p>
          <Button onClick={() => navigate('/videos')}>
            Back to Videos
          </Button>
        </div>
      </div>
    );
  }

  const selectedScene = projectScenes.find(s => s.id === selectedSceneId);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/videos')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            {project.name || 'Premium Editor'}
          </h1>
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

      {/* Main Content: 3-Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          
          {/* LEFT PANEL: Text-Based Editor */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="h-full bg-card border-r border-border">
              <TextBasedEditor
                videoId={project.videoId}
                videoUrl={project.videoUrl}
                currentTime={playback.currentTime}
                onTimeUpdate={setCurrentTime}
              />
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* CENTER PANEL: Video Player + Timeline */}
          <ResizablePanel defaultSize={50} minSize={40}>
            <ResizablePanelGroup direction="vertical">
              
              {/* Video Canvas */}
              <ResizablePanel defaultSize={70} minSize={50}>
                <div className="h-full bg-black flex items-center justify-center">
                  {project.videoUrl ? (
                    <EnhancedVideoPlayer
                      videoId={project.videoId}
                      videoSrc={project.videoUrl}
                      posterSrc={project.thumbnailUrl || undefined}
                      title={project.name}
                      language="en"
                      contentType="education"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                      <p className="text-white">Loading video...</p>
                    </div>
                  )}
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* Timeline */}
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full bg-muted p-4">
                  <div className="text-sm text-muted-foreground">
                    <p>Timeline: {projectScenes.length} scenes</p>
                    {projectScenes.length === 0 && (
                      <p className="mt-2">No scenes yet. They will be generated automatically.</p>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              
            </ResizablePanelGroup>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* RIGHT PANEL: Project Info */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="h-full bg-card border-l border-border overflow-y-auto p-6">
              <h3 className="font-semibold mb-4">Project Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Scenes:</span>
                  <span className="ml-2 font-medium">{projectScenes.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2 font-medium">{Math.round(project.duration)}s</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Video ID:</span>
                  <span className="ml-2 font-mono text-xs">{project.videoId.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </ResizablePanel>
          
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
