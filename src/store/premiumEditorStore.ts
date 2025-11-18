import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  speaker: string;
  speakerColor: string;
  order: number;
  layout: 'fullscreen' | 'pip' | 'split' | 'multicam' | 'intro';
  elements: Element[];
}

interface Element {
  id: string;
  type: 'caption' | 'shape' | 'text' | 'asl' | 'ad';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  data: any;
}

interface PremiumEditorState {
  // Project
  project: {
    id: string;
    name: string;
    videoId: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    duration: number;
    createdAt: string;
    updatedAt: string;
  } | null;

  // Playback
  playback: {
    currentTime: number;
    isPlaying: boolean;
    playbackRate: number;
    volume: number;
    isMuted: boolean;
  };

  // Scenes
  scenes: Scene[];
  selectedSceneId: string | null;

  // Elements
  elements: Element[];
  selectedElementId: string | null;

  // Panels
  ui: {
    leftPanelWidth: number;
    rightPanelWidth: number;
    timelineHeight: number;
    selectedTab: 'ai-tools' | 'elements' | 'captions' | 'media' | 'properties' | 'accessibility' | 'underlord';
    timelineZoom: number;
  };

  // Undo/Redo
  history: {
    past: any[];
    future: any[];
  };

  // Actions
  setProject: (project: PremiumEditorState['project']) => void;
  setCurrentTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackRate: (rate: number) => void;
  addScene: (scene: Scene) => void;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  selectScene: (sceneId: string | null) => void;
  addElement: (element: Element) => void;
  updateElement: (elementId: string, updates: Partial<Element>) => void;
  deleteElement: (elementId: string) => void;
  selectElement: (elementId: string | null) => void;
  setPanelWidth: (panel: 'left' | 'right', width: number) => void;
  setSelectedTab: (tab: PremiumEditorState['ui']['selectedTab']) => void;
  setTimelineZoom: (zoom: number) => void;
  undo: () => void;
  redo: () => void;
}

export const usePremiumEditor = create<PremiumEditorState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
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
          selectedTab: 'ai-tools',
          timelineZoom: 100,
        },
        history: {
          past: [],
          future: [],
        },

        // Actions with history tracking
        setProject: (project) => {
          set({ project });
        },

        setCurrentTime: (time) => {
          set((state) => ({
            playback: { ...state.playback, currentTime: time },
          }));
        },

        togglePlayback: () => {
          set((state) => ({
            playback: {
              ...state.playback,
              isPlaying: !state.playback.isPlaying,
            },
          }));
        },

        setPlaybackRate: (rate) => {
          set((state) => ({
            playback: { ...state.playback, playbackRate: rate },
          }));
        },

        addScene: (scene) => {
          set((state) => {
            const newState = {
              scenes: [...state.scenes, scene],
              history: {
                past: [...state.history.past, { scenes: state.scenes }],
                future: [],
              },
            };
            return newState;
          });
        },

        updateScene: (sceneId, updates) => {
          set((state) => {
            const newState = {
              scenes: state.scenes.map((s) =>
                s.id === sceneId ? { ...s, ...updates } : s
              ),
              history: {
                past: [...state.history.past, { scenes: state.scenes }],
                future: [],
              },
            };
            return newState;
          });
        },

        deleteScene: (sceneId) => {
          set((state) => {
            const newState = {
              scenes: state.scenes.filter((s) => s.id !== sceneId),
              selectedSceneId:
                state.selectedSceneId === sceneId ? null : state.selectedSceneId,
              history: {
                past: [...state.history.past, { scenes: state.scenes }],
                future: [],
              },
            };
            return newState;
          });
        },

        selectScene: (sceneId) => {
          set({ selectedSceneId: sceneId });
        },

        addElement: (element) => {
          set((state) => ({
            elements: [...state.elements, element],
            history: {
              past: [...state.history.past, { elements: state.elements }],
              future: [],
            },
          }));
        },

        updateElement: (elementId, updates) => {
          set((state) => ({
            elements: state.elements.map((e) =>
              e.id === elementId ? { ...e, ...updates } : e
            ),
            history: {
              past: [...state.history.past, { elements: state.elements }],
              future: [],
            },
          }));
        },

        deleteElement: (elementId) => {
          set((state) => ({
            elements: state.elements.filter((e) => e.id !== elementId),
            selectedElementId:
              state.selectedElementId === elementId
                ? null
                : state.selectedElementId,
            history: {
              past: [...state.history.past, { elements: state.elements }],
              future: [],
            },
          }));
        },

        selectElement: (elementId) => {
          set({ selectedElementId: elementId });
        },

        setPanelWidth: (panel, width) => {
          set((state) => ({
            ui: {
              ...state.ui,
              [panel === 'left' ? 'leftPanelWidth' : 'rightPanelWidth']: width,
            },
          }));
        },

        setSelectedTab: (tab) => {
          set((state) => ({
            ui: { ...state.ui, selectedTab: tab },
          }));
        },

        setTimelineZoom: (zoom) => {
          set((state) => ({
            ui: { ...state.ui, timelineZoom: zoom },
          }));
        },

        undo: () => {
          set((state) => {
            if (state.history.past.length === 0) return state;
            const previous = state.history.past[state.history.past.length - 1];
            return {
              ...state,
              ...previous,
              history: {
                past: state.history.past.slice(0, -1),
                future: [
                  { scenes: state.scenes, elements: state.elements },
                  ...state.history.future,
                ],
              },
            };
          });
        },

        redo: () => {
          set((state) => {
            if (state.history.future.length === 0) return state;
            const next = state.history.future[0];
            return {
              ...state,
              ...next,
              history: {
                past: [
                  ...state.history.past,
                  { scenes: state.scenes, elements: state.elements },
                ],
                future: state.history.future.slice(1),
              },
            };
          });
        },
      }),
      {
        name: 'premium-editor-storage',
        partialize: (state) => ({
          ui: state.ui,
          // Don't persist project/scenes (loaded from DB)
        }),
      }
    )
  )
);
