'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/Button';

interface ClassManagementActionsProps {
  classId: string;
  className: string;
  isClassTeacher: boolean;
  onExportRoster: (classId: string, format: 'excel' | 'pdf' | 'csv') => void;
  exportLoading: boolean;
}

export default function ClassManagementActions({
  classId,
  className,
  isClassTeacher,
  onExportRoster,
  exportLoading
}: ClassManagementActionsProps) {
  const t = useTranslations('teacher');
  const router = useRouter();
  const pathname = usePathname();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Extract locale from pathname
  const getLocale = () => {
    const segments = pathname.split('/');
    return segments[1] || 'en';
  };

  const navigateToPage = (page: string) => {
    const locale = getLocale();
    router.push(`/${locale}/teacher/${page}?classId=${classId}`);
  };

  const handleQuickAction = async (action: string) => {
    setActionLoading(action);
    
    try {
      switch (action) {
        case 'attendance':
          // Navigate to attendance page
          navigateToPage('attendance');
          break;
          
        case 'announcement':
          // Navigate to announcements page
          navigateToPage('announcements');
          break;
          
        case 'assignment':
          // Navigate to assignments page
          navigateToPage('assignments');
          break;
          
        case 'gradebook':
          // Navigate to gradebook page
          navigateToPage('gradebook');
          break;
          
        case 'seating':
          // Navigate to seating page
          navigateToPage('seating');
          break;
          
        case 'analytics':
          // Navigate to analytics page
          navigateToPage('analytics');
          break;
          
        case 'bulk-notification':
          // Send bulk notification to all guardians
          const response = await fetch('/api/teacher/notifications/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              classId,
              type: 'general',
              message: `Important update from ${className} class teacher`
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to send notifications');
          }
          break;
          
        case 'attendance-report':
          // Generate attendance report
          const reportResponse = await fetch(`/api/teacher/reports/attendance?classId=${classId}`);
          if (reportResponse.ok) {
            const blob = await reportResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${className}-attendance-report.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
          }
          break;
          
        default:
          console.log(`Action ${action} not implemented`);
      }
    } catch (error) {
      console.error(`Error performing action ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const getCurrentTimeBasedSuggestions = () => {
    const now = new Date();
    const hour = now.getHours();
    const suggestions = [];

    // Morning suggestions (6 AM - 12 PM)
    if (hour >= 6 && hour < 12) {
      suggestions.push({
        action: 'attendance',
        label: t('classManagement.markTodayAttendance'),
        icon: '✅',
        priority: 'high'
      });
    }

    // Afternoon suggestions (12 PM - 6 PM)
    if (hour >= 12 && hour < 18) {
      suggestions.push({
        action: 'assignment',
        label: t('classManagement.createAssignment'),
        icon: '📝',
        priority: 'medium'
      });
    }

    // Evening suggestions (6 PM - 10 PM)
    if (hour >= 18 && hour < 22) {
      suggestions.push({
        action: 'gradebook',
        label: t('classManagement.updateGrades'),
        icon: '📊',
        priority: 'medium'
      });
    }

    return suggestions;
  };

  const timeBasedSuggestions = getCurrentTimeBasedSuggestions();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('classManagement.quickActions')} - {className}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('classManagement.quickActionsDescription')}
          </p>
        </div>
        
        {isClassTeacher && (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
            <span className="text-purple-600 dark:text-purple-400 text-sm">👨‍🏫</span>
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {t('classManagement.classTeacher')}
            </span>
          </div>
        )}
      </div>

      {/* Time-based Suggestions */}
      {timeBasedSuggestions.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
            💡 {t('classManagement.suggestedActions')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {timeBasedSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                size="sm"
                onClick={() => handleQuickAction(suggestion.action)}
                disabled={actionLoading === suggestion.action}
                className={`${
                  suggestion.priority === 'high' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                }`}
              >
                {suggestion.icon} {suggestion.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main Action Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {/* Attendance Actions */}
        <Button
          variant="outline"
          onClick={() => handleQuickAction('attendance')}
          disabled={actionLoading === 'attendance'}
          className="flex flex-col items-center gap-2 h-20 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
        >
          <span className="text-xl">✅</span>
          <span className="text-xs font-medium">{t('teacher.attendance')}</span>
        </Button>

        {/* Assignment Actions */}
        <Button
          variant="outline"
          onClick={() => handleQuickAction('assignment')}
          disabled={actionLoading === 'assignment'}
          className="flex flex-col items-center gap-2 h-20 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
        >
          <span className="text-xl">📝</span>
          <span className="text-xs font-medium">{t('teacher.assignments')}</span>
        </Button>

        {/* Gradebook Actions */}
        <Button
          variant="outline"
          onClick={() => handleQuickAction('gradebook')}
          disabled={actionLoading === 'gradebook'}
          className="flex flex-col items-center gap-2 h-20 bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
        >
          <span className="text-xl">📊</span>
          <span className="text-xs font-medium">{t('teacher.gradebook')}</span>
        </Button>

        {/* Announcements */}
        <Button
          variant="outline"
          onClick={() => handleQuickAction('announcement')}
          disabled={actionLoading === 'announcement'}
          className="flex flex-col items-center gap-2 h-20 bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
        >
          <span className="text-xl">📢</span>
          <span className="text-xs font-medium">{t('teacher.announcements')}</span>
        </Button>

        {/* Seating Arrangement */}
        <Button
          variant="outline"
          onClick={() => handleQuickAction('seating')}
          disabled={actionLoading === 'seating'}
          className="flex flex-col items-center gap-2 h-20 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
        >
          <span className="text-xl">🪑</span>
          <span className="text-xs font-medium">{t('teacher.seating')}</span>
        </Button>

        {/* Analytics */}
        <Button
          variant="outline"
          onClick={() => handleQuickAction('analytics')}
          disabled={actionLoading === 'analytics'}
          className="flex flex-col items-center gap-2 h-20 bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700"
        >
          <span className="text-xl">📈</span>
          <span className="text-xs font-medium">{t('teacher.analytics')}</span>
        </Button>
      </div>

      {/* Bulk Operations */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t('classManagement.bulkOperations')}
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('bulk-notification')}
            disabled={actionLoading === 'bulk-notification'}
            className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
          >
            📧 {t('classManagement.notifyAllGuardians')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction('attendance-report')}
            disabled={actionLoading === 'attendance-report'}
            className="bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
          >
            📋 {t('classManagement.attendanceReport')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onExportRoster(classId, 'excel')}
            disabled={exportLoading}
            className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
          >
            📊 {t('classManagement.exportRoster')}
          </Button>
        </div>
      </div>

      {/* Class Teacher Exclusive Actions */}
      {isClassTeacher && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            👨‍🏫 {t('classManagement.classTeacherActions')}
          </h3>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Navigate to student management
                navigateToPage('students');
              }}
              className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
            >
              👥 {t('classManagement.manageStudents')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Navigate to class settings
                navigateToPage('settings');
              }}
              className="bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
            >
              ⚙️ {t('classManagement.classSettings')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Generate comprehensive class report
                handleQuickAction('class-report');
              }}
              disabled={actionLoading === 'class-report'}
              className="bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700"
            >
              📈 {t('classManagement.classReport')}
            </Button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {actionLoading && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {t('classManagement.processingAction')}...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
