import React, { useEffect, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Keyboard, Focus, Navigation, ShieldCheck } from 'lucide-react';

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
  category: 'playback' | 'accessibility' | 'navigation';
}

interface KeyboardAccessibilityManagerProps {
  onPlayPause?: () => void;
  onSeek?: (seconds: number) => void;
  onVolumeChange?: (delta: number) => void;
  onToggleCaptions?: () => void;
  onToggleASL?: () => void;
  onToggleAD?: () => void;
  onFullscreen?: () => void;
  className?: string;
}

export const KeyboardAccessibilityManager: React.FC<KeyboardAccessibilityManagerProps> = ({
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleCaptions,
  onToggleASL,
  onToggleAD,
  onFullscreen,
  className = ""
}) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [showFocusIndicators, setShowFocusIndicators] = useState(true);
  const [skipLinksEnabled, setSkipLinksEnabled] = useState(true);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [lastFocusedElement, setLastFocusedElement] = useState<string>('');

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Space',
      description: 'Play/Pause video',
      action: onPlayPause || (() => {}),
      category: 'playback'
    },
    {
      key: '→',
      description: 'Seek forward 10 seconds',
      action: () => onSeek?.(10),
      category: 'playback'
    },
    {
      key: '←',
      description: 'Seek backward 10 seconds',
      action: () => onSeek?.(-10),
      category: 'playback'
    },
    {
      key: '↑',
      description: 'Increase volume',
      action: () => onVolumeChange?.(0.1),
      category: 'playback'
    },
    {
      key: '↓',
      description: 'Decrease volume',
      action: () => onVolumeChange?.(-0.1),
      category: 'playback'
    },
    {
      key: 'C',
      description: 'Toggle captions',
      action: onToggleCaptions || (() => {}),
      category: 'accessibility'
    },
    {
      key: 'S',
      description: 'Toggle ASL avatar',
      action: onToggleASL || (() => {}),
      category: 'accessibility'
    },
    {
      key: 'A',
      description: 'Toggle audio description',
      action: onToggleAD || (() => {}),
      category: 'accessibility'
    },
    {
      key: 'F',
      description: 'Toggle fullscreen',
      action: onFullscreen || (() => {}),
      category: 'navigation'
    },
    {
      key: 'Escape',
      description: 'Exit fullscreen/modal',
      action: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      },
      category: 'navigation'
    }
  ];

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!isEnabled) return;
    
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const shortcut = shortcuts.find(s => {
      const key = event.key;
      return (
        key === s.key ||
        (s.key === 'Space' && key === ' ') ||
        (s.key === '→' && key === 'ArrowRight') ||
        (s.key === '←' && key === 'ArrowLeft') ||
        (s.key === '↑' && key === 'ArrowUp') ||
        (s.key === '↓' && key === 'ArrowDown')
      );
    });

    if (shortcut) {
      event.preventDefault();
      shortcut.action();
      setLastFocusedElement(shortcut.description);
    }
  }, [isEnabled, shortcuts]);

  const handleFocusManagement = useCallback(() => {
    if (!showFocusIndicators) return;

    // Enhanced focus indicators
    const style = document.createElement('style');
    style.textContent = `
      :focus {
        outline: 3px solid #3b82f6 !important;
        outline-offset: 2px !important;
        border-radius: 4px !important;
      }
      
      button:focus,
      [role="button"]:focus,
      input:focus,
      select:focus,
      textarea:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [showFocusIndicators]);

  const handleSkipLinks = useCallback(() => {
    if (!skipLinksEnabled) return;

    // Add skip links for screen reader users
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded';
    
    if (document.body.firstChild) {
      document.body.insertBefore(skipLink, document.body.firstChild);
    }

    return () => {
      if (skipLink.parentNode) {
        skipLink.parentNode.removeChild(skipLink);
      }
    };
  }, [skipLinksEnabled]);

  const handleHighContrast = useCallback(() => {
    if (highContrastMode) {
      document.documentElement.classList.add('high-contrast');
      const style = document.createElement('style');
      style.textContent = `
        .high-contrast {
          filter: contrast(150%) brightness(1.2);
        }
        
        .high-contrast button,
        .high-contrast [role="button"],
        .high-contrast input,
        .high-contrast select {
          border: 2px solid #000 !important;
          background: #fff !important;
          color: #000 !important;
        }
        
        .high-contrast button:hover,
        .high-contrast [role="button"]:hover {
          background: #000 !important;
          color: #fff !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.documentElement.classList.remove('high-contrast');
        document.head.removeChild(style);
      };
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrastMode]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useEffect(() => {
    return handleFocusManagement();
  }, [handleFocusManagement]);

  useEffect(() => {
    return handleSkipLinks();
  }, [handleSkipLinks]);

  useEffect(() => {
    return handleHighContrast();
  }, [handleHighContrast]);

  // Announce keyboard shortcuts to screen readers
  useEffect(() => {
    if (lastFocusedElement) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = `Activated: ${lastFocusedElement}`;
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
        setLastFocusedElement('');
      }, 1000);
    }
  }, [lastFocusedElement]);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="w-5 h-5" />
          Keyboard Accessibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="keyboard-enabled" className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Enable keyboard shortcuts
            </Label>
            <Switch
              id="keyboard-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="focus-indicators" className="flex items-center gap-2">
              <Focus className="w-4 h-4" />
              Enhanced focus indicators
            </Label>
            <Switch
              id="focus-indicators"
              checked={showFocusIndicators}
              onCheckedChange={setShowFocusIndicators}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="skip-links" className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Skip navigation links
            </Label>
            <Switch
              id="skip-links"
              checked={skipLinksEnabled}
              onCheckedChange={setSkipLinksEnabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="high-contrast">High contrast mode</Label>
            <Switch
              id="high-contrast"
              checked={highContrastMode}
              onCheckedChange={setHighContrastMode}
            />
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        {isEnabled && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Available Shortcuts</h4>
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category} className="space-y-2">
                <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide border-b pb-1">
                  {category}
                </h5>
                <div className="space-y-1">
                  {categoryShortcuts.map(shortcut => (
                    <div key={shortcut.key} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{shortcut.description}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {shortcut.key}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>WCAG 2.1.1:</strong> All functionality available via keyboard</p>
          <p><strong>WCAG 2.4.7:</strong> Visible focus indicators on interactive elements</p>
          <p><strong>Screen Reader:</strong> Compatible with NVDA, JAWS, and VoiceOver</p>
        </div>
      </CardContent>
    </Card>
  );
};