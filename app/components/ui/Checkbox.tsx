'use client';

import React from 'react';
import { cn } from '@/app/lib/utils';
import { Check } from 'lucide-react';

interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
  label,
}) => {
  const handleChange = () => {
    if (!disabled) {
      onCheckedChange?.(!checked);
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <button
        type="button"
        id={id}
        onClick={handleChange}
        disabled={disabled}
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          checked && 'bg-indigo-600 border-indigo-600',
          !disabled && 'hover:border-gray-400'
        )}
      >
        {checked && (
          <Check className="h-3 w-3 text-white" />
        )}
      </button>
      {label && (
        <label
          htmlFor={id}
          onClick={handleChange}
          className={cn(
            'text-sm font-medium text-gray-700 cursor-pointer',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};
