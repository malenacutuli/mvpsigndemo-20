import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DemoTheme, getThemeFromPath, demoThemes, isDemoRoute } from '@/config/demoThemes';

interface ThemeContextType {
  theme: DemoTheme;
  isDemo: boolean;
  getPath: (path: string) => string;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: demoThemes['default'],
  isDemo: false,
  getPath: (path) => path,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [theme, setTheme] = useState<DemoTheme>(demoThemes['default']);
  
  useEffect(() => {
    const currentTheme = getThemeFromPath(location.pathname);
    setTheme(currentTheme);
    
    // Apply CSS custom properties dynamically
    const root = document.documentElement;
    root.style.setProperty('--primary', currentTheme.colors.primary);
    root.style.setProperty('--primary-glow', currentTheme.colors.primaryGlow);
    root.style.setProperty('--accent', currentTheme.colors.accent);
    root.style.setProperty('--secondary', currentTheme.colors.secondary);
    
    // Apply custom fonts if specified
    if (currentTheme.fonts) {
      document.body.style.fontFamily = currentTheme.fonts.body;
    }
    
    // Update page title
    document.title = `${currentTheme.companyName} | Video Platform`;

    // Update favicon if provided
    if (currentTheme.favicon) {
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        favicon.setAttribute('href', currentTheme.favicon);
      }
    }
  }, [location.pathname]);
  
  const isDemo = isDemoRoute(location.pathname);
  
  // Helper to construct paths that preserve demo context
  const getPath = (path: string): string => {
    if (isDemo) {
      // Ensure path starts with /
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      return `/${theme.id}${cleanPath}`;
    }
    return path;
  };
  
  return (
    <ThemeContext.Provider value={{ theme, isDemo, getPath }}>
      {children}
    </ThemeContext.Provider>
  );
};
