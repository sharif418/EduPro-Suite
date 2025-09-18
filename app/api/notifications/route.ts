import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../lib/auth-helpers';
import { notificationService } from '../../lib/notification-service';
import { NotificationChannel, NotificationType, NotificationPriority } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const stats = searchParams.get('stats') === 'true';

    if (stats) {
      const notificationStats = await notificationService.getNotificationStats(user.userId);
      return NextResponse.json({ success: true, data: notificationStats });
    }

    const notifications = await notificationService.getUserNotifications(user.userId, limit, offset);
    return NextResponse.json({ success: true, data: notifications });

  } catch (error) {
    console.error('[NOTIFICATIONS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can create notifications
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      userIds,
      role,
      templateName,
      type,
      priority,
      title,
      content,
      channels,
      scheduledAt,
      expiresAt,
      data: notificationData
    } = body;

    let notificationIds: string[] = [];

    if (templateName) {
      // Create from template
      if (userId) {
        const id = await notificationService.createFromTemplate(
          templateName,
          userId,
          notificationData,
          scheduledAt ? new Date(scheduledAt) : undefined
        );
        notificationIds = [id];
      } else if (userIds && Array.isArray(userIds)) {
        // Bulk create from template
        for (const uid of userIds) {
          const id = await notificationService.createFromTemplate(
            templateName,
            uid,
            notificationData,
            scheduledAt ? new Date(scheduledAt) : undefined
          );
          notificationIds.push(id);
        }
      } else if (role) {
        // Send to role using template
        const bulkData = {
          type: type as NotificationType,
          priority: (priority || 'MEDIUM') as NotificationPriority,
          title: title || 'Notification',
          content: content || '',
          channels: (channels || ['IN_APP']) as NotificationChannel[],
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          data: notificationData
        };
        notificationIds = await notificationService.sendToRole(role, bulkData);
      }
    } else {
      // Create custom notification
      if (!type || !title || !content) {
        return NextResponse.json({ 
          error: 'Missing required fields: type, title, content' 
        }, { status: 400 });
      }

      const notificationPayload = {
        type: type as NotificationType,
        priority: (priority || 'MEDIUM') as NotificationPriority,
        title,
        content,
        channels: (channels || ['IN_APP']) as NotificationChannel[],
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        data: notificationData
      };

      if (userId) {
        const id = await notificationService.createNotification({
          ...notificationPayload,
          userId
        });
        notificationIds = [id];
      } else if (userIds && Array.isArray(userIds)) {
        notificationIds = await notificationService.sendBulkNotification(userIds, notificationPayload);
      } else if (role) {
        notificationIds = await notificationService.sendToRole(role, notificationPayload);
      } else {
        return NextResponse.json({ 
          error: 'Must specify userId, userIds, or role' 
        }, { status: 400 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        notificationIds,
        count: notificationIds.length 
      } 
    });

  } catch (error) {
    console.error('[NOTIFICATIONS_POST_ERROR]', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create notification' 
    }, { status: 500 });
  }
}
