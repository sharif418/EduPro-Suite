import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeTransporter() {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
      console.log('[EMAIL_SERVICE] Email transporter initialized');
      
      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('[EMAIL_SERVICE] SMTP connection error:', error);
        } else {
          console.log('[EMAIL_SERVICE] SMTP server is ready to take our messages');
        }
      });
    } else {
      console.warn('[EMAIL_SERVICE] SMTP credentials not configured. Email notifications will not work.');
    }
  }

  // Send email notification
  async sendNotification(notification: any): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const user = notification.user;
      if (!user.email) {
        return { success: false, error: 'User email not found' };
      }

      // Get email template based on notification type
      const emailContent = await this.getEmailTemplate(notification);

      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'EduPro Suite',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@edupro.com'
        },
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments: emailContent.attachments || []
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`[EMAIL_SENT] To: ${user.email}, MessageId: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('[EMAIL_SEND_ERROR]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown email error'
      };
    }
  }

  // Send bulk email notifications
  async sendBulkNotifications(notifications: any[]): Promise<{success: boolean, results: any[]}> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    return {
      success: successCount > 0,
      results: results.map((result, index) => ({
        notificationId: notifications[index].id,
        success: result.status === 'fulfilled' && result.value.success,
        messageId: result.status === 'fulfilled' ? result.value.messageId : undefined,
        error: result.status === 'rejected' ? result.reason : 
               (result.status === 'fulfilled' ? result.value.error : undefined)
      }))
    };
  }

  // Get email template based on notification type and language
  private async getEmailTemplate(notification: any): Promise<{subject: string, html: string, text: string, attachments?: any[]}> {
    const userLang = await this.getUserLanguage(notification.userId);
    const notificationType = notification.type;
    const priority = notification.priority;

    // Base template structure
    const baseTemplate = {
      subject: this.getSubjectByType(notificationType, notification.title, userLang),
      html: this.generateHTMLTemplate(notification, userLang),
      text: this.generateTextTemplate(notification, userLang)
    };

    // Add priority indicators
    if (priority === 'HIGH') {
      baseTemplate.subject = `🔴 [জরুরি] ${baseTemplate.subject}`;
    } else if (priority === 'MEDIUM') {
      baseTemplate.subject = `🟡 ${baseTemplate.subject}`;
    }

    return baseTemplate;
  }

  private getSubjectByType(type: string, title: string, lang: string): string {
    const subjects = {
      'bn': {
        'SYSTEM': 'সিস্টেম বিজ্ঞপ্তি',
        'ACADEMIC': 'একাডেমিক বিজ্ঞপ্তি',
        'FINANCIAL': 'আর্থিক বিজ্ঞপ্তি',
        'ATTENDANCE': 'উপস্থিতি বিজ্ঞপ্তি',
        'EXAM': 'পরীক্ষা বিজ্ঞপ্তি',
        'ANNOUNCEMENT': 'ঘোষণা',
        'REMINDER': 'স্মরণিকা'
      },
      'en': {
        'SYSTEM': 'System Notification',
        'ACADEMIC': 'Academic Notification',
        'FINANCIAL': 'Financial Notification',
        'ATTENDANCE': 'Attendance Notification',
        'EXAM': 'Exam Notification',
        'ANNOUNCEMENT': 'Announcement',
        'REMINDER': 'Reminder'
      },
      'ar': {
        'SYSTEM': 'إشعار النظام',
        'ACADEMIC': 'إشعار أكاديمي',
        'FINANCIAL': 'إشعار مالي',
        'ATTENDANCE': 'إشعار الحضور',
        'EXAM': 'إشعار الامتحان',
        'ANNOUNCEMENT': 'إعلان',
        'REMINDER': 'تذكير'
      }
    };

    const typeSubject = subjects[lang as keyof typeof subjects]?.[type as keyof typeof subjects['bn']] || title;
    return `${typeSubject} - EduPro Suite`;
  }

  private generateHTMLTemplate(notification: any, lang: string): string {
    const isRTL = lang === 'ar';
    const direction = isRTL ? 'rtl' : 'ltr';
    
    return `
    <!DOCTYPE html>
    <html dir="${direction}" lang="${lang}">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>EduPro Suite Notification</title>
        <style>
            body {
                font-family: ${lang === 'bn' ? "'Noto Sans Bengali', " : lang === 'ar' ? "'Noto Sans Arabic', " : ""} Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                border-bottom: 3px solid #007bff;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }
            .priority-high { border-left: 5px solid #dc3545; padding-left: 15px; }
            .priority-medium { border-left: 5px solid #ffc107; padding-left: 15px; }
            .priority-low { border-left: 5px solid #28a745; padding-left: 15px; }
            .content {
                margin: 20px 0;
            }
            .title {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #007bff;
            }
            .message {
                font-size: 16px;
                line-height: 1.8;
                margin-bottom: 20px;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                font-size: 12px;
                color: #666;
            }
            .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
            }
            .timestamp {
                font-size: 12px;
                color: #888;
                margin-top: 15px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">EduPro Suite</div>
                <div>${lang === 'bn' ? 'শিক্ষা ব্যবস্থাপনা সিস্টেম' : lang === 'ar' ? 'نظام إدارة التعليم' : 'Education Management System'}</div>
            </div>
            
            <div class="content priority-${notification.priority.toLowerCase()}">
                <div class="title">${notification.title}</div>
                <div class="message">${notification.content.replace(/\n/g, '<br>')}</div>
                
                ${notification.data?.actionUrl ? `
                <a href="${notification.data.actionUrl}" class="button">
                    ${lang === 'bn' ? 'বিস্তারিত দেখুন' : lang === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </a>
                ` : ''}
                
                <div class="timestamp">
                    ${lang === 'bn' ? 'সময়' : lang === 'ar' ? 'الوقت' : 'Time'}: ${new Date(notification.createdAt).toLocaleString(lang === 'bn' ? 'bn-BD' : lang === 'ar' ? 'ar-SA' : 'en-US')}
                </div>
            </div>
            
            <div class="footer">
                <p>${lang === 'bn' ? 'এই ইমেইলটি EduPro Suite থেকে স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে।' : 
                      lang === 'ar' ? 'تم إرسال هذا البريد الإلكتروني تلقائياً من EduPro Suite.' : 
                      'This email was sent automatically from EduPro Suite.'}</p>
                <p>${lang === 'bn' ? 'অনুগ্রহ করে এই ইমেইলের উত্তর দেবেন না।' : 
                      lang === 'ar' ? 'يرجى عدم الرد على هذا البريد الإلكتروني.' : 
                      'Please do not reply to this email.'}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateTextTemplate(notification: any, lang: string): string {
    const header = lang === 'bn' ? 'EduPro Suite - শিক্ষা ব্যবস্থাপনা সিস্টেম' :
                   lang === 'ar' ? 'EduPro Suite - نظام إدارة التعليم' :
                   'EduPro Suite - Education Management System';
    
    const timeLabel = lang === 'bn' ? 'সময়' : lang === 'ar' ? 'الوقت' : 'Time';
    const footer = lang === 'bn' ? 'এই ইমেইলটি EduPro Suite থেকে স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে। অনুগ্রহ করে এই ইমেইলের উত্তর দেবেন না।' :
                   lang === 'ar' ? 'تم إرسال هذا البريد الإلكتروني تلقائياً من EduPro Suite. يرجى عدم الرد على هذا البريد الإلكتروني.' :
                   'This email was sent automatically from EduPro Suite. Please do not reply to this email.';

    return `
${header}
${'='.repeat(50)}

${notification.title}

${notification.content}

${timeLabel}: ${new Date(notification.createdAt).toLocaleString(lang === 'bn' ? 'bn-BD' : lang === 'ar' ? 'ar-SA' : 'en-US')}

${'='.repeat(50)}
${footer}
    `.trim();
  }

  private async getUserLanguage(userId: string): Promise<string> {
    // For now, return 'bn' as default. This can be enhanced to get from user profile
    return 'bn';
  }

  // Test email configuration
  async testConnection(): Promise<{success: boolean, error?: string}> {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }

  // Send test email
  async sendTestEmail(toEmail: string): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'EduPro Suite',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@edupro.com'
        },
        to: toEmail,
        subject: 'EduPro Suite - Test Email',
        html: `
        <h2>EduPro Suite Email Test</h2>
        <p>This is a test email to verify that the email service is working correctly.</p>
        <p>If you received this email, the email configuration is successful!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `,
        text: `
EduPro Suite Email Test

This is a test email to verify that the email service is working correctly.
If you received this email, the email configuration is successful!

Timestamp: ${new Date().toISOString()}
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error) {
      console.error('[EMAIL_TEST_ERROR]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test email failed'
      };
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();
