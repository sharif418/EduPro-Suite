'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    label?: string;
  };
  loading?: boolean;
  animated?: boolean;
  showBengaliNumbers?: boolean;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  subtitle?: string;
  prefix?: string;
  suffix?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  loading = false,
  animated = true,
  showBengaliNumbers = false,
  color = 'blue',
  size = 'md',
  className = '',
  onClick,
  subtitle,
  prefix = '',
  suffix = '',
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  // Convert to number for animation if possible
  const numericValue = typeof value === 'number' ? value : parseFloat(value.toString()) || 0;

  // Animated counter effect
  useEffect(() => {
    if (animated && typeof value === 'number') {
      const timer = setTimeout(() => {
        setIsVisible(true);
        const duration = 2000;
        const steps = 60;
        const increment = numericValue / steps;
        let current = 0;
        
        const counter = setInterval(() => {
          current += increment;
          if (current >= numericValue) {
            setDisplayValue(numericValue);
            clearInterval(counter);
          } else {
            setDisplayValue(Math.floor(current));
          }
        }, duration / steps);

        return () => clearInterval(counter);
      }, 200);
      
      return () => clearTimeout(timer);
    } else {
      setDisplayValue(numericValue);
      setIsVisible(true);
    }
  }, [value, animated, numericValue]);

  // Bengali number conversion
  const toBengaliNumber = (num: number | string): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().replace(/\d/g, (digit) => bengaliDigits[parseInt(digit)]);
  };

  const formatValue = (val: number | string): string => {
    const formatted = typeof val === 'number' ? val.toLocaleString() : val.toString();
    return showBengaliNumbers ? toBengaliNumber(formatted) : formatted;
  };

  // Color schemes
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      text: 'text-blue-900 dark:text-blue-100',
      accent: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/10',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      iconBg: 'bg-green-100 dark:bg-green-900/20',
      text: 'text-green-900 dark:text-green-100',
      accent: 'text-green-600 dark:text-green-400',
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/10',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
      text: 'text-yellow-900 dark:text-yellow-100',
      accent: 'text-yellow-600 dark:text-yellow-400',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/10',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      text: 'text-red-900 dark:text-red-100',
      accent: 'text-red-600 dark:text-red-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/10',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/20',
      text: 'text-purple-900 dark:text-purple-100',
      accent: 'text-purple-600 dark:text-purple-400',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/10',
      border: 'border-indigo-200 dark:border-indigo-800',
      icon: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/20',
      text: 'text-indigo-900 dark:text-indigo-100',
      accent: 'text-indigo-600 dark:text-indigo-400',
    },
  };

  const scheme = colorSchemes[color];

  // Size configurations
  const sizeConfigs = {
    sm: {
      padding: 'p-4',
      iconSize: 'w-8 h-8',
      titleText: 'text-sm',
      valueText: 'text-xl',
      trendText: 'text-xs',
    },
    md: {
      padding: 'p-6',
      iconSize: 'w-10 h-10',
      titleText: 'text-base',
      valueText: 'text-2xl',
      trendText: 'text-sm',
    },
    lg: {
      padding: 'p-8',
      iconSize: 'w-12 h-12',
      titleText: 'text-lg',
      valueText: 'text-3xl',
      trendText: 'text-base',
    },
  };

  const sizeConfig = sizeConfigs[size];

  // Trend icon and color
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    switch (trend.direction) {
      case 'up':
        return 'text-green-600 dark:text-green-400';
      case 'down':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    hover: {
      y: -2,
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: 'easeOut'
      }
    }
  };

  const valueVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.6,
        delay: 0.2,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-xl border transition-all duration-300
        ${scheme.bg} ${scheme.border} ${sizeConfig.padding}
        ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}
        ${className}
      `}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={onClick ? "hover" : undefined}
      onClick={onClick}
    >
      {/* Loading shimmer */}
      {loading && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'linear',
          }}
        />
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className={`${sizeConfig.titleText} font-medium text-gray-600 dark:text-gray-400 mb-2`}>
            {title}
          </p>

          {/* Value */}
          <motion.div
            variants={valueVariants}
            className={`${sizeConfig.valueText} font-bold ${scheme.text} mb-1`}
          >
            {loading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <>
                {prefix}
                {animated && typeof value === 'number' ? 
                  formatValue(displayValue) : 
                  formatValue(value)
                }
                {suffix}
              </>
            )}
          </motion.div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {subtitle}
            </p>
          )}

          {/* Trend */}
          {trend && !loading && (
            <div className={`flex items-center space-x-1 ${sizeConfig.trendText}`}>
              {getTrendIcon()}
              <span className={getTrendColor()}>
                {showBengaliNumbers ? toBengaliNumber(trend.percentage) : trend.percentage}%
              </span>
              {trend.label && (
                <span className="text-gray-500 dark:text-gray-400">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <motion.div
            className={`
              ${sizeConfig.iconSize} ${scheme.iconBg} ${scheme.icon}
              rounded-lg flex items-center justify-center flex-shrink-0
            `}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94]
            }}
          >
            {icon}
          </motion.div>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-5">
        <div className={`w-full h-full ${scheme.icon} transform rotate-12`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
