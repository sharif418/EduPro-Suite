'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icons } from '../icons/IconLibrary';
import { ChevronLeft, ChevronRight, Bell } from 'lucide-react';

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: keyof typeof Icons;
  badge?: number;
  children?: SidebarItem[];
}

export interface EnhancedSidebarProps {
  items: SidebarItem[];
  userRole: 'admin' | 'teacher' | 'student' | 'guardian' | 'librarian' | 'accountant';
  userName: string;
  userAvatar?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  notifications?: number;
}

const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({
  items,
  userRole,
  userName,
  userAvatar,
  collapsed = false,
  onCollapsedChange,
  className = '',
  notifications = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
    
    // Clear expanded items when collapsing
    if (newCollapsed) {
      setExpandedItems([]);
    }
  };

  const toggleExpanded = (itemId: string) => {
    if (isCollapsed) return;
    
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const hasActiveChild = (item: SidebarItem): boolean => {
    if (!item.children) return false;
    return item.children.some(child => isActive(child.href) || hasActiveChild(child));
  };

  // Role-based color schemes
  const roleColors = {
    admin: {
      primary: 'bg-red-600',
      secondary: 'bg-red-50 dark:bg-red-900/20',
      accent: 'text-red-600 dark:text-red-400',
      hover: 'hover:bg-red-50 dark:hover:bg-red-900/20',
    },
    teacher: {
      primary: 'bg-blue-600',
      secondary: 'bg-blue-50 dark:bg-blue-900/20',
      accent: 'text-blue-600 dark:text-blue-400',
      hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
    },
    student: {
      primary: 'bg-green-600',
      secondary: 'bg-green-50 dark:bg-green-900/20',
      accent: 'text-green-600 dark:text-green-400',
      hover: 'hover:bg-green-50 dark:hover:bg-green-900/20',
    },
    guardian: {
      primary: 'bg-purple-600',
      secondary: 'bg-purple-50 dark:bg-purple-900/20',
      accent: 'text-purple-600 dark:text-purple-400',
      hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
    },
    librarian: {
      primary: 'bg-indigo-600',
      secondary: 'bg-indigo-50 dark:bg-indigo-900/20',
      accent: 'text-indigo-600 dark:text-indigo-400',
      hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
    },
    accountant: {
      primary: 'bg-yellow-600',
      secondary: 'bg-yellow-50 dark:bg-yellow-900/20',
      accent: 'text-yellow-600 dark:text-yellow-400',
      hover: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20',
    },
  };

  const colors = roleColors[userRole];

  const sidebarVariants = {
    expanded: {
      width: 280,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
    collapsed: {
      width: 80,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.2,
        ease: 'easeOut',
      },
    },
  };

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const IconComponent = Icons[item.icon];
    const isItemActive = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const hasActiveChildren = hasActiveChild(item);

    return (
      <motion.div
        key={item.id}
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="relative"
      >
        <div
          className={`
            relative flex items-center px-3 py-2 mx-2 rounded-lg
            transition-all duration-200 group
            ${isItemActive 
              ? `${colors.secondary} ${colors.accent} shadow-sm` 
              : `text-gray-700 dark:text-gray-300 ${colors.hover}`
            }
            ${level > 0 ? 'ml-4' : ''}
          `}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {/* Active indicator */}
          {isItemActive && (
            <motion.div
              className={`absolute left-0 top-0 bottom-0 w-1 ${colors.primary} rounded-r-full`}
              layoutId="activeIndicator"
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
            />
          )}

          {/* Islamic geometric pattern for active items */}
          {(isItemActive || hasActiveChildren) && (
            <div className="absolute inset-0 opacity-5 overflow-hidden rounded-lg">
              <svg
                className="w-full h-full"
                viewBox="0 0 100 100"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id={`pattern-${item.id}`}
                    x="0"
                    y="0"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <circle cx="10" cy="10" r="1" fill="currentColor" opacity="0.3" />
                    <path
                      d="M10,5 L15,10 L10,15 L5,10 Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.3"
                      opacity="0.2"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#pattern-${item.id})`} />
              </svg>
            </div>
          )}

          {/* Icon */}
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
            <IconComponent 
              size={20} 
              className={`transition-colors duration-200 ${
                isItemActive ? colors.accent : 'text-gray-500 dark:text-gray-400'
              }`}
            />
          </div>

          {/* Label and badge */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 ml-3 flex items-center justify-between overflow-hidden"
              >
                {/* Navigation Link */}
                <Link 
                  href={item.href} 
                  className="flex-1 text-sm font-medium truncate focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  {item.label}
                </Link>

                <div className="flex items-center space-x-1">
                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`
                        inline-flex items-center justify-center px-2 py-1 text-xs font-bold
                        leading-none text-white ${colors.primary} rounded-full min-w-[20px]
                      `}
                      aria-label={`${item.badge} notifications`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.span>
                  )}

                  {/* Expand button - separate from navigation */}
                  {hasChildren && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleExpanded(item.id);
                      }}
                      className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${item.label} submenu`}
                    >
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tooltip for collapsed state */}
          {isCollapsed && hoveredItem === item.id && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded shadow-lg whitespace-nowrap z-50"
            >
              {item.label}
              {item.badge && item.badge > 0 && (
                <span className={`ml-2 px-1 py-0.5 text-xs ${colors.primary} text-white rounded`}>
                  {item.badge}
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Children */}
        <AnimatePresence>
          {hasChildren && isExpanded && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {item.children!.map(child => renderSidebarItem(child, level + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <motion.div
      variants={sidebarVariants}
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      className={`
        relative h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
        flex flex-col shadow-lg ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center space-x-3"
            >
              {/* User Avatar */}
              <div className="relative">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-8 h-8 ${colors.primary} rounded-full flex items-center justify-center`}>
                    <span className="text-white text-sm font-medium">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                {/* Notification indicator */}
                {notifications > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-bold">
                      {notifications > 9 ? '9+' : notifications}
                    </span>
                  </motion.div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {userName}
                </p>
                <p className={`text-xs ${colors.accent} capitalize`}>
                  {userRole}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse Button */}
        <motion.button
          onClick={handleCollapse}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          )}
        </motion.button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1">
          {items.map(item => renderSidebarItem(item))}
        </nav>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <AnimatePresence>
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-gray-500 dark:text-gray-400 text-center"
            >
              EduPro Suite v2.0
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">EP</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default EnhancedSidebar;
