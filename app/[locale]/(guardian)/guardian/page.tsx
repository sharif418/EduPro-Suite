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
import { useGuardianDashboard, calculateTrends } from '../../../hooks/useDashboardData';
import { Icons } from '../../../components/icons/IconLibrary';
import { integrationService } from '../../../lib/integration-service';
import AchievementBadge from '../../../components/gamification/AchievementBadge';
import { CreditCard, MessageSquare, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ChildProgress {
  id: string;
  name: string;
  className: string;
  section: string;
  overallGrade: number;
  attendanceRate: number;
  recentMarks: any[];
  upcomingExams: any[];
}

interface AttendanceAlert {
  id: string;
  studentName: string;
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  date: string;
}

interface FeeStatus {
  studentId: string;
  studentName: string;
  totalDue: number;
  overdueDays: number;
  invoices: any[];
  paymentHistory: any[];
}

interface Communication {
  id: string;
  teacherName: string;
  subject: string;
  message: string;
  type: string;
  priority: string;
  timestamp: string;
  isRead: boolean;
}

export default function GuardianDashboard() {
  const { user } = useSession();
  const t = useTranslations('guardian');
  const params = useParams();
  const locale = params.locale as string;
  const isBengali = locale === 'bn';
  
  // Use the new unified data hook
  const { data, error, isLoading, refresh, sendAction, updateOptimistically } = useGuardianDashboard({
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
    updateOptimistically({ pendingFees: (data?.pendingFees || 0) - 100 });
    
    // Send action to backend
    await sendAction(action, { timestamp: new Date().toISOString() });
    
    // Track user action
    await integrationService.trackEvent(`guardian_${action}`, { userId: user?.id });
  };

  const handleAIMessage = async (message: string, context?: any) => {
    return await integrationService.sendAIMessage(message, {
      ...context,
      userRole: 'guardian',
      dashboardContext: data,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <Icons.AlertTriangle size={16} className="text-red-500" />;
      case 'medium': return <AlertCircle size={16} className="text-yellow-500" />;
      default: return <Icons.Bell size={16} className="text-blue-500" />;
    }
  };

  // Calculate trends for stats
  const childrenTrend = data?.totalChildren ? calculateTrends(data.totalChildren, data.totalChildren) : undefined;
  const attendanceTrend = data?.attendanceRate ? calculateTrends(data.attendanceRate, data.attendanceRate - 2) : undefined;
  const feesTrend = data?.pendingFees ? calculateTrends(data.pendingFees, data.pendingFees + 500) : undefined;

  return (
    <DashboardLayout
      title={t('dashboard.title')}
      subtitle={t('dashboard.subtitle')}
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
          className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white border-none"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
                {t('dashboard.title')} 👨‍👩‍👧‍👦
              </h1>
              <p className="text-teal-100 text-base sm:text-lg">
                {t('dashboard.subtitle')}
              </p>
            </div>
            <div className="hidden md:block">
              <Icons.Heart size={48} className="text-white/20" />
            </div>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Enhanced Stats Cards */}
      <DashboardGridItem colSpan={3} delay={0.1}>
        <StatCard
          title={t('dashboard.totalChildren')}
          value={data?.totalChildren || 0}
          icon={<Icons.Users size={24} />}
          trend={childrenTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="blue"
          onClick={() => handleQuickAction('view_children')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.2}>
        <StatCard
          title={t('dashboard.attendanceRate')}
          value={data?.attendanceRate || 0}
          suffix="%"
          icon={<Icons.Calendar size={24} />}
          trend={attendanceTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="green"
          onClick={() => handleQuickAction('view_attendance')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.3}>
        <StatCard
          title={t('dashboard.pendingFees')}
          value={data?.pendingFees || 0}
          prefix="৳"
          icon={<CreditCard size={24} />}
          trend={feesTrend}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="yellow"
          onClick={() => handleQuickAction('pay_fees')}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={3} delay={0.4}>
        <StatCard
          title={t('dashboard.upcomingExams')}
          value={data?.upcomingExams || 0}
          icon={<Icons.BookOpen size={24} />}
          loading={isLoading}
          animated={true}
          showBengaliNumbers={isBengali}
          color="purple"
          onClick={() => handleQuickAction('view_exams')}
        />
      </DashboardGridItem>

      {/* Attendance Alerts */}
      {data?.attendanceAlerts && data.attendanceAlerts.length > 0 && (
        <DashboardGridItem colSpan={12} delay={0.5}>
          <AnimatedCard variant="elevated" size="md" hover={true}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Icons.AlertTriangle size={20} className="mr-2 text-red-500" />
              Attendance Alerts
            </h3>
            <div className="space-y-3">
              {data.attendanceAlerts.map((alert: AttendanceAlert, index: number) => (
                <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {alert.severity === 'high' ? (
                        <Icons.X size={20} className="text-red-500" />
                      ) : alert.severity === 'medium' ? (
                        <Icons.AlertTriangle size={20} className="text-yellow-500" />
                      ) : (
                        <AlertCircle size={20} className="text-blue-500" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{alert.studentName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(alert.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </DashboardGridItem>
      )}

      {/* Charts Section */}
      <DashboardGridItem colSpan={6} delay={0.6}>
        <EducationalCharts
          type="area"
          data={generateGradeData(['Math', 'Science', 'English', 'History']).map(item => ({ ...item, value: item.currentGrade }))}
          title="Children's Academic Progress"
          subtitle="Average performance across subjects"
          showBengaliNumbers={isBengali}
          animated={true}
          height={300}
          dataKeys={['currentGrade', 'previousGrade', 'targetGrade']}
        />
      </DashboardGridItem>

      <DashboardGridItem colSpan={6} delay={0.7}>
        <EducationalCharts
          type="line"
          data={generateAttendanceData(30).map(item => ({ ...item, value: item.present }))}
          title="Attendance Overview"
          subtitle="Last 30 days attendance tracking"
          showBengaliNumbers={isBengali}
          animated={true}
          height={300}
          dataKeys={['present', 'absent', 'late']}
        />
      </DashboardGridItem>

      {/* Children Progress Overview */}
      <DashboardGridItem colSpan={6} delay={0.8}>
        <AnimatedCard variant="elevated" size="md" hover={true}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Users size={20} className="mr-2" />
            Children Overview
          </h3>
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="loading-skeleton h-16 w-full" />
                ))}
              </div>
            ) : data?.childrenProgress?.length ? (
              data.childrenProgress.map((child: ChildProgress) => (
                <div 
                  key={child.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  onClick={() => handleQuickAction(`view_child_${child.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{child.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{child.className} - {child.section}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{child.overallGrade}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{child.attendanceRate}% attendance</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <ProgressIndicator
                        value={child.overallGrade}
                        type="circular"
                        color="green"
                        size="sm"
                        showBengaliNumbers={isBengali}
                        animated={true}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Grade</p>
                    </div>
                    <div className="text-center">
                      <ProgressIndicator
                        value={child.attendanceRate}
                        type="circular"
                        color="blue"
                        size="sm"
                        showBengaliNumbers={isBengali}
                        animated={true}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Attendance</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Icons.Users size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">No children data available</p>
              </div>
            )}
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Achievements Section */}
      <DashboardGridItem colSpan={6} delay={0.9}>
        <AnimatedCard variant="elevated" size="md" hover={true}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Award size={20} className="mr-2" />
            Children's Achievements
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <AchievementBadge
              achievement={{
                id: '1',
                title: 'Honor Roll',
                description: 'Made honor roll this semester',
                type: 'academic',
                level: 'gold',
                earnedAt: new Date(),
                isNew: true,
                rarity: 'epic'
              }}
              size="md"
              animated={true}
            />
            <AchievementBadge
              achievement={{
                id: '2',
                title: 'Perfect Week',
                description: 'Perfect attendance this week',
                type: 'attendance',
                level: 'silver',
                earnedAt: new Date(Date.now() - 86400000),
                rarity: 'rare'
              }}
              size="md"
              animated={true}
            />
            <AchievementBadge
              achievement={{
                id: '3',
                title: 'Science Fair Winner',
                description: 'Won first place in science fair',
                type: 'academic',
                level: 'gold',
                earnedAt: new Date(Date.now() - 172800000),
                rarity: 'legendary'
              }}
              size="md"
              animated={true}
            />
            <AchievementBadge
              achievement={{
                id: '4',
                title: 'Good Behavior',
                description: 'Excellent behavior this month',
                type: 'behavior',
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

      {/* Quick Actions */}
      <DashboardGridItem colSpan={12} delay={1.0}>
        <AnimatedCard variant="elevated" size="md" hover={false}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <Icons.Zap size={20} className="mr-2" />
            {t('dashboard.quickActions')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href={`/${locale}/guardian/fees`}
              className="group p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <div className="flex items-center">
              <CreditCard size={32} className="text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dashboard.payFees')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">৳{data?.pendingFees || 0} due</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/guardian/progress`}
              className="group p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div className="flex items-center">
                <Icons.TrendingUp size={32} className="text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dashboard.viewProgress')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Academic reports</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/guardian/communication`}
              className="group p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <div className="flex items-center">
                <MessageSquare size={32} className="text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dashboard.contactTeacher')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{data?.unreadMessages || 0} unread</p>
                </div>
              </div>
            </Link>

            <Link
              href={`/${locale}/guardian/attendance`}
              className="group p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <div className="flex items-center">
                <Icons.Calendar size={32} className="text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('dashboard.viewAttendance')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Daily tracking</p>
                </div>
              </div>
            </Link>
          </div>
        </AnimatedCard>
      </DashboardGridItem>

      {/* Recent Communications */}
      {data?.communications && data.communications.length > 0 && (
        <DashboardGridItem colSpan={6} delay={1.1}>
          <AnimatedCard variant="elevated" size="md" hover={true}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <MessageSquare size={20} className="mr-2" />
              Recent Communications
            </h3>
            <div className="space-y-4">
              {data.communications.map((comm: Communication) => (
                <div key={comm.id} className="flex items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0 mr-3">
                    {getPriorityIcon(comm.priority)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{comm.teacherName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(comm.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{comm.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{comm.message}</p>
                  </div>
                  <Icons.ChevronRight size={16} className="text-gray-400 ml-2" />
                </div>
              ))}
            </div>
          </AnimatedCard>
        </DashboardGridItem>
      )}

      {/* Fee Status Summary */}
      {data?.feeStatus && data.feeStatus.length > 0 && (
        <DashboardGridItem colSpan={6} delay={1.2}>
          <AnimatedCard variant="elevated" size="md" hover={true}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <CreditCard size={20} className="mr-2" />
              Fee Status
            </h3>
            <div className="space-y-4">
              {data.feeStatus.map((fee: FeeStatus) => (
                <div key={fee.studentId} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{fee.studentName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {fee.overdueDays > 0 ? `${fee.overdueDays} days overdue` : 'Current'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">৳{fee.totalDue}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fee.invoices.length} pending invoices</p>
                  </div>
                </div>
              ))}
            </div>
          </AnimatedCard>
        </DashboardGridItem>
      )}

      {/* AI Assistant Widget */}
      <AIAssistantWidget
        userRole="guardian"
        userName={user?.name || 'Guardian'}
        currentSubject="Parenting"
        language={locale as 'en' | 'bn' | 'ar'}
        onSendMessage={handleAIMessage}
        className="fixed bottom-6 right-6 z-50"
      />
    </DashboardLayout>
  );
}
