'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  className?: string;
  showIslamicPattern?: boolean;
  fadeInDelay?: number;
  gridCols?: 1 | 2 | 3 | 4 | 6 | 12;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
  loading = false,
  error = null,
  className = '',
  showIslamicPattern = true,
  fadeInDelay = 0,
  gridCols = 12,
  spacing = 'md',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, fadeInDelay);
      return () => clearTimeout(timer);
    }
  }, [inView, fadeInDelay]);

  // Spacing configurations
  const spacingClasses = {
    sm: 'gap-3',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12',
  };

  // Grid column configurations
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
    12: 'grid-cols-12',
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.1,
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Header skeleton */}
      {(title || subtitle) && (
        <div className="space-y-2">
          {title && <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 animate-pulse" />}
          {subtitle && <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />}
        </div>
      )}
      
      {/* Content skeleton */}
      <div className={`grid ${gridClasses[gridCols]} ${spacingClasses[spacing]}`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
            style={{
              height: Math.random() * 100 + 200, // Random height between 200-300px
              animationDelay: `${index * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );

  // Error component
  const ErrorDisplay = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
        {error || 'An unexpected error occurred while loading the dashboard.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try again
      </button>
    </motion.div>
  );

  return (
    <div
      ref={ref}
      className={`
        relative min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300
        ${className}
      `}
    >
      {/* Islamic Pattern Background */}
      {showIslamicPattern && (
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.01] pointer-events-none overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 400 400"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="islamic-dashboard-pattern"
                x="0"
                y="0"
                width="80"
                height="80"
                patternUnits="userSpaceOnUse"
              >
                {/* Islamic geometric star pattern */}
                <g fill="currentColor" className="text-blue-600">
                  <circle cx="40" cy="40" r="3" opacity="0.3" />
                  <path
                    d="M40,20 L50,30 L60,20 L50,10 Z M40,60 L50,70 L60,60 L50,50 Z M20,40 L30,50 L20,60 L10,50 Z M60,40 L70,50 L60,60 L50,50 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.2"
                  />
                  <path
                    d="M40,25 L55,40 L40,55 L25,40 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.3"
                    opacity="0.15"
                  />
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#islamic-dashboard-pattern)" />
          </svg>
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6"
          >
            <LoadingSkeleton />
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ErrorDisplay />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={containerVariants}
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
            className="relative z-10 p-6"
          >
            {/* Header Section */}
            {(title || subtitle || actions) && (
              <motion.div
                variants={headerVariants}
                className="mb-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-4 sm:mb-0">
                    {title && (
                      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {actions && (
                    <div className="flex-shrink-0">
                      {actions}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Content Section */}
            <motion.div
              variants={contentVariants}
              className={`grid ${gridClasses[gridCols]} ${spacingClasses[spacing]}`}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to top button */}
      <motion.button
        className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg
          className="w-6 h-6 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </motion.button>
    </div>
  );
};

// Grid item wrapper component for consistent spacing and animations
export interface DashboardGridItemProps {
  children: ReactNode;
  colSpan?: 1 | 2 | 3 | 4 | 6 | 12;
  className?: string;
  delay?: number;
}

export const DashboardGridItem: React.FC<DashboardGridItemProps> = ({
  children,
  colSpan = 1,
  className = '',
  delay = 0,
}) => {
  const colSpanClasses = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-2 lg:col-span-3',
    4: 'col-span-1 md:col-span-2 lg:col-span-4',
    6: 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-6',
    12: 'col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-12',
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`${colSpanClasses[colSpan]} ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default DashboardLayout;
