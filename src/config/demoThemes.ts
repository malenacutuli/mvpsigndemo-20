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
    name: 'Interbrand Video',
    logo: '/assets/demo-logos/interbrand-logo.png',
    colors: {
      primary: '348 90% 45%',      // Interbrand red
      primaryGlow: '348 90% 55%',
      accent: '348 80% 95%',
      secondary: '220 15% 92%',
    },
    companyName: 'Interbrand',
    tagline: 'Brand-First Video Experience',
    heroTitle: 'Elevate Your Brand Through Video',
    heroSubtitle: 'Enterprise-grade accessibility powered by Axessible',
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
