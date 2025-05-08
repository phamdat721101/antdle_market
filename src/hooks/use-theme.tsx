import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'system';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check for stored theme preference
    const storedTheme = localStorage.getItem('theme') as Theme;
    return storedTheme || 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove previous class
    root.classList.remove('light', 'dark');
    
    // Set new theme
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light';
      root.classList.add(systemTheme);
      
      // Track system theme in analytics
      trackThemeChange(systemTheme);
    } else {
      root.classList.add(theme);
      
      // Track explicit theme choice
      trackThemeChange(theme);
    }
    
    // Save the theme preference
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Track theme changes for analytics
  const trackThemeChange = (activeTheme: string) => {
    try {
      // Simple tracking to localStorage
      const themeHistory = JSON.parse(localStorage.getItem('themeHistory') || '[]');
      themeHistory.push({
        theme: activeTheme, 
        timestamp: new Date().toISOString()
      });
      
      // Keep only the last 10 changes
      if (themeHistory.length > 10) {
        themeHistory.shift();
      }
      
      localStorage.setItem('themeHistory', JSON.stringify(themeHistory));
    } catch (error) {
      console.error('Error tracking theme change:', error);
    }
  };

  return { theme, setTheme };
};
