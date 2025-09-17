'use client';

import { useSession } from '../hooks/useSession';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { ToastProvider } from '../components/ui/Toast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN'))) {
      router.push('/unauthorized');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if user is not authorized
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN')) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-64 fixed inset-y-0 left-0 z-50">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 ml-64">
          {/* Header */}
          <Header title="Admin Dashboard" />
          
          {/* Page Content */}
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
