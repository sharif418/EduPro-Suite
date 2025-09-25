'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import EnhancedSidebar, { SidebarItem } from '@/app/components/enhanced/EnhancedSidebar';
import Header from '@/app/components/Header';

interface GuardianLayoutProps {
  children: React.ReactNode;
}

export default function GuardianLayout({ children }: GuardianLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('guardian');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        if (userData.role !== 'GUARDIAN') {
          router.push('/unauthorized');
          return;
        }
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Guardian navigation items using proper IconLibrary icons
  const guardianNavItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard'),
      href: `/${locale}/guardian`,
      icon: 'Home'
    },
    {
      id: 'child-progress',
      label: t('navigation.childProgress'),
      href: `/${locale}/guardian/progress`,
      icon: 'TrendingUp'
    },
    {
      id: 'attendance',
      label: t('navigation.attendance'),
      href: `/${locale}/guardian/attendance`,
      icon: 'Calendar'
    },
    {
      id: 'academics',
      label: t('navigation.academics'),
      href: `/${locale}/guardian/academics`,
      icon: 'BookOpen'
    },
    {
      id: 'fees',
      label: t('navigation.fees'),
      href: `/${locale}/guardian/fees`,
      icon: 'Calculator',
      badge: 1 // Example: 1 pending payment
    },
    {
      id: 'communication',
      label: t('navigation.communication'),
      href: `/${locale}/guardian/communication`,
      icon: 'MessageCircle'
    },
    {
      id: 'notifications',
      label: t('navigation.notifications'),
      href: `/${locale}/guardian/notifications`,
      icon: 'Bell',
      badge: 3 // Example: 3 new notifications
    },
    {
      id: 'settings',
      label: t('navigation.settings'),
      href: `/${locale}/guardian/settings`,
      icon: 'Settings'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Enhanced Sidebar */}
      <EnhancedSidebar
        items={guardianNavItems}
        userRole="guardian"
        userName={user?.name || 'Guardian'}
        userAvatar={undefined} // User type doesn't have avatar property
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        notifications={3} // Example: 3 new notifications
        className="fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          title="Guardian Portal"
          onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Backdrop */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
    </div>
  );
}
