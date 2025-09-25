'use client';

import { useState, useEffect } from 'react';
import { Upload, X, Download, Eye, Trash2, FileText, Image, Video, Music } from 'lucide-react';

interface LessonResource {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  resourceType: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'PRESENTATION' | 'WORKSHEET' | 'OTHER';
  description?: string;
  uploadedBy: {
    name: string;
  };
  createdAt: string;
}

interface LessonResourceManagerProps {
  lessonPlanId: string;
  onResourcesChange?: (resources: LessonResource[]) => void;
}

export default function LessonResourceManager({ lessonPlanId, onResourcesChange }: LessonResourceManagerProps) {
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    if (lessonPlanId) {
      fetchResources();
    }
  }, [lessonPlanId]);

  const fetchResources = async () => {
    try {
      const response = await fetch(`/api/teacher/lessons/resources?lessonPlanId=${lessonPlanId}`);
      if (response.ok) {
        const data = await response.json();
        setResources(data.resources || []);
        onResourcesChange?.(data.resources || []);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        // First upload the file using the existing upload API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'lesson');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('File upload failed');
        }

        const uploadData = await uploadResponse.json();

        // Then create the lesson resource record
        const resourceResponse = await fetch('/api/teacher/lessons/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lessonPlanId,
            fileName: file.name,
            fileUrl: uploadData.url,
            fileType: file.type,
            fileSize: file.size,
            resourceType: getResourceType(file.type),
            description: '',
          }),
        });

        if (!resourceResponse.ok) {
          throw new Error('Failed to create resource record');
        }

        return await resourceResponse.json();
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        return null;
      }
    });

    const uploadedResources = await Promise.all(uploadPromises);
    const successfulUploads = uploadedResources.filter(Boolean);

    if (successfulUploads.length > 0) {
      await fetchResources(); // Refresh the list
    }

    setUploading(false);
  };

  const getResourceType = (fileType: string): LessonResource['resourceType'] => {
    if (fileType.startsWith('image/')) return 'IMAGE';
    if (fileType.startsWith('video/')) return 'VIDEO';
    if (fileType.startsWith('audio/')) return 'AUDIO';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'PRESENTATION';
    if (fileType.includes('worksheet') || fileType.includes('excel')) return 'WORKSHEET';
    if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return 'DOCUMENT';
    return 'OTHER';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const response = await fetch(`/api/teacher/lessons/resources?id=${resourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchResources(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (resourceType: string, fileType: string) => {
    switch (resourceType) {
      case 'IMAGE':
        return <Image className="h-8 w-8 text-green-500" />;
      case 'VIDEO':
        return <Video className="h-8 w-8 text-red-500" />;
      case 'AUDIO':
        return <Music className="h-8 w-8 text-purple-500" />;
      default:
        return <FileText className="h-8 w-8 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            Upload lesson resources
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop files here, or click to select files
          </p>
          <p className="text-xs text-gray-400">
            Supports: PDF, DOC, PPT, Images, Videos, Audio (Max 50MB per file)
          </p>
        </div>
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mp3,.wav,.txt"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Select Files'}
        </label>
      </div>

      {/* Resources List */}
      {resources.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            Attached Resources ({resources.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getFileIcon(resource.resourceType, resource.fileType)}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {resource.fileName}
                      </h4>
                      {resource.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {resource.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
                        <span>{resource.resourceType}</span>
                        <span>•</span>
                        <span>{formatFileSize(resource.fileSize)}</span>
                        <span>•</span>
                        <span>by {resource.uploadedBy.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <a
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                    <a
                      href={resource.fileUrl}
                      download={resource.fileName}
                      className="p-1 text-gray-400 hover:text-green-600"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteResource(resource.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {resources.length === 0 && !uploading && (
        <div className="text-center py-6 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p>No resources attached yet</p>
          <p className="text-sm">Upload files to share with students</p>
        </div>
      )}
    </div>
  );
}
