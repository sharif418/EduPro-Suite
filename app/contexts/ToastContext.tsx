'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, NotificationToastProps } from '../components/ui/NotificationToast';

interface ToastContextType {
  showToast: (toast: Omit<NotificationToastProps, 'id' | 'onClose'>) => string;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
  toasts: NotificationToastProps[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  position?: NotificationToastProps['position'];
  defaultDuration?: number;
  enableSounds?: boolean;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  position = 'top-right',
  defaultDuration = 5000,
  enableSounds = true,
}) => {
  const [toasts, setToasts] = useState<NotificationToastProps[]>([]);

  const showToast = useCallback((toastData: Omit<NotificationToastProps, 'id' | 'onClose'>): string => {
    const id = Math.random().toString(36).substring(7);
    
    const newToast: NotificationToastProps = {
      ...toastData,
      id,
      duration: toastData.duration ?? defaultDuration,
      position,
      playSound: enableSounds && (toastData.playSound ?? true),
      onClose: hideToast,
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    return id;
  }, [defaultDuration, position, enableSounds, maxToasts]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    hideToast,
    clearAllToasts,
    toasts,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer 
        toasts={toasts} 
        position={position}
        maxToasts={maxToasts}
      />
    </ToastContext.Provider>
  );
};

// Custom hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Utility functions for common toast types
export const useToastHelpers = () => {
  const { showToast } = useToast();

  return {
    success: (title: string, message?: string, options?: Partial<NotificationToastProps>) =>
      showToast({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<NotificationToastProps>) =>
      showToast({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<NotificationToastProps>) =>
      showToast({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<NotificationToastProps>) =>
      showToast({ type: 'info', title, message, ...options }),
    
    // Islamic-themed notifications
    achievement: (title: string, message?: string) =>
      showToast({
        type: 'success',
        title,
        message,
        duration: 8000,
        playSound: true,
        actions: [
          {
            label: 'View Details',
            onClick: () => console.log('View achievement details'),
            variant: 'primary',
          },
        ],
      }),
    
    // Real-time dashboard updates
    dashboardUpdate: (title: string, message?: string, data?: any) =>
      showToast({
        type: 'info',
        title,
        message,
        duration: 4000,
        actions: data?.actionUrl ? [
          {
            label: 'View',
            onClick: () => window.location.href = data.actionUrl,
            variant: 'primary',
          },
        ] : undefined,
      }),
  };
};

export default ToastProvider;
