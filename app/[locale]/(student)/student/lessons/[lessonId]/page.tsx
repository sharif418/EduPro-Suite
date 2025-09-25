'use client';

import { useState, useEffect, use } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ArrowLeft, Calendar, Clock, User, Download, FileText, Eye } from 'lucide-react';
import Link from 'next/link';

interface LessonPlan {
  id: string;
  title: string;
  description?: string;
  objectives: string[];
  activities: string[];
  lessonDate: string;
  duration: number;
  assessmentMethods: string[];
  notes?: string;
  classLevel: { name: string };
  section: { name: string };
  subject: { name: string };
  teacher: { name: string };
  resources: LessonResource[];
  shareInfo: {
    permissions: 'VIEW_ONLY' | 'DOWNLOAD' | 'INTERACTIVE';
    accessCount: number;
    lastAccessed?: string;
  };
}

interface LessonResource {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  resourceType: string;
  description?: string;
}

export default function StudentLessonDetailPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const t = useTranslations();
  const locale = useLocale();
  const resolvedParams = use(params);
  const { lessonId } = resolvedParams;
  const [lesson, setLesson] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLessonDetail();
  }, [lessonId]);

  const fetchLessonDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/student/lessons/${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        setLesson(data.lesson);
        
        // Track access
        await fetch(`/api/student/lessons/${lessonId}/access`, {
          method: 'POST',
        });
      } else {
        setError('Lesson not found or access denied');
      }
    } catch (error) {
      console.error('Error fetching lesson detail:', error);
      setError('Failed to load lesson details');
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    return '📁';
  };

  const handleResourceDownload = async (resource: LessonResource) => {
    if (lesson?.shareInfo.permissions === 'VIEW_ONLY') {
      alert('Download not permitted for this lesson');
      return;
    }

    try {
      const response = await fetch(resource.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resource.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading lesson details...</div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error || 'Lesson not found'}</div>
          <Link
            href={`/${locale}/student/lessons`}
            className="text-blue-600 hover:text-blue-800"
          >
            Back to Lessons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href={`/${locale}/student/lessons`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Lessons
        </Link>
      </div>

      {/* Lesson Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {lesson.title}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {lesson.subject.name}
              </span>
            </div>
            
            {lesson.description && (
              <p className="text-gray-600 mb-4">
                {lesson.description}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center text-gray-500">
                <Calendar className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Date</div>
                  <div>{formatDate(lesson.lessonDate)}</div>
                </div>
              </div>
              <div className="flex items-center text-gray-500">
                <Clock className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Time & Duration</div>
                  <div>{formatTime(lesson.lessonDate)} ({lesson.duration} min)</div>
                </div>
              </div>
              <div className="flex items-center text-gray-500">
                <User className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Teacher</div>
                  <div>{lesson.teacher.name}</div>
                </div>
              </div>
              <div className="flex items-center text-gray-500">
                <FileText className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">Class</div>
                  <div>{lesson.classLevel.name} - {lesson.section.name}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      {lesson.objectives.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Learning Objectives
          </h2>
          <ul className="space-y-2">
            {lesson.objectives.map((objective, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                  {index + 1}
                </span>
                <span className="text-gray-700">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Activities */}
      {lesson.activities.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Lesson Activities
          </h2>
          <ul className="space-y-2">
            {lesson.activities.map((activity, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                  {index + 1}
                </span>
                <span className="text-gray-700">{activity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assessment Methods */}
      {lesson.assessmentMethods.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Assessment Methods
          </h2>
          <ul className="space-y-2">
            {lesson.assessmentMethods.map((method, index) => (
              <li key={index} className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                  {index + 1}
                </span>
                <span className="text-gray-700">{method}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resources */}
      {lesson.resources.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Lesson Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lesson.resources.map((resource) => (
              <div key={resource.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">{getFileIcon(resource.fileType)}</span>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {resource.fileName}
                      </h3>
                      {resource.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {resource.description}
                        </p>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        {resource.resourceType} • {formatFileSize(resource.fileSize)}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {lesson.shareInfo.permissions !== 'VIEW_ONLY' && (
                      <button
                        onClick={() => handleResourceDownload(resource)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    )}
                    <a
                      href={resource.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-green-600"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {lesson.notes && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Additional Notes
          </h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{lesson.notes}</p>
          </div>
        </div>
      )}

      {/* Access Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            Access Level: <span className="font-medium">
              {lesson.shareInfo.permissions === 'VIEW_ONLY' ? 'View Only' : 
               lesson.shareInfo.permissions === 'DOWNLOAD' ? 'Can Download' : 'Interactive'}
            </span>
          </div>
          <div>
            Viewed {lesson.shareInfo.accessCount} time{lesson.shareInfo.accessCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
