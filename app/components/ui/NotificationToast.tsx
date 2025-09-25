'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useSound, useMotion } from '../../contexts/SettingsContext';

export interface NotificationToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  showProgress?: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  image?: string;
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  playSound?: boolean;
  bengaliText?: boolean;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  showProgress = true,
  actions = [],
  image,
  onClose,
  position = 'top-right',
  playSound = false,
  bengaliText = false,
}) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [remainingTime, setRemainingTime] = useState(duration);

  // Auto-dismiss timer with proper pause logic
  useEffect(() => {
    if (duration <= 0) return;

    const updateProgress = () => {
      if (isPaused) return;

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, remainingTime - elapsed);
      const progressPercent = (remaining / duration) * 100;

      setProgress(progressPercent);

      if (remaining <= 0) {
        handleClose();
      }
    };

    const interval = setInterval(updateProgress, 50);

    return () => clearInterval(interval);
  }, [duration, isPaused, startTime, remainingTime, id]);

  // User preferences hooks
  const { soundEnabled, playSound: playSoundEffect } = useSound();
  const { shouldAnimate, getAnimationDuration, getTransition } = useMotion();

  // Play sound effect with user preferences
  useEffect(() => {
    if (playSound && soundEnabled && typeof window !== 'undefined') {
      // Only play sound on user gesture or when explicitly enabled
      const playNotificationSound = () => {
        playSoundEffect(type);
      };

      // Delay sound to ensure it's triggered by user interaction context
      const timer = setTimeout(playNotificationSound, 100);
      return () => clearTimeout(timer);
    }
  }, [playSound, soundEnabled, type, playSoundEffect]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const handleMouseEnter = () => {
    if (!isPaused) {
      // Calculate remaining time when pausing
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, remainingTime - elapsed);
      setRemainingTime(remaining);
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (isPaused) {
      // Reset start time and use stored remaining time
      setStartTime(Date.now());
      setIsPaused(false);
    }
  };

  // Type configurations
  const typeConfigs = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-900 dark:text-green-100',
      progressColor: 'bg-green-500',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-900 dark:text-red-100',
      progressColor: 'bg-red-500',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
      progressColor: 'bg-yellow-500',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-900 dark:text-blue-100',
      progressColor: 'bg-blue-500',
    },
  };

  const config = typeConfigs[type];
  const IconComponent = config.icon;

  // Animation variants with reduced motion support
  const toastVariants = {
    initial: shouldAnimate ? {
      opacity: 0,
      x: position.includes('right') ? 100 : position.includes('left') ? -100 : 0,
      y: position.includes('top') ? -100 : position.includes('bottom') ? 100 : 0,
      scale: 0.8,
    } : {
      opacity: 0,
    },
    animate: shouldAnimate ? {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: getTransition({
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }),
    } : {
      opacity: 1,
      transition: { duration: 0 },
    },
    exit: shouldAnimate ? {
      opacity: 0,
      x: position.includes('right') ? 100 : position.includes('left') ? -100 : 0,
      y: position.includes('top') ? -20 : 20,
      scale: 0.8,
      transition: getTransition({
        duration: 0.3,
        ease: 'easeInOut',
      }),
    } : {
      opacity: 0,
      transition: { duration: 0 },
    },
  };

  const progressVariants = {
    initial: { width: '100%' },
    animate: { 
      width: `${progress}%`,
      transition: getTransition({
        duration: 0.1,
        ease: 'linear',
      }),
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={toastVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`
            relative max-w-sm w-full rounded-lg border shadow-lg overflow-hidden
            ${config.bgColor} ${config.borderColor}
          `}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Progress bar */}
          {showProgress && duration > 0 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
              <motion.div
                variants={progressVariants}
                animate="animate"
                className={`h-full ${config.progressColor}`}
              />
            </div>
          )}

          <div className="p-4">
            <div className="flex items-start">
              {/* Icon */}
              <div className="flex-shrink-0">
                <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
              </div>

              {/* Content */}
              <div className="ml-3 flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Title */}
                    <h4 className={`text-sm font-medium ${config.titleColor}`}>
                      {title}
                    </h4>

                    {/* Message */}
                    {message && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {message}
                      </p>
                    )}

                    {/* Image */}
                    {image && (
                      <div className="mt-2">
                        <img
                          src={image}
                          alt="Notification"
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    {actions.length > 0 && (
                      <div className="mt-3 flex space-x-2">
                        {actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={action.onClick}
                            className={`
                              px-3 py-1 text-xs font-medium rounded-md transition-colors
                              ${action.variant === 'primary'
                                ? `${config.progressColor} text-white hover:opacity-90`
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }
                            `}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Close button */}
                  <button
                    onClick={handleClose}
                    className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Islamic pattern decoration */}
          <div className="absolute top-0 right-0 w-16 h-16 opacity-5 overflow-hidden">
            <svg
              className="w-full h-full transform rotate-12"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern
                  id={`islamic-pattern-${id}`}
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
              <rect width="100%" height="100%" fill={`url(#islamic-pattern-${id})`} />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Toast Container Component
export interface ToastContainerProps {
  toasts: NotificationToastProps[];
  position?: NotificationToastProps['position'];
  maxToasts?: number;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = 'top-right',
  maxToasts = 5,
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  const visibleToasts = toasts.slice(0, maxToasts);

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      <div className="space-y-2">
        <AnimatePresence>
          {visibleToasts.map((toast) => (
            <NotificationToast key={toast.id} {...toast} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotificationToast;
