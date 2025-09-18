'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationCenterProps {
  token?: string;
  className?: string;
}

export default function NotificationCenter({ token, className = '' }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  
  const { 
    isConnected, 
    connectionError, 
    notifications: realtimeNotifications, 
    unreadCount: realtimeUnreadCount,
    markAsRead,
    clearNotifications 
  } = useSocket(token);
  
  const { 
    notifications: apiNotifications, 
    stats, 
    loading,
    fetchNotifications 
  } = useNotifications();

  // Combine real-time and API notifications
  const allNotifications = [...realtimeNotifications, ...apiNotifications];
  const displayNotifications = showAll ? allNotifications : allNotifications.slice(0, 5);
  const totalUnreadCount = stats?.unread || realtimeUnreadCount;

  const handleNotificationClick = (notification: any) => {
    if (notification.status !== 'READ') {
      markAsRead(notification.id);
    }
    
    // Handle navigation based on notification type
    if (notification.data?.actionUrl) {
      window.location.href = notification.data.actionUrl;
    }
  };

  const handleClearAll = () => {
    clearNotifications();
    setIsOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SYSTEM': return '⚙️';
      case 'ACADEMIC': return '📚';
      case 'FINANCIAL': return '💰';
      case 'ATTENDANCE': return '📅';
      case 'EXAM': return '📝';
      case 'ANNOUNCEMENT': return '📢';
      case 'REMINDER': return '⏰';
      default: return '🔔';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'এখনই';
    if (diffInMinutes < 60) return `${diffInMinutes} মিনিট আগে`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ঘন্টা আগে`;
    return date.toLocaleDateString('bn-BD');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Unread Count Badge */}
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
        
        {/* Connection Status Indicator */}
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
          isConnected ? 'bg-green-400' : 'bg-red-400'
        }`} title={isConnected ? 'Connected' : 'Disconnected'} />
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">বিজ্ঞপ্তি</h3>
              <div className="flex items-center space-x-2">
                {connectionError && (
                  <span className="text-xs text-red-500" title={connectionError}>
                    ⚠️
                  </span>
                )}
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isConnected ? 'সংযুক্ত' : 'বিচ্ছিন্ন'}
                </span>
              </div>
            </div>
            
            {stats && (
              <div className="mt-2 text-sm text-gray-600">
                মোট: {stats.total} | অপঠিত: {stats.unread}
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2">লোড হচ্ছে...</p>
              </div>
            )}

            {!loading && displayNotifications.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p>কোন বিজ্ঞপ্তি নেই</p>
              </div>
            )}

            {displayNotifications.map((notification, index) => (
              <div
                key={notification.id || index}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  notification.status === 'READ' ? 'opacity-60' : ''
                } ${getPriorityColor(notification.priority)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-lg">
                    {getTypeIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.createdAt || notification.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {notification.content || notification.body}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(notification.priority)}`}>
                        {notification.priority === 'HIGH' ? 'জরুরি' : 
                         notification.priority === 'MEDIUM' ? 'মাঝারি' : 'সাধারণ'}
                      </span>
                      
                      {notification.status !== 'READ' && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowAll(!showAll)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showAll ? 'কম দেখান' : 'সব দেখান'}
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  সব মুছুন
                </button>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
