import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
  speakerColor: string;
  order: number;
}

export interface Element {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  data: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: string;
    shadow?: {
      blur: number;
      offsetX: number;
      offsetY: number;
      color: string;
    };
  };
}

export interface Project {
  id: string;
  name: string;
  videoId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
}

interface UIState {
  leftPanelWidth: number;
  rightPanelWidth: number;
  timelineHeight: number;
  timelineZoom: number;
  selectedTab: 'ai-tools' | 'elements' | 'captions' | 'media' | 'properties' | 'accessibility';
}

interface HistoryState {
  past: any[];
  future: any[];
}

interface Markers {
  inPoint: number | null;
  outPoint: number | null;
}

interface PremiumEditorState {
  // Project
  project: Project | null;
  setProject: (project: Project | null) => void;

  // Playback
  playback: PlaybackState;
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;

  // Scenes
  scenes: Scene[];
  selectedSceneId: string | null;
  setScenes: (scenes: Scene[]) => void;
  addScene: (scene: Scene) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  selectScene: (sceneId: string | null) => void;

  // Elements
  elements: Element[];
  selectedElementId: string | null;
  setElements: (elements: Element[]) => void;
  addElement: (element: Element) => void;
  updateElement: (elementId: string, updates: Partial<Element>) => void;
  deleteElement: (elementId: string) => void;
  selectElement: (elementId: string | null) => void;

  // UI
  ui: UIState;
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  setTimelineHeight: (height: number) => void;
  setTimelineZoom: (zoom: number) => void;
  setSelectedTab: (tab: UIState['selectedTab']) => void;

  // Markers
  markers: Markers;
  setInPoint: (time: number) => void;
  setOutPoint: (time: number) => void;
  clearMarkers: () => void;

  // History (Undo/Redo)
  history: HistoryState;
  undo: () => void;
  redo: () => void;
  saveState: () => void;

  // Actions
  reset: () => void;
}

const initialState = {
  project: null,
  playback: {
    currentTime: 0,
    isPlaying: false,
    playbackRate: 1,
    volume: 1,
    isMuted: false,
  },
  scenes: [],
  selectedSceneId: null,
  elements: [],
  selectedElementId: null,
  ui: {
    leftPanelWidth: 30,
    rightPanelWidth: 25,
    timelineHeight: 200,
    timelineZoom: 100,
    selectedTab: 'ai-tools' as const,
  },
  markers: {
    inPoint: null,
    outPoint: null,
  },
  history: {
    past: [],
    future: [],
  },
};

