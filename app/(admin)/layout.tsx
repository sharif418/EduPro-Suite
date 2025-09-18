'use client';

import { useSession } from '../hooks/useSession';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { ToastProvider } from '../components/ui/Toast';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN'))) {
      router.push('/unauthorized');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center transition-colors duration-200"
        style={{ backgroundColor: 'var(--admin-background)' }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if user is not authorized
  if (!user || (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN')) {
    return null;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <ToastProvider>
      <div 
        className="min-h-screen flex transition-colors duration-200"
        style={{ backgroundColor: 'var(--admin-background)' }}
      >
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 fixed inset-y-0 left-0 z-50">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <div className="lg:hidden">
          <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <Sidebar 
              isOpen={isSidebarOpen} 
              onClose={closeSidebar}
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          {/* Header */}
          <Header 
            title="Admin Dashboard" 
            onMenuToggle={toggleSidebar}
          />
          
          {/* Page Content */}
          <main 
            className="flex-1 p-4 sm:p-6 transition-colors duration-200"
            style={{ backgroundColor: 'var(--admin-content-background)' }}
          >
            <div className="max-w-full overflow-x-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
