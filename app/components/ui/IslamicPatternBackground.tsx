'use client';

import React from 'react';
import { useTheme } from '../ThemeProvider';

interface IslamicPatternBackgroundProps {
  pattern?: 'geometric' | 'arabesque' | 'star' | 'hexagon' | 'octagon' | 'calligraphy';
  opacity?: number;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  children?: React.ReactNode;
}

const IslamicPatternBackground: React.FC<IslamicPatternBackgroundProps> = ({
  pattern = 'geometric',
  opacity = 0.1,
  color,
  size = 'medium',
  className = '',
  children
}) => {
  const { actualTheme } = useTheme();
  
  const getPatternColor = () => {
    if (color) return color;
    return actualTheme === 'dark' ? '#ffffff' : '#000000';
  };

  const getPatternSize = () => {
    switch (size) {
      case 'small': return 40;
      case 'large': return 120;
      default: return 80;
    }
  };

  const patternSize = getPatternSize();
  const patternColor = getPatternColor();

  const renderGeometricPattern = () => (
    <svg width={patternSize} height={patternSize} viewBox="0 0 80 80">
      <defs>
        <pattern id="geometric" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={patternColor} strokeWidth="1" opacity={opacity}>
            {/* Islamic geometric star pattern */}
            <circle cx="40" cy="40" r="20" />
            <polygon points="40,20 50,30 60,20 70,30 60,40 70,50 60,60 50,50 40,60 30,50 20,60 10,50 20,40 10,30 20,20 30,30" />
            <polygon points="40,25 48,32 55,25 62,32 55,40 62,48 55,55 48,48 40,55 32,48 25,55 18,48 25,40 18,32 25,25 32,32" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geometric)" />
    </svg>
  );

  const renderArabesquePattern = () => (
    <svg width={patternSize} height={patternSize} viewBox="0 0 80 80">
      <defs>
        <pattern id="arabesque" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={patternColor} strokeWidth="1.5" opacity={opacity}>
            {/* Flowing arabesque curves */}
            <path d="M0,40 Q20,20 40,40 Q60,60 80,40" />
            <path d="M40,0 Q60,20 40,40 Q20,60 40,80" />
            <path d="M0,0 Q40,40 80,0" />
            <path d="M0,80 Q40,40 80,80" />
            <circle cx="20" cy="20" r="8" />
            <circle cx="60" cy="20" r="8" />
            <circle cx="20" cy="60" r="8" />
            <circle cx="60" cy="60" r="8" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#arabesque)" />
    </svg>
  );

  const renderStarPattern = () => (
    <svg width={patternSize} height={patternSize} viewBox="0 0 80 80">
      <defs>
        <pattern id="star" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill={patternColor} opacity={opacity}>
            {/* 8-pointed Islamic star */}
            <polygon points="40,10 45,25 60,20 55,35 70,40 55,45 60,60 45,55 40,70 35,55 20,60 25,45 10,40 25,35 20,20 35,25" />
            <polygon points="40,20 42,28 50,26 48,34 56,36 48,38 50,46 42,44 40,52 38,44 30,46 32,38 24,36 32,34 30,26 38,28" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#star)" />
    </svg>
  );

  const renderHexagonPattern = () => (
    <svg width={patternSize} height={patternSize} viewBox="0 0 80 80">
      <defs>
        <pattern id="hexagon" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={patternColor} strokeWidth="1" opacity={opacity}>
            {/* Hexagonal Islamic pattern */}
            <polygon points="40,15 55,25 55,45 40,55 25,45 25,25" />
            <polygon points="40,25 50,30 50,40 40,45 30,40 30,30" />
            <line x1="40" y1="15" x2="40" y2="25" />
            <line x1="55" y1="25" x2="50" y2="30" />
            <line x1="55" y1="45" x2="50" y2="40" />
            <line x1="40" y1="55" x2="40" y2="45" />
            <line x1="25" y1="45" x2="30" y2="40" />
            <line x1="25" y1="25" x2="30" y2="30" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexagon)" />
    </svg>
  );

  const renderOctagonPattern = () => (
    <svg width={patternSize} height={patternSize} viewBox="0 0 80 80">
      <defs>
        <pattern id="octagon" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={patternColor} strokeWidth="1" opacity={opacity}>
            {/* Octagonal Islamic pattern */}
            <polygon points="30,15 50,15 65,30 65,50 50,65 30,65 15,50 15,30" />
            <polygon points="35,25 45,25 55,35 55,45 45,55 35,55 25,45 25,35" />
            <circle cx="40" cy="40" r="8" />
            <line x1="40" y1="15" x2="40" y2="25" />
            <line x1="65" y1="40" x2="55" y2="40" />
            <line x1="40" y1="65" x2="40" y2="55" />
            <line x1="15" y1="40" x2="25" y2="40" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#octagon)" />
    </svg>
  );

  const renderCalligraphyPattern = () => (
    <svg width={patternSize} height={patternSize} viewBox="0 0 80 80">
      <defs>
        <pattern id="calligraphy" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={patternColor} strokeWidth="2" opacity={opacity}>
            {/* Stylized Arabic calligraphy-inspired curves */}
            <path d="M10,30 Q25,15 40,30 Q55,45 70,30" />
            <path d="M10,50 Q25,35 40,50 Q55,65 70,50" />
            <path d="M30,10 Q45,25 30,40 Q15,55 30,70" />
            <path d="M50,10 Q65,25 50,40 Q35,55 50,70" />
            <circle cx="25" cy="25" r="3" fill={patternColor} />
            <circle cx="55" cy="25" r="3" fill={patternColor} />
            <circle cx="25" cy="55" r="3" fill={patternColor} />
            <circle cx="55" cy="55" r="3" fill={patternColor} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#calligraphy)" />
    </svg>
  );

  const renderPattern = () => {
    switch (pattern) {
      case 'arabesque':
        return renderArabesquePattern();
      case 'star':
        return renderStarPattern();
      case 'hexagon':
        return renderHexagonPattern();
      case 'octagon':
        return renderOctagonPattern();
      case 'calligraphy':
        return renderCalligraphyPattern();
      default:
        return renderGeometricPattern();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Pattern Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            renderPattern().props.children
          )}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: `${patternSize}px ${patternSize}px`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Preset components for common use cases
