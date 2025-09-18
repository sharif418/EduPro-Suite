'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketHookReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  notifications: any[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
}

export function useSocket(token?: string): SocketHookReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!token) {
      return;
    }

    const socketInstance = io({
      path: '/api/socket',
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('[SOCKET] Connected to notification server');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
    });

    socketInstance.on('connected', (data) => {
      console.log('[SOCKET] Server confirmed connection:', data);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setConnectionError('Failed to connect after multiple attempts');
      }
    });

    // Notification events
    socketInstance.on('notification:new', (notification) => {
      console.log('[SOCKET] New notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.content,
          icon: '/icons/notification-icon.png',
          tag: `notification-${notification.id}`
        });
      }
    });

    socketInstance.on('notification:broadcast', (notification) => {
      console.log('[SOCKET] Broadcast notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    socketInstance.on('notification:system', (alert) => {
      console.log('[SOCKET] System alert:', alert);
      setNotifications(prev => [alert, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // System alerts are high priority - always show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(alert.title, {
          body: alert.content,
          icon: '/icons/system-alert-icon.png',
          tag: `system-${alert.id}`,
          requireInteraction: true
        });
      }
    });

    socketInstance.on('notification:read:success', ({ notificationId }) => {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, status: 'READ', readAt: new Date().toISOString() }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    socketInstance.on('notification:read:error', ({ notificationId, error }) => {
      console.error('[SOCKET] Failed to mark notification as read:', error);
    });

    // Ping/pong for connection health
    socketInstance.on('pong', (data) => {
      console.log('[SOCKET] Pong received:', data);
    });

    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('ping');
      }
    }, 30000); // Every 30 seconds

    setSocket(socketInstance);

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const markAsRead = (notificationId: string) => {
    if (socket && socket.connected) {
      socket.emit('notification:read', notificationId);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    socket,
    isConnected,
    connectionError,
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications
  };
}
