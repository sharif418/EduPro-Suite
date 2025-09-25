'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface ProgressIndicatorProps {
  value: number;
  max?: number;
  type?: 'linear' | 'circular' | 'steps';
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  showPercentage?: boolean;
  showBengaliNumbers?: boolean;
  animated?: boolean;
  steps?: string[];
  currentStep?: number;
  milestones?: number[];
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  type = 'linear',
  size = 'md',
  color = 'blue',
  showPercentage = true,
  showBengaliNumbers = false,
  animated = true,
  steps = [],
  currentStep = 0,
  milestones = [],
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const percentage = Math.min((value / max) * 100, 100);

  // Animated counter effect
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayValue(value);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value, animated]);

  // Bengali number conversion
  const toBengaliNumber = (num: number): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
  };

  const formatNumber = (num: number): string => {
    return showBengaliNumbers ? toBengaliNumber(num) : num.toString();
  };

  // Color schemes
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      fill: 'bg-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      stroke: 'stroke-blue-500',
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      fill: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      stroke: 'stroke-green-500',
    },
    yellow: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      fill: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      stroke: 'stroke-yellow-500',
    },
    red: {
      bg: 'bg-red-100 dark:bg-red-900/20',
      fill: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      stroke: 'stroke-red-500',
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      fill: 'bg-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      stroke: 'stroke-purple-500',
    },
  };

  // Dynamic color based on progress
  const getDynamicColor = (): keyof typeof colorSchemes => {
    if (percentage < 50) return 'red';
    if (percentage < 80) return 'yellow';
    return 'green';
  };

  const currentColor = color === 'blue' ? getDynamicColor() : color;
  const scheme = colorSchemes[currentColor];

  // Size configurations
  const sizeConfigs = {
    sm: {
      height: 'h-2',
      width: 'w-16',
      text: 'text-xs',
      circular: 40,
    },
    md: {
      height: 'h-3',
      width: 'w-24',
      text: 'text-sm',
      circular: 60,
    },
    lg: {
      height: 'h-4',
      width: 'w-32',
      text: 'text-base',
      circular: 80,
    },
  };

  const sizeConfig = sizeConfigs[size];

  if (type === 'linear') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex justify-between items-center mb-2">
          {showPercentage && (
            <span className={`${sizeConfig.text} font-medium ${scheme.text}`}>
              {formatNumber(Math.round(percentage))}%
            </span>
          )}
        </div>
        <div className={`w-full ${sizeConfig.height} ${scheme.bg} rounded-full overflow-hidden`}>
          <motion.div
            className={`h-full ${scheme.fill} rounded-full relative`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              duration: animated ? 1.5 : 0,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            {/* Milestone markers */}
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                style={{ left: `${(milestone / max) * 100}%` }}
              />
            ))}
            
            {/* Shimmer effect */}
            {animated && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear',
                }}
              />
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  if (type === 'circular') {
    const radius = sizeConfig.circular / 2 - 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className={`relative ${className}`}>
        <svg
          width={sizeConfig.circular}
          height={sizeConfig.circular}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={sizeConfig.circular / 2}
            cy={sizeConfig.circular / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className={scheme.bg.replace('bg-', 'text-')}
          />
          
          {/* Progress circle */}
          <motion.circle
            cx={sizeConfig.circular / 2}
            cy={sizeConfig.circular / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            className={scheme.stroke.replace('stroke-', 'text-')}
            style={{
              strokeDasharray: circumference,
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{
              duration: animated ? 1.5 : 0,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${sizeConfig.text} font-bold ${scheme.text}`}>
            {formatNumber(Math.round(percentage))}%
          </span>
        </div>
      </div>
    );
  }

  if (type === 'steps') {
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              {/* Step circle */}
              <motion.div
                className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium
                  ${index <= currentStep
                    ? `${scheme.fill} ${scheme.text} border-transparent text-white`
                    : `bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500`
                  }
                `}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {index <= currentStep ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    ✓
                  </motion.div>
                ) : (
                  formatNumber(index + 1)
                )}
              </motion.div>
              
              {/* Step label */}
              <span className={`mt-2 text-xs text-center ${
                index <= currentStep ? scheme.text : 'text-gray-500'
              }`}>
                {step}
              </span>
              
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="absolute top-4 left-1/2 w-full h-0.5 -z-10">
                  <div className="h-full bg-gray-200 dark:bg-gray-700" />
                  <motion.div
                    className={`h-full ${scheme.fill}`}
                    initial={{ width: 0 }}
                    animate={{ width: index < currentStep ? '100%' : '0%' }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};

export default ProgressIndicator;
