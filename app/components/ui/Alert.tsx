'use client';

import React from 'react';
import { cn } from '@/app/lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  children: React.ReactNode;
}

const alertVariants = {
  default: 'bg-blue-50 border-blue-200 text-blue-800',
  destructive: 'bg-red-50 border-red-200 text-red-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
};

const alertIcons = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle,
  warning: AlertTriangle,
};

export const Alert: React.FC<AlertProps> = ({ 
  className, 
  variant = 'default', 
  children, 
  ...props 
}) => {
  const Icon = alertIcons[variant];

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        alertVariants[variant],
        className
      )}
      {...props}
    >
      <div className="flex">
        <Icon className="h-4 w-4 mr-3 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ 
  className, 
  children, 
  ...props 
}) => {
  return (
    <div
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    >
      {children}
    </div>
  );
};

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const AlertTitle: React.FC<AlertTitleProps> = ({ 
  className, 
  children, 
  ...props 
}) => {
  return (
    <h5
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h5>
  );
};
