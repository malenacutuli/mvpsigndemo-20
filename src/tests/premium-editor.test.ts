import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePremiumEditor } from '@/store/premiumEditorStore';

describe('Premium Editor Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => usePremiumEditor());
    act(() => {
      // Reset store
      result.current.setScenes([]);
      result.current.setCurrentTime(0);
      result.current.selectScene(null);
    });
  });

  it('should add a scene', () => {
    const { result } = renderHook(() => usePremiumEditor());
    
    const newScene = {
      id: 'test-scene-1',
      startTime: 0,
      endTime: 10,
      text: 'Test Scene',
      speaker: 'Speaker 1',
      speakerColor: '#FF0000',
      order: 0
    };

    act(() => {
      result.current.addScene(newScene);
    });

    expect(result.current.scenes).toHaveLength(1);
    expect(result.current.scenes[0].text).toBe('Test Scene');
  });

  it('should update scene properties', () => {
    const { result } = renderHook(() => usePremiumEditor());
    
    const newScene = {
      id: 'test-scene-1',
      startTime: 0,
      endTime: 10,
      text: 'Test Scene',
      speaker: 'Speaker 1',
      speakerColor: '#FF0000',
      order: 0
    };

    act(() => {
      result.current.addScene(newScene);
    });

    act(() => {
      result.current.updateScene('test-scene-1', {
        text: 'Updated Scene'
      });
    });

    expect(result.current.scenes[0].text).toBe('Updated Scene');
  });

  it('should handle playback controls', () => {
    const { result } = renderHook(() => usePremiumEditor());
    
    act(() => {
      result.current.togglePlayback();
    });
    expect(result.current.playback.isPlaying).toBe(true);

    act(() => {
      result.current.togglePlayback();
    });
    expect(result.current.playback.isPlaying).toBe(false);

    act(() => {
      result.current.setCurrentTime(30);
    });
    expect(result.current.playback.currentTime).toBe(30);
  });

  it('should remove a scene', () => {
    const { result } = renderHook(() => usePremiumEditor());
    
    const newScene = {
      id: 'test-scene-1',
      startTime: 0,
      endTime: 10,
      text: 'Test Scene',
      speaker: 'Speaker 1',
      speakerColor: '#FF0000',
      order: 0
    };

    act(() => {
      result.current.addScene(newScene);
    });

    act(() => {
      result.current.deleteScene('test-scene-1');
    });

    expect(result.current.scenes).toHaveLength(0);
  });

  it('should select and deselect scenes', () => {
    const { result } = renderHook(() => usePremiumEditor());
    
    const newScene = {
      id: 'test-scene-1',
      startTime: 0,
      endTime: 10,
      text: 'Test Scene',
      speaker: 'Speaker 1',
      speakerColor: '#FF0000',
      order: 0
    };

    act(() => {
      result.current.addScene(newScene);
    });

    act(() => {
      result.current.selectScene('test-scene-1');
    });

    expect(result.current.selectedSceneId).toBe('test-scene-1');

    act(() => {
      result.current.selectScene(null);
    });

    expect(result.current.selectedSceneId).toBeNull();
  });
});
