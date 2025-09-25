'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { useToastHelpers } from '@/app/contexts/ToastContext';

export interface DashboardStats {
  totalStudents?: number;
  totalTeachers?: number;
  totalClasses?: number;
  attendanceRate?: number;
  averageGrade?: number;
  pendingAssignments?: number;
  upcomingExams?: number;
  notifications?: number;
  recentActivities?: Activity[];
  [key: string]: any;
}

export interface Activity {
  id: string;
  type: 'assignment' | 'exam' | 'attendance' | 'grade' | 'announcement';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
}

export interface DashboardDataOptions {
  role: 'admin' | 'teacher' | 'student' | 'guardian' | 'librarian' | 'accountant';
  userId?: string;
  refreshInterval?: number;
  enableRealtime?: boolean;
  filters?: Record<string, any>;
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// Custom hook for dashboard data
export const useDashboardData = (options: DashboardDataOptions) => {
  const { role, userId, refreshInterval = 30000, enableRealtime = true, filters = {} } = options;
  
  const [realTimeData, setRealTimeData] = useState<Partial<DashboardStats>>({});
  const [socket, setSocket] = useState<any>(null);
  const toastHelpers = useToastHelpers();

  // Construct API endpoint based on role
  const getApiEndpoint = useCallback(() => {
    const baseUrl = `/api/${role}/dashboard/stats`;
    const params = new URLSearchParams();
    
    if (userId) params.append('userId', userId);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }, [role, userId, filters]);

  // SWR configuration
  const swrConfig = {
    refreshInterval,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    onError: (error: Error) => {
      console.error('Dashboard data fetch error:', error);
    },
  };

  // Main data fetching with SWR
  const {
    data: apiData,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<DashboardStats>(getApiEndpoint(), fetcher, swrConfig);

  // Socket.IO connection for real-time updates
  useEffect(() => {
    if (!enableRealtime) return;

    // Dynamically import socket.io-client to avoid SSR issues
    import('socket.io-client').then(({ io }) => {
      // Get auth token from cookies
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        console.warn('No auth token found, skipping Socket.IO connection');
        return;
      }

      const socketInstance = io({
        path: '/api/socket',
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      socketInstance.on('connect', () => {
        console.log('Dashboard Socket.IO connected');
        
        // Subscribe to dashboard updates by joining rooms
        socketInstance.emit('subscribe_dashboard', {
          role,
          userId
        });
      });

      socketInstance.on('dashboard_update', (message) => {
        try {
          console.log('Received dashboard update:', message);
          
          if (message.data && message.data.data) {
            setRealTimeData(prev => ({
              ...prev,
              ...message.data.data,
            }));
            
            // Wire toasts to real-time events
            if (message.data.type) {
              const title = message.title || 'Dashboard Update';
              const messageText = message.message || 'New data available';
              
              switch (message.data.type) {
                case 'notification':
                  toastHelpers.dashboardUpdate(title, messageText, message.data);
                  break;
                case 'achievement':
                  toastHelpers.achievement(title, messageText);
                  break;
                case 'warning':
                  toastHelpers.warning(title, messageText);
                  break;
                case 'error':
                  toastHelpers.error(title, messageText);
                  break;
                case 'success':
                  toastHelpers.success(title, messageText);
                  break;
                default:
                  toastHelpers.info(title, messageText);
                  break;
              }
            }
            
            // Optionally trigger a full refresh for critical updates
            if (message.critical) {
              mutate();
            }
          }
        } catch (error) {
          console.error('Socket.IO message parsing error:', error);
        }
      });

      socketInstance.on('notification:new', (notification) => {
        console.log('Received new notification:', notification);
        // Handle new notifications if needed
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Dashboard Socket.IO connection error:', error);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('Dashboard Socket.IO disconnected:', reason);
      });

      // Store socket reference
      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }).catch(error => {
      console.error('Failed to load Socket.IO client:', error);
    });
  }, [enableRealtime, role, userId, mutate]);

  // Merge API data with real-time updates
  const data = apiData ? { ...apiData, ...realTimeData } : undefined;

  // Manual refresh function
  const refresh = useCallback(async () => {
    try {
      await mutate();
      setRealTimeData({}); // Clear real-time overrides after refresh
    } catch (error) {
      console.error('Manual refresh error:', error);
    }
  }, [mutate]);

  // Optimistic updates for user actions
  const updateOptimistically = useCallback((updates: Partial<DashboardStats>) => {
    setRealTimeData(prev => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Send real-time action to server with toast feedback
  const sendAction = useCallback((action: string, payload: any, options?: { 
    showSuccessToast?: boolean; 
    showErrorToast?: boolean;
    successMessage?: string;
    errorMessage?: string;
  }) => {
    if (socket && socket.connected) {
      const actionData = {
        type: 'action',
        action,
        payload,
        userId,
        role,
      };

      // Send the action
      socket.emit('dashboard_action', actionData);

      // Show success toast if requested
      if (options?.showSuccessToast) {
        toastHelpers.success(
          'Action Sent',
          options.successMessage || `${action} action sent successfully`
        );
      }

      // Listen for action response (if needed)
      socket.once(`action_response_${action}`, (response: any) => {
        if (response.success) {
          if (options?.showSuccessToast) {
            toastHelpers.success(
              'Action Completed',
              response.message || `${action} completed successfully`
            );
          }
        } else {
          if (options?.showErrorToast) {
            toastHelpers.error(
              'Action Failed',
              options.errorMessage || response.message || `${action} failed`
            );
          }
        }
      });
    } else {
      // Show error toast if socket is not connected
      toastHelpers.error(
        'Connection Error',
        'Unable to send action - not connected to server'
      );
    }
  }, [socket, userId, role, toastHelpers]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh,
    updateOptimistically,
    sendAction,
    isConnected: socket?.connected || false,
  };
};

// Specialized hooks for different roles
export const useAdminDashboard = (options?: Omit<DashboardDataOptions, 'role'>) => {
  return useDashboardData({ ...options, role: 'admin' });
};

export const useTeacherDashboard = (options?: Omit<DashboardDataOptions, 'role'>) => {
  return useDashboardData({ ...options, role: 'teacher' });
};

export const useStudentDashboard = (options?: Omit<DashboardDataOptions, 'role'>) => {
  return useDashboardData({ ...options, role: 'student' });
};

export const useGuardianDashboard = (options?: Omit<DashboardDataOptions, 'role'>) => {
  return useDashboardData({ ...options, role: 'guardian' });
};

export const useLibrarianDashboard = (options?: Omit<DashboardDataOptions, 'role'>) => {
  return useDashboardData({ ...options, role: 'librarian' });
};

export const useAccountantDashboard = (options?: Omit<DashboardDataOptions, 'role'>) => {
  return useDashboardData({ ...options, role: 'accountant' });
};

// Utility functions for data processing
export const processActivities = (activities: Activity[] = []): Activity[] => {
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10); // Keep only the 10 most recent
};

export const calculateTrends = (current: number, previous: number): {
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
} => {
  if (previous === 0) {
    return { direction: 'neutral', percentage: 0 };
  }

  const percentage = Math.round(((current - previous) / previous) * 100);
  
  return {
    direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral',
    percentage: Math.abs(percentage),
  };
};

export const formatStatValue = (value: number | undefined, type: 'number' | 'percentage' | 'currency' = 'number'): string => {
  if (value === undefined || value === null) return 'N/A';

  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    default:
      return value.toLocaleString();
  }
};

// Mock data generators for development/testing
export const generateMockDashboardData = (role: string): DashboardStats => {
  const baseData = {
    totalStudents: Math.floor(Math.random() * 1000) + 500,
    totalTeachers: Math.floor(Math.random() * 50) + 20,
    totalClasses: Math.floor(Math.random() * 30) + 10,
    attendanceRate: Math.floor(Math.random() * 20) + 80,
    averageGrade: Math.floor(Math.random() * 20) + 75,
    pendingAssignments: Math.floor(Math.random() * 10) + 2,
    upcomingExams: Math.floor(Math.random() * 5) + 1,
    notifications: Math.floor(Math.random() * 15) + 3,
  };

  const activities: Activity[] = [
    {
      id: '1',
      type: 'assignment',
      title: 'Math Assignment Submitted',
      description: 'John Doe submitted Algebra homework',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      user: { name: 'John Doe', role: 'student' },
    },
    {
      id: '2',
      type: 'grade',
      title: 'Science Test Graded',
      description: 'Physics test results published',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      user: { name: 'Dr. Smith', role: 'teacher' },
    },
    {
      id: '3',
      type: 'announcement',
      title: 'School Holiday Notice',
      description: 'Eid holiday schedule announced',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      user: { name: 'Admin', role: 'admin' },
    },
  ];

  return {
    ...baseData,
    recentActivities: activities,
  };
};

export default useDashboardData;
