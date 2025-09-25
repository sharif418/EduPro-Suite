'use client';

import { useSession } from '../../../hooks/useSession';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import DashboardLayout, { DashboardGridItem } from '../../../components/dashboard/DashboardLayout';
import StatCard from '../../../components/ui/StatCard';
import AnimatedCard from '../../../components/ui/AnimatedCard';
import ProgressIndicator from '../../../components/ui/ProgressIndicator';
import EducationalCharts, { generateGradeData, generateAttendanceData } from '../../../components/charts/EducationalCharts';
import AIAssistantWidget from '../../../components/ai/AIAssistantWidget';
import { useStudentDashboard, calculateTrends } from '../../../hooks/useDashboardData';
import { Icons } from '../../../components/icons/IconLibrary';
import { integrationService } from '../../../lib/integration-service';
import AchievementBadge from '../../../components/gamification/AchievementBadge';
import Link from 'next/link';

interface Assignment {
  id: string;
  title: string;
  subject: {
    name: string;
  };
  dueDate: string;
  submission?: {
    status: string;
    marksObtained?: number;
  };
  maxMarks?: number;
  isOverdue: boolean;
  daysUntilDue: number;
}

export default function StudentDashboard() {
  const { user } = useSession();
  const t = useTranslations('student');
  const params = useParams();
  const locale = params.locale as string;
  const isBengali = locale === 'bn';
  
  // Use the new unified data hook
  const { data, error, isLoading, refresh, sendAction, updateOptimistically } = useStudentDashboard({
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
    updateOptimistically({ pendingAssignments: (data?.pendingAssignments || 0) - 1 });
    
    // Send action to backend
    await sendAction(action, { timestamp: new Date().toISOString() });
    
    // Track user action
    await integrationService.trackEvent(`student_${action}`, { userId: user?.id });
  };

  const handleAIMessage = async (message: string, context?: any) => {
    return await integrationService.sendAIMessage(message, {
      ...context,
      userRole: 'student',
      dashboardContext: data,
    });
  };

  const getStatusColor = (assignment: Assignment) => {
    if (!assignment.submission || assignment.submission.status === 'PENDING') {
      return assignment.isOverdue ? 'text-red-600 bg-red-50' : 'text-yellow-600 bg-yellow-50';
    }
    if (assignment.submission.status === 'SUBMITTED') {
      return 'text-blue-600 bg-blue-50';
    }
    if (assignment.submission.status === 'GRADED') {
      return 'text-green-600 bg-green-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusText = (assignment: Assignment) => {
    if (!assignment.submission || assignment.submission.status === 'PENDING') {
      return assignment.isOverdue ? 'Overdue' : 'Pending';
    }
    return assignment.submission.status.charAt(0) + assignment.submission.status.slice(1).toLowerCase();
  };

  // Calculate trends for stats
  const pendingTrend = data?.pendingAssignments ? calculateTrends(data.pendingAssignments, data.pendingAssignments + 2) : undefined;
  const submittedTrend = data?.submittedAssignments ? calculateTrends(data.submittedAssignments, data.submittedAssignments - 1) : undefined;
  const gradedTrend = data?.gradedAssignments ? calculateTrends(data.gradedAssignments, data.gradedAssignments - 1) : undefined;

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name}!`}
      subtitle="Here's your academic overview for today"
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
          className="bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
                Welcome back, {user?.name}! 📚
              </h1>
              <p className="text-blue-100 text-base sm:text-lg">
                Here's your academic overview for today
              </p>
            </div>
            <div className="hidden md:block">
              <Icons.BookOpen size={48} className="text-white/20" />
            </div>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Enhanced Stats Cards */}
      <DashboardGridItem colSpan={3} delay={0.1}>
        <StatCard
          title="Pending"
          value={data?.pendingAssignments || 0}
          icon={<Icons.Clock size={24} />}
          trend={pendingTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="yellow"
          onClick={() => handleQuickAction('view_pending')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.2}>
        <StatCard
          title="Submitted"
          value={data?.submittedAssignments || 0}
          icon={<Icons.CheckCircle size={24} />}
          trend={submittedTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="blue"
          onClick={() => handleQuickAction('view_submitted')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.3}>
        <StatCard
          title="Graded"
          value={data?.gradedAssignments || 0}
          icon={<Icons.Award size={24} />}
          trend={gradedTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="green"
          onClick={() => handleQuickAction('view_graded')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.4}>
        <StatCard
          title="Average Grade"
          value={data?.averageGrade || 0}
          suffix="%"
          icon={<Icons.TrendingUp size={24} />}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="purple"
          onClick={() => handleQuickAction('view_grades')}
        />
      </DashboardGridItem>

      {/* Charts Section */}
      <DashboardGridItem colSpan={6} delay={0.5}>
        <EducationalCharts
          type="area"
          data={generateGradeData(['Math', 'Science', 'English', 'History']).map(item => ({ ...item, value: item.currentGrade }))}
          title="Grade Progress"
          subtitle="Your performance across subjects"
          showBengaliNumbers={isBengali}
          animated={true}
          height={300}
          dataKeys={['currentGrade', 'previousGrade', 'targetGrade']}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={6} delay={0.6}>
        <EducationalCharts
          type="line"
          data={generateAttendanceData(30).map(item => ({ ...item, value: item.present }))}
          title="Attendance Trends"
          subtitle="Your attendance over the last 30 days"
          showBengaliNumbers={isBengali}
          animated={true}
          height={300}
          dataKeys={['present']}
        />
      </DashboardGridItem>

      {/* Achievements Section */}
      <DashboardGridItem colSpan={12} delay={0.7}>
        <AnimatedCard variant="elevated" size="md" hover={true}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Award size={20} className="mr-2" />
            Recent Achievements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AchievementBadge
              achievement={{
                id: '1',
                title: 'Perfect Attendance',
                description: '100% attendance this week',
                type: 'attendance',
                level: 'gold',
                earnedAt: new Date(),
                isNew: true,
                rarity: 'legendary'
              }}
              size="md"
              animated={true}
            />
            <AchievementBadge
              achievement={{
                id: '2',
                title: 'Math Master',
                description: 'Scored 95+ in Math test',
                type: 'academic',
                level: 'silver',
                earnedAt: new Date(Date.now() - 86400000),
                rarity: 'epic'
              }}
              size="md"
              animated={true}
            />
            <AchievementBadge
              achievement={{
                id: '3',
                title: 'Early Bird',
                description: 'Submitted assignment early',
                type: 'behavior',
                level: 'bronze',
                earnedAt: new Date(Date.now() - 172800000),
                rarity: 'rare'
              }}
              size="md"
              animated={true}
            />
            <AchievementBadge
              achievement={{
                id: '4',
                title: 'Team Player',
                description: 'Excellent group work',
                type: 'community',
                level: 'bronze',
                earnedAt: new Date(Date.now() - 259200000),
                rarity: 'common'
              }}
              size="md"
              animated={true}
            />
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Recent Assignments */}
      <DashboardGridItem colSpan={6} delay={0.8}>
        <AnimatedCard variant="elevated" size="md" hover={true}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Icons.FileText size={20} className="mr-2" />
              Recent Assignments
            </h3>
            <Link
              href={`/${locale}/student/assignments`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="loading-skeleton h-16 w-full" />
                ))}
              </div>
            ) : data?.assignments?.length ? (
              data.assignments.slice(0, 5).map((assignment: Assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{assignment.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{assignment.subject.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      {assignment.daysUntilDue >= 0 && (
                        <span className="ml-2">
                          ({assignment.daysUntilDue === 0 ? 'Due today' : `${assignment.daysUntilDue} days left`})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4">
                    {assignment.submission?.status === 'GRADED' && assignment.submission.marksObtained !== null && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {assignment.submission.marksObtained}/{assignment.maxMarks || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Grade</p>
                      </div>
                    )}

                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment)}`}>
                      {getStatusText(assignment)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Icons.FileText size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">No assignments yet</p>
              </div>
            )}
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Performance Overview */}
      <DashboardGridItem colSpan={6} delay={0.9}>
        <AnimatedCard variant="elevated" size="md" hover={false}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
            <Icons.BarChart3 size={20} className="mr-2" />
            Performance
          </h3>
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Grade</span>
                <Icons.TrendingUp size={16} className="text-green-500" />
              </div>
              <ProgressIndicator
                value={data?.averageGrade || 82}
                type="circular"
                color="green"
                size="lg"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {data?.averageGrade || 82}% average
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attendance</span>
                <Icons.Calendar size={16} className="text-blue-500" />
              </div>
              <ProgressIndicator
                value={data?.attendanceRate || 95}
                type="linear"
                color="blue"
                size="md"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {data?.attendanceRate || 95}% this month
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assignment Completion</span>
                <Icons.CheckCircle size={16} className="text-purple-500" />
              </div>
              <ProgressIndicator
                value={data?.assignmentCompletion || 88}
                type="linear"
                color="purple"
                size="md"
                showBengaliNumbers={isBengali}
                animated={true}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {data?.assignmentCompletion || 88}% completed
              </p>
            </div>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Quick Actions */}
      <DashboardGridItem colSpan={12} delay={1.0}>
        <AnimatedCard variant="elevated" size="md" hover={false}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Zap size={20} className="mr-2" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href={`/${locale}/student/assignments`}
              className="group p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Icons.FileText size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">View Assignments</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Check all your assignments and submissions</p>
              </div>
            </Link>

            <Link
              href={`/${locale}/student/grades`}
              className="group p-6 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Icons.BarChart3 size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">View Grades</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">Check your grades and academic progress</p>
              </div>
            </Link>

            <Link
              href={`/${locale}/student/schedule`}
              className="group p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Icons.Calendar size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Class Schedule</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">View your class timetable and schedule</p>
              </div>
            </Link>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* AI Assistant Widget */}
      <AIAssistantWidget
        userRole="student"
        userName={user?.name || 'Student'}
        currentSubject="Learning"
        language={locale as 'en' | 'bn' | 'ar'}
        onSendMessage={handleAIMessage}
        className="fixed bottom-6 right-6 z-50"
      />
    </DashboardLayout>
  );
}
