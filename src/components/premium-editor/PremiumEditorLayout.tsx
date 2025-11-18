import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Upload, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePremiumEditor } from '@/store/premiumEditorStore';

// Import all components
import { MultiTrackTimeline } from './MultiTrackTimeline';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { VideoCanvas } from './VideoCanvas';
import { ElementsPanel } from './ElementsPanel';
import { AIToolsPanel } from './AIToolsPanel';
import { TextBasedEditor } from './TextBasedEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';
import { SignLanguageManager } from './SignLanguageManager';
import { ExportManager } from './ExportManager';
import { CharacterManager } from '@/components/CharacterManager';
import { RightPanelTabs } from './RightPanelTabs';

interface PremiumEditorLayoutProps {
  videoId?: string;
  projectId?: string;
}

export function PremiumEditorLayout({ videoId: propsVideoId, projectId: propsProjectId }: PremiumEditorLayoutProps) {
  const { projectId: routeProjectId, id: routeVideoId } = useParams<{ projectId?: string; id?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);

  // Use props first, fallback to route params
  const videoId = propsVideoId || routeVideoId;
  const projectId = propsProjectId || routeProjectId;

  const {
    project,
    setProject,
    playback,
    scenes,
    setScenes,
    elements,
    selectedElementId,
    ui,
    markers,
    setCurrentTime,
    togglePlayback,
    setVolume,
    toggleMute,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    selectScene,
    setInPoint,
    setOutPoint,
    undo,
    redo,
    setSelectedTab
  } = usePremiumEditor();

  // Load project
  useEffect(() => {
    if (projectId || videoId) {
      loadProject(projectId, videoId);
    }
  }, [projectId, videoId]);

  // Auto-save
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (project) {
        saveProject();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [project, scenes, elements]);

  const loadProject = async (projectIdParam?: string, videoIdParam?: string) => {
    setIsLoading(true);
    
    try {
      let projectData;
      let video;

      // Case 1: Load by projectId
      if (projectIdParam) {
        const { data, error } = await supabase
          .from('premium_projects')
          .select('*, videos(*)')
          .eq('id', projectIdParam)
          .single();

        if (error) throw error;
        projectData = data;
        video = data.videos;
      } 
      // Case 2: Load by videoId (or create if doesn't exist)
      else if (videoIdParam) {
        // First, get video details
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoIdParam)
          .single();

        if (videoError) throw videoError;
        video = videoData;

        // Try to find existing premium project
        const { data: existingProject } = await supabase
          .from('premium_projects')
          .select('*')
          .eq('video_id', videoIdParam)
          .maybeSingle();

        if (existingProject) {
          projectData = { ...existingProject, videos: video };
        } else {
          // Create new premium project
          const { data: newProject, error: createError } = await supabase
            .from('premium_projects')
            .insert({
              video_id: videoIdParam,
              name: video.title || 'Untitled Project',
              user_id: (await supabase.auth.getUser()).data.user?.id
            })
            .select()
            .single();

          if (createError) throw createError;
          projectData = { ...newProject, videos: video };
          toast.success('Created new premium project');
        }
      } else {
        throw new Error('No projectId or videoId provided');
      }

      if (!video) {
        throw new Error('No video found');
      }

      // Construct video URL from storage path
      const videoUrl = video.storage_path
        ? `https://faeyekynudyzeotbjfsj.supabase.co/storage/v1/object/public/videos/${video.storage_path}`
        : video.video_url || '';

      setProject({
        id: projectData.id,
        name: projectData.name,
        videoId: video.id,
        videoUrl,
        thumbnailUrl: video.thumbnail_url,
        duration: video.duration_seconds || 0,
        createdAt: projectData.created_at,
        updatedAt: projectData.updated_at
      });

      // Load characters
      const { data: charactersData } = await supabase
        .from('characters')
        .select('*')
        .eq('video_id', video.id);
      
      if (charactersData) {
        setCharacters(charactersData);
      }

      // Load scenes/transcript from transcript_segments
      const { data: scenesData } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', video.id)
        .order('start_time');

      if (scenesData) {
        // Create a map of character_id to color for quick lookup
        const characterColorMap = new Map<string, string>();
        if (charactersData) {
          charactersData.forEach(char => {
            characterColorMap.set(char.id, char.color);
          });
        }

        const loadedScenes = scenesData.map((seg, index) => ({
          id: seg.id,
          startTime: seg.start_time,
          endTime: seg.end_time,
          text: seg.text,
          speaker: seg.speaker || 'Unknown',
          speakerColor: seg.character_id ? characterColorMap.get(seg.character_id) : undefined,
          order: index
        }));
        setScenes(loadedScenes);
      }

      toast.success('Project loaded');
    } catch (error) {
      console.error('Failed to load project:', error);
      toast.error('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProject = async () => {
    if (!project) return;

    try {
      // Save project metadata
      await supabase
        .from('premium_projects')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', project.id);

      // Save scenes if modified
      // (Implementation depends on your data model)

      setLastSaved(new Date());
      console.log('Project auto-saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    await saveProject();
    toast.success('Project saved', { duration: 2000 });
  };

  const handleExport = () => {
    toast.info('Export modal (implement separately)');
  };

  const handleInsertClip = (clipUrl: string) => {
    toast.success('Clip inserted (implement clip insertion logic)');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading Premium Editor...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p>Project not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-muted/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Home
          </Button>
          <div className="h-6 w-px bg-border" />
          <h1 className="font-semibold truncate max-w-md">{project.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* LEFT PANEL - Text Editor / Transcript */}
          <ResizablePanel
            defaultSize={ui.leftPanelWidth}
            minSize={20}
            maxSize={40}
          >
            <div className="h-full border-r">
              <Tabs defaultValue="transcript" className="h-full flex flex-col">
                <TabsList className="w-full">
                  <TabsTrigger value="transcript" className="flex-1">Transcript</TabsTrigger>
                  <TabsTrigger value="ad" className="flex-1">AD</TabsTrigger>
                  <TabsTrigger value="asl" className="flex-1">ASL</TabsTrigger>
                </TabsList>
                
                <TabsContent value="transcript" className="flex-1 overflow-hidden">
                  <TextBasedEditor
                    videoId={project.videoId}
                    videoUrl={project.videoUrl}
                    currentTime={playback.currentTime}
                    onTimeUpdate={setCurrentTime}
                  />
                </TabsContent>

                <TabsContent value="ad" className="flex-1 overflow-hidden">
                  <AudioDescriptionEditor 
                    videoId={project.videoId}
                    videoUrl={project.videoUrl}
                    currentTime={playback.currentTime}
                    onTimeUpdate={setCurrentTime}
                    scenes={scenes}
                  />
                </TabsContent>

                <TabsContent value="asl" className="flex-1 overflow-hidden">
                  <SignLanguageManager 
                    videoId={project.videoId}
                    videoUrl={project.videoUrl}
                    currentTime={playback.currentTime}
                    characters={[]}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* CENTER PANEL - Video Canvas */}
          <ResizablePanel defaultSize={45} minSize={30}>
            <div className="h-full flex flex-col">
              <VideoCanvas
                videoUrl={project.videoUrl}
                currentTime={playback.currentTime}
                isPlaying={playback.isPlaying}
                playbackRate={playback.playbackRate}
                volume={playback.volume}
                isMuted={playback.isMuted}
                elements={elements}
                selectedElementId={selectedElementId}
                onTimeUpdate={setCurrentTime}
                onTogglePlayback={togglePlayback}
                onVolumeChange={setVolume}
                onToggleMute={toggleMute}
                onElementSelect={selectElement}
                onElementUpdate={updateElement}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* RIGHT PANEL - Tools */}
          <ResizablePanel
            defaultSize={ui.rightPanelWidth}
            minSize={20}
            maxSize={35}
          >
            <div className="h-full border-l">
              <Tabs value={ui.selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="h-full flex flex-col">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="ai-tools">AI</TabsTrigger>
                  <TabsTrigger value="elements">Elements</TabsTrigger>
                  <TabsTrigger value="properties">Props</TabsTrigger>
                  <TabsTrigger value="export">Export</TabsTrigger>
                </TabsList>

                <TabsContent value="ai-tools" className="flex-1 overflow-hidden">
                  <AIToolsPanel
                    videoId={project.videoId}
                    selectedSceneId={null}
                    onToolExecute={() => {}}
                  />
                </TabsContent>

                <TabsContent value="elements" className="flex-1 overflow-hidden">
                  <ElementsPanel videoId={project.videoId} />
                </TabsContent>

                <TabsContent value="properties" className="flex-1 overflow-hidden p-4">
                  <p className="text-sm text-muted-foreground">
                    Properties panel (implement detailed properties)
                  </p>
                </TabsContent>

                <TabsContent value="export" className="flex-1 overflow-hidden">
                  <ExportManager
                    videoId={project.videoId}
                    projectId={project.id}
                    duration={project.duration}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Bottom Timeline */}
      <div className="border-t" style={{ height: ui.timelineHeight }}>
        {/* Timeline component - to be implemented */}
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-sm">Timeline (to be implemented)</p>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts
        isPlaying={playback.isPlaying}
        currentTime={playback.currentTime}
        duration={project.duration}
        onTogglePlayback={togglePlayback}
        onSeek={setCurrentTime}
        selectedElementId={selectedElementId}
        onUndo={undo}
        onRedo={redo}
        onDeleteElement={deleteElement}
        onSave={handleSave}
        onExport={handleExport}
        onMarkIn={setInPoint}
        onMarkOut={setOutPoint}
      />
    </div>
  );
}
