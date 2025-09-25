interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
}

interface QueueOptions {
  maxAttempts?: number;
  retryDelay?: number;
  priority?: number;
  delay?: number;
}

interface JobProcessor<T = any> {
  (job: QueueJob<T>): Promise<void>;
}

class QueueService {
  private queues = new Map<string, QueueJob[]>();
  private processors = new Map<string, JobProcessor>();
  private isProcessing = new Map<string, boolean>();
  private processingIntervals = new Map<string, NodeJS.Timeout>();

  /**
   * Register a job processor for a specific job type
   */
  registerProcessor<T>(jobType: string, processor: JobProcessor<T>): void {
    this.processors.set(jobType, processor);
    
    // Initialize queue for this job type if it doesn't exist
    if (!this.queues.has(jobType)) {
      this.queues.set(jobType, []);
    }

    // Start processing for this queue
    this.startProcessing(jobType);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T>(
    jobType: string, 
    data: T, 
    options: QueueOptions = {}
  ): Promise<string> {
    const jobId = `${jobType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: QueueJob<T> = {
      id: jobId,
      type: jobType,
      data,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
      scheduledAt: options.delay ? new Date(Date.now() + options.delay) : new Date(),
      status: 'pending',
    };

    // Get or create queue for this job type
    if (!this.queues.has(jobType)) {
      this.queues.set(jobType, []);
    }

    const queue = this.queues.get(jobType)!;
    queue.push(job);

    // Sort queue by priority (higher priority first) and scheduled time
    queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0);
    });

    console.log(`[QUEUE] Added job ${jobId} to ${jobType} queue`);
    return jobId;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): QueueJob | null {
    for (const queue of this.queues.values()) {
      const job = queue.find(j => j.id === jobId);
      if (job) {
        return job;
      }
    }
    return null;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(jobType?: string): any {
    if (jobType) {
      const queue = this.queues.get(jobType) || [];
      return {
        jobType,
        total: queue.length,
        pending: queue.filter(j => j.status === 'pending').length,
        processing: queue.filter(j => j.status === 'processing').length,
        completed: queue.filter(j => j.status === 'completed').length,
        failed: queue.filter(j => j.status === 'failed').length,
        isProcessing: this.isProcessing.get(jobType) || false,
      };
    }

    // Return stats for all queues
    const stats: any = {};
    for (const [type, queue] of this.queues.entries()) {
      stats[type] = {
        total: queue.length,
        pending: queue.filter(j => j.status === 'pending').length,
        processing: queue.filter(j => j.status === 'processing').length,
        completed: queue.filter(j => j.status === 'completed').length,
        failed: queue.filter(j => j.status === 'failed').length,
        isProcessing: this.isProcessing.get(type) || false,
      };
    }
    return stats;
  }

  /**
   * Start processing jobs for a specific queue
   */
  private startProcessing(jobType: string): void {
    if (this.processingIntervals.has(jobType)) {
      return; // Already processing
    }

    const interval = setInterval(() => {
      this.processNextJob(jobType);
    }, 1000); // Check every second

    this.processingIntervals.set(jobType, interval);
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(jobType: string): Promise<void> {
    if (this.isProcessing.get(jobType)) {
      return; // Already processing a job
    }

    const queue = this.queues.get(jobType);
    if (!queue || queue.length === 0) {
      return; // No jobs to process
    }

    // Find next job that's ready to be processed
    const now = new Date();
    const nextJob = queue.find(job => 
      job.status === 'pending' && 
      (job.scheduledAt?.getTime() || 0) <= now.getTime()
    );

    if (!nextJob) {
      return; // No jobs ready for processing
    }

    const processor = this.processors.get(jobType);
    if (!processor) {
      console.error(`[QUEUE] No processor registered for job type: ${jobType}`);
      return;
    }

    // Mark as processing
    this.isProcessing.set(jobType, true);
    nextJob.status = 'processing';
    nextJob.processedAt = new Date();
    nextJob.attempts++;

    console.log(`[QUEUE] Processing job ${nextJob.id} (attempt ${nextJob.attempts})`);

    try {
      // Execute the job
      await processor(nextJob);
      
      // Mark as completed
      nextJob.status = 'completed';
      nextJob.completedAt = new Date();
      
      console.log(`[QUEUE] Job ${nextJob.id} completed successfully`);

      // Remove completed job from queue after a delay
      setTimeout(() => {
        const index = queue.indexOf(nextJob);
        if (index > -1) {
          queue.splice(index, 1);
        }
      }, 60000); // Keep completed jobs for 1 minute

    } catch (error) {
      console.error(`[QUEUE] Job ${nextJob.id} failed:`, error);
      
      nextJob.error = error instanceof Error ? error.message : String(error);
      nextJob.failedAt = new Date();

      // Retry logic
      if (nextJob.attempts < nextJob.maxAttempts) {
        nextJob.status = 'retrying';
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, nextJob.attempts) * 1000; // 2^attempts seconds
        nextJob.scheduledAt = new Date(Date.now() + retryDelay);
        
        console.log(`[QUEUE] Job ${nextJob.id} will retry in ${retryDelay}ms`);
      } else {
        nextJob.status = 'failed';
        console.error(`[QUEUE] Job ${nextJob.id} failed permanently after ${nextJob.attempts} attempts`);
      }
    } finally {
      this.isProcessing.set(jobType, false);
    }
  }

  /**
   * Remove a job from the queue
   */
  removeJob(jobId: string): boolean {
    for (const [jobType, queue] of this.queues.entries()) {
      const index = queue.findIndex(job => job.id === jobId);
      if (index > -1) {
        queue.splice(index, 1);
        console.log(`[QUEUE] Removed job ${jobId} from ${jobType} queue`);
        return true;
      }
    }
    return false;
  }

  /**
   * Clear all jobs from a queue
   */
  clearQueue(jobType: string): number {
    const queue = this.queues.get(jobType);
    if (!queue) {
      return 0;
    }

    const count = queue.length;
    queue.length = 0;
    console.log(`[QUEUE] Cleared ${count} jobs from ${jobType} queue`);
    return count;
  }

  /**
   * Pause processing for a queue
   */
  pauseQueue(jobType: string): void {
    const interval = this.processingIntervals.get(jobType);
    if (interval) {
      clearInterval(interval);
      this.processingIntervals.delete(jobType);
      console.log(`[QUEUE] Paused processing for ${jobType} queue`);
    }
  }

  /**
   * Resume processing for a queue
   */
  resumeQueue(jobType: string): void {
    if (!this.processingIntervals.has(jobType)) {
      this.startProcessing(jobType);
      console.log(`[QUEUE] Resumed processing for ${jobType} queue`);
    }
  }

  /**
   * Get all jobs in a queue
   */
  getJobs(jobType: string): QueueJob[] {
    return this.queues.get(jobType) || [];
  }

  /**
   * Shutdown the queue service
   */
  shutdown(): void {
    // Clear all processing intervals
    for (const interval of this.processingIntervals.values()) {
      clearInterval(interval);
    }
    this.processingIntervals.clear();
    this.isProcessing.clear();
    
    console.log('[QUEUE] Queue service shutdown');
  }
}

// Create singleton instance
const queueService = new QueueService();

// Register common job processors
queueService.registerProcessor('email', async (job) => {
  console.log(`[EMAIL_PROCESSOR] Processing email job:`, job.data);
  // Mock email processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`[EMAIL_PROCESSOR] Email sent successfully`);
});

queueService.registerProcessor('sms', async (job) => {
  console.log(`[SMS_PROCESSOR] Processing SMS job:`, job.data);
  // Mock SMS processing
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(`[SMS_PROCESSOR] SMS sent successfully`);
});

queueService.registerProcessor('notification', async (job) => {
  console.log(`[NOTIFICATION_PROCESSOR] Processing notification job:`, job.data);
  // Mock notification processing
  await new Promise(resolve => setTimeout(resolve, 200));
  console.log(`[NOTIFICATION_PROCESSOR] Notification sent successfully`);
});

queueService.registerProcessor('report_generation', async (job) => {
  console.log(`[REPORT_PROCESSOR] Processing report generation job:`, job.data);
  // Mock report generation
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log(`[REPORT_PROCESSOR] Report generated successfully`);
});

queueService.registerProcessor('backup', async (job) => {
  console.log(`[BACKUP_PROCESSOR] Processing backup job:`, job.data);
  // Mock backup processing
  await new Promise(resolve => setTimeout(resolve, 10000));
  console.log(`[BACKUP_PROCESSOR] Backup completed successfully`);
});

queueService.registerProcessor('data_sync', async (job) => {
  console.log(`[SYNC_PROCESSOR] Processing data sync job:`, job.data);
  // Mock data synchronization
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`[SYNC_PROCESSOR] Data sync completed successfully`);
});

// Export queue service and utility functions
export { queueService };

// Utility functions for common queue operations
export const queueUtils = {
  /**
   * Add email job to queue
   */
  queueEmail: async (emailData: {
    to: string | string[];
    subject: string;
    body: string;
    template?: string;
  }): Promise<string> => {
    return queueService.addJob('email', emailData, { priority: 1 });
  },

  /**
   * Add SMS job to queue
   */
  queueSMS: async (smsData: {
    to: string | string[];
    message: string;
    sender?: string;
  }): Promise<string> => {
    return queueService.addJob('sms', smsData, { priority: 2 });
  },

  /**
   * Add notification job to queue
   */
  queueNotification: async (notificationData: {
    userId: string | string[];
    title: string;
    message: string;
    type: string;
  }): Promise<string> => {
    return queueService.addJob('notification', notificationData, { priority: 3 });
  },

  /**
   * Add report generation job to queue
   */
  queueReportGeneration: async (reportData: {
    type: string;
    parameters: any;
    userId: string;
  }): Promise<string> => {
    return queueService.addJob('report_generation', reportData, { 
      priority: 0, 
      maxAttempts: 2 
    });
  },

  /**
   * Add backup job to queue
   */
  queueBackup: async (backupData: {
    type: string;
    includeFiles: boolean;
    userId: string;
  }): Promise<string> => {
    return queueService.addJob('backup', backupData, { 
      priority: -1, 
      maxAttempts: 1 
    });
  },

  /**
   * Add data sync job to queue
   */
  queueDataSync: async (syncData: {
    source: string;
    target: string;
    syncType: string;
    userId: string;
  }): Promise<string> => {
    return queueService.addJob('data_sync', syncData, { priority: 1 });
  },

  /**
   * Schedule a job for later execution
   */
  scheduleJob: async <T>(
    jobType: string,
    data: T,
    scheduleTime: Date,
    options: Omit<QueueOptions, 'delay'> = {}
  ): Promise<string> => {
    const delay = scheduleTime.getTime() - Date.now();
    return queueService.addJob(jobType, data, { ...options, delay });
  },

  /**
   * Get job status by ID
   */
  getJobStatus: (jobId: string): QueueJob | null => {
    return queueService.getJobStatus(jobId);
  },

  /**
   * Get queue statistics
   */
  getQueueStats: (jobType?: string): any => {
    return queueService.getQueueStats(jobType);
  },

  /**
   * Bulk add jobs
   */
  bulkAddJobs: async <T>(
    jobType: string,
    dataArray: T[],
    options: QueueOptions = {}
  ): Promise<string[]> => {
    const jobIds: string[] = [];
    
    for (const data of dataArray) {
      const jobId = await queueService.addJob(jobType, data, options);
      jobIds.push(jobId);
    }

    return jobIds;
  },

  /**
   * Priority job addition (jumps to front of queue)
   */
  addPriorityJob: async <T>(
    jobType: string,
    data: T,
    options: Omit<QueueOptions, 'priority'> = {}
  ): Promise<string> => {
    return queueService.addJob(jobType, data, { ...options, priority: 100 });
  },
};

// Export default instance
export default queueService;

// Example usage and job type definitions
export const JobTypes = {
  EMAIL: 'email',
  SMS: 'sms',
  NOTIFICATION: 'notification',
  REPORT_GENERATION: 'report_generation',
  BACKUP: 'backup',
  DATA_SYNC: 'data_sync',
  GRADE_CALCULATION: 'grade_calculation',
  ATTENDANCE_REMINDER: 'attendance_reminder',
  FEE_REMINDER: 'fee_reminder',
  EXAM_NOTIFICATION: 'exam_notification',
} as const;

// Type definitions for common job data
export interface EmailJobData {
  to: string | string[];
  subject: string;
  body: string;
  template?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface SMSJobData {
  to: string | string[];
  message: string;
  sender?: string;
  scheduledAt?: Date;
}

export interface NotificationJobData {
  userId: string | string[];
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface ReportJobData {
  type: 'attendance' | 'performance' | 'financial' | 'academic';
  parameters: Record<string, any>;
  userId: string;
  format: 'pdf' | 'excel' | 'csv';
  emailOnCompletion?: boolean;
}

export interface BackupJobData {
  type: 'full' | 'incremental' | 'database_only';
  includeFiles: boolean;
  compression: boolean;
  encryption: boolean;
  userId: string;
  retentionDays?: number;
}

export interface DataSyncJobData {
  source: string;
  target: string;
  syncType: 'full' | 'incremental';
  userId: string;
  mappings?: Record<string, string>;
  filters?: Record<string, any>;
}
