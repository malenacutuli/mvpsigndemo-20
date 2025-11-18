// src/components/premium-editor/PremiumEditorLayout.tsx
// REPLACE entire file with this

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft,
  Save, 
  Download, 
  Sparkles,
  Film,
  FileText,
  Scissors,
  Upload,
  Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import all components
import { Timeline } from './Timeline';
import { TimelineControls } from './TimelineControls';
import { TextBasedEditor } from './TextBasedEditor';
import { MultiSegmentClipCreator } from './MultiSegmentClipCreator';
import { AIAssistant } from './AIAssistant';
import { AdvancedExportDialog } from './AdvancedExportDialog';
import { ScenePropertiesPanel } from './ScenePropertiesPanel';
import { SubscriptionGate } from './SubscriptionGate';
import { Badge } from '@/components/ui/badge';
import { DevTestingPanel } from './DevTestingPanel';

// Import hooks
import { useVideoProject, generateScenesFromTranscript } from '@/hooks/useVideoProject';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { useEffect } from 'react';

export function PremiumEditorLayout() {
  const { videoId } = useParams<{ videoId: string }>();
  
  const [activeTab, setActiveTab] = useState('timeline');
  const [isSaving, setIsSaving] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  
  const { canAccess, isAdmin, tier, isLoading: accessLoading } = usePremiumAccess();
  const { project, isLoading: projectLoading } = useVideoProject(videoId);
  
  const { data: segments = [] } = useQuery({
    queryKey: ['transcriptSegments', videoId],
    queryFn: async () => {
      if (!videoId) return [];
      const { data } = await supabase
        .from('transcript_segments_clean')
        .select('id, start_time, end_time, text, speaker')
        .eq('video_id', videoId)
        .order('idx');
      return data || [];
    },
    enabled: !!videoId
  });

  // Calculate duration from segments
  const videoDuration = segments.length > 0 
    ? segments[segments.length - 1].end_time 
    : 60;

  // Fetch project scenes
  const { data: scenes = [] } = useQuery({
    queryKey: ['projectScenes', project?.id],
    queryFn: async () => {
      if (!project?.id) return [];
      const { data } = await supabase
        .from('project_scenes')
        .select('*')
        .eq('project_id', project.id)
        .order('scene_order', { ascending: true });
      return data || [];
    },
    enabled: !!project?.id
  });

  // Admin users and premium tier users have access
  const hasAccess = canAccess || isAdmin;

  // Auto-generate scenes from transcript if none exist
  useEffect(() => {
    if (project?.id && videoId && scenes.length === 0 && !projectLoading) {
      generateScenesFromTranscript(project.id, videoId);
    }
  }, [project?.id, videoId, scenes.length, projectLoading]);

  const handleSave = async () => {
    if (!project) {
      toast.error('No project to save');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('video_projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', project.id);
      
      if (error) throw error;
      toast.success('Project saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSceneSelect = (sceneId: string) => {
    setSelectedSceneId(sceneId);
  };

  const handleScenesReorder = async (reorderedScenes: any[]) => {
    try {
      // Update scene orders in database
      const updates = reorderedScenes.map((scene, index) => 
        supabase
          .from('project_scenes')
          .update({ scene_order: index })
          .eq('id', scene.id)
      );
      
      await Promise.all(updates);
      toast.success('Scenes reordered');
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Failed to reorder scenes');
    }
  };

  const handleSplitScene = async () => {
    if (!selectedSceneId || !project) return;
    try {
      const { sceneManager } = await import('@/lib/premium-editor/scene-manager');
      const result = await sceneManager.splitScene(selectedSceneId, currentTime);
      if (result.success) {
        toast.success('Scene split successfully');
        // Refetch scenes
      }
    } catch (error) {
      console.error('Split error:', error);
      toast.error('Failed to split scene');
    }
  };

  const handleDeleteScene = async () => {
    if (!selectedSceneId) return;
    try {
      const { sceneManager } = await import('@/lib/premium-editor/scene-manager');
      const result = await sceneManager.deleteScene(selectedSceneId);
      if (result.success) {
        toast.success('Scene deleted');
        setSelectedSceneId(null);
        // Refetch scenes
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete scene');
    }
  };

  const handleDuplicateScene = async () => {
    if (!selectedSceneId) return;
    try {
      const { sceneManager } = await import('@/lib/premium-editor/scene-manager');
      const result = await sceneManager.duplicateScene(selectedSceneId);
      if (result.success) {
        toast.success('Scene duplicated');
        // Refetch scenes
      }
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error('Failed to duplicate scene');
    }
  };

  const handleFitToView = () => {
    setZoom(1);
  };

  if (accessLoading || projectLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-light">Loading premium editor...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <SubscriptionGate currentTier={tier} videoId={videoId || ''} />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/videos">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                My Videos
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-semibold">
                  {project?.name || 'Premium Video Editor'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {segments.length} transcript segments
                </p>
              </div>
              {isAdmin && (
                <Badge variant="secondary" className="text-xs font-light">
                  Admin Access
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={showAI ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAI(!showAI)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ask AI
            </Button>

            {scenes.length === 0 && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={async () => {
                  if (project?.id && videoId) {
                    setIsGeneratingScenes(true);
                    await generateScenesFromTranscript(project.id, videoId);
                    setIsGeneratingScenes(false);
                    toast.success('Scenes generated from transcript!');
                    // Refresh to show new scenes
                    window.location.reload();
                  }
                }}
                disabled={isGeneratingScenes}
              >
                {isGeneratingScenes ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Scenes
                  </>
                )}
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving || !project}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>

            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setShowExportDialog(true)}
              disabled={!project}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none px-4">
              <TabsTrigger value="timeline" className="gap-2">
                <Film className="w-4 h-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="transcript" className="gap-2">
                <FileText className="w-4 h-4" />
                Transcript
              </TabsTrigger>
              <TabsTrigger value="social" className="gap-2">
                <Scissors className="w-4 h-4" />
                Social Clips
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-2">
                <Upload className="w-4 h-4" />
                Export
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="timeline" className="m-0 h-full flex flex-col">
                {videoId && project && (
                  <>
                    <div className="flex-1">
                      <Timeline 
                        projectId={project.id}
                        scenes={scenes}
                        currentTime={currentTime}
                        duration={videoDuration}
                        onSceneSelect={handleSceneSelect}
                        onTimeChange={setCurrentTime}
                        onScenesReorder={handleScenesReorder}
                      />
                    </div>
                    <TimelineControls
                      isPlaying={isPlaying}
                      currentTime={currentTime}
                      duration={videoDuration}
                      zoom={zoom}
                      selectedSceneId={selectedSceneId}
                      onPlayPause={() => setIsPlaying(!isPlaying)}
                      onSeek={setCurrentTime}
                      onZoomChange={setZoom}
                      onSplitScene={handleSplitScene}
                      onDeleteScene={handleDeleteScene}
                      onDuplicateScene={handleDuplicateScene}
                      onFitToView={handleFitToView}
                    />
                  </>
                )}
              </TabsContent>

              <TabsContent value="transcript" className="m-0 h-full overflow-auto">
                {videoId && <TextBasedEditor videoId={videoId} />}
              </TabsContent>

              <TabsContent value="social" className="m-0 h-full overflow-auto">
                {videoId && <MultiSegmentClipCreator videoId={videoId} segments={segments} />}
              </TabsContent>

              <TabsContent value="export" className="m-0 p-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Export Options</h3>
                  <p className="text-muted-foreground mb-6">
                    Export your project in various professional formats including DOCX transcripts, 
                    AAF timelines, and SRT/VTT subtitles.
                  </p>
                  <Button 
                    onClick={() => setShowExportDialog(true)} 
                    size="lg" 
                    className="w-full"
                    disabled={!project}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Open Export Dialog
                  </Button>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="w-80 border-l bg-card overflow-auto flex flex-col gap-4 p-4">
          <ScenePropertiesPanel 
            selectedSceneId={selectedSceneId}
            projectId={project?.id}
          />
          {import.meta.env.DEV && project && videoId && (
            <DevTestingPanel projectId={project.id} videoId={videoId} />
          )}
        </div>

        {showAI && project && videoId && (
          <div className="w-96 border-l bg-card flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">AI Assistant</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAI(false)}
              >
                ×
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIAssistant 
                projectId={project.id}
                videoId={videoId}
                currentContext={activeTab}
              />
            </div>
          </div>
        )}
      </div>

      {project && videoId && (
        <AdvancedExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          projectId={project.id}
          videoId={videoId}
        />
      )}
    </div>
  );
}
