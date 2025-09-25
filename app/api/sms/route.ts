import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';
import { integrationService } from '@/app/lib/integration-service';

interface SMSRequest {
  to: string | string[];
  message: string;
  template?: string;
  templateData?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: string;
  trackDelivery?: boolean;
}

interface BulkSMSRequest {
  recipients: Array<{
    phone: string;
    name?: string;
    templateData?: Record<string, any>;
  }>;
  message?: string;
  template: string;
  scheduledAt?: string;
  batchSize?: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { type, ...smsData } = body;

    switch (type) {
      case 'single':
        return await sendSingleSMS(smsData as SMSRequest, user.userId);
      
      case 'bulk':
        return await sendBulkSMS(smsData as BulkSMSRequest, user.userId);
      
      case 'template':
        return await sendTemplateSMS(smsData as SMSRequest, user.userId);
      
      default:
        return createErrorResponse('Invalid SMS type', 400);
    }
  } catch (error) {
    console.error('SMS API error:', error);
    return createErrorResponse('Failed to process SMS request', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'templates':
        return await getSMSTemplates();
      
      case 'status':
        const smsId = searchParams.get('smsId');
        if (!smsId) {
          return createErrorResponse('SMS ID is required', 400);
        }
        return await getSMSStatus(smsId);
      
      case 'analytics':
        const templateId = searchParams.get('templateId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        return await getSMSAnalytics(templateId, startDate, endDate);
      
      case 'balance':
        return await getSMSBalance();
      
      default:
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    console.error('SMS GET API error:', error);
    return createErrorResponse('Failed to process request', 500);
  }
}

async function sendSingleSMS(smsData: SMSRequest, userId: string) {
  try {
    // Validate phone numbers
    const recipients = Array.isArray(smsData.to) ? smsData.to : [smsData.to];
    const validPhones = recipients.filter(phone => isValidPhoneNumber(phone));
    
    if (validPhones.length === 0) {
      return createErrorResponse('No valid phone numbers provided', 400);
    }

    // Check SMS balance
    const balance = await checkSMSBalance();
    if (balance < validPhones.length) {
      return createErrorResponse('Insufficient SMS balance', 400);
    }

    // For now, use the existing notification system and log the SMS
    const smsId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send notifications to users if they exist in the system
    for (const phone of validPhones) {
      try {
        // Try to find user by phone number through staff relation
        const user = await prisma.user.findFirst({ 
          where: { 
            staff: { contactNumber: phone }
          },
          include: {
            staff: true
          }
        });

        if (user) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'SYSTEM',
              title: 'SMS Notification',
              content: smsData.message,
              channels: ['SMS'],
              priority: smsData.priority === 'high' ? 'HIGH' : smsData.priority === 'low' ? 'LOW' : 'MEDIUM',
              scheduledAt: smsData.scheduledAt ? new Date(smsData.scheduledAt) : undefined,
            }
          });
        }
      } catch (error) {
        console.error(`Failed to create notification for ${phone}:`, error);
      }
    }

    // Log the SMS operation
    console.log(`SMS sent: "${smsData.message}" to ${validPhones.length} recipients`);

    return createSuccessResponse({
      smsId,
      message: 'SMS processed successfully',
      recipients: validPhones.length,
      cost: calculateSMSCost(validPhones.length, smsData.message)
    });
  } catch (error) {
    console.error('Send single SMS error:', error);
    return createErrorResponse('Failed to send SMS', 500);
  }
}

