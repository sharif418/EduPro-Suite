'use client';

import { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { redirect } from 'next/navigation';
import Header from '../../components/Header';
import TeacherSidebar from '../../components/teacher/TeacherSidebar';
import { useLocale } from 'next-intl';

interface TeacherLayoutProps {
  children: React.ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  const { user, isLoading } = useSession();
  const locale = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect if not authenticated or not a teacher
  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
    redirect(`/${locale}/login`);
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex h-screen overflow-hidden">
        {/* Teacher Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <TeacherSidebar 
            className="h-full w-64 shadow-xl"
            isOpen={sidebarOpen}
            onClose={closeSidebar}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header
            title="Teacher Dashboard"
            onMenuToggle={toggleSidebar}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
