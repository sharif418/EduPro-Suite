'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '../icons/IconLibrary';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  Settings, 
  LogOut, 
  User, 
  Moon, 
  Sun,
  Command,
  Home,
  ChevronRight
} from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  avatar?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Icons;
  href: string;
  shortcut?: string;
}

export interface EnhancedHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
  notifications?: NotificationItem[];
  quickActions?: QuickAction[];
  userName: string;
  userAvatar?: string;
  userRole: string;
  onSearch?: (query: string) => void;
  onNotificationClick?: (notification: NotificationItem) => void;
  onLogout?: () => void;
  onThemeToggle?: () => void;
  isDarkMode?: boolean;
  className?: string;
}

const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  breadcrumbs = [],
  notifications = [],
  quickActions = [],
  userName,
  userAvatar,
  userRole,
  onSearch,
  onNotificationClick,
  onLogout,
  onThemeToggle,
  isDarkMode = false,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  
  const searchRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      
      // Escape to close dropdowns
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowUserMenu(false);
        setShowQuickActions(false);
        searchRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <Icons.CheckCircle size={16} className="text-green-500" />;
      case 'warning':
        return <Icons.AlertTriangle size={16} className="text-yellow-500" />;
      case 'error':
        return <Icons.AlertTriangle size={16} className="text-red-500" />;
      default:
        return <Icons.Bell size={16} className="text-blue-500" />;
    }
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700
        px-6 py-4 flex items-center justify-between shadow-sm ${className}
      `}
    >
      {/* Left Section - Breadcrumbs */}
      <div className="flex items-center space-x-4 flex-1">
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
              <Home className="w-4 h-4" />
            </Link>
            
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {item.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-8">
        <form onSubmit={handleSearch} className="relative">
          <motion.div
            className={`
              relative flex items-center transition-all duration-200
              ${isSearchFocused 
                ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                : 'ring-1 ring-gray-300 dark:ring-gray-600'
              }
              rounded-lg bg-gray-50 dark:bg-gray-800
            `}
            whileFocus={{ scale: 1.02 }}
          >
            <Search className="w-4 h-4 text-gray-400 ml-3" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="
                w-full px-3 py-2 bg-transparent text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none
              "
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <Icons.X size={16} />
              </button>
            )}
          </motion.div>
        </form>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center space-x-4">
        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="relative" ref={quickActionsRef}>
            <motion.button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Command className="w-5 h-5" />
            </motion.button>

            <AnimatePresence>
              {showQuickActions && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                >
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Quick Actions
                  </div>
                  {quickActions.map((action) => {
                    const IconComponent = Icons[action.icon];
                    return (
                      <Link
                        key={action.id}
                        href={action.href}
                        className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setShowQuickActions(false)}
                      >
                        <IconComponent size={16} className="mr-3" />
                        <span className="flex-1">{action.label}</span>
                        {action.shortcut && (
                          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {action.shortcut}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Theme Toggle */}
        <motion.button
          onClick={onThemeToggle}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </motion.button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <motion.button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Notifications
                  </h3>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        className={`
                          px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer
                          hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                          ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                        `}
                        onClick={() => {
                          onNotificationClick?.(notification);
                          setShowNotifications(false);
                        }}
                        whileHover={{ x: 4 }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {notification.avatar ? (
                              <img
                                src={notification.avatar}
                                alt=""
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              getNotificationIcon(notification.type)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {formatTimeAgo(notification.timestamp)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
                
                {notifications.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                      View all notifications
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <motion.button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
              >
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {userRole}
                  </p>
                </div>
                
                <div className="py-2">
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <User className="w-4 h-4 mr-3" />
                    Profile
                  </button>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </button>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                  <button
                    onClick={() => {
                      onLogout?.();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
};

export default EnhancedHeader;