export const IslamicHeaderBackground: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <IslamicPatternBackground
    pattern="geometric"
    opacity={0.05}
    size="large"
    className={`bg-gradient-to-r from-emerald-600 to-teal-600 text-white ${className}`}
  >
    {children}
  </IslamicPatternBackground>
);

export const IslamicCardBackground: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <IslamicPatternBackground
    pattern="star"
    opacity={0.03}
    size="medium"
    className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}
  >
    {children}
  </IslamicPatternBackground>
);

export const IslamicSidebarBackground: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <IslamicPatternBackground
    pattern="arabesque"
    opacity={0.02}
    size="small"
    className={`bg-gray-50 dark:bg-gray-900 ${className}`}
  >
    {children}
  </IslamicPatternBackground>
);

export const IslamicModalBackground: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <IslamicPatternBackground
    pattern="hexagon"
    opacity={0.04}
    size="medium"
    className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl ${className}`}
  >
    {children}
  </IslamicPatternBackground>
);

// CSS classes for Islamic-themed styling
export const islamicThemeClasses = {
  colors: {
    primary: 'text-emerald-600 dark:text-emerald-400',
    secondary: 'text-teal-600 dark:text-teal-400',
    accent: 'text-amber-600 dark:text-amber-400',
    background: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-700'
  },
  gradients: {
    primary: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    secondary: 'bg-gradient-to-r from-teal-500 to-cyan-500',
    accent: 'bg-gradient-to-r from-amber-500 to-orange-500'
  },
  shadows: {
    soft: 'shadow-emerald-100 dark:shadow-emerald-900/20',
    medium: 'shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30',
    strong: 'shadow-xl shadow-emerald-300/50 dark:shadow-emerald-900/40'
  }
};

export default IslamicPatternBackground;
