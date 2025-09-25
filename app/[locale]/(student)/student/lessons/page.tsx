'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { BookOpen, Download, Eye, Calendar, Clock, User } from 'lucide-react';
import Link from 'next/link';

interface LessonPlan {
  id: string;
  title: string;
  description?: string;
  lessonDate: string;
  duration: number;
  status: string;
  classLevel: { name: string };
  section: { name: string };
  subject: { name: string };
  teacher: { name: string };
  resources: any[];
  shareInfo: {
    permissions: 'VIEW_ONLY' | 'DOWNLOAD' | 'INTERACTIVE';
    accessCount: number;
    lastAccessed?: string;
  };
}

interface Subject {
  id: string;
  name: string;
}

export default function StudentLessonsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [lessons, setLessons] = useState<LessonPlan[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchLessons();
  }, [selectedSubject, dateRange]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSubject) params.append('subjectId', selectedSubject);
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);

      const response = await fetch(`/api/student/lessons?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
        
        // Extract unique subjects from lessons
        const uniqueSubjects: Subject[] = Array.from(
          new Map(
            data.lessons.map((lesson: LessonPlan) => [
              lesson.subject.name,
              { id: lesson.subject.name, name: lesson.subject.name }
            ])
          ).values()
        ) as Subject[];
        setSubjects(uniqueSubjects);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'DOWNLOAD':
        return <Download className="h-4 w-4" />;
      case 'INTERACTIVE':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getPermissionText = (permission: string) => {
    switch (permission) {
      case 'DOWNLOAD':
        return 'Can Download';
      case 'INTERACTIVE':
        return 'Interactive';
      default:
        return 'View Only';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My Lesson Plans
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Access lesson plans shared by your teachers
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading lessons...</div>
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No lessons available</h3>
            <p className="mt-1 text-sm text-gray-500">
              No lesson plans have been shared with you yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {lessons.map((lesson) => (
              <div key={lesson.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {lesson.title}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {lesson.subject.name}
                      </span>
                    </div>
                    
                    {lesson.description && (
                      <p className="text-sm text-gray-600 mb-3">
                        {lesson.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(lesson.lessonDate)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(lesson.lessonDate)} ({lesson.duration} min)
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {lesson.teacher.name}
                      </div>
                      <div className="flex items-center">
                        {getPermissionIcon(lesson.shareInfo.permissions)}
                        <span className="ml-1">
                          {getPermissionText(lesson.shareInfo.permissions)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {lesson.classLevel.name} - {lesson.section.name}
                        {lesson.resources.length > 0 && (
                          <span className="ml-2">
                            • {lesson.resources.length} resource{lesson.resources.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/${locale}/student/lessons/${lesson.id}`}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
