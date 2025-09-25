'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/app/hooks/useSession';
import Header from '@/app/components/Header';
import EnhancedSidebar, { SidebarItem } from '@/app/components/enhanced/EnhancedSidebar';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useSession();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (user && user.role !== 'STUDENT') {
      router.push('/unauthorized');
    } else if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user || user.role !== 'STUDENT') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Student navigation items using proper IconLibrary icons
  const studentNavItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: `/${locale}/student`,
      icon: 'Home'
    },
    {
      id: 'assignments',
      label: 'Assignments',
      href: `/${locale}/student/assignments`,
      icon: 'PenTool',
      badge: 3 // Example: 3 pending assignments
    },
    {
      id: 'grades',
      label: 'Grades',
      href: `/${locale}/student/grades`,
      icon: 'BarChart3'
    },
    {
      id: 'schedule',
      label: 'Schedule',
      href: `/${locale}/student/schedule`,
      icon: 'Calendar'
    },
    {
      id: 'library',
      label: 'Library',
      href: `/${locale}/student/library`,
      icon: 'BookOpen'
    },
    {
      id: 'exams',
      label: 'Exams',
      href: `/${locale}/student/exams`,
      icon: 'FileText'
    },
    {
      id: 'achievements',
      label: 'Achievements',
      href: `/${locale}/student/achievements`,
      icon: 'Trophy'
    },
    {
      id: 'profile',
      label: 'Profile',
      href: `/${locale}/student/profile`,
      icon: 'User'
    },
    {
      id: 'settings',
      label: 'Settings',
      href: `/${locale}/student/settings`,
      icon: 'Settings'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Enhanced Sidebar */}
      <EnhancedSidebar
        items={studentNavItems}
        userRole="student"
        userName={user.name || 'Student'}
        userAvatar={undefined} // User type doesn't have avatar property
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        notifications={2} // Example: 2 new notifications
        className="fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header
          title="Student Portal"
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
