'use client';

import { useState, useEffect, useCallback } from 'react';

interface NotificationStats {
  total: number;
  unread: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
}

interface NotificationPreference {
  id: string;
  type: string;
  channels: string[];
  isEnabled: boolean;
}

interface UseNotificationsReturn {
  notifications: any[];
  stats: NotificationStats | null;
  preferences: NotificationPreference[];
  loading: boolean;
  error: string | null;
  fetchNotifications: (limit?: number, offset?: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreference>[]) => Promise<boolean>;
  updatePreference: (type: string, channels: string[], isEnabled: boolean) => Promise<boolean>;
  createNotification: (data: any) => Promise<boolean>;
  subscribeToPush: (subscription: any) => Promise<boolean>;
  unsubscribeFromPush: (endpoint?: string) => Promise<boolean>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (limit = 20, offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/notifications?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      
      if (data.success) {
        if (offset === 0) {
          setNotifications(data.data);
        } else {
          setNotifications(prev => [...prev, ...data.data]);
        }
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[NOTIFICATIONS_FETCH_ERROR]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?stats=true', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification stats');
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('[STATS_FETCH_ERROR]', err);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch preferences');
      }
    } catch (err) {
      console.error('[PREFERENCES_FETCH_ERROR]', err);
    }
  }, []);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreference>[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ preferences: newPreferences })
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.data);
        return true;
      } else {
        throw new Error(data.error || 'Failed to update preferences');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[PREFERENCES_UPDATE_ERROR]', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePreference = useCallback(async (type: string, channels: string[], isEnabled: boolean): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ type, channels, isEnabled })
      });

      if (!response.ok) {
        throw new Error('Failed to update preference');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setPreferences(prev => {
          const existing = prev.find(p => p.type === type);
          if (existing) {
            return prev.map(p => p.type === type ? data.data : p);
          } else {
            return [...prev, data.data];
          }
        });
        return true;
      } else {
        throw new Error(data.error || 'Failed to update preference');
      }
    } catch (err) {
      console.error('[PREFERENCE_UPDATE_ERROR]', err);
      return false;
    }
  }, []);

  const createNotification = useCallback(async (notificationData: any): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(notificationData)
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh notifications and stats
        await fetchNotifications();
        await fetchStats();
        return true;
      } else {
        throw new Error(data.error || 'Failed to create notification');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('[NOTIFICATION_CREATE_ERROR]', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications, fetchStats]);

  const subscribeToPush = useCallback(async (subscription: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'subscribe', subscription })
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe to push notifications');
      }

      const data = await response.json();
      return data.success;
    } catch (err) {
      console.error('[PUSH_SUBSCRIBE_ERROR]', err);
      return false;
    }
  }, []);

  const unsubscribeFromPush = useCallback(async (endpoint?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          action: 'unsubscribe', 
          subscription: endpoint ? { endpoint } : undefined 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to unsubscribe from push notifications');
      }

      const data = await response.json();
      return data.success;
    } catch (err) {
      console.error('[PUSH_UNSUBSCRIBE_ERROR]', err);
      return false;
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchNotifications();
    fetchStats();
    fetchPreferences();
  }, [fetchNotifications, fetchStats, fetchPreferences]);

  return {
    notifications,
    stats,
    preferences,
    loading,
    error,
    fetchNotifications,
    fetchStats,
    fetchPreferences,
    updatePreferences,
    updatePreference,
    createNotification,
    subscribeToPush,
    unsubscribeFromPush
  };
}
