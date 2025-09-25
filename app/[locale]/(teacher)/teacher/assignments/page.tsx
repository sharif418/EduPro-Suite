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
  classLevel: {
    name: string;
  };
  section: {
    name: string;
  };
  dueDate: string;
  maxMarks?: number;
  createdAt: string;
  stats: {
    totalSubmissions: number;
    pendingSubmissions: number;
    submittedCount: number;
    gradedCount: number;
    averageMarks: number;
  };
}

export default function TeacherAssignments() {
  const { user } = useSession();
  const locale = useLocale();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  useEffect(() => {
    fetchAssignments();
  }, [filter, classFilter]);

  const fetchAssignments = async () => {
    try {
      let url = '/api/teacher/assignments';
      const params = new URLSearchParams();
      
      if (classFilter !== 'all') {
        params.append('classLevelId', classFilter);
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
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isOverdue = now > dueDate;
    
    if (isOverdue && assignment.stats.pendingSubmissions > 0) {
      return 'border-l-red-500';
    }
    if (assignment.stats.pendingSubmissions > 0) {
      return 'border-l-yellow-500';
    }
    if (assignment.stats.submittedCount > assignment.stats.gradedCount) {
      return 'border-l-blue-500';
    }
    return 'border-l-green-500';
  };

  const getProgressPercentage = (assignment: Assignment) => {
    if (assignment.stats.totalSubmissions === 0) return 0;
    return Math.round((assignment.stats.submittedCount / assignment.stats.totalSubmissions) * 100);
  };

  const getGradingPercentage = (assignment: Assignment) => {
    if (assignment.stats.submittedCount === 0) return 0;
    return Math.round((assignment.stats.gradedCount / assignment.stats.submittedCount) * 100);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (filter === 'active') {
      return now <= dueDate;
    }
    if (filter === 'overdue') {
      return now > dueDate && assignment.stats.pendingSubmissions > 0;
    }
    if (filter === 'grading') {
      return assignment.stats.submittedCount > assignment.stats.gradedCount;
    }
    if (filter === 'completed') {
      return assignment.stats.submittedCount === assignment.stats.gradedCount && assignment.stats.submittedCount > 0;
    }
    return true;
  });

  const classes = [...new Set(assignments.map(a => `${a.classLevel.name} - ${a.section.name}`))];

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
          <p className="text-gray-600 mt-1">Create and manage assignments for your classes</p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <Link
            href={`/${locale}/teacher/assignments/new`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <span className="mr-2">➕</span>
            Create Assignment
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.filter(a => new Date() <= new Date(a.dueDate)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Need Grading</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.filter(a => a.stats.submittedCount > a.stats.gradedCount).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.filter(a => a.stats.submittedCount === a.stats.gradedCount && a.stats.submittedCount > 0).length}
              </p>
            </div>
          </div>
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
              <option value="active">Active</option>
              <option value="overdue">Overdue</option>
              <option value="grading">Need Grading</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Class:</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Classes</option>
              {classes.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-500">
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <span className="text-6xl mb-4 block">📚</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? "You haven't created any assignments yet."
                : `No ${filter} assignments found.`
              }
            </p>
            <Link
              href={`/${locale}/teacher/assignments/new`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="mr-2">➕</span>
              Create Your First Assignment
            </Link>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className={`bg-white rounded-lg shadow-sm border-l-4 ${getStatusColor(assignment)} hover:shadow-md transition-shadow`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.title}
                      </h3>
                      {new Date() > new Date(assignment.dueDate) && assignment.stats.pendingSubmissions > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                          Overdue
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center">
                        <span className="mr-1">📚</span>
                        {assignment.subject.name}
                      </span>
                      <span className="flex items-center">
                        <span className="mr-1">🏫</span>
                        {assignment.classLevel.name} - {assignment.section.name}
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

                    {/* Progress Bars */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Submission Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Submissions</span>
                          <span className="font-medium">
                            {assignment.stats.submittedCount}/{assignment.stats.totalSubmissions}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(assignment)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Grading Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Graded</span>
                          <span className="font-medium">
                            {assignment.stats.gradedCount}/{assignment.stats.submittedCount}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getGradingPercentage(assignment)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-yellow-600">
                        📋 {assignment.stats.pendingSubmissions} pending
                      </span>
                      <span className="text-blue-600">
                        📤 {assignment.stats.submittedCount} submitted
                      </span>
                      <span className="text-green-600">
                        ✅ {assignment.stats.gradedCount} graded
                      </span>
                      {assignment.stats.averageMarks > 0 && (
                        <span className="text-purple-600">
                          📊 Avg: {assignment.stats.averageMarks.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Link
                      href={`/${locale}/teacher/assignments/${assignment.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                    >
                      View Details
                    </Link>
                    
                    {assignment.stats.submittedCount > assignment.stats.gradedCount && (
                      <Link
                        href={`/${locale}/teacher/assignments/${assignment.id}/grade`}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium text-center"
                      >
                        Grade ({assignment.stats.submittedCount - assignment.stats.gradedCount})
                      </Link>
                    )}
                    
                    <Link
                      href={`/${locale}/teacher/assignments/${assignment.id}/edit`}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-center"
                    >
                      Edit
                    </Link>
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
