'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  pendingPayments: number;
  monthlyRevenue: number[];
  paymentStatuses: { paid: number; pending: number; overdue: number };
  recentTransactions: any[];
}

export default function AccountantDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('accountant');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/accountant/dashboard/stats');
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
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
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const overviewCards = [
    {
      title: t('dashboard.totalRevenue'),
      value: `$${stats?.totalRevenue?.toLocaleString() || 0}`,
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: t('dashboard.totalExpenses'),
      value: `$${stats?.totalExpenses?.toLocaleString() || 0}`,
      icon: TrendingUp,
      color: 'bg-red-500',
      textColor: 'text-red-600'
    },
    {
      title: t('dashboard.pendingPayments'),
      value: `$${stats?.pendingPayments?.toLocaleString() || 0}`,
      icon: CreditCard,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Net Profit',
      value: `$${((stats?.totalRevenue || 0) - (stats?.totalExpenses || 0)).toLocaleString()}`,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
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

      {/* Payment Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-700">Paid</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats?.paymentStatuses?.paid || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-700">Pending</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats?.paymentStatuses?.pending || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-sm text-gray-700">Overdue</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{stats?.paymentStatuses?.overdue || 0}</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {stats?.recentTransactions?.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {transaction.type === 'invoice' ? 'Invoice Payment' : 'Expense'}
                  </p>
                  <p className="text-xs text-gray-500">{transaction.date}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${transaction.type === 'invoice' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'invoice' ? '+' : '-'}${transaction.amount}
                  </p>
                  {transaction.status && (
                    <p className="text-xs text-gray-500">{transaction.status}</p>
                  )}
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
            <FileText className="h-5 w-5 mr-2" />
            Generate Invoice
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <CreditCard className="h-5 w-5 mr-2" />
            Process Payment
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
            <TrendingUp className="h-5 w-5 mr-2" />
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
}
