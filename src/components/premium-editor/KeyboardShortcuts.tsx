import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  // Playback control
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlayback: () => void;
  onSeek: (time: number) => void;
  
  // Editing
  selectedElementId?: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteElement: (elementId: string) => void;
  
  // Project actions
  onSave?: () => void;
  onExport?: () => void;
  
  // Mark in/out
  onMarkIn?: (time: number) => void;
  onMarkOut?: (time: number) => void;
}

export function KeyboardShortcuts({
  isPlaying,
  currentTime,
  duration,
  onTogglePlayback,
  onSeek,
  selectedElementId,
  onUndo,
  onRedo,
  onDeleteElement,
  onSave,
  onExport,
  onMarkIn,
  onMarkOut
}: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const isTyping = 
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTyping && !e.metaKey && !e.ctrlKey) {
        return;
      }

      // Cmd/Ctrl + Key combinations
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              onRedo();
              toast.success('Redo', { duration: 1000 });
            } else {
              onUndo();
              toast.success('Undo', { duration: 1000 });
            }
            break;

          case 's':
            e.preventDefault();
            if (onSave) {
              onSave();
              toast.success('Project saved', { duration: 2000 });
            }
            break;

          case 'e':
            e.preventDefault();
            if (onExport) {
              onExport();
            }
            break;

          case '/':
            e.preventDefault();
            setShowHelp(true);
            break;
        }
        return;
      }

      // Prevent default for all editor shortcuts
      const editorKeys = [' ', 'Tab', 'j', 'k', 'l', 'i', 'o', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace'];
      if (editorKeys.includes(e.key)) {
        e.preventDefault();
      }

      // Playback shortcuts
      switch (e.key) {
        case ' ':
          onTogglePlayback();
          break;

        case 'Tab':
          // Play from cursor position (restart if playing)
          if (isPlaying) {
            onTogglePlayback(); // Pause first
            setTimeout(() => onTogglePlayback(), 50); // Then play again
          } else {
            onTogglePlayback();
          }
          break;

        case 'j':
          onSeek(Math.max(0, currentTime - 1));
          toast.info('⏪ -1s', { duration: 500 });
          break;

        case 'k':
          if (isPlaying) {
            onTogglePlayback();
            toast.info('⏸ Paused', { duration: 500 });
          }
          break;

        case 'l':
          onSeek(Math.min(duration, currentTime + 1));
          toast.info('⏩ +1s', { duration: 500 });
          break;

        case 'ArrowLeft':
          if (e.shiftKey) {
            // Jump 5 seconds backward
            onSeek(Math.max(0, currentTime - 5));
            toast.info('⏪ -5s', { duration: 500 });
          } else {
            // Frame backward (0.1s)
            onSeek(Math.max(0, currentTime - 0.1));
          }
          break;

        case 'ArrowRight':
          if (e.shiftKey) {
            // Jump 5 seconds forward
            onSeek(Math.min(duration, currentTime + 5));
            toast.info('⏩ +5s', { duration: 500 });
          } else {
            // Frame forward (0.1s)
            onSeek(Math.min(duration, currentTime + 0.1));
          }
          break;

        case 'i':
          if (onMarkIn) {
            onMarkIn(currentTime);
            toast.success(`📍 In point: ${formatTime(currentTime)}`, { duration: 2000 });
          }
          break;

        case 'o':
          if (onMarkOut) {
            onMarkOut(currentTime);
            toast.success(`📍 Out point: ${formatTime(currentTime)}`, { duration: 2000 });
          }
          break;

        case 'Delete':
        case 'Backspace':
          if (selectedElementId) {
            onDeleteElement(selectedElementId);
            toast.success('🗑️ Element deleted', { duration: 2000 });
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    currentTime,
    duration,
    selectedElementId,
    onTogglePlayback,
    onSeek,
    onUndo,
    onRedo,
    onDeleteElement,
    onSave,
    onExport,
    onMarkIn,
    onMarkOut
  ]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shortcuts = [
    {
      category: 'Playback',
      items: [
        { keys: ['Space'], description: 'Play / Pause' },
        { keys: ['Tab'], description: 'Play from cursor' },
        { keys: ['J'], description: 'Rewind 1 second' },
        { keys: ['K'], description: 'Pause' },
        { keys: ['L'], description: 'Forward 1 second' },
        { keys: ['←'], description: 'Previous frame' },
        { keys: ['→'], description: 'Next frame' },
        { keys: ['Shift', '←'], description: 'Jump back 5s' },
        { keys: ['Shift', '→'], description: 'Jump forward 5s' },
      ]
    },
    {
      category: 'Editing',
      items: [
        { keys: ['Cmd', 'Z'], description: 'Undo' },
        { keys: ['Cmd', 'Shift', 'Z'], description: 'Redo' },
        { keys: ['I'], description: 'Mark in point' },
        { keys: ['O'], description: 'Mark out point' },
        { keys: ['Delete'], description: 'Delete selected element' },
      ]
    },
    {
      category: 'Project',
      items: [
        { keys: ['Cmd', 'S'], description: 'Save project' },
        { keys: ['Cmd', 'E'], description: 'Export video' },
        { keys: ['Cmd', '/'], description: 'Show shortcuts' },
      ]
    }
  ];

  return (
    <>
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-light">
              <Keyboard className="w-5 h-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="font-light mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-light">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <Badge variant="outline" className="font-mono font-light text-xs px-2 py-0.5">
                              {key}
                            </Badge>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-xs text-muted-foreground font-light">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground font-light">
              💡 <strong className="font-medium">Tip:</strong> Shortcuts are disabled when typing in input fields. Press <Badge variant="outline" className="font-mono font-light text-xs mx-1">Cmd</Badge> + <Badge variant="outline" className="font-mono font-light text-xs mx-1">/</Badge> anytime to view this help.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
