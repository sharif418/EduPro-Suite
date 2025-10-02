'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Home, BookOpen, Users, Briefcase, Calendar, FileText, DollarSign } from 'lucide-react';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ className = '', isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('sidebar');

  const navigationItems = [
    {
      name: t('dashboard'),
      href: `/${locale}/admin`,
      icon: '🏠', // Home icon
    },
    {
      name: t('academicSetup'),
      href: `/${locale}/admin/academic-setup`,
      icon: '📚', // Book icon
    },
    {
      name: t('studentManagement'),
      href: `/${locale}/admin/student-management`,
      icon: '👥', // Users icon
    },
    {
      name: t('staffManagement'),
      href: `/${locale}/admin/staff-management`,
      icon: '💼', // Briefcase icon
    },
    {
      name: t('leaveManagement'),
      href: `/${locale}/admin/leave-management`,
      icon: '📋', // Calendar icon
    },
    {
      name: t('examinations'),
      href: `/${locale}/admin/examinations`,
      icon: '📋', // Clipboard icon
    },
    {
      name: t('finance'),
      href: `/${locale}/admin/finance`,
      icon: '💰', // Dollar sign icon
    },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}/admin`) {
      return pathname === `/${locale}/admin`;
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
          background: 'var(--sidebar-background)',
          color: 'var(--sidebar-foreground)'
        }}
      >
        {/* Logo Section */}
        <div 
          className="p-4 sm:p-6 border-b"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center backdrop-blur-sm"
                style={{ backgroundColor: 'var(--sidebar-accent)' }}
              >
                <span className="text-lg sm:text-xl font-bold text-white">E</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold">EduPro Suite</h1>
                <p className="text-xs sm:text-sm opacity-80">{t('adminPanel')}</p>
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
                        ? 'shadow-lg backdrop-blur-sm border'
                        : 'hover:backdrop-blur-sm'
                    }
                  `}
                  style={{
                    backgroundColor: isActive(item.href) 
                      ? 'var(--sidebar-accent)' 
                      : 'transparent',
                    borderColor: isActive(item.href) 
                      ? 'var(--sidebar-border)' 
                      : 'transparent',
                    color: isActive(item.href) 
                      ? 'var(--sidebar-accent-foreground)' 
                      : 'var(--sidebar-foreground)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.backgroundColor = 'var(--sidebar-accent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span className="text-lg sm:text-xl flex-shrink-0">{item.icon}</span>
                  <span className="font-medium text-sm sm:text-base truncate">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer Pattern */}
        <div 
          className="p-3 sm:p-4 border-t"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <div className="text-center text-sm opacity-75">
            <div className="mb-2 opacity-50">
              {/* Islamic geometric pattern */}
              <div className="flex justify-center space-x-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full"></div>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full"></div>
              </div>
            </div>
            <p className="text-xs sm:text-sm">{t('adminPanel')}</p>
          </div>
        </div>
      </div>
    </>
  );
}
