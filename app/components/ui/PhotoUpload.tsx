'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/app/lib/utils';
import { Upload, X, User } from 'lucide-react';

interface PhotoUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  className?: string;
  disabled?: boolean;
}

export function PhotoUpload({ value, onChange, className, disabled }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64 for demo purposes
      // In a real application, you would upload to a cloud storage service
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange(result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'relative w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200',
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
          isUploading && 'opacity-75'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {value ? (
          <div className="relative w-full h-full">
            <img
              src={value}
              alt="Student photo"
              className="w-full h-full object-cover rounded-lg"
            />
            {!disabled && !isUploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-gray-500">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <span className="text-xs mt-2">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <User className="w-8 h-8 mb-2" />
                <Upload className="w-4 h-4 mb-1" />
                <span className="text-xs text-center">
                  Drop photo here or click to upload
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <p className="text-xs text-gray-500 mt-2 text-center">
        Max file size: 5MB
      </p>
    </div>
  );
}
