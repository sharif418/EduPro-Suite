'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/app/hooks/useSession';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface Assignment {
  id: string;
  title: string;
  description?: string;
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
    marksObtained?: number;
    feedback?: string;
    submissionDate?: string;
  };
  isOverdue: boolean;
  daysUntilDue: number;
  canSubmit: boolean;
}

export default function StudentAssignments() {
  const { user } = useSession();
  const locale = useLocale();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  useEffect(() => {
    fetchAssignments();
  }, [filter, subjectFilter]);

  const fetchAssignments = async () => {
    try {
      let url = '/api/student/assignments';
      const params = new URLSearchParams();
      
      if (filter !== 'all') {
        params.append('status', filter);
      }
      if (subjectFilter !== 'all') {
        params.append('subjectId', subjectFilter);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (assignment: Assignment) => {
    if (!assignment.submission || assignment.submission.status === 'PENDING') {
      return assignment.isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
    }
    if (assignment.submission.status === 'SUBMITTED') {
      return 'bg-blue-100 text-blue-800';
    }
    if (assignment.submission.status === 'GRADED') {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (assignment: Assignment) => {
    if (!assignment.submission || assignment.submission.status === 'PENDING') {
      return assignment.isOverdue ? 'Overdue' : 'Pending';
    }
    return assignment.submission.status.charAt(0) + assignment.submission.status.slice(1).toLowerCase();
  };

  const getPriorityColor = (assignment: Assignment) => {
    if (assignment.isOverdue) return 'border-l-red-500';
    if (assignment.daysUntilDue <= 1) return 'border-l-orange-500';
    if (assignment.daysUntilDue <= 3) return 'border-l-yellow-500';
    return 'border-l-blue-500';
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (filter === 'pending') {
      return !assignment.submission || assignment.submission.status === 'PENDING';
    }
    if (filter === 'submitted') {
      return assignment.submission?.status === 'SUBMITTED';
    }
    if (filter === 'graded') {
      return assignment.submission?.status === 'GRADED';
    }
    return true;
  });

  const subjects = [...new Set(assignments.map(a => a.subject.name))];

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-600 mt-1">View and manage your assignments</p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <span className="text-sm text-gray-500">
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Subject:</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <span className="text-6xl mb-4 block">📚</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? "You don't have any assignments yet."
                : `No ${filter} assignments found.`
              }
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className={`bg-white rounded-lg shadow-sm border-l-4 ${getPriorityColor(assignment)} hover:shadow-md transition-shadow`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment)}`}>
                        {getStatusText(assignment)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center">
                        <span className="mr-1">📚</span>
                        {assignment.subject.name}
                      </span>
                      <span className="flex items-center">
                        <span className="mr-1">👨‍🏫</span>
                        {assignment.teacher.name}
                      </span>
                      <span className="flex items-center">
                        <span className="mr-1">📅</span>
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                      {assignment.maxMarks && (
                        <span className="flex items-center">
                          <span className="mr-1">🎯</span>
                          {assignment.maxMarks} marks
                        </span>
                      )}
                    </div>

                    {assignment.description && (
                      <p className="text-gray-700 mb-4 line-clamp-2">
                        {assignment.description}
                      </p>
                    )}

                    {/* Submission Info */}
                    {assignment.submission && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Submission Status: {assignment.submission.status}
                            </p>
                            {assignment.submission.submissionDate && (
                              <p className="text-xs text-gray-600">
                                Submitted: {new Date(assignment.submission.submissionDate).toLocaleString()}
                              </p>
                            )}
                          </div>
                          {assignment.submission.status === 'GRADED' && assignment.submission.marksObtained !== null && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                {assignment.submission.marksObtained}/{assignment.maxMarks || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-600">Grade</p>
                            </div>
                          )}
                        </div>
                        {assignment.submission.feedback && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-sm text-gray-700">
                              <strong>Feedback:</strong> {assignment.submission.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Due Date Warning */}
                    {assignment.daysUntilDue >= 0 && !assignment.submission?.submissionDate && (
                      <div className={`text-sm ${assignment.isOverdue ? 'text-red-600' : assignment.daysUntilDue <= 1 ? 'text-orange-600' : 'text-gray-600'}`}>
                        {assignment.isOverdue 
                          ? '⚠️ This assignment is overdue'
                          : assignment.daysUntilDue === 0 
                            ? '⏰ Due today'
                            : `📅 ${assignment.daysUntilDue} day${assignment.daysUntilDue > 1 ? 's' : ''} remaining`
                        }
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Link
                      href={`/${locale}/student/assignments/${assignment.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                    >
                      View Details
                    </Link>
                    
                    {assignment.canSubmit && !assignment.isOverdue && (
                      <Link
                        href={`/${locale}/student/assignments/${assignment.id}/submit`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium text-center"
                      >
                        {assignment.submission?.submissionDate ? 'Resubmit' : 'Submit'}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
