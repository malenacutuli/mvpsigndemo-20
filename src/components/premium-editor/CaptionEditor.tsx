import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Type, Sparkles, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: CaptionStyle;
  animation: CaptionAnimation;
  position: CaptionPosition;
}

interface CaptionStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  backgroundColor: string;
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  letterSpacing: number;
  lineHeight: number;
  padding: number;
  borderRadius: number;
  shadow: boolean;
  outline: boolean;
  outlineColor: string;
}

type CaptionAnimation = 
  | 'none' 
  | 'fade-in' 
  | 'slide-up' 
  | 'slide-down' 
  | 'zoom-in' 
  | 'bounce' 
  | 'typewriter'
  | 'word-by-word';

type CaptionPosition = 
  | 'top' 
  | 'center' 
  | 'bottom' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right';

interface CaptionEditorProps {
  captions: Caption[];
  onCaptionsChange: (captions: Caption[]) => void;
  currentTime: number;
  videoDuration: number;
}

const PRESET_STYLES = [
  {
    name: 'Bold Title',
    style: {
      fontSize: 48,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'transparent',
      textAlign: 'center' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 2,
      lineHeight: 1.2,
      padding: 20,
      borderRadius: 0,
      shadow: true,
      outline: true,
      outlineColor: '#000000',
    }
  },
  {
    name: 'Subtitle',
    style: {
      fontSize: 32,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      textAlign: 'center' as const,
      textTransform: 'none' as const,
      letterSpacing: 0,
      lineHeight: 1.5,
      padding: 16,
      borderRadius: 8,
      shadow: false,
      outline: false,
      outlineColor: '#000000',
    }
  },
  {
    name: 'Call to Action',
    style: {
      fontSize: 36,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(59,130,246,0.9)',
      textAlign: 'center' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 1,
      lineHeight: 1.3,
      padding: 24,
      borderRadius: 12,
      shadow: true,
      outline: false,
      outlineColor: '#000000',
    }
  },
  {
    name: 'Minimal',
    style: {
      fontSize: 28,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      color: '#ffffff',
      backgroundColor: 'transparent',
      textAlign: 'left' as const,
      textTransform: 'none' as const,
      letterSpacing: 0,
      lineHeight: 1.4,
      padding: 8,
      borderRadius: 0,
      shadow: true,
      outline: false,
      outlineColor: '#000000',
    }
  },
];

