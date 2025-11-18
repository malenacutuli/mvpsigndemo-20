import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { usePremiumEditor } from '@/store/premiumEditorStore';
import { 
  Square, 
  Circle, 
  Triangle, 
  Type, 
  Sparkles,
  Minus,
  MoveRight,
  Image as ImageIcon,
  Layers
} from 'lucide-react';

interface ElementsPanelProps {
  videoId: string;
}

export function ElementsPanel({ videoId }: ElementsPanelProps) {
  const {
    elements,
    selectedElementId,
    addElement,
    updateElement,
    deleteElement
  } = usePremiumEditor();

  const [fillColor, setFillColor] = useState('#ffffff');
  const [strokeColor, setStrokeColor] = useState('#000000');

  const selectedElement = elements.find(e => e.id === selectedElementId);

  const createElement = (type: string, defaultProps = {}) => {
    const baseElement = {
      id: crypto.randomUUID(),
      type: 'shape' as const,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      zIndex: elements.length,
      data: {},
      ...defaultProps
    };

    const elementConfig: Record<string, any> = {
      'rectangle': {
        data: {
          type: 'rectangle',
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: 2,
          cornerRadius: 0
        }
      },
      'circle': {
        width: 100,
        height: 100,
        data: {
          type: 'circle',
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: 2
        }
      },
      'triangle': {
        data: {
          type: 'triangle',
          fill: fillColor,
          stroke: strokeColor,
          strokeWidth: 2
        }
      },
      'line': {
        width: 200,
        height: 2,
        data: {
          type: 'line',
          stroke: strokeColor,
          strokeWidth: 2
        }
      },
      'arrow': {
        width: 200,
        height: 2,
        data: {
          type: 'arrow',
          stroke: strokeColor,
          strokeWidth: 2,
          arrowHead: true
        }
      },
      'text-title': {
        type: 'text' as const,
        width: 400,
        height: 80,
        data: {
          type: 'text-title',
          text: 'Title Text',
          fontSize: 48,
          fontFamily: 'Arial',
          fontWeight: 'bold',
          fill: '#000000',
          textAlign: 'center'
        }
      },
      'text-subtitle': {
        type: 'text' as const,
        width: 400,
        height: 60,
        data: {
          type: 'text-subtitle',
          text: 'Subtitle Text',
          fontSize: 32,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fill: '#000000',
          textAlign: 'center'
        }
      },
      'text-body': {
        type: 'text' as const,
        width: 400,
        height: 100,
        data: {
          type: 'text-body',
          text: 'Body text goes here',
          fontSize: 16,
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fill: '#000000',
          textAlign: 'left'
        }
      },
      'text-quote': {
        type: 'text' as const,
        width: 400,
        height: 100,
        data: {
          type: 'text-quote',
          text: '"Quote text"',
          fontSize: 24,
          fontFamily: 'Georgia',
          fontWeight: 'italic',
          fill: '#333333',
          textAlign: 'center'
        }
      },
      'overlay-blur': {
        width: 400,
        height: 300,
        data: {
          type: 'overlay-blur',
          blurAmount: 10,
          opacity: 0.5
        }
      },
      'overlay-gradient': {
        width: 400,
        height: 300,
        data: {
          type: 'overlay-gradient',
          gradientType: 'linear',
          colors: ['#000000', 'transparent'],
          angle: 180
        }
      },
      'overlay-vignette': {
        width: 400,
        height: 300,
        data: {
          type: 'overlay-vignette',
          intensity: 0.5,
          color: '#000000'
        }
      }
    };

    const config = elementConfig[type] || {};
    const newElement = { ...baseElement, ...config };

    addElement(newElement);
  };

  const createPreset = (presetType: string) => {
    const presets: Record<string, any> = {
      'lower-third': {
        elements: [
          {
            type: 'rectangle',
            x: 50,
            y: 450,
            width: 600,
            height: 80,
            data: { fill: 'hsl(var(--primary))', opacity: 0.9 }
          },
          {
            type: 'text-title',
            x: 70,
            y: 460,
            width: 560,
            height: 30,
            data: { text: 'Name', fontSize: 24, fill: '#ffffff' }
          },
          {
            type: 'text-subtitle',
            x: 70,
            y: 490,
            width: 560,
            height: 20,
            data: { text: 'Title', fontSize: 16, fill: '#ffffff' }
          }
        ]
      },
      'title-card': {
        elements: [
          {
            type: 'overlay-gradient',
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            data: { colors: ['#000000', 'transparent'], opacity: 0.7 }
          },
          {
            type: 'text-title',
            x: 760,
            y: 400,
            width: 400,
            height: 100,
            data: { text: 'Video Title', fontSize: 64, fill: '#ffffff' }
          }
        ]
      },
      'end-screen': {
        elements: [
          {
            type: 'rectangle',
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
            data: { fill: '#000000', opacity: 0.8 }
          },
          {
            type: 'text-title',
            x: 760,
            y: 400,
            width: 400,
            height: 80,
            data: { text: 'Thanks for Watching!', fontSize: 48, fill: '#ffffff' }
          },
          {
            type: 'text-subtitle',
            x: 760,
            y: 500,
            width: 400,
            height: 40,
            data: { text: 'Subscribe for more', fontSize: 24, fill: '#ffffff' }
          }
        ]
      }
    };

    const preset = presets[presetType];
    if (preset && preset.elements) {
      preset.elements.forEach((element: any) => {
        createElement(element.type, element);
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="shapes" className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="shapes">Shapes</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="overlays">Overlays</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Shapes Tab */}
          <TabsContent value="shapes" className="space-y-2 p-4 mt-0">
            <div className="space-y-2 mb-4">
              <Label>Fill Color</Label>
              <Input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="h-10"
              />
              <Label>Stroke Color</Label>
              <Input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="h-10"
              />
            </div>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('rectangle')}
            >
              <Square className="w-4 h-4 mr-2" />
              Rectangle
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('circle')}
            >
              <Circle className="w-4 h-4 mr-2" />
              Circle
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('triangle')}
            >
              <Triangle className="w-4 h-4 mr-2" />
              Triangle
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('line')}
            >
              <Minus className="w-4 h-4 mr-2" />
              Line
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('arrow')}
            >
              <MoveRight className="w-4 h-4 mr-2" />
              Arrow
            </Button>
          </TabsContent>

          {/* Text Tab */}
          <TabsContent value="text" className="space-y-2 p-4 mt-0">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('text-title')}
            >
              <Type className="w-4 h-4 mr-2" />
              Title
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('text-subtitle')}
            >
              <Type className="w-4 h-4 mr-2" />
              Subtitle
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('text-body')}
            >
              <Type className="w-4 h-4 mr-2" />
              Body Text
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('text-quote')}
            >
              <Type className="w-4 h-4 mr-2" />
              Quote
            </Button>
          </TabsContent>

          {/* Overlays Tab */}
          <TabsContent value="overlays" className="space-y-2 p-4 mt-0">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('overlay-blur')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Blur
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('overlay-gradient')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gradient
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createElement('overlay-vignette')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Vignette
            </Button>
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="space-y-2 p-4 mt-0">
            <Card className="p-3 cursor-pointer hover:bg-accent" onClick={() => createPreset('lower-third')}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <div>
                  <div className="font-medium">Lower Third</div>
                  <div className="text-xs text-muted-foreground">Name and title overlay</div>
                </div>
              </div>
            </Card>

            <Card className="p-3 cursor-pointer hover:bg-accent" onClick={() => createPreset('title-card')}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <div>
                  <div className="font-medium">Title Card</div>
                  <div className="text-xs text-muted-foreground">Video title intro</div>
                </div>
              </div>
            </Card>

            <Card className="p-3 cursor-pointer hover:bg-accent" onClick={() => createPreset('end-screen')}>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <div>
                  <div className="font-medium">End Screen</div>
                  <div className="text-xs text-muted-foreground">Thank you message</div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Properties Panel */}
      {selectedElement && (
        <div className="border-t bg-muted/30">
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Element Properties</h3>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteElement(selectedElement.id)}
                >
                  Delete
                </Button>
              </div>
              
              {/* Position */}
              <div className="space-y-2">
                <Label>Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X</Label>
                    <Input
                      type="number"
                      value={selectedElement.x}
                      onChange={(e) => updateElement(selectedElement.id, {
                        x: Number(e.target.value)
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Y</Label>
                    <Input
                      type="number"
                      value={selectedElement.y}
                      onChange={(e) => updateElement(selectedElement.id, {
                        y: Number(e.target.value)
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label>Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={selectedElement.width}
                      onChange={(e) => updateElement(selectedElement.id, {
                        width: Number(e.target.value)
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      value={selectedElement.height}
                      onChange={(e) => updateElement(selectedElement.id, {
                        height: Number(e.target.value)
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Fill Color (for shapes) */}
              {selectedElement.data?.fill !== undefined && (
                <div className="space-y-2">
                  <Label>Fill Color</Label>
                  <Input
                    type="color"
                    value={selectedElement.data.fill}
                    onChange={(e) => updateElement(selectedElement.id, {
                      data: { ...selectedElement.data, fill: e.target.value }
                    })}
                    className="h-10"
                  />
                </div>
              )}

              {/* Stroke */}
              {selectedElement.data?.stroke !== undefined && (
                <>
                  <div className="space-y-2">
                    <Label>Stroke Color</Label>
                    <Input
                      type="color"
                      value={selectedElement.data.stroke}
                      onChange={(e) => updateElement(selectedElement.id, {
                        data: { ...selectedElement.data, stroke: e.target.value }
                      })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stroke Width: {selectedElement.data.strokeWidth || 0}px</Label>
                    <Slider
                      value={[selectedElement.data.strokeWidth || 0]}
                      onValueChange={([value]) => updateElement(selectedElement.id, {
                        data: { ...selectedElement.data, strokeWidth: value }
                      })}
                      min={0}
                      max={20}
                      step={1}
                    />
                  </div>
                </>
              )}

              {/* Text Properties */}
              {selectedElement.data?.text !== undefined && (
                <>
                  <div className="space-y-2">
                    <Label>Text</Label>
                    <Input
                      value={selectedElement.data.text}
                      onChange={(e) => updateElement(selectedElement.id, {
                        data: { ...selectedElement.data, text: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Font Size: {selectedElement.data.fontSize || 16}px</Label>
                    <Slider
                      value={[selectedElement.data.fontSize || 16]}
                      onValueChange={([value]) => updateElement(selectedElement.id, {
                        data: { ...selectedElement.data, fontSize: value }
                      })}
                      min={8}
                      max={128}
                      step={1}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