async function sendBulkSMS(smsData: BulkSMSRequest, userId: string) {
  try {
    // Validate recipients
    const validRecipients = smsData.recipients.filter(recipient => 
      isValidPhoneNumber(recipient.phone)
    );

    if (validRecipients.length === 0) {
      return createErrorResponse('No valid recipients provided', 400);
    }

    // Check SMS balance
    const balance = await checkSMSBalance();
    if (balance < validRecipients.length) {
      return createErrorResponse('Insufficient SMS balance', 400);
    }

    // Get notification template
    const template = await prisma.notificationTemplate.findUnique({
      where: { name: smsData.template }
    });

    if (!template) {
      return createErrorResponse('SMS template not found', 404);
    }

    const campaignId = `sms_campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process recipients in batches
    const batchSize = smsData.batchSize || 100; // SMS can handle larger batches
    const batches = chunkArray(validRecipients, batchSize);

    let processedCount = 0;
    let totalCost = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Process each recipient in the batch
      for (const recipient of batch) {
        try {
          // Try to find user by phone number through staff relation
          const user = await prisma.user.findFirst({ 
            where: { 
              staff: { contactNumber: recipient.phone }
            }
          });

          if (user) {
            // Render template content
            const templateTitle = template.title ? 
              (typeof template.title === 'string' ? template.title : 
               (template.title as any)?.en || 'SMS Notification') : 'SMS Notification';
            const templateContent = template.content ? 
              (typeof template.content === 'string' ? template.content : 
               (template.content as any)?.en || '') : '';

            const renderedContent = renderTemplate(templateContent, recipient.templateData || {});

            await prisma.notification.create({
              data: {
                templateId: template.id,
                userId: user.id,
                type: template.type,
                title: templateTitle,
                content: renderedContent,
                channels: ['SMS'],
                priority: 'MEDIUM',
                scheduledAt: smsData.scheduledAt ? new Date(smsData.scheduledAt) : undefined,
              }
            });

            processedCount++;
            totalCost += calculateSMSCost(1, renderedContent);
          }
        } catch (error) {
          console.error(`Failed to process recipient ${recipient.phone}:`, error);
        }
      }
    }

    console.log(`Bulk SMS campaign processed: ${processedCount} notifications created`);

    return createSuccessResponse({
      campaignId,
      message: 'Bulk SMS campaign processed successfully',
      recipients: processedCount,
      batches: batches.length,
      estimatedCost: totalCost
    });
  } catch (error) {
    console.error('Send bulk SMS error:', error);
    return createErrorResponse('Failed to send bulk SMS', 500);
  }
}

async function sendTemplateSMS(smsData: SMSRequest, userId: string) {
  try {
    if (!smsData.template) {
      return createErrorResponse('Template name is required', 400);
    }

    // Get notification template
    const template = await prisma.notificationTemplate.findUnique({
      where: { name: smsData.template }
    });

    if (!template) {
      return createErrorResponse('SMS template not found', 404);
    }

    // Render template with data
    const templateContent = template.content ? 
      (typeof template.content === 'string' ? template.content : 
       (template.content as any)?.en || '') : '';

    const renderedContent = renderTemplate(templateContent, smsData.templateData || {});

    // Send SMS using single SMS function
    return await sendSingleSMS({
      ...smsData,
      message: renderedContent,
    }, userId);
  } catch (error) {
    console.error('Send template SMS error:', error);
    return createErrorResponse('Failed to send template SMS', 500);
  }
}

async function getSMSTemplates() {
  try {
    const templates = await prisma.notificationTemplate.findMany({
      where: { 
        isActive: true,
        channels: { has: 'SMS' }
      },
      select: {
        id: true,
        name: true,
        title: true,
        content: true,
        type: true,
        channels: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' }
    });

    return createSuccessResponse({ templates });
  } catch (error) {
    console.error('Get SMS templates error:', error);
    return createErrorResponse('Failed to fetch SMS templates', 500);
  }
}

async function getSMSStatus(smsId: string) {
  try {
    // For now, return a mock status since we don't have SMS tracking tables
    return createSuccessResponse({
      sms: {
        id: smsId,
        status: 'DELIVERED',
        sentAt: new Date(),
        deliveredAt: new Date(),
        deliveryAttempts: 1,
        cost: 0.05, // Mock cost
      }
    });
  } catch (error) {
    console.error('Get SMS status error:', error);
    return createErrorResponse('Failed to fetch SMS status', 500);
  }
}

async function getSMSAnalytics(templateId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    const whereClause: any = {
      channels: { has: 'SMS' }
    };
    
    if (templateId) {
      whereClause.templateId = templateId;
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [
      totalSMS,
      sentSMS,
      deliveredSMS,
    ] = await Promise.all([
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: { ...whereClause, status: 'SENT' } }),
      prisma.notification.count({ where: { ...whereClause, status: 'DELIVERED' } }),
    ]);

    const analytics = {
      totalSMS,
      sentSMS,
      deliveredSMS,
      failedSMS: sentSMS - deliveredSMS,
      deliveryRate: sentSMS > 0 ? (deliveredSMS / sentSMS) * 100 : 0,
      failureRate: sentSMS > 0 ? ((sentSMS - deliveredSMS) / sentSMS) * 100 : 0,
      estimatedCost: totalSMS * 0.05, // Mock cost calculation
    };

    return createSuccessResponse({ analytics });
  } catch (error) {
    console.error('Get SMS analytics error:', error);
    return createErrorResponse('Failed to fetch SMS analytics', 500);
  }
}

async function getSMSBalance() {
  try {
    // Mock SMS balance - in production this would check with SMS provider
    const balance = {
      credits: 1000,
      used: 150,
      remaining: 850,
      costPerSMS: 0.05,
      currency: 'USD',
      lastUpdated: new Date(),
    };

    return createSuccessResponse({ balance });
  } catch (error) {
    console.error('Get SMS balance error:', error);
    return createErrorResponse('Failed to fetch SMS balance', 500);
  }
}

// Helper functions
function isValidPhoneNumber(phone: string): boolean {
  // Basic phone number validation - can be enhanced
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  // Simple template rendering - replace {{variable}} with data
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, String(data[key] || ''));
  });
  
  return rendered;
}

async function checkSMSBalance(): Promise<number> {
  // Mock balance check - in production this would check with SMS provider
  return 1000;
}

function calculateSMSCost(count: number, message: string): number {
  // SMS cost calculation based on message length
  const messageLength = message.length;
  const smsCount = Math.ceil(messageLength / 160); // Standard SMS length
  const costPerSMS = 0.05; // Mock cost
  
  return count * smsCount * costPerSMS;
}

// Webhook handler for SMS service providers
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { smsId, event, timestamp, data } = body;

    if (!smsId || !event) {
      return createErrorResponse('Missing required webhook data', 400);
    }

    // For now, just log webhook events since we don't have SMS tracking tables
    console.log(`SMS webhook received: ${event} for SMS ${smsId}`, data);
    
    // In a production system, this would update proper SMS tracking tables
    switch (event) {
      case 'sent':
        console.log(`SMS ${smsId} sent at ${timestamp}`);
        break;

      case 'delivered':
        console.log(`SMS ${smsId} delivered at ${timestamp}`);
        break;

      case 'failed':
        console.log(`SMS ${smsId} failed at ${timestamp}, reason: ${data?.reason}`);
        break;

      case 'unsubscribed':
        console.log(`Phone ${data?.phone} unsubscribed at ${timestamp}`);
        // In production, add to unsubscribe list
        break;
    }

    return createSuccessResponse({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('SMS webhook error:', error);
    return createErrorResponse('Failed to process webhook', 500);
  }
}

// Emergency broadcast endpoint
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'ADMIN') {
      return createErrorResponse('Admin access required', 403);
    }

    const body = await request.json();
    const { message, priority = 'high', targetGroups } = body;

    if (!message) {
      return createErrorResponse('Message is required', 400);
    }

    // Get all users based on target groups
    let users = [];
    
    if (targetGroups?.includes('all')) {
      users = await prisma.user.findMany({
        include: {
          staff: true
        }
      });
    } else {
      const whereClause: any = {};
      if (targetGroups?.includes('staff')) {
        whereClause.staff = { isNot: null };
      }
      
      users = await prisma.user.findMany({
        where: whereClause,
        include: {
          staff: true
        }
      });
    }

    // Send emergency notifications
    let sentCount = 0;
    for (const user of users) {
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'SYSTEM',
            title: 'Emergency Alert',
            content: message,
            channels: ['SMS', 'PUSH', 'IN_APP'],
            priority: 'HIGH',
          }
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send emergency notification to user ${user.id}:`, error);
      }
    }

    console.log(`Emergency broadcast sent to ${sentCount} users`);

    return createSuccessResponse({
      message: 'Emergency broadcast sent successfully',
      recipients: sentCount,
      broadcastId: `emergency_${Date.now()}`
    });
  } catch (error) {
    console.error('Emergency broadcast error:', error);
    return createErrorResponse('Failed to send emergency broadcast', 500);
  }
}
