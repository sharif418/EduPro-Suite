'use client';

import { useState, useRef } from 'react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
  multiple?: boolean;
  disabled?: boolean;
}

interface UploadedFile {
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
}

export default function FileUpload({
  onFilesSelected,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ],
  className = '',
  multiple = true,
  disabled = false
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File "${file.name}" is too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB.`;
    }
    
    if (!acceptedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed.`;
    }
    
    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    
    setError(null);
    const fileArray = Array.from(files);
    
    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(validationError);
      } else {
        validFiles.push(file);
      }
    }
    
    if (errors.length > 0) {
      setError(errors.join(' '));
      return;
    }
    
    // Check total file count
    if (selectedFiles.length + validFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed.`);
      return;
    }
    
    // Create file objects with previews for images
    const newFiles: UploadedFile[] = validFiles.map(file => {
      const uploadedFile: UploadedFile = { file };
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        uploadedFile.preview = URL.createObjectURL(file);
      }
      
      return uploadedFile;
    });
    
    const updatedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles.map(f => f.file));
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles.map(f => f.file));
    setError(null);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📃';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAcceptString = () => {
    return acceptedTypes.join(',');
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200
          ${dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={getAcceptString()}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className="space-y-2">
          <div className="text-4xl mb-2">
            {dragActive ? '📥' : '📎'}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {dragActive
                ? 'Drop files here'
                : 'Click to upload or drag and drop'
              }
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {acceptedTypes.includes('application/pdf') && 'PDF, '}
              {acceptedTypes.includes('application/msword') && 'DOC, '}
              {acceptedTypes.includes('image/jpeg') && 'Images, '}
              {acceptedTypes.includes('text/plain') && 'Text files'}
              <br />
              Max {maxFiles} files, {(maxSize / 1024 / 1024).toFixed(0)}MB each
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center text-red-800">
            <span className="mr-2">❌</span>
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Selected Files ({selectedFiles.length}/{maxFiles})
          </h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* File Icon or Preview */}
                  <div className="flex-shrink-0">
                    {uploadedFile.preview ? (
                      <img
                        src={uploadedFile.preview}
                        alt={uploadedFile.file.name}
                        className="w-10 h-10 object-cover rounded"
                        onLoad={() => URL.revokeObjectURL(uploadedFile.preview!)}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                        <span className="text-lg">{getFileIcon(uploadedFile.file.type)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                  </div>
                  
                  {/* Progress Bar (if uploading) */}
                  {uploadedFile.progress !== undefined && uploadedFile.progress < 100 && (
                    <div className="w-20">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadedFile.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{uploadedFile.progress}%</p>
                    </div>
                  )}
                </div>
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  className="ml-3 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File Type Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        <p className="font-medium mb-1">Supported file types:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
          {acceptedTypes.includes('application/pdf') && <span>• PDF documents</span>}
          {acceptedTypes.includes('application/msword') && <span>• Word documents</span>}
          {acceptedTypes.includes('image/jpeg') && <span>• JPEG images</span>}
          {acceptedTypes.includes('image/png') && <span>• PNG images</span>}
          {acceptedTypes.includes('text/plain') && <span>• Text files</span>}
          {acceptedTypes.includes('application/vnd.ms-powerpoint') && <span>• PowerPoint</span>}
        </div>
      </div>
    </div>
  );
}

// Hook for file upload with progress tracking
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ [key: string]: number }>({});

  const uploadFiles = async (files: File[], uploadType: string = 'assignment'): Promise<any[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('type', uploadType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const data = await response.json();
      return data.files || [];
    } finally {
      setUploading(false);
      setProgress({});
    }
  };

  return {
    uploadFiles,
    uploading,
    progress
  };
}
