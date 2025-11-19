import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Image as ImageIcon, Video, Palette, Droplet } from 'lucide-react';

interface BackgroundEditorProps {
  backgroundType: string;
  backgroundConfig: Record<string, any>;
  onBackgroundChange: (type: string, config: Record<string, any>) => void;
}

export function BackgroundEditor({
  backgroundType,
  backgroundConfig,
  onBackgroundChange
}: BackgroundEditorProps) {
  const [selectedType, setSelectedType] = useState(backgroundType);
  const [config, setConfig] = useState(backgroundConfig);

  const backgroundTypes = [
    { value: 'solid', label: 'Solid Color', icon: Palette },
    { value: 'gradient', label: 'Gradient', icon: Droplet },
    { value: 'image', label: 'Image', icon: ImageIcon },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'blur', label: 'Blur', icon: Droplet }
  ];

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    
    // Set default config for each type
    let defaultConfig = {};
    switch (type) {
      case 'solid':
        defaultConfig = { color: '#000000' };
        break;
      case 'gradient':
        defaultConfig = {
          type: 'linear',
          angle: 135,
          stops: [
            { color: '#667eea', position: 0 },
            { color: '#764ba2', position: 100 }
          ]
        };
        break;
      case 'image':
        defaultConfig = { url: '', fit: 'cover', opacity: 1 };
        break;
      case 'video':
        defaultConfig = { url: '', fit: 'cover', opacity: 1 };
        break;
      case 'blur':
        defaultConfig = { amount: 10 };
        break;
    }
    
    setConfig(defaultConfig);
    onBackgroundChange(type, defaultConfig);
  };

  const handleConfigChange = (updates: Record<string, any>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onBackgroundChange(selectedType, newConfig);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Background Type</Label>
        <div className="grid grid-cols-2 gap-2">
          {backgroundTypes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleTypeChange(value)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all',
                selectedType === value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <Icon className={cn('w-5 h-5', selectedType === value ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-xs font-medium', selectedType === value ? 'text-primary' : 'text-foreground')}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific editors */}
      <div className="pt-4 border-t">
        {selectedType === 'solid' && (
          <SolidColorEditor
            color={config.color || '#000000'}
            onChange={(color) => handleConfigChange({ color })}
          />
        )}

        {selectedType === 'gradient' && (
          <GradientEditor
            gradient={config}
            onChange={(gradient) => handleConfigChange(gradient)}
          />
        )}

        {selectedType === 'image' && (
          <MediaBackgroundEditor
            config={config}
            onChange={(updates) => handleConfigChange(updates)}
            type="image"
          />
        )}

        {selectedType === 'video' && (
          <MediaBackgroundEditor
            config={config}
            onChange={(updates) => handleConfigChange(updates)}
            type="video"
          />
        )}

        {selectedType === 'blur' && (
          <BlurEditor
            amount={config.amount || 10}
            onChange={(amount) => handleConfigChange({ amount })}
          />
        )}
      </div>
    </div>
  );
}

// Solid Color Editor
function SolidColorEditor({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  const PRESET_COLORS = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#808080', '#800080', '#008080', '#808000', '#C0C0C0', '#FFA500', '#A52A2A'
  ];

  return (
    <div className="space-y-2">
      <Label>Color</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded cursor-pointer border border-border"
        />
        <Input
          type="text"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
        />
      </div>
      
      {/* Preset colors */}
      <div className="grid grid-cols-8 gap-2 mt-4">
        {PRESET_COLORS.map((presetColor) => (
          <button
            key={presetColor}
            onClick={() => onChange(presetColor)}
            className="w-8 h-8 rounded border-2 border-border hover:border-primary transition-colors"
            style={{ backgroundColor: presetColor }}
            title={presetColor}
          />
        ))}
      </div>
    </div>
  );
}

// Gradient Editor
function GradientEditor({ gradient, onChange }: { gradient: any; onChange: (gradient: any) => void }) {
  const [stops, setStops] = useState(gradient.stops || [
    { color: '#667eea', position: 0 },
    { color: '#764ba2', position: 100 }
  ]);

  const handleStopChange = (index: number, updates: any) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], ...updates };
    setStops(newStops);
    onChange({ ...gradient, stops: newStops });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Gradient Type</Label>
        <select
          value={gradient.type || 'linear'}
          onChange={(e) => onChange({ ...gradient, type: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground"
        >
          <option value="linear">Linear</option>
          <option value="radial">Radial</option>
        </select>
      </div>

      {gradient.type === 'linear' && (
        <div className="space-y-2">
          <Label>Angle: {gradient.angle || 135}°</Label>
          <input
            type="range"
            min={0}
            max={360}
            value={gradient.angle || 135}
            onChange={(e) => onChange({ ...gradient, angle: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>
      )}

      <div className="space-y-3">
        <Label>Color Stops</Label>
        {stops.map((stop, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="color"
              value={stop.color}
              onChange={(e) => handleStopChange(index, { color: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={stop.position}
              onChange={(e) => handleStopChange(index, { position: parseInt(e.target.value) })}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-12">{stop.position}%</span>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div
        className="w-full h-24 rounded border border-border"
        style={{
          background: gradient.type === 'linear'
            ? `linear-gradient(${gradient.angle || 135}deg, ${stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
            : `radial-gradient(circle, ${stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
        }}
      />
    </div>
  );
}

// Media Background Editor (Image/Video)
function MediaBackgroundEditor({ config, onChange, type }: { config: any; onChange: (updates: any) => void; type: 'image' | 'video' }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{type === 'image' ? 'Image' : 'Video'} URL</Label>
        <Input
          type="text"
          value={config.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://..."
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>Fit</Label>
        <select
          value={config.fit || 'cover'}
          onChange={(e) => onChange({ fit: e.target.value })}
          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Opacity: {Math.round((config.opacity || 1) * 100)}%</Label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={config.opacity || 1}
          onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      {config.url && type === 'image' && (
        <div className="border border-border rounded overflow-hidden">
          <img src={config.url} alt="Background preview" className="w-full h-32 object-cover" />
        </div>
      )}
    </div>
  );
}

// Blur Editor
function BlurEditor({ amount, onChange }: { amount: number; onChange: (amount: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>Blur Amount: {amount}px</Label>
      <input
        type="range"
        min={0}
        max={50}
        value={amount}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
