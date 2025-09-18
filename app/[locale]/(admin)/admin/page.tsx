'use client';

import { useSession } from '../../../hooks/useSession';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

interface DashboardStats {
  statistics: {
    totalStudents: number;
    totalStaff: number;
    activeCourses: number;
    pendingTasks: number;
  };
  recentActivities: Array<{
    id: string;
    message: string;
    timestamp: string;
    type: string;
  }>;
  systemHealth: {
    database: string;
    authentication: string;
    fileStorage: string;
  };
  lastUpdated: string;
}

export default function AdminDashboard() {
  const { user } = useSession();
  const t = useTranslations();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/dashboard/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard statistics');
        }
        
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours === 1) return '1 hour ago';
    return `${diffInHours} hours ago`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          {t('dashboard.welcomeMessage')}, {user?.name}!
        </h1>
        <p className="text-indigo-100 text-base sm:text-lg">
          Manage your educational institution with powerful administrative tools.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div 
          className="rounded-lg p-4 sm:p-6 shadow-sm border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--card-foreground)'
          }}
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <span className="text-xl sm:text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dashboard.totalStudents')}</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loading ? '...' : error ? 'Error' : stats?.statistics.totalStudents.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg p-4 sm:p-6 shadow-sm border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--card-foreground)'
          }}
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <span className="text-xl sm:text-2xl">👨‍🏫</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Staff Members</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loading ? '...' : error ? 'Error' : stats?.statistics.totalStaff.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg p-4 sm:p-6 shadow-sm border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--card-foreground)'
          }}
        >
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <span className="text-xl sm:text-2xl">📚</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Courses</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loading ? '...' : error ? 'Error' : stats?.statistics.activeCourses.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg p-4 sm:p-6 shadow-sm border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--card-foreground)'
          }}
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <span className="text-xl sm:text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Tasks</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {loading ? '...' : error ? 'Error' : stats?.statistics.pendingTasks.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div 
          className="rounded-lg p-4 sm:p-6 shadow-sm border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--card-foreground)'
          }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('dashboard.recentActivity')}</h3>
          <div className="space-y-4">
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading activities...</div>
            ) : error ? (
              <div className="text-sm text-red-500">Error loading activities</div>
            ) : stats?.recentActivities.length ? (
              stats.recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
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
              <div className="text-sm text-gray-500 dark:text-gray-400">No recent activities</div>
            )}
          </div>
        </div>

        <div 
          className="rounded-lg p-4 sm:p-6 shadow-sm border transition-colors duration-200"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--card-foreground)'
          }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('dashboard.quickActions')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="p-3 sm:p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="text-xl sm:text-2xl mb-2">👤</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('students.addStudent')}</p>
            </button>
            <button 
              className="p-3 sm:p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="text-xl sm:text-2xl mb-2">👨‍🏫</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('teachers.addTeacher')}</p>
            </button>
            <button 
              className="p-3 sm:p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="text-xl sm:text-2xl mb-2">📊</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">View Reports</p>
            </button>
            <button 
              className="p-3 sm:p-4 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="text-xl sm:text-2xl mb-2">⚙️</div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('common.settings')}</p>
            </button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div 
        className="rounded-lg p-4 sm:p-6 shadow-sm border transition-colors duration-200"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--card-foreground)'
        }}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('dashboard.systemHealth')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading system status...</div>
          ) : error ? (
            <div className="text-sm text-red-500">Error loading system status</div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Database</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {stats?.systemHealth.database || 'Operational'}
                  </p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Authentication</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {stats?.systemHealth.authentication || 'Operational'}
                  </p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg sm:col-span-2 md:col-span-1">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">File Storage</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {stats?.systemHealth.fileStorage || 'Operational'}
                  </p>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
