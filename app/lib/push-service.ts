import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Custom interface for push subscription with keys
interface PushSubscriptionWithKeys {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;

  constructor() {
    this.initializeWebPush();
  }

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private initializeWebPush() {
    // Set VAPID keys for web push
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@edupro.com';

    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      console.log('[PUSH_SERVICE] Web Push initialized with VAPID keys');
    } else {
      console.warn('[PUSH_SERVICE] VAPID keys not configured. Push notifications will not work.');
    }
  }

  // Subscribe user to push notifications
  async subscribe(userId: string, subscription: PushSubscriptionWithKeys): Promise<boolean> {
    try {
      // Store subscription in database
      await prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: {
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true
        }
      });

      console.log(`[PUSH_SUBSCRIBE] User ${userId} subscribed to push notifications`);
      return true;

    } catch (error) {
      console.error('[PUSH_SUBSCRIBE_ERROR]', error);
      return false;
    }
  }

  // Unsubscribe user from push notifications
  async unsubscribe(userId: string, endpoint?: string): Promise<boolean> {
    try {
      if (endpoint) {
        // Unsubscribe specific endpoint
        await prisma.pushSubscription.updateMany({
          where: { userId, endpoint },
          data: { isActive: false }
        });
      } else {
        // Unsubscribe all user's endpoints
        await prisma.pushSubscription.updateMany({
          where: { userId },
          data: { isActive: false }
        });
      }

      console.log(`[PUSH_UNSUBSCRIBE] User ${userId} unsubscribed from push notifications`);
      return true;

    } catch (error) {
      console.error('[PUSH_UNSUBSCRIBE_ERROR]', error);
      return false;
    }
  }

  // Send push notification to user
  async sendToUser(userId: string, payload: PushPayload): Promise<{success: boolean, messageId?: string, error?: string}> {
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId, isActive: true }
      });

      if (subscriptions.length === 0) {
        return { success: false, error: 'No active push subscriptions found' };
      }

      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendPushNotification(sub, payload))
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.length - successCount;

      // Clean up invalid subscriptions
      const failedSubscriptions = results
        .map((result, index) => ({ result, subscription: subscriptions[index] }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ subscription }) => subscription);

      if (failedSubscriptions.length > 0) {
        await this.cleanupInvalidSubscriptions(failedSubscriptions);
      }

      console.log(`[PUSH_SEND] User ${userId}: ${successCount} sent, ${failureCount} failed`);

      return {
        success: successCount > 0,
        messageId: `push-${Date.now()}-${userId}`,
        error: failureCount > 0 ? `${failureCount} subscriptions failed` : undefined
      };

    } catch (error) {
      console.error('[PUSH_SEND_ERROR]', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Send push notification to multiple users
  async sendBulkPush(userIds: string[], payload: PushPayload): Promise<{success: boolean, results: any[]}> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, payload))
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    return {
      success: successCount > 0,
      results: results.map((result, index) => ({
        userId: userIds[index],
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason : undefined
      }))
    };
  }

  // Send push notification to role
  async sendToRole(role: string, payload: PushPayload): Promise<{success: boolean, count: number}> {
    try {
      const users = await prisma.user.findMany({
        where: { role: role as any },
        select: { id: true }
      });

      const userIds = users.map(user => user.id);
      const result = await this.sendBulkPush(userIds, payload);

      return {
        success: result.success,
        count: result.results.filter(r => r.success).length
      };

    } catch (error) {
      console.error('[PUSH_ROLE_ERROR]', error);
      return { success: false, count: 0 };
    }
  }

  // Send individual push notification
  private async sendPushNotification(subscription: any, payload: PushPayload): Promise<void> {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/notification-icon.png',
      badge: payload.badge || '/icons/badge-icon.png',
      image: payload.image,
      data: payload.data || {},
      actions: payload.actions || [],
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      timestamp: Date.now()
    });

    const options = {
      TTL: payload.ttl || 86400, // 24 hours default
      urgency: payload.urgency || 'normal',
      topic: payload.topic
    };

    await webpush.sendNotification(pushSubscription, notificationPayload, options);
  }

  // Clean up invalid subscriptions
  private async cleanupInvalidSubscriptions(subscriptions: any[]): Promise<void> {
    try {
      const endpoints = subscriptions.map(sub => sub.endpoint);
      await prisma.pushSubscription.updateMany({
        where: { endpoint: { in: endpoints } },
        data: { isActive: false }
      });

      console.log(`[PUSH_CLEANUP] Deactivated ${endpoints.length} invalid subscriptions`);
    } catch (error) {
      console.error('[PUSH_CLEANUP_ERROR]', error);
    }
  }

  // Get user's push subscriptions
  async getUserSubscriptions(userId: string): Promise<any[]> {
    return await prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        endpoint: true,
        userAgent: true,
        createdAt: true
      }
    });
  }

  // Get push notification statistics
  async getStats(): Promise<any> {
    const [totalSubscriptions, activeSubscriptions, subscriptionsByUser] = await Promise.all([
      prisma.pushSubscription.count(),
      prisma.pushSubscription.count({ where: { isActive: true } }),
      prisma.pushSubscription.groupBy({
        by: ['userId'],
        where: { isActive: true },
        _count: { id: true }
      })
    ]);

    return {
      totalSubscriptions,
      activeSubscriptions,
      uniqueUsers: subscriptionsByUser.length,
      averageSubscriptionsPerUser: subscriptionsByUser.length > 0 
        ? subscriptionsByUser.reduce((sum, item) => sum + item._count.id, 0) / subscriptionsByUser.length 
        : 0
    };
  }

  // Generate VAPID keys (for setup)
  static generateVapidKeys(): { publicKey: string; privateKey: string } {
    return webpush.generateVAPIDKeys();
  }
}

// Push notification payload interface
export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: PushAction[];
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  ttl?: number; // Time to live in seconds
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  topic?: string;
}

export interface PushAction {
  action: string;
  title: string;
  icon?: string;
}

// Export singleton instance
export const pushService = PushNotificationService.getInstance();
