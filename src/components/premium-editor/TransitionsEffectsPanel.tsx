import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Zap, 
  Wind, 
  Droplets,
  Sun,
  Moon,
  Palette,
  Film,
  Eye,
  Layers
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  transition?: Transition;
  effects?: Effect[];
}

interface Transition {
  type: string;
  duration: number;
}

interface Effect {
  id: string;
  type: string;
  intensity: number;
  enabled: boolean;
}

interface TransitionsEffectsPanelProps {
  scenes: Scene[];
  onScenesChange: (scenes: Scene[]) => void;
  selectedSceneId?: string;
}

const TRANSITIONS = [
  { value: "none", label: "None", icon: Eye },
  { value: "fade", label: "Fade", icon: Wind },
  { value: "dissolve", label: "Dissolve", icon: Droplets },
  { value: "wipe-left", label: "Wipe Left", icon: Zap },
  { value: "wipe-right", label: "Wipe Right", icon: Zap },
  { value: "slide-left", label: "Slide Left", icon: Layers },
  { value: "slide-right", label: "Slide Right", icon: Layers },
  { value: "zoom-in", label: "Zoom In", icon: Eye },
  { value: "zoom-out", label: "Zoom Out", icon: Eye },
  { value: "circle-open", label: "Circle Open", icon: Sun },
  { value: "circle-close", label: "Circle Close", icon: Moon },
];

const EFFECTS = [
  { value: "blur", label: "Blur", icon: Wind, description: "Gaussian blur effect" },
  { value: "brightness", label: "Brightness", icon: Sun, description: "Adjust brightness" },
  { value: "contrast", label: "Contrast", icon: Palette, description: "Adjust contrast" },
  { value: "saturation", label: "Saturation", icon: Palette, description: "Color saturation" },
  { value: "vignette", label: "Vignette", icon: Moon, description: "Darken edges" },
  { value: "sharpen", label: "Sharpen", icon: Sparkles, description: "Enhance details" },
  { value: "sepia", label: "Sepia", icon: Film, description: "Vintage look" },
  { value: "grayscale", label: "Grayscale", icon: Layers, description: "Black and white" },
  { value: "invert", label: "Invert", icon: Zap, description: "Invert colors" },
  { value: "noise", label: "Noise", icon: Droplets, description: "Add film grain" },
];

