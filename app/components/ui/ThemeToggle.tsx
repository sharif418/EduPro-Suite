'use client';

import { useTheme } from '../ThemeProvider';
import { useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: '☀️',
      description: 'Light theme'
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: '🌙',
      description: 'Dark theme'
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: '💻',
      description: 'Follow system preference'
    }
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[0];

  return (
    <div className="relative">
      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 border border-gray-200 dark:border-gray-700"
        aria-label="Toggle theme"
        title={`Current theme: ${currentTheme.label}`}
      >
        <span className="text-lg">{currentTheme.icon}</span>
        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentTheme.label}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Theme Preference
              </p>
            </div>
            
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors duration-200 flex items-center space-x-3 ${
                  theme === themeOption.value
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{themeOption.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{themeOption.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {themeOption.description}
                    {themeOption.value === 'system' && (
                      <span className="ml-1">
                        ({actualTheme === 'dark' ? '🌙' : '☀️'})
                      </span>
                    )}
                  </div>
                </div>
                {theme === themeOption.value && (
                  <svg
                    className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
            
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Currently using: <span className="font-medium">{actualTheme}</span> theme
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Quick Theme Toggle Button (for mobile or compact spaces)
export function QuickThemeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'light') return '☀️';
    if (theme === 'dark') return '🌙';
    return actualTheme === 'dark' ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (theme === 'system') return `System (${actualTheme})`;
    return theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
      aria-label={`Switch theme (current: ${getLabel()})`}
      title={`Current: ${getLabel()}. Click to cycle themes.`}
    >
      <span className="text-xl">{getIcon()}</span>
    </button>
  );
}
