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
import { EnhancedVideoPlayer } from '@/components/EnhancedVideoPlayer';
import { ElementsPanel } from './ElementsPanel';
import { AIToolsPanel } from './AIToolsPanel';
import { TextBasedEditor } from './TextBasedEditor';
import { AudioDescriptionEditor } from './AudioDescriptionEditor';
import { SignLanguageManager } from './SignLanguageManager';
import { ExportManager } from './ExportManager';
import { CharacterManager } from '@/components/CharacterManager';
import { PremiumEditorSidebar } from './PremiumEditorSidebar';
import { VideoAnalysisPanel } from '@/components/VideoAnalysisPanel';
import { MediaLibrary } from './MediaLibrary';

interface PremiumEditorLayoutProps {
  videoId?: string;
  projectId?: string;
}

export function PremiumEditorLayout({ videoId: propsVideoId, projectId: propsProjectId }: PremiumEditorLayoutProps) {
  const { projectId: routeProjectId, id: routeVideoId } = useParams<{ projectId?: string; id?: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [activeView, setActiveView] = useState('transcript');

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

  // Load project once IDs are available
  useEffect(() => {
    if (!projectId && !videoId) return;

    console.log('🔄 PremiumEditorLayout: loadProject effect', { projectId, videoId });
    loadProject(projectId, videoId);
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
    console.log('🚀 PremiumEditorLayout.loadProject called', { projectIdParam, videoIdParam });
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
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area - Left Side */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          
          {/* Left Panel - Video Player + Timeline */}
          <ResizablePanel defaultSize={70} minSize={50}>
            <div className="h-full flex flex-col">
              {/* Video Player */}
              <div className="flex-1 relative bg-black">
                <EnhancedVideoPlayer
                  videoSrc={project.videoUrl}
                  posterSrc={project.thumbnailUrl || undefined}
                  title={project.name}
                  videoId={project.videoId}
                  language={currentLanguage}
                  contentType="education"
                  className="w-full h-full"
                  onLanguageChange={setCurrentLanguage}
                />
                
                {/* Element overlay layer for shapes/text */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="relative w-full h-full pointer-events-auto">
                    {elements
                      .sort((a, b) => a.zIndex - b.zIndex)
                      .map(element => (
                        <div
                          key={element.id}
                          style={{
                            position: 'absolute',
                            left: `${element.x}px`,
                            top: `${element.y}px`,
                            width: `${element.width}px`,
                            height: `${element.height}px`,
                            transform: `rotate(${element.rotation}deg)`,
                            opacity: element.opacity,
                            backgroundColor: element.data?.fill || 'transparent',
                            zIndex: element.zIndex,
                          }}
                          onClick={() => selectElement(element.id)}
                        />
                      ))}
                  </div>
                </div>
              </div>

              {/* Timeline directly under player */}
              <div className="border-t bg-background" style={{ height: '240px', minHeight: '200px' }}>
                {scenes.length > 0 ? (
                  <MultiTrackTimeline
                    scenes={scenes.map(scene => ({
                      ...scene,
                      layout: 'default',
                      elements: []
                    }))}
                    duration={project.duration || 0}
                    currentTime={playback.currentTime}
                    zoom={ui.timelineZoom}
                    onTimeUpdate={setCurrentTime}
                    onSceneSelect={(id) => selectScene(id || null)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Loading timeline...</p>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Sidebar + Dynamic Content + Properties */}
          <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
            <div className="h-full flex flex-col border-l bg-background">
              {/* Sidebar Navigation at top */}
              <PremiumEditorSidebar
                activeView={activeView}
                onViewChange={setActiveView}
              />

              {/* Dynamic Content Area */}
              <div className="flex-1 overflow-y-auto border-t">
                {activeView === 'transcript' && (
                  <TextBasedEditor
                    videoId={project.videoId}
                    videoUrl={project.videoUrl}
                    currentTime={playback.currentTime}
                    onTimeUpdate={setCurrentTime}
                  />
                )}
                
                {activeView === 'characters' && (
                  <CharacterManager
                    videoId={project.videoId}
                    onCharactersUpdate={(updatedCharacters) => {
                      console.log('🔁 PremiumEditorLayout: characters updated', updatedCharacters?.length);
                      setCharacters(updatedCharacters);
                    }}
                  />
                )}
                
                {activeView === 'captions' && (
                  <div className="p-4">
                    <h3 className="font-semibold mb-4">Captions with Intention</h3>
                    <p className="text-sm text-muted-foreground">
                      Advanced caption styling and synchronization
                    </p>
                  </div>
                )}
                
                {activeView === 'audio-descriptions' && (
                  <AudioDescriptionEditor 
                    videoId={project.videoId}
                    videoUrl={project.videoUrl}
                    currentTime={playback.currentTime}
                    onTimeUpdate={setCurrentTime}
                    scenes={scenes}
                  />
                )}
                
                {activeView === 'sign-language' && (
                  <SignLanguageManager 
                    videoId={project.videoId}
                    videoUrl={project.videoUrl}
                    currentTime={playback.currentTime}
                    characters={characters}
                  />
                )}
                
                {activeView === 'timeline' && (
                  <div className="p-4">
                    <h3 className="font-semibold mb-4">Timeline View</h3>
                    <p className="text-sm text-muted-foreground">
                      Timeline controls and scene management (see below player)
                    </p>
                  </div>
                )}
                
                {activeView === 'analysis' && (
                  <VideoAnalysisPanel 
                    videoId={project.videoId}
                    assetId={project.videoId}
                    playbackUrl={project.videoUrl}
                  />
                )}
                
                {activeView === 'ai-tools' && (
                  <AIToolsPanel
                    videoId={project.videoId}
                    selectedSceneId={null}
                    onToolExecute={() => {}}
                  />
                )}
                
                {activeView === 'runway' && (
                  <div className="p-4">
                    <h3 className="font-semibold mb-4">Runway ML Video Generation</h3>
                    <p className="text-sm text-muted-foreground">
                      AI-powered video generation from text prompts
                    </p>
                  </div>
                )}
                
                {activeView === 'media' && (
                  <MediaLibrary 
                    videoId={project.videoId}
                    onMediaSelect={(media) => toast.success('Media added to project')}
                  />
                )}
                
                {activeView === 'elements' && (
                  <ElementsPanel videoId={project.videoId} />
                )}
                
                {activeView === 'export' && (
                  <ExportManager
                    videoId={project.videoId}
                    projectId={project.id}
                    duration={project.duration}
                  />
                )}
              </div>

              {/* Properties Panel at bottom */}
              <div className="border-t p-4 bg-muted/30">
                <h3 className="font-semibold mb-4">Properties</h3>
                {selectedElementId ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Element properties for selected item
                    </p>
                    <div className="space-y-2">
                      <div className="p-3 border rounded bg-background">
                        <p className="text-xs font-medium">Selected Element</p>
                        <p className="text-xs text-muted-foreground mt-1">ID: {selectedElementId}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select an element to edit properties
                  </p>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
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