export const TransitionsEffectsPanel = ({ 
  scenes, 
  onScenesChange, 
  selectedSceneId 
}: TransitionsEffectsPanelProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("transitions");

  const selectedScene = scenes.find(s => s.id === selectedSceneId);

  const handleTransitionChange = (type: string, duration: number = 0.5) => {
    if (!selectedSceneId) {
      toast({
        title: "No scene selected",
        description: "Please select a scene first",
        variant: "destructive",
      });
      return;
    }

    const updatedScenes = scenes.map(scene => {
      if (scene.id === selectedSceneId) {
        return {
          ...scene,
          transition: type === "none" ? undefined : { type, duration },
        };
      }
      return scene;
    });

    onScenesChange(updatedScenes);
    
    toast({
      title: "Transition updated",
      description: `Applied ${type} transition`,
    });
  };

  const handleTransitionDurationChange = (duration: number) => {
    if (!selectedSceneId || !selectedScene?.transition) return;

    const updatedScenes = scenes.map(scene => {
      if (scene.id === selectedSceneId && scene.transition) {
        return {
          ...scene,
          transition: { ...scene.transition, duration },
        };
      }
      return scene;
    });

    onScenesChange(updatedScenes);
  };

  const handleAddEffect = (effectType: string) => {
    if (!selectedSceneId) {
      toast({
        title: "No scene selected",
        description: "Please select a scene first",
        variant: "destructive",
      });
      return;
    }

    const updatedScenes = scenes.map(scene => {
      if (scene.id === selectedSceneId) {
        const effects = scene.effects || [];
        
        // Check if effect already exists
        if (effects.some(e => e.type === effectType)) {
          toast({
            title: "Effect already applied",
            description: "This effect is already on this scene",
            variant: "destructive",
          });
          return scene;
        }

        return {
          ...scene,
          effects: [
            ...effects,
            {
              id: `${effectType}-${Date.now()}`,
              type: effectType,
              intensity: 50,
              enabled: true,
            },
          ],
        };
      }
      return scene;
    });

    onScenesChange(updatedScenes);
    
    toast({
      title: "Effect added",
      description: `Added ${effectType} effect`,
    });
  };

  const handleRemoveEffect = (effectId: string) => {
    if (!selectedSceneId) return;

    const updatedScenes = scenes.map(scene => {
      if (scene.id === selectedSceneId) {
        return {
          ...scene,
          effects: scene.effects?.filter(e => e.id !== effectId) || [],
        };
      }
      return scene;
    });

    onScenesChange(updatedScenes);
    
    toast({
      title: "Effect removed",
    });
  };

  const handleEffectIntensityChange = (effectId: string, intensity: number) => {
    if (!selectedSceneId) return;

    const updatedScenes = scenes.map(scene => {
      if (scene.id === selectedSceneId) {
        return {
          ...scene,
          effects: scene.effects?.map(effect => 
            effect.id === effectId ? { ...effect, intensity } : effect
          ) || [],
        };
      }
      return scene;
    });

    onScenesChange(updatedScenes);
  };

  const handleToggleEffect = (effectId: string) => {
    if (!selectedSceneId) return;

    const updatedScenes = scenes.map(scene => {
      if (scene.id === selectedSceneId) {
        return {
          ...scene,
          effects: scene.effects?.map(effect => 
            effect.id === effectId ? { ...effect, enabled: !effect.enabled } : effect
          ) || [],
        };
      }
      return scene;
    });

    onScenesChange(updatedScenes);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Transitions & Effects
        </CardTitle>
        <CardDescription>
          {selectedSceneId 
            ? "Add transitions and effects to the selected scene"
            : "Select a scene to apply transitions and effects"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transitions">Transitions</TabsTrigger>
            <TabsTrigger value="effects">Effects</TabsTrigger>
          </TabsList>

          {/* Transitions Tab */}
          <TabsContent value="transitions" className="space-y-4 mt-4">
            {!selectedSceneId ? (
              <div className="text-center py-8 text-muted-foreground">
                <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a scene to add transitions</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Label>Transition Type</Label>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="grid grid-cols-2 gap-2">
                      {TRANSITIONS.map((transition) => {
                        const Icon = transition.icon;
                        const isActive = selectedScene?.transition?.type === transition.value ||
                                       (transition.value === "none" && !selectedScene?.transition);
                        
                        return (
                          <Button
                            key={transition.value}
                            variant={isActive ? "default" : "outline"}
                            className="h-auto flex-col gap-2 p-4"
                            onClick={() => handleTransitionChange(transition.value)}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs">{transition.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {selectedScene?.transition && (
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label>Duration</Label>
                      <span className="text-sm text-muted-foreground">
                        {selectedScene.transition.duration.toFixed(1)}s
                      </span>
                    </div>
                    <Slider
                      value={[selectedScene.transition.duration]}
                      onValueChange={(value) => handleTransitionDurationChange(value[0])}
                      min={0.1}
                      max={2}
                      step={0.1}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Effects Tab */}
          <TabsContent value="effects" className="space-y-4 mt-4">
            {!selectedSceneId ? (
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a scene to add effects</p>
              </div>
            ) : (
              <>
                {/* Active Effects */}
                {selectedScene?.effects && selectedScene.effects.length > 0 && (
                  <div className="space-y-3">
                    <Label>Active Effects</Label>
                    {selectedScene.effects.map((effect) => {
                      const effectInfo = EFFECTS.find(e => e.value === effect.type);
                      const Icon = effectInfo?.icon || Sparkles;
                      
                      return (
                        <Card key={effect.id} className="p-3 bg-muted/50">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span className="font-medium text-sm">
                                  {effectInfo?.label || effect.type}
                                </span>
                                <Badge 
                                  variant={effect.enabled ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {effect.enabled ? "On" : "Off"}
                                </Badge>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleEffect(effect.id)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveEffect(effect.id)}
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs">Intensity</Label>
                                <span className="text-xs text-muted-foreground">
                                  {effect.intensity}%
                                </span>
                              </div>
                              <Slider
                                value={[effect.intensity]}
                                onValueChange={(value) => 
                                  handleEffectIntensityChange(effect.id, value[0])
                                }
                                min={0}
                                max={100}
                                step={1}
                                disabled={!effect.enabled}
                              />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {/* Available Effects */}
                <div className="space-y-3">
                  <Label>Add Effect</Label>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="grid grid-cols-2 gap-2">
                      {EFFECTS.map((effect) => {
                        const Icon = effect.icon;
                        const isApplied = selectedScene?.effects?.some(e => e.type === effect.value);
                        
                        return (
                          <Button
                            key={effect.value}
                            variant={isApplied ? "secondary" : "outline"}
                            className="h-auto flex-col gap-2 p-4"
                            onClick={() => handleAddEffect(effect.value)}
                            disabled={isApplied}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-xs text-center">{effect.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
