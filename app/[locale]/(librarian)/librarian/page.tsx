'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  BookOpen, 
  Users, 
  Package, 
  AlertCircle, 
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

interface DashboardStats {
  totalBooks: number;
  issuedBooks: number;
  availableBooks: number;
  overdueBooks: number;
  pendingFines: number;
  recentActivities: any[];
}

export default function LibrarianDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('librarian');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/librarian/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data);
        } else {
          setError(data.error || 'Failed to load data');
        }
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchDashboardStats}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overviewCards = [
    {
      title: t('dashboard.totalBooks'),
      value: stats?.totalBooks?.toLocaleString() || 0,
      icon: BookOpen,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: t('dashboard.issuedBooks'),
      value: stats?.issuedBooks?.toLocaleString() || 0,
      icon: TrendingUp,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: t('dashboard.availableBooks'),
      value: stats?.availableBooks?.toLocaleString() || 0,
      icon: Package,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    },
    {
      title: 'Overdue Books',
      value: stats?.overdueBooks?.toLocaleString() || 0,
      icon: AlertCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-2">{t('dashboard.subtitle')}</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewCards.map((card, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`${card.color} rounded-md p-3`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className={`text-lg font-medium ${card.textColor}`}>
                      {card.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Library Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Library Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700">Available</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats?.availableBooks || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm text-gray-700">Issued</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats?.issuedBooks || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm text-gray-700">Overdue</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats?.overdueBooks || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-700">Pending Fines</span>
              </div>
              <span className="text-sm font-medium text-gray-900">${stats?.pendingFines || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activities</h3>
          <div className="space-y-3">
            {stats?.recentActivities?.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 py-2 border-b border-gray-100 last:border-b-0">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'issue' ? 'bg-green-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.timeAgo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <BookOpen className="h-5 w-5 mr-2" />
            Issue Book
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Package className="h-5 w-5 mr-2" />
            Return Book
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Users className="h-5 w-5 mr-2" />
            Manage Members
          </button>
        </div>
      </div>
    </div>
  );
}
