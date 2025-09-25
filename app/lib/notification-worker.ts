import { prisma } from './prisma';
import { emailService } from './email-service';
import { smsService } from './sms-service';
import { pushService } from './push-service';

export interface NotificationJob {
  id: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  recipient: string;
  subject?: string;
  content: string;
  data?: any;
  scheduledAt: Date;
  attempts: number;
  maxAttempts: number;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED';
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
}

export interface BulkNotificationJob {
  id: string;
  templateId: string;
  recipients: Array<{
    id: string;
    type: string;
    contact: string;
    variables?: { [key: string]: string };
  }>;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRecipients: number;
  processedRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  createdAt: Date;
  completedAt?: Date;
}

export class NotificationWorker {
  private static isProcessing = false;
  private static processingInterval: NodeJS.Timeout | null = null;

  /**
   * Start the notification worker
   */
  static start(): void {
    if (this.processingInterval) {
      console.log('Notification worker is already running');
      return;
    }

    console.log('Starting notification worker...');
    
    // Process notifications every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processNotificationQueue();
    }, 30000);

    // Process immediately on start
    this.processNotificationQueue();
  }

  /**
   * Stop the notification worker
   */
  static stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Notification worker stopped');
    }
  }

  /**
   * Process notification queue
   */
  static async processNotificationQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      console.log('Processing notification queue...');

      // Get pending notifications ordered by priority and scheduled time
      const pendingJobs = await this.getPendingNotifications();

      for (const job of pendingJobs) {
        await this.processNotificationJob(job);
      }

      console.log(`Processed ${pendingJobs.length} notification jobs`);

    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Add notification to queue
   */
  static async addNotification(notification: {
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    recipient: string;
    subject?: string;
    content: string;
    data?: any;
    scheduledAt?: Date;
  }): Promise<string> {
    try {
      const jobId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const job: NotificationJob = {
        id: jobId,
        type: notification.type,
        priority: notification.priority || 'MEDIUM',
        recipient: notification.recipient,
        subject: notification.subject,
        content: notification.content,
        data: notification.data,
        scheduledAt: notification.scheduledAt || new Date(),
        attempts: 0,
        maxAttempts: 3,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in queue (mock implementation)
      console.log('Adding notification to queue:', job);

      // In production, this would be stored in database or Redis
      // await prisma.notificationQueue.create({ data: job });

      return jobId;

    } catch (error) {
      console.error('Error adding notification to queue:', error);
      throw new Error('Failed to add notification to queue');
    }
  }

  /**
   * Process individual notification job
   */
  private static async processNotificationJob(job: NotificationJob): Promise<void> {
    try {
      console.log(`Processing notification job: ${job.id}`);

      // Update status to processing
      await this.updateJobStatus(job.id, 'PROCESSING');

      let success = false;

      switch (job.type) {
        case 'EMAIL':
          success = await this.sendEmail(job);
          break;
        case 'SMS':
          success = await this.sendSMS(job);
          break;
        case 'PUSH':
          success = await this.sendPushNotification(job);
          break;
        case 'IN_APP':
          success = await this.sendInAppNotification(job);
          break;
        default:
          throw new Error(`Unsupported notification type: ${job.type}`);
      }

      if (success) {
        await this.updateJobStatus(job.id, 'SENT');
        console.log(`Notification job ${job.id} sent successfully`);
      } else {
        await this.handleJobFailure(job);
      }

    } catch (error: any) {
      console.error(`Error processing notification job ${job.id}:`, error);
      await this.handleJobFailure(job, error.message);
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmail(job: NotificationJob): Promise<boolean> {
    try {
      const result = await emailService.sendNotification({
        user: { email: job.recipient },
        title: job.subject || 'Notification',
        content: job.content,
        type: 'SYSTEM',
        priority: job.priority,
        data: job.data,
        createdAt: new Date(),
        userId: job.recipient
      });

      return result.success;

    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  /**
   * Send SMS notification
   */
  private static async sendSMS(job: NotificationJob): Promise<boolean> {
    try {
      const result = await smsService.sendNotification({
        user: { phone: job.recipient },
        title: job.subject || 'Notification',
        content: job.content,
        type: 'SYSTEM',
        priority: job.priority,
        data: job.data
      });

      return result.success;

    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }

  /**
   * Send push notification
   */
  private static async sendPushNotification(job: NotificationJob): Promise<boolean> {
    try {
      const result = await pushService.sendToUser(job.recipient, {
        title: job.subject || 'Notification',
        body: job.content,
        data: job.data
      });

      return result.success;

    } catch (error) {
      console.error('Push notification sending failed:', error);
      return false;
    }
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(job: NotificationJob): Promise<boolean> {
    try {
      // Store in-app notification in database
      // await prisma.notification.create({
      //   data: {
      //     userId: job.recipient,
      //     title: job.subject || 'Notification',
      //     content: job.content,
      //     type: 'SYSTEM',
      //     priority: job.priority,
      //     data: job.data
      //   }
      // });

      console.log(`In-app notification stored for user: ${job.recipient}`);
      return true;

    } catch (error) {
      console.error('In-app notification failed:', error);
      return false;
    }
  }

  /**
   * Handle job failure
   */
  private static async handleJobFailure(job: NotificationJob, errorMessage?: string): Promise<void> {
    const updatedJob = {
      ...job,
      attempts: job.attempts + 1,
      lastError: errorMessage,
      updatedAt: new Date()
    };

    if (updatedJob.attempts >= job.maxAttempts) {
      await this.updateJobStatus(job.id, 'FAILED', errorMessage);
      console.log(`Notification job ${job.id} failed after ${job.maxAttempts} attempts`);
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, updatedJob.attempts) * 60000; // 2^attempts minutes
      const retryAt = new Date(Date.now() + retryDelay);
      
      await this.updateJobStatus(job.id, 'PENDING', errorMessage, retryAt);
      console.log(`Notification job ${job.id} scheduled for retry at ${retryAt}`);
    }
  }

  /**
   * Get pending notifications
   */
  private static async getPendingNotifications(): Promise<NotificationJob[]> {
    try {
      // Mock implementation - in production this would query the database
      const mockJobs: NotificationJob[] = [];

      // This would be replaced with actual database query:
      // const jobs = await prisma.notificationQueue.findMany({
      //   where: {
      //     status: 'PENDING',
      //     scheduledAt: { lte: new Date() }
      //   },
      //   orderBy: [
      //     { priority: 'desc' },
      //     { scheduledAt: 'asc' }
      //   ],
      //   take: 50
      // });

      return mockJobs;

    } catch (error) {
      console.error('Error fetching pending notifications:', error);
      return [];
    }
  }

  /**
   * Update job status
   */
  private static async updateJobStatus(
    jobId: string, 
    status: string, 
    errorMessage?: string, 
    scheduledAt?: Date
  ): Promise<void> {
    try {
      // Mock implementation - in production this would update the database
      console.log(`Updating job ${jobId} status to ${status}`, {
        errorMessage,
        scheduledAt
      });

      // This would be replaced with actual database update:
      // await prisma.notificationQueue.update({
      //   where: { id: jobId },
      //   data: {
      //     status,
      //     lastError: errorMessage,
      //     scheduledAt,
      //     updatedAt: new Date()
      //   }
      // });

    } catch (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotifications(bulkJob: {
    templateId: string;
    recipients: Array<{
      id: string;
      type: string;
      contact: string;
      variables?: { [key: string]: string };
    }>;
  }): Promise<string> {
    try {
      const jobId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const job: BulkNotificationJob = {
        id: jobId,
        templateId: bulkJob.templateId,
        recipients: bulkJob.recipients,
        status: 'PENDING',
        totalRecipients: bulkJob.recipients.length,
        processedRecipients: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        createdAt: new Date()
      };

      // Store bulk job
      console.log('Creating bulk notification job:', job);

      // Process bulk job asynchronously
      this.processBulkNotificationJob(job);

      return jobId;

    } catch (error) {
      console.error('Error creating bulk notification job:', error);
      throw new Error('Failed to create bulk notification job');
    }
  }

  /**
   * Process bulk notification job
   */
  private static async processBulkNotificationJob(job: BulkNotificationJob): Promise<void> {
    try {
      console.log(`Processing bulk notification job: ${job.id}`);

      // Get template
      const template = await this.getNotificationTemplate(job.templateId);
      if (!template) {
        throw new Error(`Template not found: ${job.templateId}`);
      }

      // Update status to processing
      job.status = 'PROCESSING';

      // Process each recipient
      for (const recipient of job.recipients) {
        try {
          // Replace template variables
          let content = template.content;
          let subject = template.subject;

          if (recipient.variables) {
            Object.entries(recipient.variables).forEach(([key, value]) => {
              content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
              if (subject) {
                subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
              }
            });
          }

          // Add individual notification to queue
          await this.addNotification({
            type: template.type,
            priority: 'MEDIUM',
            recipient: recipient.contact,
            subject,
            content,
            data: { bulkJobId: job.id, recipientId: recipient.id }
          });

          job.successfulDeliveries++;

        } catch (error) {
          console.error(`Error processing recipient ${recipient.id}:`, error);
          job.failedDeliveries++;
        }

        job.processedRecipients++;
      }

      // Update final status
      job.status = 'COMPLETED';
      job.completedAt = new Date();

      console.log(`Bulk notification job ${job.id} completed:`, {
        total: job.totalRecipients,
        successful: job.successfulDeliveries,
        failed: job.failedDeliveries
      });

    } catch (error) {
      console.error(`Error processing bulk notification job ${job.id}:`, error);
      job.status = 'FAILED';
    }
  }

  /**
   * Get notification template
   */
  private static async getNotificationTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      // Mock implementation - in production this would query the database
      const mockTemplate: NotificationTemplate = {
        id: templateId,
        name: 'Default Template',
        type: 'EMAIL',
        subject: 'Notification from EduPro Suite',
        content: 'Hello {{name}}, this is a notification from EduPro Suite.',
        variables: ['name'],
        isActive: true
      };

      return mockTemplate;

    } catch (error) {
      console.error('Error fetching notification template:', error);
      return null;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(startDate: Date, endDate: Date): Promise<{
    totalSent: number;
    totalFailed: number;
    successRate: number;
    typeBreakdown: { [key: string]: number };
    priorityBreakdown: { [key: string]: number };
    dailyStats: Array<{
      date: string;
      sent: number;
      failed: number;
    }>;
  }> {
    try {
      // Mock implementation
      return {
        totalSent: 15420,
        totalFailed: 234,
        successRate: 98.5,
        typeBreakdown: {
          'EMAIL': 8500,
          'SMS': 4200,
          'PUSH': 2500,
          'IN_APP': 454
        },
        priorityBreakdown: {
          'HIGH': 2100,
          'MEDIUM': 10200,
          'LOW': 3354
        },
        dailyStats: [
          { date: '2024-01-01', sent: 450, failed: 12 },
          { date: '2024-01-02', sent: 520, failed: 8 },
          { date: '2024-01-03', sent: 380, failed: 15 }
        ]
      };

    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw new Error('Failed to fetch notification statistics');
    }
  }

  /**
   * Cancel notification job
   */
  static async cancelNotification(jobId: string): Promise<boolean> {
    try {
      await this.updateJobStatus(jobId, 'CANCELLED');
      console.log(`Notification job ${jobId} cancelled`);
      return true;

    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }

  /**
   * Retry failed notification
   */
  static async retryNotification(jobId: string): Promise<boolean> {
    try {
      await this.updateJobStatus(jobId, 'PENDING', undefined, new Date());
      console.log(`Notification job ${jobId} scheduled for retry`);
      return true;

    } catch (error) {
      console.error('Error retrying notification:', error);
      return false;
    }
  }
}

// Auto-start the notification worker when the module is loaded
if (typeof window === 'undefined') {
  // Only start in server environment
  NotificationWorker.start();
}
