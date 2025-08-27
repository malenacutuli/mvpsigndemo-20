import React from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Keyboard } from 'lucide-react';

interface KeyboardAccessibilityManagerProps {
  onKeyboardModeChange?: (enabled: boolean) => void;
  onToggleCaptions?: () => void;
  onToggleASL?: () => void;
  onToggleAD?: () => void;
}

export const KeyboardAccessibilityManager: React.FC<KeyboardAccessibilityManagerProps> = ({
  onKeyboardModeChange,
  onToggleCaptions,
  onToggleASL,
  onToggleAD
}) => {
  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Keyboard className="w-5 h-5" />
        Keyboard Accessibility
      </h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="keyboard-mode"
            defaultChecked
            onCheckedChange={onKeyboardModeChange}
          />
          <Label htmlFor="keyboard-mode">Enable keyboard navigation</Label>
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch id="captions-toggle" onCheckedChange={() => onToggleCaptions?.()} />
            <Label htmlFor="captions-toggle">Toggle Captions (C)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="asl-toggle" onCheckedChange={() => onToggleASL?.()} />
            <Label htmlFor="asl-toggle">Toggle ASL (S)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="ad-toggle" onCheckedChange={() => onToggleAD?.()} />
            <Label htmlFor="ad-toggle">Toggle Audio Description (A)</Label>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          All video controls are accessible via keyboard shortcuts.
        </div>
      </div>
    </Card>
  );
};