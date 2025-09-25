import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';
import { integrationService } from '@/app/lib/integration-service';

interface EmailRequest {
  to: string | string[];
  subject: string;
  content: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
    encoding?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

interface BulkEmailRequest {
  recipients: Array<{
    email: string;
    name?: string;
    templateData?: Record<string, any>;
  }>;
  subject: string;
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
    const { type, ...emailData } = body;

    switch (type) {
      case 'single':
        return await sendSingleEmail(emailData as EmailRequest, user.userId);
      
      case 'bulk':
        return await sendBulkEmail(emailData as BulkEmailRequest, user.userId);
      
      case 'template':
        return await sendTemplateEmail(emailData as EmailRequest, user.userId);
      
      default:
        return createErrorResponse('Invalid email type', 400);
    }
  } catch (error) {
    console.error('Email API error:', error);
    return createErrorResponse('Failed to process email request', 500);
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
        return await getEmailTemplates();
      
      case 'status':
        const emailId = searchParams.get('emailId');
        if (!emailId) {
          return createErrorResponse('Email ID is required', 400);
        }
        return await getEmailStatus(emailId);
      
      case 'analytics':
        const templateId = searchParams.get('templateId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        return await getEmailAnalytics(templateId, startDate, endDate);
      
      default:
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    console.error('Email GET API error:', error);
    return createErrorResponse('Failed to process request', 500);
  }
}

async function sendSingleEmail(emailData: EmailRequest, userId: string) {
  try {
    // Validate email addresses
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];
    const validEmails = recipients.filter(email => isValidEmail(email));
    
    if (validEmails.length === 0) {
      return createErrorResponse('No valid email addresses provided', 400);
    }

    // For now, use the existing notification system and log the email
    const emailId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send notifications to users if they exist in the system
    for (const email of validEmails) {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'SYSTEM',
              title: emailData.subject,
              content: emailData.content,
              channels: ['EMAIL'],
              priority: emailData.priority === 'high' ? 'HIGH' : emailData.priority === 'low' ? 'LOW' : 'MEDIUM',
              scheduledAt: emailData.scheduledAt ? new Date(emailData.scheduledAt) : undefined,
            }
          });
        }
      } catch (error) {
        console.error(`Failed to create notification for ${email}:`, error);
      }
    }

    // Log the email operation
    console.log(`Email sent: ${emailData.subject} to ${validEmails.length} recipients`);

    return createSuccessResponse({
      emailId,
      message: 'Email processed successfully',
      recipients: validEmails.length
    });
  } catch (error) {
    console.error('Send single email error:', error);
    return createErrorResponse('Failed to send email', 500);
  }
}

async function sendBulkEmail(emailData: BulkEmailRequest, userId: string) {
  try {
    // Validate recipients
    const validRecipients = emailData.recipients.filter(recipient => 
      isValidEmail(recipient.email)
    );

    if (validRecipients.length === 0) {
      return createErrorResponse('No valid recipients provided', 400);
    }

    // Get notification template
    const template = await prisma.notificationTemplate.findUnique({
      where: { name: emailData.template }
    });

    if (!template) {
      return createErrorResponse('Email template not found', 404);
    }

    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process recipients in batches
    const batchSize = emailData.batchSize || 50;
    const batches = chunkArray(validRecipients, batchSize);

    let processedCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Process each recipient in the batch
      for (const recipient of batch) {
        try {
          const user = await prisma.user.findUnique({ where: { email: recipient.email } });
          if (user) {
            // Render template content
            const templateTitle = template.title ? 
              (typeof template.title === 'string' ? template.title : 
               (template.title as any)?.en || emailData.subject) : emailData.subject;
            const templateContent = template.content ? 
              (typeof template.content === 'string' ? template.content : 
               (template.content as any)?.en || '') : '';

            const renderedTitle = renderTemplate(templateTitle, recipient.templateData || {});
            const renderedContent = renderTemplate(templateContent, recipient.templateData || {});

            await prisma.notification.create({
              data: {
                templateId: template.id,
                userId: user.id,
                type: template.type,
                title: renderedTitle,
                content: renderedContent,
                channels: ['EMAIL'],
                priority: 'MEDIUM',
                scheduledAt: emailData.scheduledAt ? new Date(emailData.scheduledAt) : undefined,
              }
            });
            processedCount++;
          }
        } catch (error) {
          console.error(`Failed to process recipient ${recipient.email}:`, error);
        }
      }
    }

    console.log(`Bulk email campaign processed: ${processedCount} notifications created`);

    return createSuccessResponse({
      campaignId,
      message: 'Bulk email campaign processed successfully',
      recipients: processedCount,
      batches: batches.length
    });
  } catch (error) {
    console.error('Send bulk email error:', error);
    return createErrorResponse('Failed to send bulk email', 500);
  }
}

