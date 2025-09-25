'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserSettings {
  soundEnabled: boolean;
  reducedMotion: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'bn' | 'ar';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
}

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const defaultSettings: UserSettings = {
  soundEnabled: true,
  reducedMotion: false,
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    screenReader: false,
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('edupro-user-settings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings({ ...defaultSettings, ...parsed });
        }

        // Check system preferences
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const prefersColorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

        setSettings(prev => ({
          ...prev,
          reducedMotion: prefersReducedMotion || prev.reducedMotion,
          theme: prev.theme === 'system' ? prefersColorScheme : prev.theme,
        }));
      } catch (error) {
        console.error('Failed to load user settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      setSettings(prev => ({
        ...prev,
        theme: prev.theme === 'system' ? (e.matches ? 'dark' : 'light') : prev.theme,
      }));
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    colorSchemeQuery.addEventListener('change', handleColorSchemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      colorSchemeQuery.removeEventListener('change', handleColorSchemeChange);
    };
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('edupro-user-settings', JSON.stringify(settings));
      } catch (error) {
        console.error('Failed to save user settings:', error);
      }
    }
  }, [settings, isLoading]);

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      
      // Handle nested updates
      Object.keys(updates).forEach(key => {
        const typedKey = key as keyof UserSettings;
        const value = updates[typedKey];
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Handle nested object updates
          if (typedKey === 'notifications' || typedKey === 'accessibility') {
            (newSettings[typedKey] as any) = {
              ...(prev[typedKey] as any),
              ...value,
            };
          }
        } else {
          // Handle primitive value updates
          (newSettings as any)[typedKey] = value;
        }
      });

      return newSettings;
    });
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('edupro-user-settings');
  };

  const contextValue: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use settings
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Utility hooks for specific settings
export const useSound = () => {
  const { settings } = useSettings();
  
  const playSound = (type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (!settings.soundEnabled || settings.reducedMotion) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 500,
      };

      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Sound notification not supported');
    }
  };

  return {
    soundEnabled: settings.soundEnabled,
    playSound,
  };
};

export const useMotion = () => {
  const { settings } = useSettings();
  
  return {
    reducedMotion: settings.reducedMotion,
    shouldAnimate: !settings.reducedMotion,
    getAnimationDuration: (defaultDuration: number) => 
      settings.reducedMotion ? 0 : defaultDuration,
    getTransition: (defaultTransition: any) => 
      settings.reducedMotion ? { duration: 0 } : defaultTransition,
  };
};

export const useAccessibility = () => {
  const { settings } = useSettings();
  
  return {
    ...settings.accessibility,
    getTextSize: (baseSize: string) => {
      if (settings.accessibility.largeText) {
        const sizeMap: Record<string, string> = {
          'text-xs': 'text-sm',
          'text-sm': 'text-base',
          'text-base': 'text-lg',
          'text-lg': 'text-xl',
          'text-xl': 'text-2xl',
        };
        return sizeMap[baseSize] || baseSize;
      }
      return baseSize;
    },
    getContrastClass: (defaultClass: string) => {
      if (settings.accessibility.highContrast) {
        return `${defaultClass} contrast-more`;
      }
      return defaultClass;
    },
  };
};

export default SettingsProvider;
