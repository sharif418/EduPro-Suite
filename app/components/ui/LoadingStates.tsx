'use client';

import React from 'react';
import { Icons } from '../icons/IconLibrary';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave';
}

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  children?: React.ReactNode;
  backdrop?: 'light' | 'dark' | 'blur';
}

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

interface LoadingProgressProps {
  progress: number;
  message?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

// Loading Spinner Component
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorClasses = {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-gray-600 dark:text-gray-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <Icons.RefreshCw size={24} />
    </div>
  );
};

// Loading Skeleton Component
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'rectangular',
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse', // Could implement wave animation with CSS
  };

  const variantClasses = {
    text: 'rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

// Loading Overlay Component
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  children,
  backdrop = 'light',
}) => {
  if (!isVisible) return <>{children}</>;

  const backdropClasses = {
    light: 'bg-white/80',
    dark: 'bg-black/50',
    blur: 'bg-white/80 backdrop-blur-sm',
  };

  return (
    <div className="relative">
      {children}
      <div className={`absolute inset-0 flex items-center justify-center ${backdropClasses[backdrop]} z-50`}>
        <div className="flex flex-col items-center space-y-4 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};

// Loading Dots Component
export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 'md',
  color = 'currentColor',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`${sizeClasses[size]} rounded-full animate-pulse`}
          style={{
            backgroundColor: color,
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );
};

// Loading Progress Component
export const LoadingProgress: React.FC<LoadingProgressProps> = ({
  progress,
  message,
  showPercentage = true,
  color = 'primary',
  size = 'md',
}) => {
  const colorClasses = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full">
      {(message || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {message && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {message}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

// Page Loading Component
export const PageLoading: React.FC<{ message?: string }> = ({ 
  message = 'Loading page...' 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="xl" />
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          {message}
        </p>
      </div>
    </div>
  );
};

// Card Loading Component
export const CardLoading: React.FC<{ 
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}> = ({ 
  lines = 3, 
  showAvatar = false,
  className = '',
}) => {
  return (
    <div className={`p-4 space-y-3 ${className}`}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <LoadingSkeleton variant="circular" width={40} height={40} />
          <div className="space-y-2 flex-1">
            <LoadingSkeleton width="60%" height="1rem" />
            <LoadingSkeleton width="40%" height="0.75rem" />
          </div>
        </div>
      )}
      
      {Array.from({ length: lines }).map((_, index) => (
        <LoadingSkeleton
          key={index}
          width={index === lines - 1 ? '75%' : '100%'}
          height="0.875rem"
        />
      ))}
    </div>
  );
};

// Table Loading Component
export const TableLoading: React.FC<{ 
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}> = ({ 
  rows = 5, 
  columns = 4,
  showHeader = true,
}) => {
  return (
    <div className="w-full">
      {showHeader && (
        <div className="grid gap-4 p-4 border-b border-gray-200 dark:border-gray-700" 
             style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <LoadingSkeleton key={index} height="1rem" width="80%" />
          ))}
        </div>
      )}
      
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex}
          className="grid gap-4 p-4 border-b border-gray-100 dark:border-gray-800"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton 
              key={colIndex} 
              height="0.875rem" 
              width={colIndex === 0 ? '90%' : '70%'} 
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Form Loading Component
export const FormLoading: React.FC<{ 
  fields?: number;
  showSubmitButton?: boolean;
}> = ({ 
  fields = 4,
  showSubmitButton = true,
}) => {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <LoadingSkeleton width="25%" height="1rem" />
          <LoadingSkeleton width="100%" height="2.5rem" />
        </div>
      ))}
      
      {showSubmitButton && (
        <div className="pt-4">
          <LoadingSkeleton width="120px" height="2.5rem" />
        </div>
      )}
    </div>
  );
};

