'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/app/hooks/useSession';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface ClassAssignment {
  id: string;
  classLevel: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  };
  subject: {
    id: string;
    name: string;
  };
}

export default function CreateAssignment() {
  const { user } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Available classes for the teacher
  const [classAssignments, setClassAssignments] = useState<ClassAssignment[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    classLevelId: '',
    sectionId: '',
    subjectId: '',
    dueDate: '',
    dueTime: '',
    maxMarks: '',
  });
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  const fetchTeacherClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes');
      if (response.ok) {
        const data = await response.json();
        setClassAssignments(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      setError('Failed to load your classes');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`File "${file.name}" is too large. Maximum size is 50MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    setError(null);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]): Promise<any[]> => {
    if (files.length === 0) return [];

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('type', 'assignment');

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload files');
    }

    const data = await response.json();
    return data.files || [];
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      setError('Assignment title is required');
      return;
    }
    
    if (!formData.classLevelId || !formData.sectionId || !formData.subjectId) {
      setError('Please select class, section, and subject');
      return;
    }
    
    if (!formData.dueDate || !formData.dueTime) {
      setError('Please set due date and time');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload files first
      let attachments: any[] = [];
      if (selectedFiles.length > 0) {
        attachments = await uploadFiles(selectedFiles);
      }

      // Combine date and time
      const dueDateTime = new Date(`${formData.dueDate}T${formData.dueTime}`);

      // Prepare assignment data
      const assignmentData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        instructions: formData.instructions.trim() || null,
        classLevelId: formData.classLevelId,
        sectionId: formData.sectionId,
        subjectId: formData.subjectId,
        dueDate: dueDateTime.toISOString(),
        maxMarks: formData.maxMarks ? parseInt(formData.maxMarks) : null,
        attachments: attachments.length > 0 ? attachments : null
      };

      // Create assignment
      const response = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assignmentData),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Assignment created successfully and notifications sent to students!');
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/${locale}/teacher/assignments/${data.assignment.id}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      setError('An error occurred while creating the assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // Get available sections and subjects based on selected class
  const selectedClassAssignment = classAssignments.find(ca => 
    ca.classLevel.id === formData.classLevelId && 
    ca.section.id === formData.sectionId && 
    ca.subject.id === formData.subjectId
  );

  const availableClasses = [...new Set(classAssignments.map(ca => ca.classLevel))];
  const availableSections = formData.classLevelId 
    ? [...new Set(classAssignments
        .filter(ca => ca.classLevel.id === formData.classLevelId)
        .map(ca => ca.section))]
    : [];
  const availableSubjects = formData.classLevelId && formData.sectionId
    ? [...new Set(classAssignments
        .filter(ca => ca.classLevel.id === formData.classLevelId && ca.section.id === formData.sectionId)
        .map(ca => ca.subject))]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/${locale}/teacher/assignments`}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Assignments
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Assignment</h1>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-green-800">
              <span className="mr-2">✅</span>
              <span className="font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-red-800">
              <span className="mr-2">❌</span>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assignment Title */}
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter assignment title"
              />
            </div>

            {/* Class Selection */}
            <div>
              <label htmlFor="classLevelId" className="block text-sm font-medium text-gray-700 mb-2">
                Class *
              </label>
              <select
                id="classLevelId"
                name="classLevelId"
                value={formData.classLevelId}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Class</option>
                {availableClasses.map(classLevel => (
                  <option key={classLevel.id} value={classLevel.id}>
                    {classLevel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Selection */}
            <div>
              <label htmlFor="sectionId" className="block text-sm font-medium text-gray-700 mb-2">
                Section *
              </label>
              <select
                id="sectionId"
                name="sectionId"
                value={formData.sectionId}
                onChange={handleInputChange}
                required
                disabled={!formData.classLevelId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Section</option>
                {availableSections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label htmlFor="subjectId" className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <select
                id="subjectId"
                name="subjectId"
                value={formData.subjectId}
                onChange={handleInputChange}
                required
                disabled={!formData.sectionId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Subject</option>
                {availableSubjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Maximum Marks */}
            <div>
              <label htmlFor="maxMarks" className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Marks
              </label>
              <input
                type="number"
                id="maxMarks"
                name="maxMarks"
                value={formData.maxMarks}
                onChange={handleInputChange}
                min="1"
                max="1000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter maximum marks"
              />
            </div>
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date *
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 mb-2">
                Due Time *
              </label>
              <input
                type="time"
                id="dueTime"
                name="dueTime"
                value={formData.dueTime}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide a brief description of the assignment"
            />
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              id="instructions"
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide detailed instructions for students"
            />
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments
            </label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <span className="text-4xl mb-2">📎</span>
                <span className="text-lg font-medium text-gray-900 mb-1">
                  Click to upload files
                </span>
                <span className="text-sm text-gray-600">
                  PDF, DOC, DOCX, TXT, JPG, PNG, GIF (Max 50MB each)
                </span>
              </label>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Selected Files:</h4>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="mr-2">📄</span>
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href={`/${locale}/teacher/assignments`}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {submitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {submitting ? 'Creating Assignment...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
