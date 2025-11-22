export interface DemoTheme {
  id: string;
  name: string;
  logo: string;
  logoAlt?: string;
  colors: {
    primary: string;        // HSL format: "214 100% 47%"
    primaryGlow: string;
    accent: string;
    secondary: string;
  };
  fonts?: {
    heading: string;
    body: string;
  };
  companyName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  favicon?: string;
  hideNavLinks?: string[]; // Hide specific nav links like ['dashboard', 'videos']
}

export const demoThemes: Record<string, DemoTheme> = {
  // Default Axessible theme
  'default': {
    id: 'default',
    name: 'Axessible',
    logo: '/assets/axessible-logo.png',
    logoAlt: '/assets/axessible-logo-alt.png',
    colors: {
      primary: '214 100% 47%',
      primaryGlow: '214 100% 57%',
      accent: '204 94% 94%',
      secondary: '210 30% 92%',
    },
    companyName: 'Axessible',
    tagline: 'Accessibility-First Video Platform',
    heroTitle: 'Make Every Video Accessible',
    heroSubtitle: 'AI-powered captions, dubbing, and sign language',
    ctaText: 'Get Started Free',
  },
  
  // Interbrand demo theme
  'interbrand': {
    id: 'interbrand',
    name: 'Interbrand',
    logo: '/assets/demo-logos/interbrand-logo.png',
    colors: {
      primary: '0 100% 50%',        // Interbrand red #ff0000
      primaryGlow: '0 100% 60%',
      accent: '194 87% 57%',        // Light blue #33c3f0
      secondary: '196 75% 49%',     // Blue #1eaedb
    },
    fonts: {
      heading: 'Inter, sans-serif',  // Using Inter as fallback until custom fonts are added
      body: 'Inter, sans-serif',
    },
    companyName: 'Interbrand',
    tagline: 'Making Iconic Moves that help brands thrive in what\'s next.',
    heroTitle: 'Interbrand wants to help brands move from \'passive\' to \'purposeful\' in their inclusivity efforts.',
    heroSubtitle: 'The world\'s first video platform to instantly enhance your videos with Captions with Intention, Emotive Audio Descriptions, and inclusive viewing tools - so your stories don\'t just reach more people, they move them.',
    ctaText: 'Request Demo',
    hideNavLinks: ['dashboard', 'videos'],
  },
  
  // Nike demo theme
  'nike': {
    id: 'nike',
    name: 'Nike Media Hub',
    logo: '/assets/demo-logos/nike-logo.png',
    colors: {
      primary: '0 0% 0%',          // Nike black
      primaryGlow: '0 0% 20%',
      accent: '25 95% 47%',        // Nike orange
      secondary: '0 0% 95%',
    },
    companyName: 'Nike',
    tagline: 'Just Do It - Accessible',
    heroTitle: 'Inspire Athletes Everywhere',
    heroSubtitle: 'Accessible video content for every athlete',
    ctaText: 'Learn More',
    hideNavLinks: ['dashboard', 'videos'],
  },

  // Coca-Cola demo theme
  'cocacola': {
    id: 'cocacola',
    name: 'Coca-Cola Media',
    logo: '/assets/demo-logos/cocacola-logo.png',
    colors: {
      primary: '355 100% 45%',     // Coca-Cola red
      primaryGlow: '355 100% 55%',
      accent: '355 80% 95%',
      secondary: '210 15% 92%',
    },
    companyName: 'Coca-Cola',
    tagline: 'Taste The Feeling',
    heroTitle: 'Share Happiness Through Video',
    heroSubtitle: 'Accessible content that connects with everyone',
    ctaText: 'Explore',
    hideNavLinks: ['dashboard', 'videos'],
  },
};

export const getThemeFromPath = (pathname: string): DemoTheme => {
  // Extract theme ID from path (e.g., "/interbrand" or "/interbrand/videos")
  const segments = pathname.split('/').filter(Boolean);
  const themeId = segments[0];
  return demoThemes[themeId] || demoThemes['default'];
};

export const isDemoRoute = (pathname: string): boolean => {
  const segments = pathname.split('/').filter(Boolean);
  const themeId = segments[0];
  return themeId in demoThemes && themeId !== 'default';
};
