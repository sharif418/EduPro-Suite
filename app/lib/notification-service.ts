import { PrismaClient, NotificationChannel, NotificationType, NotificationPriority } from '@prisma/client';
import { getSocketServer } from './socket-server';

const prisma = new PrismaClient();

export interface NotificationData {
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  content: string;
  data?: any;
  channels: NotificationChannel[];
  scheduledAt?: Date;
  expiresAt?: Date;
  templateId?: string;
}

export interface NotificationTemplate {
  name: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: {
    en: string;
    bn: string;
    ar: string;
  };
  content: {
    en: string;
    bn: string;
    ar: string;
  };
  channels: NotificationChannel[];
}

export class NotificationService {
  private static instance: NotificationService;
  private processingQueue: boolean = false;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Create a new notification
  async createNotification(data: NotificationData): Promise<string> {
    try {
      // Check user preferences
      const userPreferences = await this.getUserPreferences(data.userId, data.type);
      const allowedChannels = this.filterChannelsByPreferences(data.channels, userPreferences);

      if (allowedChannels.length === 0) {
        console.log(`[NOTIFICATION_SKIPPED] User ${data.userId} has disabled all channels for ${data.type}`);
        return '';
      }

      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          templateId: data.templateId,
          type: data.type,
          priority: data.priority,
          title: data.title,
          content: data.content,
          data: data.data || {},
          channels: allowedChannels as NotificationChannel[],
          scheduledAt: data.scheduledAt,
          expiresAt: data.expiresAt,
          status: data.scheduledAt ? 'PENDING' : 'PENDING'
        }
      });

      // Add to processing queue
      await this.addToQueue(notification.id, data.priority, data.scheduledAt);

      // If immediate notification (no scheduling), process now
      if (!data.scheduledAt) {
        await this.processNotification(notification.id);
      }

      console.log(`[NOTIFICATION_CREATED] ID: ${notification.id}, User: ${data.userId}, Priority: ${data.priority}`);
      return notification.id;

    } catch (error) {
      console.error('[NOTIFICATION_CREATE_ERROR]', error);
      throw new Error('Failed to create notification');
    }
  }

  // Create notification from template
  async createFromTemplate(
    templateName: string, 
    userId: string, 
    variables: Record<string, any> = {},
    scheduledAt?: Date
  ): Promise<string> {
    try {
      const template = await prisma.notificationTemplate.findUnique({
        where: { name: templateName, isActive: true }
      });

      if (!template) {
        throw new Error(`Template '${templateName}' not found or inactive`);
      }

      // Get user's preferred language
      const userLang = await this.getUserLanguage(userId);
      
      // Render template with variables
      const title = this.renderTemplate(
        (template.title as any)[userLang] || (template.title as any)['en'], 
        variables
      );
      const content = this.renderTemplate(
        (template.content as any)[userLang] || (template.content as any)['en'], 
        variables
      );

      return await this.createNotification({
        userId,
        type: template.type,
        priority: template.priority,
        title,
        content,
        channels: template.channels,
        templateId: template.id,
        scheduledAt,
        data: variables
      });

    } catch (error) {
      console.error('[NOTIFICATION_TEMPLATE_ERROR]', error);
      throw new Error('Failed to create notification from template');
    }
  }

  // Send bulk notifications
  async sendBulkNotification(
    userIds: string[],
    data: Omit<NotificationData, 'userId'>
  ): Promise<string[]> {
    const notificationIds: string[] = [];

    for (const userId of userIds) {
      try {
        const notificationId = await this.createNotification({
          ...data,
          userId
        });
        if (notificationId) {
          notificationIds.push(notificationId);
        }
      } catch (error) {
        console.error(`[BULK_NOTIFICATION_ERROR] User ${userId}:`, error);
      }
    }

    console.log(`[BULK_NOTIFICATION] Created ${notificationIds.length}/${userIds.length} notifications`);
    return notificationIds;
  }

  // Send notification to role
  async sendToRole(
    role: 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'GUARDIAN',
    data: Omit<NotificationData, 'userId'>
  ): Promise<string[]> {
    try {
      const users = await prisma.user.findMany({
        where: { role },
        select: { id: true }
      });

      const userIds = users.map(user => user.id);
      return await this.sendBulkNotification(userIds, data);

    } catch (error) {
      console.error('[ROLE_NOTIFICATION_ERROR]', error);
      throw new Error('Failed to send notification to role');
    }
  }

  // Process notification queue
  async processQueue(): Promise<void> {
    if (this.processingQueue) {
      return; // Already processing
    }

    this.processingQueue = true;

    try {
      // Get pending notifications ordered by priority and schedule
      const queueItems = await prisma.notificationQueue.findMany({
        where: {
          processedAt: null,
          scheduledAt: { lte: new Date() }
        },
        orderBy: [
          { priority: 'desc' }, // HIGH first
          { scheduledAt: 'asc' }
        ],
        take: 50 // Process in batches
      });

      console.log(`[QUEUE_PROCESSING] Processing ${queueItems.length} notifications`);

      for (const item of queueItems) {
        try {
          await this.processNotification(item.notificationId);
          
          // Mark as processed
          await prisma.notificationQueue.update({
            where: { id: item.id },
            data: { processedAt: new Date() }
          });

        } catch (error) {
          console.error(`[QUEUE_ITEM_ERROR] Notification ${item.notificationId}:`, error);
          
          // Update failure count
          await prisma.notificationQueue.update({
            where: { id: item.id },
            data: {
              failureCount: { increment: 1 },
              lastError: error instanceof Error ? error.message : 'Unknown error'
            }
          });
        }
      }

    } catch (error) {
      console.error('[QUEUE_PROCESSING_ERROR]', error);
    } finally {
      this.processingQueue = false;
    }
  }

  // Process individual notification
  private async processNotification(notificationId: string): Promise<void> {
    try {
      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { user: true }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Check if expired
      if (notification.expiresAt && notification.expiresAt < new Date()) {
        await prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'FAILED' }
        });
        return;
      }

      // Process each channel
      for (const channel of notification.channels) {
        await this.processChannel(notification, channel);
      }

      // Update notification status
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: 'SENT',
          sentAt: new Date()
        }
      });

      // Send real-time notification if user is connected
      const socketServer = getSocketServer();
      if (socketServer && notification.channels.includes('IN_APP')) {
        const sent = await socketServer.sendToUser(notification.userId, {
          id: notification.id,
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
          content: notification.content,
          data: notification.data,
          timestamp: new Date().toISOString()
        });

        if (sent) {
          console.log(`[REALTIME_SENT] Notification ${notificationId} sent to user ${notification.userId}`);
        }
      }

    } catch (error) {
      console.error(`[PROCESS_NOTIFICATION_ERROR] ${notificationId}:`, error);
      throw error;
    }
  }

  // Process specific channel
  private async processChannel(notification: any, channel: string): Promise<void> {
    try {
      // Create delivery record
      const delivery = await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: channel as any,
          status: 'PENDING'
        }
      });

      let success = false;
      let externalId: string | null = null;
      let errorMessage: string | null = null;

      switch (channel) {
        case 'IN_APP':
          // In-app notifications are handled by WebSocket
          success = true;
          break;

        case 'EMAIL':
          // Email will be handled by email service
          const emailResult = await this.sendEmail(notification);
          success = emailResult.success;
          externalId = emailResult.messageId || null;
          errorMessage = emailResult.error || null;
          break;

        case 'SMS':
          // SMS will be handled by SMS service
          const smsResult = await this.sendSMS(notification);
          success = smsResult.success;
          externalId = smsResult.messageId || null;
          errorMessage = smsResult.error || null;
          break;

        case 'PUSH':
          // Push notifications will be handled by push service
          const pushResult = await this.sendPush(notification);
          success = pushResult.success;
          externalId = pushResult.messageId || null;
          errorMessage = pushResult.error || null;
          break;
      }

      // Update delivery status
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: success ? 'DELIVERED' : 'FAILED',
          deliveredAt: success ? new Date() : null,
          failureReason: errorMessage,
          externalId,
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date()
        }
      });

    } catch (error) {
      console.error(`[CHANNEL_PROCESSING_ERROR] ${channel}:`, error);
    }
  }

  // Channel-specific sending methods
  private async sendEmail(notification: any): Promise<{success: boolean, messageId?: string, error?: string}> {
    try {
      const { emailService } = await import('./email-service');
      return await emailService.sendNotification(notification);
    } catch (error) {
      console.error('[EMAIL_SEND_ERROR]', error);
      return { success: false, error: 'Email service error' };
    }
  }

  private async sendSMS(notification: any): Promise<{success: boolean, messageId?: string, error?: string}> {
    try {
      const { smsService } = await import('./sms-service');
      return await smsService.sendNotification(notification);
    } catch (error) {
      console.error('[SMS_SEND_ERROR]', error);
      return { success: false, error: 'SMS service error' };
    }
  }

  private async sendPush(notification: any): Promise<{success: boolean, messageId?: string, error?: string}> {
    try {
      const { pushService } = await import('./push-service');
      return await pushService.sendToUser(notification.userId, {
        title: notification.title,
        body: notification.content,
        data: notification.data,
        tag: `notification-${notification.id}`,
        requireInteraction: notification.priority === 'HIGH'
      });
    } catch (error) {
      console.error('[PUSH_SEND_ERROR]', error);
      return { success: false, error: 'Push service error' };
    }
  }

  // Helper methods
  private async addToQueue(notificationId: string, priority: string, scheduledAt?: Date): Promise<void> {
    await prisma.notificationQueue.create({
      data: {
        notificationId,
        priority: priority as any,
        scheduledAt: scheduledAt || new Date()
      }
    });
  }

  private async getUserPreferences(userId: string, type: string): Promise<any[]> {
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId, type: type as any, isEnabled: true }
    });
    return preferences;
  }

  private filterChannelsByPreferences(channels: NotificationChannel[], preferences: any[]): NotificationChannel[] {
    if (preferences.length === 0) {
      // If no preferences set, allow all channels (default behavior)
      return channels;
    }

    const allowedChannels = new Set<NotificationChannel>();
    preferences.forEach(pref => {
      pref.channels.forEach((channel: NotificationChannel) => allowedChannels.add(channel));
    });

    return channels.filter(channel => allowedChannels.has(channel));
  }

  private async getUserLanguage(userId: string): Promise<string> {
    // For now, return 'bn' as default. This can be enhanced to get from user profile
    return 'bn';
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, variables[key]);
    });
    return rendered;
  }

  // Public utility methods
  async getNotificationStats(userId?: string): Promise<any> {
    const where = userId ? { userId } : {};
    
    const [total, unread, byPriority, byType] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, status: { not: 'READ' } } }),
      prisma.notification.groupBy({
        by: ['priority'],
        where,
        _count: { id: true }
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: { id: true }
      })
    ]);

    return {
      total,
      unread,
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset,
      include: {
        template: {
          select: { name: true }
        }
      }
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
