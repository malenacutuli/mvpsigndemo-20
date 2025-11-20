import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wand2, Layers, Type, Image as ImageIcon, Settings, Accessibility, Sparkles, Video } from 'lucide-react';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { AIToolsPanel } from './ai-tools/AIToolsPanel';
import { ScenePropertiesPanel } from './ScenePropertiesPanel';
import { MediaLibrary } from './MediaLibrary';
import { CaptionTemplateGallery } from './CaptionTemplateGallery';
import { ExportManager } from './ExportManager';
import { VideoAnalysisPanel } from '@/components/VideoAnalysisPanel';
import { AdvancedFrameExtractor } from './AdvancedFrameExtractor';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface RightPanelTabsProps {
  projectId: string;
  videoId: string;
  videoUrl: string;
  currentTime: number;
}

export function RightPanelTabs({
  projectId,
  videoId,
  videoUrl,
  currentTime,
}: RightPanelTabsProps) {
  const { ui, setSelectedTab, selectedSceneId, scenes, updateScene } = usePremiumEditor();
  const selectedTab = ui.selectedTab;
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  // Load video file for frame extraction
  useEffect(() => {
    if (videoUrl) {
      fetch(videoUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'video.mp4', { type: blob.type });
          setVideoFile(file);
        })
        .catch(err => console.error('Failed to load video file:', err));
    }
  }, [videoUrl]);
  
  const handleToolExecute = (toolId: string) => {
    toast.info(`Executing tool: ${toolId}`);
  };

  const handleSceneUpdate = (updates: any) => {
    if (selectedSceneId) {
      updateScene(selectedSceneId, updates);
    }
  };

  const selectedScene = scenes.find(s => s.id === selectedSceneId);

  return (
    <Tabs
      value={selectedTab}
      onValueChange={(value) => setSelectedTab(value as any)}
      className="h-full flex flex-col"
    >
      <TabsList className="grid grid-cols-8 w-full rounded-none border-b">
        <TabsTrigger value="ai-tools" className="gap-1 font-light text-xs">
          <Wand2 className="h-4 w-4" />
          <span className="hidden xl:inline">AI</span>
        </TabsTrigger>
        <TabsTrigger value="media" className="gap-1 font-light text-xs">
          <ImageIcon className="h-4 w-4" />
          <span className="hidden xl:inline">Media</span>
        </TabsTrigger>
        <TabsTrigger value="captions" className="gap-1 font-light text-xs">
          <Type className="h-4 w-4" />
          <span className="hidden xl:inline">Captions</span>
        </TabsTrigger>
        <TabsTrigger value="analysis" className="gap-1 font-light text-xs">
          <Video className="h-4 w-4" />
          <span className="hidden xl:inline">Analysis</span>
        </TabsTrigger>
        <TabsTrigger value="properties" className="gap-1 font-light text-xs">
          <Settings className="h-4 w-4" />
          <span className="hidden xl:inline">Props</span>
        </TabsTrigger>
        <TabsTrigger value="accessibility" className="gap-1 font-light text-xs">
          <Accessibility className="h-4 w-4" />
          <span className="hidden xl:inline">A11y</span>
        </TabsTrigger>
        <TabsTrigger value="export" className="gap-1 font-light text-xs">
          <Sparkles className="h-4 w-4" />
          <span className="hidden xl:inline">Export</span>
        </TabsTrigger>
        <TabsTrigger value="elements" className="gap-1 font-light text-xs">
          <Layers className="h-4 w-4" />
          <span className="hidden xl:inline">Elements</span>
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="ai-tools" className="h-full m-0">
          <AIToolsPanel 
            projectId={projectId}
            videoUrl={videoUrl}
            transcript=""
            onJobComplete={() => {
              toast.success('AI job completed!');
            }}
          />
        </TabsContent>

        <TabsContent value="media" className="h-full m-0">
          <MediaLibrary 
            videoId={videoId}
            onMediaSelect={(media) => {
              toast.success(`Selected ${media.type}: ${media.title}`);
            }}
          />
        </TabsContent>

        <TabsContent value="captions" className="h-full m-0">
          <CaptionTemplateGallery 
            projectId={projectId}
            videoId={videoId}
            onTemplateSelect={(template) => {
              toast.success(`Applied template: ${template.name}`);
            }}
          />
        </TabsContent>

        <TabsContent value="analysis" className="h-full m-0">
          <VideoAnalysisPanel 
            assetId={videoId}
            playbackUrl={videoUrl}
            videoId={videoId}
          />
        </TabsContent>

        <TabsContent value="elements" className="h-full m-0 p-4">
          <AdvancedFrameExtractor 
            videoFile={videoFile}
            onFrameExtracted={(frame) => {
              toast.success('Frame extracted', {
                description: `${frame.width}x${frame.height} at ${frame.timestamp.toFixed(2)}s`
              });
            }}
          />
        </TabsContent>

        <TabsContent value="properties" className="h-full m-0">
          <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-2">
            {selectedSceneId ? (
              <>
                <Settings className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-light">Scene Properties</p>
                <p className="text-xs text-muted-foreground font-light">Scene ID: {selectedSceneId}</p>
              </>
            ) : (
              <>
                <Settings className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select a scene to view properties</p>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="accessibility" className="h-full m-0 p-4">
          <div className="text-sm text-muted-foreground">Accessibility tools coming soon...</div>
        </TabsContent>

        <TabsContent value="underlord" className="h-full m-0 p-4">
          <div className="text-sm text-muted-foreground">Underlord AI coming soon...</div>
        </TabsContent>
      </div>
    </Tabs>
  );
}
