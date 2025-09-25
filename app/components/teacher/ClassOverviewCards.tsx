'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTeacherDashboard } from '../../hooks/useDashboardData';
import { integrationService } from '../../lib/integration-service';
import { Icons } from '../icons/IconLibrary';
import AnimatedCard from '../ui/AnimatedCard';
import ProgressIndicator from '../ui/ProgressIndicator';

interface ClassData {
  id: string;
  name: string;
  section: string;
  subject: string;
  studentCount: number;
  attendanceRate: number;
  averagePerformance: number;
  syllabusProgress: number;
  nextClass: string;
  room: string;
  recentActivity: string;
  syllabusDetails: {
    totalChapters: number;
    completedChapters: number;
    currentChapter: string;
    upcomingTopics: string[];
  };
}

export default function ClassOverviewCards() {
  const t = useTranslations('teacher');
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Use the unified dashboard hook for data
  const { data, isLoading, sendAction, updateOptimistically } = useTeacherDashboard({
    refreshInterval: 30000,
    enableRealtime: true,
  });

  const classes = data?.classes || [];

  const getPerformanceColor = (performance: number): 'green' | 'yellow' | 'red' => {
    if (performance >= 80) return 'green';
    if (performance >= 60) return 'yellow';
    return 'red';
  };

  const getAttendanceColor = (attendance: number): 'green' | 'yellow' | 'red' => {
    if (attendance >= 90) return 'green';
    if (attendance >= 75) return 'yellow';
    return 'red';
  };

  const getProgressColor = (progress: number): 'green' | 'yellow' | 'red' => {
    if (progress >= 70) return 'green';
    if (progress >= 50) return 'yellow';
    return 'red';
  };

  const openSyllabusDetails = (classData: ClassData) => {
    setSelectedClass(classData);
  };

  const closeSyllabusDetails = () => {
    setSelectedClass(null);
  };

  const handleQuickAction = async (action: string, classId: string) => {
    setActionLoading(`${action}-${classId}`);
    
    try {
      // Optimistic update
      updateOptimistically({ 
        classes: classes.map((cls: any) => 
          cls.id === classId 
            ? { ...cls, [action === 'attendance' ? 'attendanceRate' : 'lastUpdated']: Date.now() }
            : cls
        )
      });

      // Real API integration
      let result;
      switch (action) {
        case 'attendance':
          result = await fetch('/api/teacher/attendance/quick-mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ classId, date: new Date().toISOString().split('T')[0] }),
          });
          break;
        case 'reports':
          result = await fetch(`/api/teacher/reports/class/${classId}`, {
            credentials: 'include',
          });
          break;
        default:
          throw new Error('Unknown action');
      }

      if (result?.ok) {
        const responseData = await result.json();
        
        // Send real-time update
        await sendAction(`class_${action}`, {
          classId,
          action,
          result: responseData,
          timestamp: new Date().toISOString(),
        });

        // Show success notification
        await integrationService.sendNotification({
          title: `${action.charAt(0).toUpperCase() + action.slice(1)} Updated`,
          message: `Successfully updated ${action} for the class`,
          type: 'success',
        });

        // Track event
        await integrationService.trackEvent(`class_quick_${action}`, {
          classId,
          action,
        });
      }
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      await integrationService.sendNotification({
        title: 'Action Failed',
        message: `Failed to execute ${action}. Please try again.`,
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updateSyllabusProgress = async (classId: string, newProgress: number) => {
    try {
      const response = await fetch('/api/teacher/syllabus/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ classId, progress: newProgress }),
      });

      if (response.ok) {
        // Optimistic update
        updateOptimistically({
          classes: classes.map((cls: any) => 
            cls.id === classId ? { ...cls, syllabusProgress: newProgress } : cls
          )
        });

        await integrationService.sendNotification({
          title: 'Progress Updated',
          message: 'Syllabus progress has been updated successfully',
          type: 'success',
        });

        // Trigger milestone celebration if reached significant milestone
        if (newProgress >= 100) {
          await integrationService.sendNotification({
            title: '🎉 Syllabus Complete!',
            message: 'Congratulations! You have completed the entire syllabus.',
            type: 'success',
          });
        } else if (newProgress >= 75 && newProgress < 80) {
          await integrationService.sendNotification({
            title: '🎯 Great Progress!',
            message: 'You are almost there! Keep up the excellent work.',
            type: 'info',
          });
        }
      }
    } catch (error) {
      console.error('Error updating syllabus progress:', error);
    }
  };

  return (
    <>
      <AnimatedCard variant="elevated" size="lg" hover={false}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Icons.BookOpen size={20} className="mr-2" />
              {t('classOverview')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('manageYourClasses')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Live Data</span>
          </div>
        </div>

        {/* Class Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-lg p-6 shadow-sm border animate-pulse bg-gray-100 dark:bg-gray-800"
              >
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                </div>
              </div>
            ))
          ) : (
            classes.map((classData: ClassData) => (
              <AnimatedCard
                key={classData.id}
                variant="elevated"
                size="md"
                hover={true}
                className="transition-all duration-200"
              >
                {/* Class Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {classData.name} - {classData.section}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <Icons.BookOpen size={16} className="mr-1" />
                      {classData.subject} • 
                      <Icons.MapPin size={16} className="ml-2 mr-1" />
                      {classData.room}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                      <Icons.Users size={16} className="mr-1" />
                      {classData.studentCount}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('students')}
                    </p>
                  </div>
                </div>

                {/* Stats Grid with Progress Indicators */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <ProgressIndicator
                      value={classData.attendanceRate}
                      type="circular"
                      color={getAttendanceColor(classData.attendanceRate)}
                      size="sm"
                      animated={true}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('attendance')}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <ProgressIndicator
                      value={classData.averagePerformance}
                      type="circular"
                      color={getPerformanceColor(classData.averagePerformance)}
                      size="sm"
                      animated={true}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('performance')}</p>
                  </div>
                </div>

                {/* Syllabus Progress with Enhanced UI */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                      <Icons.Target size={16} className="mr-1" />
                      {t('syllabusProgress')}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {classData.syllabusProgress}%
                    </span>
                  </div>
                  <div className="cursor-pointer" onClick={() => openSyllabusDetails(classData)}>
                    <ProgressIndicator
                      value={classData.syllabusProgress}
                      type="linear"
                      color={getProgressColor(classData.syllabusProgress)}
                      size="md"
                      animated={true}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <Icons.Eye size={12} className="mr-1" />
                    {t('clickToViewDetails')}
                  </p>
                </div>

                {/* Next Class Info */}
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center">
                    <Icons.Calendar size={16} className="mr-2" />
                    {t('nextClass')}: {classData.nextClass}
                  </p>
                </div>

                {/* Recent Activity */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                    <Icons.Clock size={12} className="mr-1" />
                    {t('recentActivity')}:
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {classData.recentActivity}
                  </p>
                </div>

                {/* Enhanced Quick Actions with Real Integration */}
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleQuickAction('attendance', classData.id)}
                    disabled={actionLoading === `attendance-${classData.id}`}
                    className="flex-1 px-3 py-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
                  >
                    {actionLoading === `attendance-${classData.id}` ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <>
                        <Icons.CheckCircle size={14} className="mr-1" />
                        {t('takeAttendance')}
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => handleQuickAction('reports', classData.id)}
                    disabled={actionLoading === `reports-${classData.id}`}
                    className="flex-1 px-3 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
                  >
                    {actionLoading === `reports-${classData.id}` ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <>
                        <Icons.BarChart3 size={14} className="mr-1" />
                        {t('viewReports')}
                      </>
                    )}
                  </button>
                </div>
              </AnimatedCard>
            ))
          )}
        </div>
      </AnimatedCard>

      {/* Enhanced Syllabus Details Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <AnimatedCard
            variant="elevated"
            size="lg"
            className="max-w-md w-full max-h-[80vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Icons.Target size={20} className="mr-2" />
                {t('syllabusDetails')}
              </h3>
              <button
                onClick={closeSyllabusDetails}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              >
                <Icons.X size={20} />
              </button>
            </div>

            {/* Class Info */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {selectedClass.name} - {selectedClass.section}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedClass.subject}
              </p>
            </div>

            {/* Progress Overview with Enhanced ProgressIndicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('overallProgress')}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedClass.syllabusProgress}%
                </span>
              </div>
              <div className="flex justify-center mb-4">
                <ProgressIndicator
                  value={selectedClass.syllabusProgress}
                  type="circular"
                  color={getProgressColor(selectedClass.syllabusProgress)}
                  size="lg"
                  animated={true}
                />
              </div>
              <ProgressIndicator
                value={selectedClass.syllabusProgress}
                type="linear"
                color={getProgressColor(selectedClass.syllabusProgress)}
                size="lg"
                animated={true}
              />
            </div>

            {/* Chapter Progress */}
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <Icons.BookOpen size={16} className="mr-2" />
                {t('chapterProgress')}
              </h5>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('totalChapters')}:</span>
                  <span className="font-medium">{selectedClass.syllabusDetails.totalChapters}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('completed')}:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {selectedClass.syllabusDetails.completedChapters}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('remaining')}:</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">
                    {selectedClass.syllabusDetails.totalChapters - selectedClass.syllabusDetails.completedChapters}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Chapter */}
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                <Icons.Star size={16} className="mr-2" />
                {t('currentChapter')}
              </h5>
              <p className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-lg flex items-center">
                <Icons.BookOpen size={16} className="mr-2" />
                {selectedClass.syllabusDetails.currentChapter}
              </p>
            </div>

            {/* Upcoming Topics */}
            <div className="mb-6">
              <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                <Icons.Calendar size={16} className="mr-2" />
                {t('upcomingTopics')}
              </h5>
              <ul className="space-y-2">
                {selectedClass.syllabusDetails.upcomingTopics.map((topic, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons with Real Integration */}
            <div className="flex space-x-3">
              <button 
                onClick={() => updateSyllabusProgress(selectedClass.id, Math.min(100, selectedClass.syllabusProgress + 10))}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium flex items-center justify-center"
              >
                <Icons.TrendingUp size={16} className="mr-2" />
                {t('updateProgress')}
              </button>
              <button 
                onClick={closeSyllabusDetails}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 text-sm font-medium flex items-center justify-center"
              >
                <Icons.X size={16} className="mr-2" />
                {t('close')}
              </button>
            </div>
          </AnimatedCard>
        </div>
      )}
    </>
  );
}