export const CaptionEditor: React.FC<CaptionEditorProps> = ({
  captions,
  onCaptionsChange,
  currentTime,
  videoDuration,
}) => {
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [isAddingCaption, setIsAddingCaption] = useState(false);
  const [newCaptionText, setNewCaptionText] = useState('');

  const selectedCaption = captions.find(c => c.id === selectedCaptionId);

  const handleAddCaption = () => {
    if (!newCaptionText.trim()) return;

    const newCaption: Caption = {
      id: `caption-${Date.now()}`,
      text: newCaptionText,
      startTime: Math.floor(currentTime),
      endTime: Math.min(Math.floor(currentTime) + 3, videoDuration),
      style: PRESET_STYLES[0].style,
      animation: 'fade-in',
      position: 'bottom',
    };

    onCaptionsChange([...captions, newCaption]);
    setNewCaptionText('');
    setSelectedCaptionId(newCaption.id);
    setIsAddingCaption(false);
  };

  const handleUpdateCaption = (captionId: string, updates: Partial<Caption>) => {
    const updatedCaptions = captions.map(c => 
      c.id === captionId ? { ...c, ...updates } : c
    );
    onCaptionsChange(updatedCaptions);
  };

  const handleDeleteCaption = (captionId: string) => {
    onCaptionsChange(captions.filter(c => c.id !== captionId));
    if (selectedCaptionId === captionId) {
      setSelectedCaptionId(null);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_STYLES[0]) => {
    if (!selectedCaptionId) return;
    handleUpdateCaption(selectedCaptionId, { style: preset.style });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Captions & Text
            </CardTitle>
            <CardDescription>
              Add animated text overlays to your video
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddingCaption(!isAddingCaption)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Caption
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Caption Form */}
        {isAddingCaption && (
          <Card className="p-4 bg-muted/30">
            <div className="space-y-3">
              <Label>Caption Text</Label>
              <Textarea
                value={newCaptionText}
                onChange={(e) => setNewCaptionText(e.target.value)}
                placeholder="Enter your caption text..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddCaption} className="flex-1">
                  Add Caption
                </Button>
                <Button onClick={() => setIsAddingCaption(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Captions List */}
          <div className="space-y-2">
            <Label>Captions ({captions.length})</Label>
            <ScrollArea className="h-[400px] rounded-lg border p-2">
              {captions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No captions yet
                </div>
              ) : (
                <div className="space-y-2">
                  {captions.map((caption) => (
                    <div
                      key={caption.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedCaptionId === caption.id
                          ? "bg-primary/10 border-primary"
                          : "bg-card hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedCaptionId(caption.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{caption.text}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatTime(caption.startTime)} - {formatTime(caption.endTime)}
                          </div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {caption.position}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {caption.animation}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCaption(caption.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Caption Editor */}
          <div className="space-y-2">
            <Label>Edit Caption</Label>
            {!selectedCaption ? (
              <div className="h-[400px] rounded-lg border flex items-center justify-center text-muted-foreground text-sm">
                Select a caption to edit
              </div>
            ) : (
              <ScrollArea className="h-[400px] rounded-lg border p-4">
                <Tabs defaultValue="content" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="style">Style</TabsTrigger>
                    <TabsTrigger value="animation">Animation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Text</Label>
                      <Textarea
                        value={selectedCaption.text}
                        onChange={(e) => handleUpdateCaption(selectedCaption.id, { text: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Start Time (s)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={videoDuration}
                          step={0.1}
                          value={selectedCaption.startTime}
                          onChange={(e) => handleUpdateCaption(selectedCaption.id, { 
                            startTime: parseFloat(e.target.value) || 0 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time (s)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={videoDuration}
                          step={0.1}
                          value={selectedCaption.endTime}
                          onChange={(e) => handleUpdateCaption(selectedCaption.id, { 
                            endTime: parseFloat(e.target.value) || 0 
                          })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select
                        value={selectedCaption.position}
                        onValueChange={(value: CaptionPosition) => 
                          handleUpdateCaption(selectedCaption.id, { position: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="style" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Presets</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {PRESET_STYLES.map((preset) => (
                          <Button
                            key={preset.name}
                            variant="outline"
                            size="sm"
                            onClick={() => handleApplyPreset(preset)}
                            className="justify-start"
                          >
                            <Sparkles className="w-3 h-3 mr-2" />
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Font Size: {selectedCaption.style.fontSize}px</Label>
                      <Slider
                        value={[selectedCaption.style.fontSize]}
                        min={12}
                        max={120}
                        step={1}
                        onValueChange={([value]) => 
                          handleUpdateCaption(selectedCaption.id, { 
                            style: { ...selectedCaption.style, fontSize: value }
                          })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <Input
                          type="color"
                          value={selectedCaption.style.color}
                          onChange={(e) => handleUpdateCaption(selectedCaption.id, { 
                            style: { ...selectedCaption.style, color: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Background</Label>
                        <Input
                          type="color"
                          value={selectedCaption.style.backgroundColor}
                          onChange={(e) => handleUpdateCaption(selectedCaption.id, { 
                            style: { ...selectedCaption.style, backgroundColor: e.target.value }
                          })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Text Align</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={selectedCaption.style.textAlign === 'left' ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => handleUpdateCaption(selectedCaption.id, { 
                            style: { ...selectedCaption.style, textAlign: 'left' }
                          })}
                        >
                          <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={selectedCaption.style.textAlign === 'center' ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => handleUpdateCaption(selectedCaption.id, { 
                            style: { ...selectedCaption.style, textAlign: 'center' }
                          })}
                        >
                          <AlignCenter className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={selectedCaption.style.textAlign === 'right' ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => handleUpdateCaption(selectedCaption.id, { 
                            style: { ...selectedCaption.style, textAlign: 'right' }
                          })}
                        >
                          <AlignRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="animation" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Animation Type</Label>
                      <Select
                        value={selectedCaption.animation}
                        onValueChange={(value: CaptionAnimation) => 
                          handleUpdateCaption(selectedCaption.id, { animation: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="fade-in">Fade In</SelectItem>
                          <SelectItem value="slide-up">Slide Up</SelectItem>
                          <SelectItem value="slide-down">Slide Down</SelectItem>
                          <SelectItem value="zoom-in">Zoom In</SelectItem>
                          <SelectItem value="bounce">Bounce</SelectItem>
                          <SelectItem value="typewriter">Typewriter</SelectItem>
                          <SelectItem value="word-by-word">Word by Word</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>
              </ScrollArea>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
