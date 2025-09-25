'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { integrationService } from '@/app/lib/integration-service';
import { useSettings } from '@/app/contexts/SettingsContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Report error to logging service
    this.reportError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        userId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
      };

      // Send to error tracking service (Sentry, LogRocket, etc.)
      await integrationService.trackEvent('error_boundary_triggered', errorReport);

      // Also send to backend for logging
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(errorReport),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          retryCount={this.retryCount}
          maxRetries={this.maxRetries}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackUIProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReload: () => void;
  onGoHome: () => void;
}

const ErrorFallbackUI: React.FC<ErrorFallbackUIProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  maxRetries,
  onRetry,
  onReload,
  onGoHome,
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
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
        </div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Oops! Something went wrong
        </h1>

        {/* Error Description */}
        <div className="text-center mb-6">
          <p className="text-gray-600 mb-2">
            We encountered an unexpected error. Our team has been notified and is working on a fix.
          </p>
          {errorId && (
            <p className="text-sm text-gray-500">
              Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{errorId}</code>
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          {retryCount < maxRetries && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again ({maxRetries - retryCount} attempts left)
            </button>
          )}
          <button
            onClick={onReload}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Reload Page
          </button>
          <button
            onClick={onGoHome}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Go Home
          </button>
        </div>

        {/* Development Error Details */}
        {isDevelopment && error && (
          <details className="mt-6 p-4 bg-gray-50 rounded-lg">
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              Error Details (Development Only)
            </summary>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700">Error Message:</h3>
                <pre className="mt-1 p-2 bg-red-50 text-red-800 text-sm rounded overflow-auto">
                  {error.message}
                </pre>
              </div>
              {error.stack && (
                <div>
                  <h3 className="font-medium text-gray-700">Stack Trace:</h3>
                  <pre className="mt-1 p-2 bg-gray-100 text-gray-800 text-xs rounded overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <h3 className="font-medium text-gray-700">Component Stack:</h3>
                  <pre className="mt-1 p-2 bg-blue-50 text-blue-800 text-xs rounded overflow-auto max-h-40">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Support Information */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-800 text-sm">
            If this problem persists, please contact our support team with the error ID above.
            We're here to help you get back on track.
          </p>
        </div>
      </div>
    </div>
  );
};

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryClass fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundaryClass>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting in functional components
export function useErrorHandler() {
  const reportError = async (error: Error, context?: any) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        userId: typeof window !== 'undefined' ? localStorage.getItem('userId') : null,
      };

      await integrationService.trackEvent('manual_error_report', errorReport);

      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(errorReport),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  return { reportError };
}

// Specialized error boundaries for different contexts
export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundaryClass
    onError={(error, errorInfo) => {
      console.error('Page Error:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundaryClass>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  componentName?: string;
}> = ({ children, componentName }) => (
  <ErrorBoundaryClass
    fallback={
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">
          {componentName ? `${componentName} component` : 'This component'} encountered an error.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Reload Page
        </button>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error(`Component Error (${componentName}):`, error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundaryClass>
);

export default ErrorBoundaryClass;
