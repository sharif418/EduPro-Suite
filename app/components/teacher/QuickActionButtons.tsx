'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Icons } from '../icons/IconLibrary';
import { integrationService } from '../../lib/integration-service';
import { useTeacherDashboard } from '../../hooks/useDashboardData';
import AnimatedCard from '../ui/AnimatedCard';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Icons;
  color: string;
  bgColor: string;
  hoverColor: string;
  action: () => Promise<void>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export default function QuickActionButtons() {
  const t = useTranslations('teacher');
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const { sendAction, updateOptimistically, data } = useTeacherDashboard();

  const handleAction = async (action: QuickAction) => {
    if (action.requiresConfirmation && showConfirmation !== action.id) {
      setShowConfirmation(action.id);
      return;
    }

    setIsLoading(action.id);
    setShowConfirmation(null);

    try {
      // Optimistic update
      if (action.id === 'attendance') {
        updateOptimistically({ pendingTasks: Math.max(0, (data?.pendingTasks ?? 0) - 1) });
      }

      await action.action();
      
      // Track the action
      await integrationService.trackEvent(`teacher_quick_action_${action.id}`, {
        actionId: action.id,
        timestamp: new Date().toISOString(),
      });

      // Send real-time update
      await sendAction(`quick_action_${action.id}`, {
        actionId: action.id,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error(`Error executing action ${action.id}:`, error);
      // Show error notification
      await integrationService.sendNotification({
        title: 'Action Failed',
        message: `Failed to execute ${action.title}. Please try again.`,
        type: 'error',
      });
    } finally {
      setIsLoading(null);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'attendance',
      title: t('takeAttendance'),
      description: t('markStudentAttendance'),
      icon: 'CheckCircle',
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      hoverColor: 'hover:bg-green-200 dark:hover:bg-green-900/50',
      action: async () => {
        // Real attendance marking integration
        try {
          const response = await fetch('/api/teacher/attendance/quick-mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              classId: 'current-class',
              date: new Date().toISOString().split('T')[0],
              method: 'quick-mark',
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            await integrationService.sendNotification({
              title: 'Attendance Marked',
              message: `Attendance marked for ${result.studentsCount || 0} students`,
              type: 'success',
            });
            router.push(`/${locale}/teacher/attendance`);
          }
        } catch (error) {
          console.error('Attendance marking failed:', error);
        }
      }
    },
    {
      id: 'assignment',
      title: t('createAssignment'),
      description: t('createNewAssignment'),
      icon: 'FileText',
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      hoverColor: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
      action: async () => {
        // Navigate to assignment creation with pre-filled template
        try {
          const response = await fetch('/api/teacher/assignments/templates', {
            credentials: 'include',
          });
          if (response.ok) {
            const templates = await response.json();
            const template = templates[0] || { id: 'default' };
            router.push(`/${locale}/teacher/assignments/new?template=${template.id}`);
          } else {
            router.push(`/${locale}/teacher/assignments/new`);
          }
        } catch (error) {
          router.push(`/${locale}/teacher/assignments/new`);
        }
      }
    },
    {
      id: 'notice',
      title: t('sendNotice'),
      description: t('sendNoticeToStudents'),
      icon: 'Bell',
      color: 'text-purple-700 dark:text-purple-300',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      hoverColor: 'hover:bg-purple-200 dark:hover:bg-purple-900/50',
      requiresConfirmation: true,
      confirmationMessage: 'Send notice to all students in your classes?',
      action: async () => {
        // Real notification sending
        try {
          const response = await fetch('/api/teacher/notifications/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              type: 'announcement',
              recipients: 'my-students',
              title: 'Quick Notice',
              message: 'Please check the latest updates in your class.',
              priority: 'normal',
            }),
          });

          if (response.ok) {
            const result = await response.json();
            await integrationService.sendNotification({
              title: 'Notice Sent',
              message: `Notice sent to ${result.recipientCount || 0} students`,
              type: 'success',
            });
          }
        } catch (error) {
          console.error('Notice sending failed:', error);
        }
      }
    },
    {
      id: 'grading',
      title: t('gradePapers'),
      description: t('gradeStudentPapers'),
      icon: 'BarChart3',
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      hoverColor: 'hover:bg-orange-200 dark:hover:bg-orange-900/50',
      action: async () => {
        // Navigate to grading interface with pending submissions
        try {
          const response = await fetch('/api/teacher/gradebook/pending', {
            credentials: 'include',
          });
          if (response.ok) {
            const pendingGrades = await response.json();
            router.push(`/${locale}/teacher/gradebook?filter=pending&count=${pendingGrades.length || 0}`);
          } else {
            router.push(`/${locale}/teacher/gradebook`);
          }
        } catch (error) {
          router.push(`/${locale}/teacher/gradebook`);
        }
      }
    },
    {
      id: 'reports',
      title: t('viewReports'),
      description: t('viewAcademicReports'),
      icon: 'FileText',
      color: 'text-indigo-700 dark:text-indigo-300',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      hoverColor: 'hover:bg-indigo-200 dark:hover:bg-indigo-900/50',
      action: async () => {
        // Generate and view latest reports
        try {
          const response = await fetch('/api/teacher/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              type: 'class-summary',
              period: 'current-week',
            }),
          });
          if (response.ok) {
            const reportData = await response.json();
            router.push(`/${locale}/teacher/reports?data=${encodeURIComponent(JSON.stringify(reportData))}`);
          } else {
            router.push(`/${locale}/teacher/reports`);
          }
        } catch (error) {
          router.push(`/${locale}/teacher/reports`);
        }
      }
    },
    {
      id: 'meeting',
      title: t('scheduleMeeting'),
      description: t('scheduleParentMeeting'),
      icon: 'Users',
      color: 'text-teal-700 dark:text-teal-300',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
      hoverColor: 'hover:bg-teal-200 dark:hover:bg-teal-900/50',
      action: async () => {
        // Open meeting scheduler with available slots
        try {
          const response = await fetch('/api/teacher/meetings/available-slots', {
            credentials: 'include',
          });
          if (response.ok) {
            const availableSlots = await response.json();
            router.push(`/${locale}/teacher/meetings/schedule?slots=${encodeURIComponent(JSON.stringify(availableSlots))}`);
          } else {
            router.push(`/${locale}/teacher/meetings/schedule`);
          }
        } catch (error) {
          router.push(`/${locale}/teacher/meetings/schedule`);
        }
      }
    }
  ];

  const additionalActions = [
    {
      id: 'classes',
      title: t('myClasses'),
      description: t('viewAllClasses'),
      icon: 'BookOpen',
      action: () => router.push(`/${locale}/teacher/classes`),
    },
    {
      id: 'schedule',
      title: t('schedule'),
      description: t('viewFullSchedule'),
      icon: 'Calendar',
      action: () => router.push(`/${locale}/teacher/schedule`),
    },
    {
      id: 'messages',
      title: t('messages'),
      description: t('checkMessages'),
      icon: 'MessageCircle',
      action: () => router.push(`/${locale}/teacher/messages`),
    },
    {
      id: 'settings',
      title: t('settings'),
      description: t('preferences'),
      icon: 'Settings',
      action: () => router.push(`/${locale}/teacher/settings`),
    },
  ];

  return (
    <AnimatedCard variant="elevated" size="lg" hover={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <Icons.Zap size={20} className="mr-2" />
            {t('quickActions')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('commonTeacherTasks')}
          </p>
        </div>
        
        {/* Quick Stats */}
        <div className="hidden sm:flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{t('available')}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.map((action) => {
          const IconComponent = Icons[action.icon as keyof typeof Icons];
          const isConfirming = showConfirmation === action.id;
          
          return (
            <div key={action.id} className="relative">
              <button
                onClick={() => handleAction(action)}
                disabled={isLoading === action.id}
                className={`
                  relative w-full p-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg
                  ${action.bgColor} ${action.hoverColor} ${action.color}
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  group
                  ${isConfirming ? 'ring-2 ring-yellow-400 ring-opacity-75' : ''}
                `}
              >
                {/* Loading Spinner */}
                {isLoading === action.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-xl">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current"></div>
                  </div>
                )}

                {/* Icon */}
                <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                  <IconComponent size={24} />
                </div>

                {/* Title */}
                <h4 className="font-semibold text-sm mb-1 leading-tight text-center">
                  {action.title}
                </h4>

                {/* Description */}
                <p className="text-xs opacity-75 leading-tight text-center">
                  {action.description}
                </p>

                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-current/20 transition-colors duration-200"></div>
              </button>

              {/* Confirmation Dialog */}
              {isConfirming && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {action.confirmationMessage}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAction(action)}
                      className="flex-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowConfirmation(null)}
                      className="flex-1 px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Quick Actions Row */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {additionalActions.map((action) => {
            const IconComponent = Icons[action.icon as keyof typeof Icons];
            return (
              <button
                key={action.id}
                onClick={action.action}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 group"
              >
                <div className="group-hover:scale-110 transition-transform duration-200">
                  <IconComponent size={20} className="text-gray-600 dark:text-gray-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Islamic Pattern Decoration */}
      <div className="mt-6 flex justify-center">
        <div className="flex items-center space-x-2 opacity-30">
          <div className="w-2 h-2 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-2 h-2 bg-current rounded-full"></div>
          <div className="w-1 h-1 bg-current rounded-full"></div>
          <div className="w-2 h-2 bg-current rounded-full"></div>
        </div>
      </div>
    </AnimatedCard>
  );
}
