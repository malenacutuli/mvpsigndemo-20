import { LayoutConfig, LayoutPosition } from '@/types/premium-timeline';

export const LAYOUT_TEMPLATES: Record<string, LayoutConfig> = {
  fullscreen: {
    name: 'Fullscreen',
    description: 'Single source fills entire frame',
    thumbnail: '/layouts/fullscreen.svg',
    sources: 1,
    arrangement: 'custom',
    positions: [
      {
        id: 'main',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 1
      }
    ]
  },

  split: {
    name: 'Split Screen',
    description: 'Two sources side-by-side',
    thumbnail: '/layouts/split.svg',
    sources: 2,
    arrangement: 'horizontal',
    positions: [
      {
        id: 'left',
        x: 0,
        y: 0,
        width: 50,
        height: 100,
        zIndex: 1
      },
      {
        id: 'right',
        x: 50,
        y: 0,
        width: 50,
        height: 100,
        zIndex: 1
      }
    ]
  },

  pip: {
    name: 'Picture-in-Picture',
    description: 'Small source overlaid on main source',
    thumbnail: '/layouts/pip.svg',
    sources: 2,
    arrangement: 'overlay',
    positions: [
      {
        id: 'main',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 1
      },
      {
        id: 'pip',
        x: 70,
        y: 70,
        width: 25,
        height: 25,
        zIndex: 2
      }
    ]
  },

  screenCamera: {
    name: 'Screen + Camera',
    description: 'Screen share with camera overlay',
    thumbnail: '/layouts/screen-camera.svg',
    sources: 2,
    arrangement: 'overlay',
    positions: [
      {
        id: 'screen',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 1
      },
      {
        id: 'camera',
        x: 5,
        y: 75,
        width: 20,
        height: 20,
        zIndex: 2
      }
    ]
  },

  multicam: {
    name: 'Multi-Camera',
    description: 'Multiple camera angles in grid',
    thumbnail: '/layouts/multicam.svg',
    sources: 4,
    arrangement: 'grid',
    positions: [
      {
        id: 'cam1',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        zIndex: 1
      },
      {
        id: 'cam2',
        x: 50,
        y: 0,
        width: 50,
        height: 50,
        zIndex: 1
      },
      {
        id: 'cam3',
        x: 0,
        y: 50,
        width: 50,
        height: 50,
        zIndex: 1
      },
      {
        id: 'cam4',
        x: 50,
        y: 50,
        width: 50,
        height: 50,
        zIndex: 1
      }
    ]
  },

  lShape: {
    name: 'L-Shape',
    description: 'Main content with sidebar',
    thumbnail: '/layouts/l-shape.svg',
    sources: 2,
    arrangement: 'custom',
    positions: [
      {
        id: 'main',
        x: 0,
        y: 0,
        width: 75,
        height: 100,
        zIndex: 1
      },
      {
        id: 'sidebar',
        x: 75,
        y: 0,
        width: 25,
        height: 100,
        zIndex: 1
      }
    ]
  },

  custom: {
    name: 'Custom',
    description: 'User-defined layout',
    thumbnail: '/layouts/custom.svg',
    sources: 0,
    arrangement: 'custom',
    positions: []
  }
};

export function getLayoutTemplate(type: string): LayoutConfig {
  return LAYOUT_TEMPLATES[type] || LAYOUT_TEMPLATES.fullscreen;
}

export function createCustomLayout(positions: LayoutPosition[]): LayoutConfig {
  return {
    name: 'Custom Layout',
    description: 'User-defined layout',
    thumbnail: '/layouts/custom.svg',
    sources: positions.length,
    arrangement: 'custom',
    positions
  };
}
