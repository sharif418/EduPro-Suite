'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  loading?: boolean;
  islamicPattern?: boolean;
  onClick?: () => void;
  delay?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  hover = true,
  loading = false,
  islamicPattern = false,
  onClick,
  delay = 0,
}) => {
  const baseClasses = 'relative overflow-hidden transition-all duration-300 ease-in-out';
  
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm',
    elevated: 'bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700',
    outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-600 rounded-lg',
    gradient: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-gray-700 rounded-xl',
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  };

  const hoverClasses = hover
    ? 'hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-600'
    : '';

  const clickableClasses = onClick ? 'cursor-pointer' : '';

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    },
    hover: {
      y: -4,
      scale: 1.02,
      transition: {
        duration: 0.2,
        ease: 'easeOut'
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: 0.1
      }
    }
  };

  const shimmerVariants = {
    animate: {
      x: ['-100%', '100%'],
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear'
      }
    }
  };

  const islamicPatternVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 0.1,
      transition: {
        duration: 1,
        delay: delay + 0.3
      }
    }
  };

  return (
    <motion.div
      className={`
        group
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${hoverClasses}
        ${clickableClasses}
        ${className}
      `}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={hover ? "hover" : undefined}
      whileTap={onClick ? "tap" : undefined}
      onClick={onClick}
    >
      {/* Islamic Pattern Overlay */}
      {islamicPattern && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          variants={islamicPatternVariants}
          initial="initial"
          animate="animate"
        >
          <div className="w-full h-full opacity-10 bg-gradient-to-br from-transparent via-blue-500 to-transparent">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id="islamic-pattern"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="10" cy="10" r="2" fill="currentColor" opacity="0.3" />
                  <path
                    d="M10,5 L15,10 L10,15 L5,10 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
            </svg>
          </div>
        </motion.div>
      )}

      {/* Loading Shimmer Effect */}
      {loading && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          variants={shimmerVariants}
          animate="animate"
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Glow Effect on Hover */}
      {hover && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/0 via-blue-400/5 to-purple-400/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
    </motion.div>
  );
};

export default AnimatedCard;
