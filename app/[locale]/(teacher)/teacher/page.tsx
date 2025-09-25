'use client';

import { useSession } from '../../../hooks/useSession';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import DashboardLayout, { DashboardGridItem } from '../../../components/dashboard/DashboardLayout';
import StatCard from '../../../components/ui/StatCard';
import AnimatedCard from '../../../components/ui/AnimatedCard';
import ProgressIndicator from '../../../components/ui/ProgressIndicator';
import EducationalCharts, { generateAttendanceData, generateGradeData } from '../../../components/charts/EducationalCharts';
import AIAssistantWidget from '../../../components/ai/AIAssistantWidget';
import { useTeacherDashboard, calculateTrends } from '../../../hooks/useDashboardData';
import { Icons } from '../../../components/icons/IconLibrary';
import { integrationService } from '../../../lib/integration-service';
import QuickActionButtons from '../../../components/teacher/QuickActionButtons';
import ClassOverviewCards from '../../../components/teacher/ClassOverviewCards';

export default function TeacherDashboard() {
  const { user } = useSession();
  const t = useTranslations('teacher');
  const params = useParams();
  const locale = params.locale as string;
  const isBengali = locale === 'bn';
  
  // Use the new unified data hook
  const { data, error, isLoading, refresh, sendAction, updateOptimistically } = useTeacherDashboard({
    refreshInterval: 30000,
    enableRealtime: true,
  });

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    return `${diffInHours} hours ago`;
  };

  const handleQuickAction = async (action: string) => {
    // Optimistic update
    updateOptimistically({ pendingTasks: (data?.pendingTasks || 0) + 1 });
    
    // Send action to backend
    await sendAction(action, { timestamp: new Date().toISOString() });
    
    // Track user action
    await integrationService.trackEvent(`teacher_${action}`, { userId: user?.id });
  };

  const handleAIMessage = async (message: string, context?: any) => {
    return await integrationService.sendAIMessage(message, {
      ...context,
      userRole: 'teacher',
      dashboardContext: data,
    });
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  // Calculate trends for stats
  const studentTrend = data?.totalStudents ? calculateTrends(data.totalStudents, data.totalStudents - 2) : undefined;
  const classesTrend = data?.totalClasses ? calculateTrends(data.totalClasses, data.totalClasses - 1) : undefined;
  const tasksTrend = data?.pendingTasks ? calculateTrends(data.pendingTasks, data.pendingTasks + 2) : undefined;

  return (
    <DashboardLayout
      title={`${getCurrentGreeting()}, ${user?.name}!`}
      subtitle={t('welcomeMessage')}
      loading={isLoading}
      error={error}
      showIslamicPattern={true}
      gridCols={12}
      spacing="lg"
    >
      {/* Welcome Section with Islamic Pattern */}
      <DashboardGridItem colSpan={12} delay={0}>
        <AnimatedCard
          variant="gradient"
          size="lg"
          islamicPattern={true}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
                {getCurrentGreeting()}, {user?.name}! 👨‍🏫
              </h1>
              <p className="text-purple-100 text-base sm:text-lg">
                {t('welcomeMessage')}
              </p>
            </div>
            <div className="hidden md:block">
              <Icons.GraduationCap size={48} className="text-white/20" />
            </div>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Enhanced Stats Cards */}
      <DashboardGridItem colSpan={3} delay={0.1}>
        <StatCard
          title={t('totalStudents')}
          value={data?.totalStudents || 0}
          icon={<Icons.Users size={24} />}
          trend={studentTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="blue"
          onClick={() => handleQuickAction('view_students')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.2}>
        <StatCard
          title={t('totalClasses')}
          value={data?.totalClasses || 0}
          icon={<Icons.BookOpen size={24} />}
          trend={classesTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="green"
          onClick={() => handleQuickAction('view_classes')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.3}>
        <StatCard
          title={t('todayClasses')}
          value={data?.todayClasses || 0}
          icon={<Icons.Calendar size={24} />}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="yellow"
          onClick={() => handleQuickAction('view_schedule')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.4}>
        <StatCard
          title={t('pendingTasks')}
          value={data?.pendingTasks || 0}
          icon={<Icons.AlertTriangle size={24} />}
          trend={tasksTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="red"
          onClick={() => handleQuickAction('view_tasks')}
        />
      </DashboardGridItem>

      {/* Quick Action Buttons */}
      <DashboardGridItem colSpan={12} delay={0.5}>
        <QuickActionButtons />
      </DashboardGridItem>

      {/* Charts Section */}
      <DashboardGridItem colSpan={6} delay={0.6}>
        <EducationalCharts
          type="line"
          data={generateAttendanceData(30).map(item => ({ ...item, value: item.present }))}
          title="Class Attendance Trends"
          subtitle="Last 30 days attendance overview"
          showBengaliNumbers={isBengali}
          animated={true}
          height={300}
          dataKeys={['present', 'absent', 'late']}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={6} delay={0.7}>
        <EducationalCharts
          type="bar"
          data={generateGradeData(['Math', 'Science', 'English', 'History']).map(item => ({ ...item, value: item.currentGrade }))}
          title="Subject Performance"
          subtitle="Average grades across subjects"
          showBengaliNumbers={isBengali}
          animated={true}
          height={300}
          dataKeys={['currentGrade', 'previousGrade', 'targetGrade']}
        />
      </DashboardGridItem>

      {/* Class Overview Cards */}
      <DashboardGridItem colSpan={12} delay={0.8}>
        <ClassOverviewCards />
      </DashboardGridItem>

      {/* Recent Activities with Enhanced UI */}
      <DashboardGridItem colSpan={6} delay={0.9}>
        <AnimatedCard variant="elevated" size="md" hover={true}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Clock size={20} className="mr-2" />
            {t('recentActivity')}
          </h3>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="loading-skeleton h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <div className="text-sm text-red-500 flex items-center">
                <Icons.AlertTriangle size={16} className="mr-2" />
                Error loading activities
              </div>
            ) : data?.recentActivities?.length ? (
              data.recentActivities.map((activity: any, index: number) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === 'assignment' ? 'bg-green-500' : 
                    activity.type === 'meeting' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 dark:text-gray-100">{activity.message}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                <Icons.Calendar size={32} className="mx-auto mb-2 opacity-50" />
                No recent activities
              </div>
            )}
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Today's Schedule */}
      <DashboardGridItem colSpan={6} delay={1.0}>
        <AnimatedCard variant="elevated" size="md" hover={true}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Calendar size={20} className="mr-2" />
            Today's Schedule
          </h3>
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="loading-skeleton h-12 w-full" />
                ))}
              </div>
            ) : data?.todaySchedule?.length ? (
              data.todaySchedule.map((schedule: any, index: number) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {schedule.subject}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {schedule.class} - {schedule.section} • {schedule.room}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {schedule.time}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {schedule.studentCount} students
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                <Icons.Calendar size={32} className="mx-auto mb-2 opacity-50" />
                No classes scheduled for today
              </div>
            )}
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Performance Overview */}
      <DashboardGridItem colSpan={12} delay={1.1}>
        <AnimatedCard variant="elevated" size="md" hover={false}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <Icons.TrendingUp size={20} className="mr-2" />
            Performance Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Attendance</span>
                <Icons.Users size={16} className="text-blue-500" />
              </div>
              <ProgressIndicator
                value={data?.averageAttendance || 85}
                type="circular"
                color="blue"
                size="md"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {data?.averageAttendance || 85}% this month
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assignment Completion</span>
                <Icons.CheckCircle size={16} className="text-green-500" />
              </div>
              <ProgressIndicator
                value={data?.assignmentCompletion || 78}
                type="circular"
                color="green"
                size="md"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {data?.assignmentCompletion || 78}% completed
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Grade</span>
                <Icons.Award size={16} className="text-yellow-500" />
              </div>
              <ProgressIndicator
                value={data?.averageGrade || 82}
                type="circular"
                color="yellow"
                size="md"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {data?.averageGrade || 82}% average
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Parent Engagement</span>
                <Icons.Heart size={16} className="text-purple-500" />
              </div>
              <ProgressIndicator
                value={data?.parentEngagement || 65}
                type="circular"
                color="purple"
                size="md"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {data?.parentEngagement || 65}% active
              </p>
            </div>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* AI Assistant Widget */}
      <AIAssistantWidget
        userRole="teacher"
        userName={user?.name || 'Teacher'}
        currentSubject="Teaching"
        language={locale as 'en' | 'bn' | 'ar'}
        onSendMessage={handleAIMessage}
        className="fixed bottom-6 right-6 z-50"
      />
    </DashboardLayout>
  );
}
