'use client';

import { useEffect, useState, use } from 'react';
import { useSession } from '@/app/hooks/useSession';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

interface Submission {
  id: string;
  status: string;
  submissionDate?: string;
  marksObtained?: number;
  feedback?: string;
  fileUrls?: any[];
  enrollment: {
    student: {
      id: string;
      name: string;
      studentId: string;
    };
    rollNumber: number;
  };
}

interface Assignment {
  id: string;
  title: string;
  subject: {
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
}

export default function GradeAssignment({
  params
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const resolvedParams = use(params);
  const { user } = useSession();
  const locale = useLocale();
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Grading state
  const [grades, setGrades] = useState<{ [submissionId: string]: { marks: string; feedback: string } }>({});
  const [selectAll, setSelectAll] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAssignmentData();
  }, [resolvedParams.assignmentId]);

  const fetchAssignmentData = async () => {
    try {
      const response = await fetch(`/api/teacher/assignments/${resolvedParams.assignmentId}/submissions`);
      if (response.ok) {
        const data = await response.json();
        setAssignment(data.assignment);
        setSubmissions(data.submissions || []);
        
        // Initialize grades state
        const initialGrades: { [key: string]: { marks: string; feedback: string } } = {};
        data.submissions?.forEach((submission: Submission) => {
          initialGrades[submission.id] = {
            marks: submission.marksObtained?.toString() || '',
            feedback: submission.feedback || ''
          };
        });
        setGrades(initialGrades);
      } else {
        setError('Failed to fetch assignment data');
      }
    } catch (error) {
      console.error('Error fetching assignment data:', error);
      setError('An error occurred while fetching assignment data');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (submissionId: string, field: 'marks' | 'feedback', value: string) => {
    setGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value
      }
    }));
    setError(null);
  };

  const handleSelectSubmission = (submissionId: string) => {
    const newSelected = new Set(selectedSubmissions);
    if (newSelected.has(submissionId)) {
      newSelected.delete(submissionId);
    } else {
      newSelected.add(submissionId);
    }
    setSelectedSubmissions(newSelected);
    setSelectAll(newSelected.size === submissions.filter(s => s.status === 'SUBMITTED').length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSubmissions(new Set());
    } else {
      const submittedIds = submissions
        .filter(s => s.status === 'SUBMITTED')
        .map(s => s.id);
      setSelectedSubmissions(new Set(submittedIds));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkGrade = async () => {
    if (selectedSubmissions.size === 0) {
      setError('Please select submissions to grade');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const submissionsToGrade = Array.from(selectedSubmissions).map(submissionId => ({
        submissionId,
        marksObtained: grades[submissionId]?.marks ? parseInt(grades[submissionId].marks) : null,
        feedback: grades[submissionId]?.feedback || null
      }));

      const response = await fetch(`/api/teacher/assignments/${resolvedParams.assignmentId}/submissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submissions: submissionsToGrade }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(data.message || 'Grades saved successfully!');
        
        // Refresh data
        await fetchAssignmentData();
        setSelectedSubmissions(new Set());
        setSelectAll(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save grades');
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      setError('An error occurred while saving grades');
    } finally {
      setSaving(false);
    }
  };

  const submittedSubmissions = submissions.filter(s => s.status === 'SUBMITTED');
  const gradedSubmissions = submissions.filter(s => s.status === 'GRADED');

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
          href={`/${locale}/teacher/assignments`}
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
            href={`/${locale}/teacher/assignments/${resolvedParams.assignmentId}`}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Assignment
          </Link>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedSubmissions.size > 0 && (
            <button
              onClick={handleBulkGrade}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              Grade Selected ({selectedSubmissions.size})
            </button>
          )}
        </div>
      </div>

      {/* Assignment Info */}
      {assignment && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Grade Assignment: {assignment.title}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
            <div className="flex items-center">
              <span className="mr-2">📚</span>
              <span><strong>Subject:</strong> {assignment.subject.name}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">🏫</span>
              <span><strong>Class:</strong> {assignment.classLevel.name} - {assignment.section.name}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">📅</span>
              <span><strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <span className="mr-2">🎯</span>
              <span><strong>Max Marks:</strong> {assignment.maxMarks || 'Not specified'}</span>
            </div>
          </div>
        </div>
      )}

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{submittedSubmissions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Graded</p>
              <p className="text-2xl font-bold text-gray-900">{gradedSubmissions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{submittedSubmissions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions to Grade */}
      {submittedSubmissions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Submissions to Grade</h2>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Select All</span>
                </label>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {submittedSubmissions.map((submission) => (
                <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.has(submission.id)}
                      onChange={() => handleSelectSubmission(submission.id)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {submission.enrollment.student.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Roll: {submission.enrollment.rollNumber} | ID: {submission.enrollment.student.studentId}
                          </p>
                          {submission.submissionDate && (
                            <p className="text-xs text-gray-500">
                              Submitted: {new Date(submission.submissionDate).toLocaleString()}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            {submission.status}
                          </span>
                        </div>
                      </div>

                      {/* Submitted Files */}
                      {submission.fileUrls && submission.fileUrls.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Submitted Files:</h4>
                          <div className="flex flex-wrap gap-2">
                            {submission.fileUrls.map((file, index) => (
                              <div key={index} className="flex items-center p-2 bg-gray-50 rounded text-sm">
                                <span className="mr-1">📄</span>
                                <span>{file.originalName || file.name || `File ${index + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Grading Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marks {assignment?.maxMarks && `(out of ${assignment.maxMarks})`}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={assignment?.maxMarks || 100}
                            value={grades[submission.id]?.marks || ''}
                            onChange={(e) => handleGradeChange(submission.id, 'marks', e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter marks"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Feedback
                          </label>
                          <textarea
                            value={grades[submission.id]?.feedback || ''}
                            onChange={(e) => handleGradeChange(submission.id, 'feedback', e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter feedback for student"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Already Graded Submissions */}
      {gradedSubmissions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Already Graded</h2>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {gradedSubmissions.map((submission) => (
                <div key={submission.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {submission.enrollment.student.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Roll: {submission.enrollment.rollNumber} | ID: {submission.enrollment.student.studentId}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {submission.marksObtained}/{assignment?.maxMarks || 'N/A'}
                      </p>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        Graded
                      </span>
                    </div>
                  </div>
                  
                  {submission.feedback && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-sm text-gray-700">
                        <strong>Feedback:</strong> {submission.feedback}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No Submissions */}
      {submissions.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <span className="text-6xl mb-4 block">📝</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Submissions Yet</h3>
          <p className="text-gray-600">Students haven't submitted their assignments yet.</p>
        </div>
      )}

      {/* No Submissions to Grade */}
      {submissions.length > 0 && submittedSubmissions.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <span className="text-6xl mb-4 block">✅</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">
            {gradedSubmissions.length > 0 
              ? 'All submitted assignments have been graded.'
              : 'No submissions are ready for grading yet.'
            }
          </p>
        </div>
      )}
    </div>
  );
}
