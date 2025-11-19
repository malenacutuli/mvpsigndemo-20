import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Upload, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePremiumEditor } from '@/store/premiumEditorStore';

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
    setCurrentTime,
    togglePlayback,
    selectElement,
    selectScene,
    setInPoint,
    setOutPoint,
    undo,
    redo,
    deleteElement,
  } = usePremiumEditor();

  useEffect(() => {
    if (!projectId && !videoId) return;
    loadProject(projectId, videoId);
  }, [projectId, videoId]);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (project) {
        saveProject();
      }
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [project, scenes, elements]);

  const loadProject = async (projectIdParam?: string, videoIdParam?: string) => {
    setIsLoading(true);
    
    try {
      let projectData;
      let video;

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
      else if (videoIdParam) {
        const { data: videoData, error: videoError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', videoIdParam)
          .single();

        if (videoError) throw videoError;
        video = videoData;

        const { data: existingProject } = await supabase
          .from('premium_projects')
          .select('*')
          .eq('video_id', videoIdParam)
          .maybeSingle();

        if (existingProject) {
          projectData = { ...existingProject, videos: video };
        } else {
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

      if (!video) throw new Error('No video found');

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

      const { data: charactersData } = await supabase
        .from('characters')
        .select('*')
        .eq('video_id', video.id);
      
      if (charactersData) {
        setCharacters(charactersData);
      }

      const { data: scenesData } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('video_id', video.id)
        .order('start_time');

      if (scenesData) {
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
      await supabase
        .from('premium_projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', project.id);

      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    await saveProject();
    toast.success('Project saved');
  };

  const handleExport = () => {
    toast.info('Export');
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
      <div className="h-14 border-b flex items-center justify-between px-4 bg-muted/50 flex-shrink-0">
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
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="vertical" className="h-full">
          
          {/* Top: Video Player + Right Sidebar */}
          <ResizablePanel defaultSize={55} minSize={35}>
            <div className="h-full">
              <ResizablePanelGroup direction="horizontal" className="h-full">
                
                {/* Video Player */}
                <ResizablePanel defaultSize={70} minSize={55}>
                  <div className="h-full relative bg-black">
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
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Right Sidebar */}
                <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
                  <div className="h-full flex flex-col border-l bg-background overflow-hidden">
                    <div className="flex-shrink-0">
                      <PremiumEditorSidebar
                        activeView={activeView}
                        onViewChange={setActiveView}
                      />
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto border-t">
                      <div className="p-4">
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
                            onCharactersUpdate={setCharacters}
                          />
                        )}
                        
                        {activeView === 'captions' && (
                          <div>
                            <h3 className="font-semibold mb-4">Captions with Intention</h3>
                            <p className="text-sm text-muted-foreground">Caption styling and sync</p>
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
                          <div>
                            <h3 className="font-semibold mb-4">AI Video Generation</h3>
                            <p className="text-sm text-muted-foreground">Generate video from text</p>
                          </div>
                        )}
                        
                        {activeView === 'media' && (
                          <MediaLibrary 
                            videoId={project.videoId}
                            onMediaSelect={() => toast.success('Media added')}
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
                    </div>

                    <div className="flex-shrink-0 border-t p-4 bg-muted/30 max-h-48 overflow-y-auto">
                      <h3 className="text-sm font-semibold mb-3">Properties</h3>
                      {selectedElementId ? (
                        <div className="space-y-2">
                          <div className="p-3 border rounded bg-background">
                            <p className="text-xs font-medium">Selected Element</p>
                            <p className="text-xs text-muted-foreground mt-1">ID: {selectedElementId}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Select an element</p>
                      )}
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Bottom: Timeline */}
          <ResizablePanel defaultSize={45} minSize={35} maxSize={60}>
            <div className="h-full bg-background border-t flex flex-col overflow-hidden">
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
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

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
