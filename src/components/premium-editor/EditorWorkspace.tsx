import { useState } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Film, 
  Scissors, 
  Type, 
  Volume2, 
  Sparkles, 
  Download, 
  Wand2,
  Save,
  Eye,
  Keyboard as KeyboardIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RenderPreview } from "./RenderPreview";
import { VideoTimeline } from "./VideoTimeline";
import { SceneManager } from "./SceneManager";
import { CaptionEditor } from "./CaptionEditor";
import { AudioEditor } from "./AudioEditor";
import { TransitionsEffectsPanel } from "./TransitionsEffectsPanel";
import { AIAssistantPanel } from "./AIAssistantPanel";
import { ExportPanel } from "./ExportPanel";
import { KeyboardShortcuts } from "./KeyboardShortcuts";

interface EditorWorkspaceProps {
  videoFile: File;
  videoUrl: string;
  metadata: {
    duration: number;
    width: number;
    height: number;
    fps: number;
  };
  scenes: any[];
  onScenesChange: (scenes: any[]) => void;
  captions: any[];
  onCaptionsChange: (captions: any[]) => void;
  audioTracks: any[];
  onAudioTracksChange: (tracks: any[]) => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  selectedSceneId?: string;
  onSceneSelect: (id: string) => void;
}

type EditorPanel = "preview" | "scenes" | "captions" | "audio" | "effects" | "ai" | "export";

const EDITOR_PANELS = [
  { id: "preview" as EditorPanel, label: "Preview", icon: Eye, color: "text-blue-500" },
  { id: "scenes" as EditorPanel, label: "Scenes", icon: Scissors, color: "text-green-500" },
  { id: "captions" as EditorPanel, label: "Captions", icon: Type, color: "text-purple-500" },
  { id: "audio" as EditorPanel, label: "Audio", icon: Volume2, color: "text-orange-500" },
  { id: "effects" as EditorPanel, label: "Effects", icon: Wand2, color: "text-pink-500" },
  { id: "ai" as EditorPanel, label: "AI Assistant", icon: Sparkles, color: "text-yellow-500" },
  { id: "export" as EditorPanel, label: "Export", icon: Download, color: "text-red-500" },
];

function EditorSidebar({ 
  activePanel, 
  onPanelChange 
}: { 
  activePanel: EditorPanel; 
  onPanelChange: (panel: EditorPanel) => void;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "justify-center" : ""}>
            {!isCollapsed && "Editor Tools"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {EDITOR_PANELS.map((panel) => {
                const Icon = panel.icon;
                const isActive = activePanel === panel.id;
                
                return (
                  <SidebarMenuItem key={panel.id}>
                    <SidebarMenuButton 
                      onClick={() => onPanelChange(panel.id)}
                      className={`${isActive ? "bg-muted text-primary font-medium" : ""} hover:bg-muted/50`}
                    >
                      <Icon className={`h-4 w-4 ${panel.color} ${isCollapsed ? "" : "mr-2"}`} />
                      {!isCollapsed && <span>{panel.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function EditorWorkspace({
  videoFile,
  videoUrl,
  metadata,
  scenes,
  onScenesChange,
  captions,
  onCaptionsChange,
  audioTracks,
  onAudioTracksChange,
  currentTime,
  onTimeUpdate,
  selectedSceneId,
  onSceneSelect,
}: EditorWorkspaceProps) {
  const { toast } = useToast();
  const [activePanel, setActivePanel] = useState<EditorPanel>("preview");
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Project saved",
      description: "All changes have been saved successfully",
    });
    
    setIsSaving(false);
  };

  const handleTogglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleDeleteScene = () => {
    if (selectedSceneId) {
      onScenesChange(scenes.filter(s => s.id !== selectedSceneId));
      toast({
        title: "Scene deleted",
      });
    }
  };

  const renderPanel = () => {
    switch (activePanel) {
      case "preview":
        return (
          <RenderPreview
            videoUrl={videoUrl}
            scenes={scenes}
            captions={captions}
            currentTime={currentTime}
            duration={metadata.duration}
            onTimeUpdate={onTimeUpdate}
          />
        );
      
      case "scenes":
        return (
          <SceneManager
            scenes={scenes}
            onScenesChange={onScenesChange}
            onSceneSelect={onSceneSelect}
            videoDuration={metadata.duration}
          />
        );
      
      case "captions":
        return (
          <CaptionEditor
            captions={captions}
            onCaptionsChange={onCaptionsChange}
            currentTime={currentTime}
            videoDuration={metadata.duration}
          />
        );
      
      case "audio":
        return (
          <AudioEditor
            videoFile={videoFile}
            audioTracks={audioTracks}
            onAudioTracksChange={onAudioTracksChange}
            currentTime={currentTime}
            videoDuration={metadata.duration}
          />
        );
      
      case "effects":
        return (
          <TransitionsEffectsPanel
            scenes={scenes}
            onScenesChange={onScenesChange}
            selectedSceneId={selectedSceneId}
          />
        );
      
      case "ai":
        return (
          <AIAssistantPanel
            videoContext={{
              duration: metadata.duration,
              sceneCount: scenes.length,
              captionCount: captions.length,
              audioTrackCount: audioTracks.length,
            }}
          />
        );
      
      case "export":
        return (
          <ExportPanel
            videoFile={videoFile}
            scenes={scenes}
            captions={captions}
            audioTracks={audioTracks}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <EditorSidebar 
          activePanel={activePanel} 
          onPanelChange={setActivePanel}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 border-b flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <Film className="w-5 h-5 text-primary" />
              <span className="font-semibold">Premium Video Editor</span>
              <Badge variant="secondary" className="text-xs">
                {metadata.width}x{metadata.height} • {metadata.fps}fps
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {scenes.length} scenes • {captions.length} captions
              </span>
              <Separator orientation="vertical" className="h-6" />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Timeline (always visible) */}
              <VideoTimeline
                videoUrl={videoUrl}
                duration={metadata.duration}
                scenes={scenes}
                onTimeUpdate={onTimeUpdate}
                onSceneSelect={onSceneSelect}
              />

              {/* Active Panel Content */}
              {renderPanel()}
            </div>
          </div>

          {/* Footer Stats */}
          <footer className="h-10 border-t flex items-center justify-between px-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Duration: {metadata.duration.toFixed(2)}s</span>
              <span>Current: {currentTime.toFixed(2)}s</span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Effects: {scenes.reduce((acc, s) => acc + (s.effects?.filter((e: any) => e.enabled).length || 0), 0)}
              </span>
              <span>Transitions: {scenes.filter((s) => s.transition).length}</span>
            </div>
          </footer>
        </div>

        {/* Keyboard Shortcuts */}
        <KeyboardShortcuts
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={metadata.duration}
          onTogglePlayback={handleTogglePlayback}
          onSeek={onTimeUpdate}
          selectedElementId={selectedSceneId}
          onUndo={() => toast({ title: "Undo not implemented yet" })}
          onRedo={() => toast({ title: "Redo not implemented yet" })}
          onDeleteElement={handleDeleteScene}
          onSave={handleSave}
        />
      </div>
    </SidebarProvider>
  );
}
