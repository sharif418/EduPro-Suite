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
  classLevel: {
    name: string;
  };
  section: {
    name: string;
  };
  dueDate: string;
  maxMarks?: number;
  attachments?: any[];
  submission?: {
    id: string;
    status: string;
    marksObtained?: number;
    feedback?: string;
    submissionDate?: string;
    fileUrls?: any[];
  };
  isOverdue: boolean;
  daysUntilDue: number;
  canSubmit: boolean;
  createdAt: string;
}

export default function AssignmentDetail({
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignment();
  }, [resolvedParams.assignmentId]);

  const fetchAssignment = async () => {
    try {
      // Since we don't have a specific assignment detail API for students,
      // we'll fetch all assignments and find the specific one
      const response = await fetch('/api/student/assignments');
      if (response.ok) {
        const data = await response.json();
        const foundAssignment = data.assignments?.find((a: Assignment) => a.id === resolvedParams.assignmentId);
        
        if (foundAssignment) {
          setAssignment(foundAssignment);
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

  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (status === 'PENDING') {
      return isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
    }
    if (status === 'SUBMITTED') {
      return 'bg-blue-100 text-blue-800';
    }
    if (status === 'GRADED') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string, isOverdue: boolean) => {
    if (status === 'PENDING') {
      return isOverdue ? 'Overdue' : 'Pending';
    }
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
        <span className="text-6xl mb-4 block">❌</span>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment Not Found</h3>
        <p className="text-gray-600 mb-4">{error || 'The assignment you are looking for does not exist.'}</p>
        <Link
          href={`/${locale}/student/assignments`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Back to Assignments
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
            href={`/${locale}/student/assignments`}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Assignments
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assignment.submission?.status || 'PENDING', assignment.isOverdue)}`}>
            {getStatusText(assignment.submission?.status || 'PENDING', assignment.isOverdue)}
          </span>
          
          {assignment.canSubmit && !assignment.isOverdue && (
            <Link
              href={`/${locale}/student/assignments/${assignment.id}/submit`}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              {assignment.submission?.submissionDate ? 'Resubmit' : 'Submit Assignment'}
            </Link>
          )}
        </div>
      </div>

      {/* Assignment Details */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{assignment.title}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="mr-2">📚</span>
                <span><strong>Subject:</strong> {assignment.subject.name}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">👨‍🏫</span>
                <span><strong>Teacher:</strong> {assignment.teacher.name}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">🏫</span>
                <span><strong>Class:</strong> {assignment.classLevel.name} - {assignment.section.name}</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">📅</span>
                <span><strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Due Date Alert */}
          {assignment.daysUntilDue >= 0 && !assignment.submission?.submissionDate && (
            <div className={`p-4 rounded-lg mb-6 ${assignment.isOverdue ? 'bg-red-50 border border-red-200' : assignment.daysUntilDue <= 1 ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
              <div className={`flex items-center ${assignment.isOverdue ? 'text-red-800' : assignment.daysUntilDue <= 1 ? 'text-orange-800' : 'text-blue-800'}`}>
                <span className="mr-2">
                  {assignment.isOverdue ? '⚠️' : assignment.daysUntilDue <= 1 ? '⏰' : '📅'}
                </span>
                <span className="font-medium">
                  {assignment.isOverdue 
                    ? 'This assignment is overdue'
                    : assignment.daysUntilDue === 0 
                      ? 'This assignment is due today'
                      : `${assignment.daysUntilDue} day${assignment.daysUntilDue > 1 ? 's' : ''} remaining to submit`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          {assignment.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <div className="prose max-w-none text-gray-700">
                <p className="whitespace-pre-wrap">{assignment.description}</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          {assignment.instructions && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{assignment.instructions}</p>
              </div>
            </div>
          )}

          {/* Assignment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Assignment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Maximum Marks:</span>
                  <span className="font-medium">{assignment.maxMarks || 'Not specified'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{new Date(assignment.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium">{new Date(assignment.dueDate).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Attachments */}
            {assignment.attachments && assignment.attachments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Attachments</h3>
                <div className="space-y-2">
                  {assignment.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <span className="mr-2">📎</span>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {attachment.name}
                      </a>
                      <span className="ml-auto text-xs text-gray-500">
                        {attachment.size && `(${(attachment.size / 1024).toFixed(1)} KB)`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Submission Status */}
      {assignment.submission && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Submission</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assignment.submission.status, assignment.isOverdue)}`}>
                      {getStatusText(assignment.submission.status, assignment.isOverdue)}
                    </span>
                  </div>
                  
                  {assignment.submission.submissionDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Submitted:</span>
                      <span className="font-medium">{new Date(assignment.submission.submissionDate).toLocaleString()}</span>
                    </div>
                  )}
                  
                  {assignment.submission.status === 'GRADED' && assignment.submission.marksObtained !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Grade:</span>
                      <span className="font-bold text-green-600 text-lg">
                        {assignment.submission.marksObtained}/{assignment.maxMarks || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submitted Files */}
              {assignment.submission.fileUrls && assignment.submission.fileUrls.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Submitted Files</h4>
                  <div className="space-y-2">
                    {assignment.submission.fileUrls.map((file, index) => (
                      <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                        <span className="mr-2">📄</span>
                        <span className="text-sm">{file.name || `File ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Feedback */}
            {assignment.submission.feedback && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">Teacher Feedback</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{assignment.submission.feedback}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Link
          href={`/${locale}/student/assignments`}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to Assignments
        </Link>
        
        {assignment.canSubmit && !assignment.isOverdue && (
          <Link
            href={`/${locale}/student/assignments/${assignment.id}/submit`}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {assignment.submission?.submissionDate ? 'Update Submission' : 'Submit Assignment'}
          </Link>
        )}
      </div>
    </div>
  );
}
