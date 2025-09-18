// Service Worker for Push Notifications
const CACHE_NAME = 'edupro-notifications-v1';
const urlsToCache = [
  '/',
  '/icons/notification-icon.png',
  '/icons/badge-icon.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'EduPro Suite',
        body: event.data.text() || 'You have a new notification',
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png'
      };
    }
  } else {
    notificationData = {
      title: 'EduPro Suite',
      body: 'You have a new notification',
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png'
    };
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || '/icons/notification-icon.png',
    badge: notificationData.badge || '/icons/badge-icon.png',
    image: notificationData.image,
    data: notificationData.data || {},
    actions: notificationData.actions || [
      {
        action: 'open',
        title: 'Open',
        icon: '/icons/open-icon.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close-icon.png'
      }
    ],
    tag: notificationData.tag || 'edupro-notification',
    requireInteraction: notificationData.requireInteraction || false,
    silent: notificationData.silent || false,
    timestamp: notificationData.timestamp || Date.now(),
    vibrate: [200, 100, 200], // Vibration pattern
    dir: 'auto', // Text direction
    lang: 'bn' // Language
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  if (action === 'close') {
    // Just close the notification
    return;
  }

  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin)) {
            // Send message to client about notification click
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              notificationId: data.notificationId,
              action: action,
              data: data
            });
            
            return client.focus();
          }
        }
        
        // Open new window if no existing window found
        let targetUrl = self.location.origin;
        
        // Navigate to specific page based on notification type
        if (data.type) {
          switch (data.type) {
            case 'EXAM':
              targetUrl += '/admin/examinations';
              break;
            case 'FINANCIAL':
              targetUrl += '/admin/finance';
              break;
            case 'ACADEMIC':
              targetUrl += '/admin';
              break;
            case 'ATTENDANCE':
              targetUrl += '/admin/staff';
              break;
            default:
              targetUrl += '/admin';
          }
        }
        
        return clients.openWindow(targetUrl);
      })
  );
});

// Background sync event (for offline functionality)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Sync pending notifications when back online
      syncPendingNotifications()
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_NOTIFICATIONS':
      clearAllNotifications();
      break;
      
    case 'UPDATE_BADGE':
      updateBadgeCount(payload.count);
      break;
  }
});

// Helper functions
async function syncPendingNotifications() {
  try {
    // This would sync with the server for any pending notifications
    console.log('[SW] Syncing pending notifications...');
    
    // Implementation would depend on your offline storage strategy
    // For now, just log the sync attempt
    
  } catch (error) {
    console.error('[SW] Error syncing notifications:', error);
  }
}

async function clearAllNotifications() {
  try {
    const notifications = await self.registration.getNotifications();
    notifications.forEach(notification => notification.close());
    console.log('[SW] Cleared all notifications');
  } catch (error) {
    console.error('[SW] Error clearing notifications:', error);
  }
}

async function updateBadgeCount(count) {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await navigator.setAppBadge(count);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch (error) {
    console.error('[SW] Error updating badge:', error);
  }
}

// Fetch event - handle network requests (basic caching strategy)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for static assets
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      })
  );
});

console.log('[SW] Service Worker loaded');