// Chart Loading Component
export const ChartLoading: React.FC<{ 
  type?: 'bar' | 'line' | 'pie' | 'area';
  height?: number;
}> = ({ 
  type = 'bar',
  height = 300,
}) => {
  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <div className="flex items-end justify-center h-full space-x-2 p-4">
        {type === 'bar' && Array.from({ length: 8 }).map((_, index) => (
          <LoadingSkeleton
            key={index}
            width="20px"
            height={`${Math.random() * 60 + 40}%`}
            className="flex-shrink-0"
          />
        ))}
        
        {type === 'pie' && (
          <LoadingSkeleton
            variant="circular"
            width={height * 0.6}
            height={height * 0.6}
          />
        )}
        
        {(type === 'line' || type === 'area') && (
          <div className="w-full h-full relative">
            <LoadingSkeleton width="100%" height="100%" />
            <div className="absolute inset-0 flex items-center justify-center">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Button Loading Component
export const ButtonLoading: React.FC<{
  children: React.ReactNode;
  isLoading: boolean;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({
  children,
  isLoading,
  loadingText,
  disabled = false,
  className = '',
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`relative ${className} ${isLoading ? 'cursor-not-allowed' : ''}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" color="secondary" />
        </div>
      )}
      
      <span className={isLoading ? 'opacity-0' : 'opacity-100'}>
        {isLoading && loadingText ? loadingText : children}
      </span>
    </button>
  );
};

// List Loading Component
export const ListLoading: React.FC<{
  items?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}> = ({
  items = 5,
  showAvatar = false,
  showActions = false,
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          {showAvatar && (
            <LoadingSkeleton variant="circular" width={40} height={40} />
          )}
          
          <div className="flex-1 space-y-2">
            <LoadingSkeleton width="70%" height="1rem" />
            <LoadingSkeleton width="50%" height="0.75rem" />
          </div>
          
          {showActions && (
            <div className="flex space-x-2">
              <LoadingSkeleton width="60px" height="32px" />
              <LoadingSkeleton width="60px" height="32px" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Dashboard Loading Component
export const DashboardLoading: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <LoadingSkeleton width="300px" height="2rem" />
        <LoadingSkeleton width="500px" height="1rem" />
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <LoadingSkeleton variant="circular" width={40} height={40} />
              <LoadingSkeleton width="60px" height="1.5rem" />
            </div>
            <LoadingSkeleton width="80%" height="1rem" />
          </div>
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <LoadingSkeleton width="200px" height="1.5rem" className="mb-4" />
          <ChartLoading type="bar" height={250} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <LoadingSkeleton width="200px" height="1.5rem" className="mb-4" />
          <ChartLoading type="line" height={250} />
        </div>
      </div>
      
      {/* Recent Activities */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <LoadingSkeleton width="200px" height="1.5rem" className="mb-4" />
        <ListLoading items={5} showAvatar={true} />
      </div>
    </div>
  );
};

// Error State Component
export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
}> = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading the data.',
  onRetry,
  showRetryButton = true,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
        <Icons.AlertTriangle size={32} className="text-red-600 dark:text-red-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {message}
      </p>
      
      {showRetryButton && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
        >
          <Icons.RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

// Empty State Component
export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  icon?: keyof typeof Icons;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  title = 'No data found',
  message = 'There is no data to display at the moment.',
  icon = 'FileText',
  actionLabel,
  onAction,
}) => {
  const IconComponent = Icons[icon];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <IconComponent size={32} className="text-gray-400 dark:text-gray-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {message}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Inline Loading Component
export const InlineLoading: React.FC<{
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({
  text = 'Loading...',
  size = 'sm',
}) => {
  return (
    <div className="flex items-center space-x-2">
      <LoadingSpinner size={size} />
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {text}
      </span>
    </div>
  );
};

// Loading States Hook
export const useLoadingStates = () => {
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({});

  const setLoading = React.useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading,
    }));
  }, []);

  const isLoading = React.useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const withLoading = React.useCallback(async (
    key: string,
    asyncFunction: () => Promise<any>
  ): Promise<any> => {
    setLoading(key, true);
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  return {
    loadingStates,
    setLoading,
    isLoading,
    withLoading,
  };
};

// Export all components
export default {
  LoadingSpinner,
  LoadingSkeleton,
  LoadingOverlay,
  LoadingDots,
  LoadingProgress,
  PageLoading,
  CardLoading,
  TableLoading,
  FormLoading,
  ChartLoading,
  ButtonLoading,
  ListLoading,
  DashboardLoading,
  ErrorState,
  EmptyState,
  InlineLoading,
};
