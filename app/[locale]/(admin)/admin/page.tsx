'use client';

import { useSession } from '../../../hooks/useSession';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import DashboardLayout, { DashboardGridItem } from '../../../components/dashboard/DashboardLayout';
import StatCard from '../../../components/ui/StatCard';
import AnimatedCard from '../../../components/ui/AnimatedCard';
import ProgressIndicator from '../../../components/ui/ProgressIndicator';
import EducationalCharts, { generateAttendanceData, generateSubjectPerformanceData } from '../../../components/charts/EducationalCharts';
import AIAssistantWidget from '../../../components/ai/AIAssistantWidget';
import { useAdminDashboard, calculateTrends } from '../../../hooks/useDashboardData';
import { Icons } from '../../../components/icons/IconLibrary';
import { integrationService } from '../../../lib/integration-service';

export default function AdminDashboard() {
  const { user } = useSession();
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;
  const isBengali = locale === 'bn';
  
  // Use the new unified data hook
  const { data, error, isLoading, refresh, sendAction, updateOptimistically } = useAdminDashboard({
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
    await integrationService.trackEvent(`admin_${action}`, { userId: user?.id });
  };

  const handleAIMessage = async (message: string, context?: any) => {
    return await integrationService.sendAIMessage(message, {
      ...context,
      userRole: 'admin',
      dashboardContext: data,
    });
  };

  // Calculate trends for stats
  const studentTrend = data?.totalStudents ? calculateTrends(data.totalStudents, data.totalStudents - 5) : undefined;
  const staffTrend = data?.totalStaff ? calculateTrends(data.totalStaff, data.totalStaff - 1) : undefined;
  const coursesTrend = data?.activeCourses ? calculateTrends(data.activeCourses, data.activeCourses - 2) : undefined;

  return (
    <DashboardLayout
      title={`${t('dashboard.welcomeMessage')}, ${user?.name}!`}
      subtitle="Manage your educational institution with powerful administrative tools"
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
          className="bg-gradient-to-r from-red-500 to-purple-600 text-white border-none"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
                {t('dashboard.welcomeMessage')}, {user?.name}!
              </h1>
              <p className="text-red-100 text-base sm:text-lg">
                Manage your educational institution with powerful administrative tools.
              </p>
            </div>
            <div className="hidden md:block">
              <Icons.Crown size={48} className="text-white/20" />
            </div>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Enhanced Stats Cards */}
      <DashboardGridItem colSpan={3} delay={0.1}>
        <StatCard
          title={t('dashboard.totalStudents')}
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
          title="Staff Members"
          value={data?.totalStaff || 0}
          icon={<Icons.GraduationCap size={24} />}
          trend={staffTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="green"
          onClick={() => handleQuickAction('view_staff')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.3}>
        <StatCard
          title="Active Courses"
          value={data?.activeCourses || 0}
          icon={<Icons.BookOpen size={24} />}
          trend={coursesTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="yellow"
          onClick={() => handleQuickAction('view_courses')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.4}>
        <StatCard
          title="Pending Tasks"
          value={data?.pendingTasks || 0}
          icon={<Icons.AlertTriangle size={24} />}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="red"
          onClick={() => handleQuickAction('view_tasks')}
        />
      </DashboardGridItem>

      {/* Charts Section */}
      <DashboardGridItem colSpan={6} delay={0.5}>
        <EducationalCharts
          type="bar"
          data={generateSubjectPerformanceData().map(item => ({ ...item, value: item.average }))}
          title="School Performance Overview"
          subtitle="Average performance across all subjects"
          showBengaliNumbers={isBengali}
          animated={true}
          height={300}
          dataKeys={['average', 'highest', 'lowest']}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={6} delay={0.6}>
        <EducationalCharts
          type="line"
          data={generateAttendanceData(30).map(item => ({ ...item, value: item.present }))}
          title="Attendance Trends"
          subtitle="Last 30 days attendance overview"
          showBengaliNumbers={isBengali}
          animated={true}
          height={300}
          dataKeys={['present', 'absent', 'late']}
        />
      </DashboardGridItem>

      {/* Recent Activities with Enhanced UI */}
      <DashboardGridItem colSpan={6} delay={0.7}>
        <AnimatedCard variant="elevated" size="md" hover={true}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Clock size={20} className="mr-2" />
            {t('dashboard.recentActivity')}
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
                    activity.type === 'enrollment' ? 'bg-green-500' : 
                    activity.type === 'report' ? 'bg-blue-500' : 'bg-yellow-500'
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

      {/* Enhanced Quick Actions */}
      <DashboardGridItem colSpan={6} delay={0.8}>
        <AnimatedCard variant="elevated" size="md" hover={true}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Zap size={20} className="mr-2" />
            {t('dashboard.quickActions')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleQuickAction('add_student')}
              className="group p-4 text-left border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover-lift"
            >
              <Icons.Users size={24} className="mb-3 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('students.addStudent')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enroll new students</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('add_teacher')}
              className="group p-4 text-left border rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 hover-lift"
            >
              <Icons.GraduationCap size={24} className="mb-3 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('teachers.addTeacher')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add teaching staff</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('view_reports')}
              className="group p-4 text-left border rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 hover-lift"
            >
              <Icons.BarChart3 size={24} className="mb-3 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">View Reports</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Analytics & insights</p>
            </button>
            
            <button 
              onClick={() => handleQuickAction('system_settings')}
              className="group p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 hover-lift"
            >
              <Icons.Settings size={24} className="mb-3 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('common.settings')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">System configuration</p>
            </button>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* System Health with Progress Indicators */}
      <DashboardGridItem colSpan={12} delay={0.9}>
        <AnimatedCard variant="elevated" size="md" hover={false}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <Icons.Shield size={20} className="mr-2" />
            {t('dashboard.systemHealth')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Database</span>
                <Icons.CheckCircle size={16} className="text-green-500" />
              </div>
              <ProgressIndicator
                value={98}
                type="linear"
                color="green"
                size="sm"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {data?.systemHealth?.database || 'Operational'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Authentication</span>
                <Icons.CheckCircle size={16} className="text-green-500" />
              </div>
              <ProgressIndicator
                value={100}
                type="linear"
                color="green"
                size="sm"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {data?.systemHealth?.authentication || 'Operational'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">File Storage</span>
                <Icons.CheckCircle size={16} className="text-green-500" />
              </div>
              <ProgressIndicator
                value={95}
                type="linear"
                color="green"
                size="sm"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {data?.systemHealth?.fileStorage || 'Operational'}
              </p>
            </div>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* AI Assistant Widget */}
      <AIAssistantWidget
        userRole="admin"
        userName={user?.name || 'Admin'}
        currentSubject="Administration"
        language={locale as 'en' | 'bn' | 'ar'}
        onSendMessage={handleAIMessage}
        className="fixed bottom-6 right-6 z-50"
      />
    </DashboardLayout>
  );
}
