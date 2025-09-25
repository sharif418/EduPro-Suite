'use client';

import React, { useState } from 'react';
import { cn } from '@/app/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  error,
  label,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            isOpen && 'ring-2 ring-indigo-500 border-transparent'
          )}
        >
          <span className={cn(
            selectedOption ? 'text-gray-900' : 'text-gray-500'
          )}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={cn(
            'h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none',
                    value === option.value && 'bg-indigo-50 text-indigo-600'
                  )}
                >
                  <span className="flex-1 text-left">{option.label}</span>
                  {value === option.value && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};
