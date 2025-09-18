'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Get system theme preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Calculate actual theme based on theme setting
  const calculateActualTheme = (themeValue: Theme): 'light' | 'dark' => {
    return themeValue === 'system' ? getSystemTheme() : themeValue;
  };

  // Apply theme to document
  const applyTheme = (themeValue: 'light' | 'dark') => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // Temporarily disable transitions to prevent flash
      root.classList.add('theme-transition-disabled');
      
      // Remove existing theme classes
      root.removeAttribute('data-theme');
      
      // Add new theme
      if (themeValue === 'dark') {
        root.setAttribute('data-theme', 'dark');
      }
      
      // Re-enable transitions after a brief delay
      setTimeout(() => {
        root.classList.remove('theme-transition-disabled');
      }, 50);
    }
  };

  // Initialize theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get stored theme or use default
      const storedTheme = localStorage.getItem('edupro-theme') as Theme;
      const initialTheme = storedTheme || defaultTheme;
      
      setTheme(initialTheme);
      const initial = calculateActualTheme(initialTheme);
      setActualTheme(initial);
      applyTheme(initial);
      setMounted(true);
    }
  }, [defaultTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        if (theme === 'system') {
          const newActualTheme = getSystemTheme();
          setActualTheme(newActualTheme);
          applyTheme(newActualTheme);
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, mounted]);

  // Handle theme changes
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    
    // Store theme preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('edupro-theme', newTheme);
    }
    
    // Calculate and apply actual theme
    const newActualTheme = calculateActualTheme(newTheme);
    setActualTheme(newActualTheme);
    applyTheme(newActualTheme);
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="theme-transition-disabled">
        {children}
      </div>
    );
  }

  const value: ThemeContextType = {
    theme,
    setTheme: handleThemeChange,
    actualTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
