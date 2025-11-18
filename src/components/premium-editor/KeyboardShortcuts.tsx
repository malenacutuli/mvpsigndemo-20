import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onTogglePlay: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function KeyboardShortcuts({
  onTogglePlay,
  onUndo,
  onRedo,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space - Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      }

      // Cmd/Ctrl + Z - Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      }

      // Cmd/Ctrl + Shift + Z - Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo();
      }

      // Cmd/Ctrl + Y - Redo (alternative)
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, onUndo, onRedo]);

  return null;
}
