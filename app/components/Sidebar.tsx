'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: '🏠', // Home icon
    },
    {
      name: 'Academic Setup',
      href: '/admin/academic-setup',
      icon: '📚', // Book icon
    },
    {
      name: 'Student Management',
      href: '/admin/student-management',
      icon: '👥', // Users icon
    },
    {
      name: 'Staff Management',
      href: '/admin/staff-management',
      icon: '💼', // Briefcase icon
    },
    {
      name: 'Leave Management',
      href: '/admin/leave-management',
      icon: '📋', // Calendar icon
    },
    {
      name: 'Examinations',
      href: '/admin/examinations',
      icon: '📋', // Clipboard icon
    },
    {
      name: 'Finance',
      href: '/admin/finance',
      icon: '💰', // Dollar sign icon
    },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className={`bg-gradient-to-b from-indigo-900 to-purple-900 text-white h-full flex flex-col ${className}`}>
      {/* Logo Section */}
      <div className="p-6 border-b border-indigo-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <span className="text-xl font-bold text-white">E</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">EduPro Suite</h1>
            <p className="text-indigo-200 text-sm">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                  ${
                    isActive(item.href)
                      ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/20'
                      : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer Pattern */}
      <div className="p-4 border-t border-indigo-700/50">
        <div className="text-center text-indigo-300 text-sm">
          <div className="mb-2 opacity-30">
            {/* Islamic geometric pattern */}
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-current rounded-full"></div>
              <div className="w-2 h-2 bg-current rounded-full"></div>
              <div className="w-2 h-2 bg-current rounded-full"></div>
            </div>
          </div>
          <p>Admin Dashboard</p>
        </div>
      </div>
    </div>
  );
}