export const usePremiumEditor = create<PremiumEditorState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Project actions
        setProject: (project) => set({ project }),

        // Playback actions
        setCurrentTime: (time) =>
          set((state) => ({
            playback: { ...state.playback, currentTime: time },
          })),

        togglePlayback: () =>
          set((state) => ({
            playback: {
              ...state.playback,
              isPlaying: !state.playback.isPlaying,
            },
          })),

        setPlaybackRate: (rate) =>
          set((state) => ({
            playback: { ...state.playback, playbackRate: rate },
          })),

        setVolume: (volume) =>
          set((state) => ({
            playback: { ...state.playback, volume },
          })),

        toggleMute: () =>
          set((state) => ({
            playback: {
              ...state.playback,
              isMuted: !state.playback.isMuted,
            },
          })),

        // Scene actions (with history)
        setScenes: (scenes) => set({ scenes }),

        addScene: (scene) =>
          set((state) => {
            const newState = {
              scenes: [...state.scenes, scene],
              history: {
                past: [
                  ...state.history.past,
                  { scenes: state.scenes, elements: state.elements },
                ],
                future: [],
              },
            };
            return newState;
          }),

        updateScene: (sceneId, updates) =>
          set((state) => {
            const newState = {
              scenes: state.scenes.map((s) =>
                s.id === sceneId ? { ...s, ...updates } : s
              ),
              history: {
                past: [
                  ...state.history.past,
                  { scenes: state.scenes, elements: state.elements },
                ],
                future: [],
              },
            };
            return newState;
          }),

        deleteScene: (sceneId) =>
          set((state) => {
            const newState = {
              scenes: state.scenes.filter((s) => s.id !== sceneId),
              selectedSceneId:
                state.selectedSceneId === sceneId ? null : state.selectedSceneId,
              history: {
                past: [
                  ...state.history.past,
                  { scenes: state.scenes, elements: state.elements },
                ],
                future: [],
              },
            };
            return newState;
          }),

        selectScene: (sceneId) => set({ selectedSceneId: sceneId }),

        // Element actions (with history)
        setElements: (elements) => set({ elements }),

        addElement: (element) =>
          set((state) => ({
            elements: [...state.elements, element],
            selectedElementId: element.id,
            history: {
              past: [
                ...state.history.past,
                { scenes: state.scenes, elements: state.elements },
              ],
              future: [],
            },
          })),

        updateElement: (elementId, updates) =>
          set((state) => ({
            elements: state.elements.map((e) =>
              e.id === elementId ? { ...e, ...updates } : e
            ),
            history: {
              past: [
                ...state.history.past,
                { scenes: state.scenes, elements: state.elements },
              ],
              future: [],
            },
          })),

        deleteElement: (elementId) =>
          set((state) => ({
            elements: state.elements.filter((e) => e.id !== elementId),
            selectedElementId:
              state.selectedElementId === elementId
                ? null
                : state.selectedElementId,
            history: {
              past: [
                ...state.history.past,
                { scenes: state.scenes, elements: state.elements },
              ],
              future: [],
            },
          })),

        selectElement: (elementId) => set({ selectedElementId: elementId }),

        // UI actions
        setPanelWidth: (panel, width) =>
          set((state) => ({
            ui: {
              ...state.ui,
              [panel === 'left' ? 'leftPanelWidth' : 'rightPanelWidth']: width,
            },
          })),

        setTimelineHeight: (height) =>
          set((state) => ({
            ui: { ...state.ui, timelineHeight: height },
          })),

        setTimelineZoom: (zoom) =>
          set((state) => ({
            ui: { ...state.ui, timelineZoom: zoom },
          })),

        setSelectedTab: (tab) =>
          set((state) => ({
            ui: { ...state.ui, selectedTab: tab },
          })),

        // Markers
        setInPoint: (time) =>
          set((state) => ({
            markers: { ...state.markers, inPoint: time },
          })),

        setOutPoint: (time) =>
          set((state) => ({
            markers: { ...state.markers, outPoint: time },
          })),

        clearMarkers: () =>
          set({ markers: { inPoint: null, outPoint: null } }),

        // History (Undo/Redo)
        undo: () =>
          set((state) => {
            if (state.history.past.length === 0) return state;
            
            const previous = state.history.past[state.history.past.length - 1];
            const newPast = state.history.past.slice(0, -1);
            
            return {
              ...state,
              scenes: previous.scenes,
              elements: previous.elements,
              history: {
                past: newPast,
                future: [
                  { scenes: state.scenes, elements: state.elements },
                  ...state.history.future,
                ],
              },
            };
          }),

        redo: () =>
          set((state) => {
            if (state.history.future.length === 0) return state;
            
            const next = state.history.future[0];
            const newFuture = state.history.future.slice(1);
            
            return {
              ...state,
              scenes: next.scenes,
              elements: next.elements,
              history: {
                past: [
                  ...state.history.past,
                  { scenes: state.scenes, elements: state.elements },
                ],
                future: newFuture,
              },
            };
          }),

        saveState: () =>
          set((state) => ({
            history: {
              past: [
                ...state.history.past,
                { scenes: state.scenes, elements: state.elements },
              ],
              future: [],
            },
          })),

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'premium-editor-storage',
        partialize: (state) => ({
          ui: state.ui, // Only persist UI preferences
        }),
      }
    ),
    { name: 'PremiumEditor' }
  )
);