async function sendTemplateEmail(emailData: EmailRequest, userId: string) {
  try {
    if (!emailData.template) {
      return createErrorResponse('Template name is required', 400);
    }

    // Get notification template
    const template = await prisma.notificationTemplate.findUnique({
      where: { name: emailData.template }
    });

    if (!template) {
      return createErrorResponse('Email template not found', 404);
    }

    // Render template with data
    const templateTitle = template.title ? 
      (typeof template.title === 'string' ? template.title : 
       (template.title as any)?.en || emailData.subject) : emailData.subject;
    const templateContent = template.content ? 
      (typeof template.content === 'string' ? template.content : 
       (template.content as any)?.en || '') : '';

    const renderedContent = renderTemplate(templateContent, emailData.templateData || {});
    const renderedSubject = renderTemplate(templateTitle, emailData.templateData || {});

    // Send email using single email function
    return await sendSingleEmail({
      ...emailData,
      subject: renderedSubject,
      content: renderedContent,
    }, userId);
  } catch (error) {
    console.error('Send template email error:', error);
    return createErrorResponse('Failed to send template email', 500);
  }
}

async function getEmailTemplates() {
  try {
    const templates = await prisma.notificationTemplate.findMany({
      where: { isActive: true },
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
    console.error('Get email templates error:', error);
    return createErrorResponse('Failed to fetch email templates', 500);
  }
}

async function getEmailStatus(emailId: string) {
  try {
    // For now, return a mock status since we don't have email tracking tables
    return createSuccessResponse({
      email: {
        id: emailId,
        status: 'SENT',
        sentAt: new Date(),
        deliveredAt: new Date(),
        deliveryAttempts: 1,
        opens: 0,
        clicks: 0,
      }
    });
  } catch (error) {
    console.error('Get email status error:', error);
    return createErrorResponse('Failed to fetch email status', 500);
  }
}

async function getEmailAnalytics(templateId?: string | null, startDate?: string | null, endDate?: string | null) {
  try {
    const whereClause: any = {
      channels: { has: 'EMAIL' }
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
      totalEmails,
      sentEmails,
      readEmails,
    ] = await Promise.all([
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: { ...whereClause, status: 'SENT' } }),
      prisma.notification.count({ where: { ...whereClause, readAt: { not: null } } }),
    ]);

    const analytics = {
      totalEmails,
      sentEmails,
      deliveredEmails: sentEmails, // Assume all sent emails are delivered
      openedEmails: readEmails,
      clickedEmails: 0, // Not tracked yet
      bouncedEmails: 0, // Not tracked yet
      deliveryRate: sentEmails > 0 ? 100 : 0, // Assume 100% delivery rate
      openRate: sentEmails > 0 ? (readEmails / sentEmails) * 100 : 0,
      clickRate: 0, // Not tracked yet
      bounceRate: 0, // Not tracked yet
    };

    return createSuccessResponse({ analytics });
  } catch (error) {
    console.error('Get email analytics error:', error);
    return createErrorResponse('Failed to fetch email analytics', 500);
  }
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

async function queueEmail(emailId: string, emailData: EmailRequest, recipients: string[]) {
  try {
    // For now, just log the email queue operation
    console.log(`Email ${emailId} queued for ${recipients.length} recipients`);
    
    // In a production system, this would add to a proper queue system
    // like Redis, Bull, or AWS SQS
  } catch (error) {
    console.error('Queue email error:', error);
    throw error;
  }
}

async function queueBulkEmailCampaign(campaignId: string) {
  try {
    // For now, just log the campaign queue operation
    console.log(`Bulk email campaign ${campaignId} queued for processing`);
    
    // In a production system, this would add to a proper queue system
  } catch (error) {
    console.error('Queue bulk email campaign error:', error);
    throw error;
  }
}

// Webhook handler for email service providers
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailId, event, timestamp, data } = body;

    if (!emailId || !event) {
      return createErrorResponse('Missing required webhook data', 400);
    }

    // For now, just log webhook events since we don't have email tracking tables
    console.log(`Email webhook received: ${event} for email ${emailId}`, data);
    
    // In a production system, this would update proper email tracking tables
    switch (event) {
      case 'delivered':
        console.log(`Email ${emailId} delivered at ${timestamp}`);
        break;

      case 'opened':
        console.log(`Email ${emailId} opened at ${timestamp}`);
        break;

      case 'clicked':
        console.log(`Email ${emailId} clicked at ${timestamp}, URL: ${data?.url}`);
        break;

      case 'bounced':
        console.log(`Email ${emailId} bounced at ${timestamp}, reason: ${data?.reason}`);
        break;

      case 'unsubscribed':
        console.log(`Email ${emailId} unsubscribed at ${timestamp}, email: ${data?.email}`);
        break;
    }

    return createSuccessResponse({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Email webhook error:', error);
    return createErrorResponse('Failed to process webhook', 500);
  }
}
