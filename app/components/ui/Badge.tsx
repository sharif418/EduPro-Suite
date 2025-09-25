'use client';

import React from 'react';
import { cn } from '@/app/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  secondary: 'bg-gray-100 text-gray-800 border-gray-200',
  destructive: 'bg-red-100 text-red-800 border-red-200',
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  outline: 'bg-transparent text-gray-700 border-gray-300',
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant = 'default',
  size = 'md',
  children, 
  ...props 
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        badgeVariants[variant],
        badgeSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
