'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

interface TeacherSidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function TeacherSidebar({ className = '', isOpen = true, onClose }: TeacherSidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('teacher');

  const navigationItems = [
    {
      name: t('dashboard'),
      href: `/${locale}/teacher`,
      icon: '🏠', // Home icon
    },
    {
      name: t('myClasses'),
      href: `/${locale}/teacher/classes`,
      icon: '👥', // Users icon
    },
    {
      name: t('schedule'),
      href: `/${locale}/teacher/schedule`,
      icon: '📅', // Calendar icon
    },
    {
      name: t('lessons'),
      href: `/${locale}/teacher/lessons`,
      icon: '📚', // Books icon
    },
    {
      name: t('assignments'),
      href: `/${locale}/teacher/assignments`,
      icon: '📝', // Writing icon
    },
    {
      name: t('attendance'),
      href: `/${locale}/teacher/attendance`,
      icon: '✅', // Check mark icon
    },
    {
      name: t('grading'),
      href: `/${locale}/teacher/grading`,
      icon: '📊', // Chart icon
    },
    {
      name: t('reports'),
      href: `/${locale}/teacher/reports`,
      icon: '📋', // Clipboard icon
    },
    {
      name: t('messages'),
      href: `/${locale}/teacher/messages`,
      icon: '💬', // Message icon
    },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}/teacher`) {
      return pathname === `/${locale}/teacher`;
    }
    return pathname.startsWith(href);
  };

  const handleLinkClick = () => {
    // Close mobile sidebar when a link is clicked
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`
          h-full flex flex-col transition-all duration-300 z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${className}
        `}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        {/* Logo Section */}
        <div className="p-4 sm:p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm">
                <span className="text-lg sm:text-xl font-bold text-white">👨‍🏫</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold">EduPro Suite</h1>
                <p className="text-xs sm:text-sm opacity-80">{t('teacherPanel')}</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors duration-200"
                aria-label="Close menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <ul className="space-y-1 sm:space-y-2">
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`
                    flex items-center space-x-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all duration-200 group
                    ${
                      isActive(item.href)
                        ? 'bg-white/20 shadow-lg backdrop-blur-sm border border-white/30'
                        : 'hover:bg-white/10'
                    }
                  `}
                >
                  <span className="text-lg sm:text-xl flex-shrink-0">{item.icon}</span>
                  <span className="font-medium text-sm sm:text-base truncate">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer Pattern */}
        <div className="p-3 sm:p-4 border-t border-white/20">
          <div className="text-center text-sm opacity-75">
            <div className="mb-2 opacity-50">
              {/* Islamic geometric pattern */}
              <div className="flex justify-center space-x-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full"></div>
              </div>
            </div>
            <p className="text-xs sm:text-sm">{t('teacherPanel')}</p>
          </div>
        </div>
      </div>
    </>
  );
}
