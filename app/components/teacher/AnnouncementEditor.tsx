'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';

interface AnnouncementEditorProps {
  announcement?: {
    title: string;
    content: string;
    classId: string;
    isPinned: boolean;
    expiresAt?: string;
    attachments: any[];
  } | null;
  classId?: string | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export function AnnouncementEditor({
  announcement,
  classId,
  onSave,
  onCancel,
}: AnnouncementEditorProps) {
  const [title, setTitle] = useState(announcement?.title || '');
  const [content, setContent] = useState(announcement?.content || '');
  const [selectedClassId, setSelectedClassId] = useState(classId || announcement?.classId || '');
  const [isPinned, setIsPinned] = useState(announcement?.isPinned || false);
  const [expiresAt, setExpiresAt] = useState(
    announcement?.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : ''
  );
  const [classes, setClasses] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title for the announcement');
      return;
    }
    
    if (!content.trim()) {
      alert('Please enter content for the announcement');
      return;
    }
    
    if (!selectedClassId) {
      alert('Please select a class');
      return;
    }

    setLoading(true);

    try {
      // Handle file uploads if any
      let uploadedAttachments: any[] = [];
      
      if (attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file, index) => {
          formData.append(`file${index}`, file);
        });

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedAttachments = uploadData.files || [];
        }
      }

      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        classId: selectedClassId,
        isPinned,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        attachments: uploadedAttachments,
      };

      onSave(announcementData);
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Failed to save announcement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Announcement Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Enter announcement title"
          maxLength={200}
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {title.length}/200 characters
        </div>
      </div>

      {/* Class Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Target Class *
        </label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Select a class</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.classLevel?.name} - {cls.section?.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Announcement Content *
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Enter announcement content..."
          maxLength={2000}
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {content.length}/2000 characters
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Expiration Date (Optional)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Leave empty for permanent announcement
          </div>
        </div>

        <div className="flex items-center">
          <div className="flex items-center h-5">
            <input
              id="isPinned"
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="isPinned" className="font-medium text-gray-700 dark:text-gray-300">
              Pin this announcement
            </label>
            <p className="text-gray-500 dark:text-gray-400">
              Pinned announcements appear at the top
            </p>
          </div>
        </div>
      </div>

      {/* File Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Attachments (Optional)
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
        />
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF (Max 5MB each)
        </div>
        
        {attachments.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Selected files:
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-400">
              {attachments.map((file, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <span>📎</span>
                  <span>{file.name}</span>
                  <span className="text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : announcement ? 'Update Announcement' : 'Create Announcement'}
        </Button>
      </div>
    </div>
  );
}
