'use client';

import { useEffect, useState, use } from 'react';
import { useSession } from '@/app/hooks/useSession';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  subject: {
    name: string;
  };
  teacher: {
    name: string;
  };
  dueDate: string;
  maxMarks?: number;
  submission?: {
    id: string;
    status: string;
    fileUrls?: any[];
  };
  isOverdue: boolean;
  daysUntilDue: number;
  canSubmit: boolean;
}

export default function SubmitAssignment({
  params
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const resolvedParams = use(params);
  const { user } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [textSubmission, setTextSubmission] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchAssignment();
  }, [resolvedParams.assignmentId]);

  const fetchAssignment = async () => {
    try {
      const response = await fetch('/api/student/assignments');
      if (response.ok) {
        const data = await response.json();
        const foundAssignment = data.assignments?.find((a: Assignment) => a.id === resolvedParams.assignmentId);
        
        if (foundAssignment) {
          setAssignment(foundAssignment);
          // Pre-fill text submission if resubmitting
          if (foundAssignment.submission?.fileUrls) {
            const textFile = foundAssignment.submission.fileUrls.find((file: any) => file.type === 'text');
            if (textFile) {
              setTextSubmission(textFile.content || '');
            }
          }
        } else {
          setError('Assignment not found');
        }
      } else {
        setError('Failed to fetch assignment');
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
      setError('An error occurred while fetching the assignment');
    } finally {
      setLoading(false);
    }
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
    
    if (!assignment) return;
    
    if (selectedFiles.length === 0 && !textSubmission.trim()) {
      setError('Please provide either files or text submission');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload files first
      let uploadedFiles: any[] = [];
      if (selectedFiles.length > 0) {
        uploadedFiles = await uploadFiles(selectedFiles);
      }

      // Prepare submission data
      const submissionData = {
        fileUrls: uploadedFiles,
        textSubmission: textSubmission.trim() || null
      };

      // Submit assignment
      const method = assignment.submission?.id ? 'PUT' : 'POST';
      const response = await fetch(`/api/student/assignments/${assignment.id}/submit`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || 'Assignment submitted successfully!');
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(`/${locale}/student/assignments/${assignment.id}`);
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit assignment');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      setError('An error occurred while submitting the assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <span className="text-6xl mb-4 block">❌</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Not Found</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link
          href={`/${locale}/student/assignments`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Assignments
        </Link>
      </div>
    );
  }

  if (!assignment?.canSubmit || assignment.isOverdue) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <span className="text-6xl mb-4 block">⏰</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {assignment?.isOverdue ? 'Assignment Overdue' : 'Submission Not Available'}
        </h3>
        <p className="text-gray-600 mb-4">
          {assignment?.isOverdue 
            ? 'The deadline for this assignment has passed.'
            : 'This assignment is not available for submission.'
          }
        </p>
        <Link
          href={`/${locale}/student/assignments/${assignment?.id}`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Assignment
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/${locale}/student/assignments/${assignment.id}`}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Assignment
          </Link>
        </div>
      </div>

      {/* Assignment Info */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {assignment.submission?.id ? 'Update Submission' : 'Submit Assignment'}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-6">
          <div className="flex items-center">
            <span className="mr-2">📚</span>
            <span><strong>Subject:</strong> {assignment.subject.name}</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">👨‍🏫</span>
            <span><strong>Teacher:</strong> {assignment.teacher.name}</span>
          </div>
          <div className="flex items-center">
            <span className="mr-2">📅</span>
            <span><strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}</span>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">{assignment.title}</h2>
        
        {assignment.description && (
          <p className="text-gray-700 mb-4">{assignment.description}</p>
        )}

        {assignment.instructions && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
            <p className="text-blue-800 whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
        )}

        {/* Time remaining */}
        {assignment.daysUntilDue >= 0 && (
          <div className={`p-3 rounded-lg mb-6 ${assignment.daysUntilDue <= 1 ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
            <div className={`flex items-center ${assignment.daysUntilDue <= 1 ? 'text-orange-800' : 'text-blue-800'}`}>
              <span className="mr-2">{assignment.daysUntilDue <= 1 ? '⏰' : '📅'}</span>
              <span className="font-medium">
                {assignment.daysUntilDue === 0 
                  ? 'Due today'
                  : `${assignment.daysUntilDue} day${assignment.daysUntilDue > 1 ? 's' : ''} remaining`
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center text-green-800">
            <span className="mr-2">✅</span>
            <span className="font-medium">{success}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center text-red-800">
            <span className="mr-2">❌</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h3>
          
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

        {/* Text Submission */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Text Submission</h3>
          <textarea
            value={textSubmission}
            onChange={(e) => setTextSubmission(e.target.value)}
            placeholder="Enter your assignment text here..."
            rows={8}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-600 mt-2">
            You can provide your assignment content as text if you don't have files to upload.
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center space-x-4">
          <Link
            href={`/${locale}/student/assignments/${assignment.id}`}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          
          <button
            type="submit"
            disabled={submitting || (!selectedFiles.length && !textSubmission.trim())}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {submitting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {submitting 
              ? 'Submitting...' 
              : assignment.submission?.id 
                ? 'Update Submission' 
                : 'Submit Assignment'
            }
          </button>
        </div>
      </form>
    </div>
  );
}
