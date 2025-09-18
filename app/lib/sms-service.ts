import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SMSGatewayConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  senderId: string;
  method: 'GET' | 'POST';
  parameters: Record<string, string>;
}

export class SMSService {
  private static instance: SMSService;
  private gatewayConfig: SMSGatewayConfig | null = null;

  constructor() {
    this.initializeGateway();
  }

  public static getInstance(): SMSService {
    if (!SMSService.instance) {
      SMSService.instance = new SMSService();
    }
    return SMSService.instance;
  }

  private initializeGateway() {
    // Load SMS gateway configuration from environment variables
    const gatewayName = process.env.SMS_GATEWAY_NAME || 'generic';
    const apiUrl = process.env.SMS_API_URL;
    const apiKey = process.env.SMS_API_KEY;
    const senderId = process.env.SMS_SENDER_ID || 'EduPro';

    if (apiUrl && apiKey) {
      this.gatewayConfig = {
        name: gatewayName,
        apiUrl,
        apiKey,
        senderId,
        method: (process.env.SMS_METHOD as 'GET' | 'POST') || 'POST',
        parameters: this.getGatewayParameters(gatewayName)
      };
      
      console.log(`[SMS_SERVICE] SMS gateway initialized: ${gatewayName}`);
    } else {
      console.warn('[SMS_SERVICE] SMS gateway not configured. SMS notifications will not work.');
    }
  }

  private getGatewayParameters(gatewayName: string): Record<string, string> {
    // Common Bangladeshi SMS gateway parameter mappings
    const gatewayParams: Record<string, Record<string, string>> = {
      'ssl_wireless': {
        'user': 'user',
        'pass': 'pass',
        'sid': 'sid',
        'sms': 'sms',
        'msisdn': 'msisdn',
        'csms_id': 'csms_id'
      },
      'grameenphone': {
        'username': 'username',
        'password': 'password',
        'apikey': 'apikey',
        'cli': 'cli',
        'messagetype': 'messagetype',
        'message': 'message',
        'msisdn': 'msisdn'
      },
      'robi': {
        'SenderId': 'SenderId',
        'ApiKey': 'ApiKey',
        'ClientId': 'ClientId',
        'Message': 'Message',
        'MobileNumber': 'MobileNumber'
      },
      'banglalink': {
        'userID': 'userID',
        'passwd': 'passwd',
        'sender': 'sender',
        'message': 'message',
        'msisdn': 'msisdn'
      },
      'generic': {
        'api_key': 'api_key',
        'sender_id': 'sender_id',
        'message': 'message',
        'number': 'number'
      }
    };

    return gatewayParams[gatewayName] || gatewayParams['generic'];
  }

  // Send SMS notification
  async sendNotification(notification: any): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.gatewayConfig) {
      return { success: false, error: 'SMS gateway not configured' };
    }

    try {
      const user = notification.user;
      const phoneNumber = await this.getUserPhoneNumber(user.id);
      
      if (!phoneNumber) {
        return { success: false, error: 'User phone number not found' };
      }

      // Format message for SMS
      const smsMessage = this.formatSMSMessage(notification);
      
      // Send SMS through configured gateway
      const result = await this.sendSMS(phoneNumber, smsMessage);
      
      if (result.success) {
        console.log(`[SMS_SENT] To: ${phoneNumber}, MessageId: ${result.messageId}`);
      }
      
      return result;

    } catch (error) {
      console.error('[SMS_SEND_ERROR]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error'
      };
    }
  }

  // Send bulk SMS notifications
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

  // Core SMS sending function
  private async sendSMS(phoneNumber: string, message: string): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.gatewayConfig) {
      return { success: false, error: 'SMS gateway not configured' };
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const params = this.buildRequestParameters(formattedNumber, message);
      
      let response: Response;
      
      if (this.gatewayConfig.method === 'GET') {
        const url = new URL(this.gatewayConfig.apiUrl);
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
        
        response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'EduPro-Suite/1.0'
          }
        });
      } else {
        response = await fetch(this.gatewayConfig.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'EduPro-Suite/1.0'
          },
          body: JSON.stringify(params)
        });
      }

      const responseText = await response.text();
      
      if (response.ok) {
        // Parse response based on gateway type
        const messageId = this.parseMessageId(responseText);
        return {
          success: true,
          messageId: messageId || `sms-${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: `SMS gateway error: ${response.status} - ${responseText}`
        };
      }

    } catch (error) {
      console.error('[SMS_GATEWAY_ERROR]', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS gateway request failed'
      };
    }
  }

  private buildRequestParameters(phoneNumber: string, message: string): Record<string, string> {
    if (!this.gatewayConfig) return {};

    const params: Record<string, string> = {};
    const paramMap = this.gatewayConfig.parameters;

    // Map common parameters
    if (paramMap.api_key || paramMap.ApiKey || paramMap.apikey) {
      const keyParam = paramMap.api_key || paramMap.ApiKey || paramMap.apikey;
      params[keyParam] = this.gatewayConfig.apiKey;
    }

    if (paramMap.sender_id || paramMap.SenderId || paramMap.sid || paramMap.cli) {
      const senderParam = paramMap.sender_id || paramMap.SenderId || paramMap.sid || paramMap.cli;
      params[senderParam] = this.gatewayConfig.senderId;
    }

    if (paramMap.message || paramMap.Message || paramMap.sms) {
      const messageParam = paramMap.message || paramMap.Message || paramMap.sms;
      params[messageParam] = message;
    }

    if (paramMap.number || paramMap.MobileNumber || paramMap.msisdn) {
      const numberParam = paramMap.number || paramMap.MobileNumber || paramMap.msisdn;
      params[numberParam] = phoneNumber;
    }

    // Add any additional gateway-specific parameters from environment
    const additionalParams = process.env.SMS_ADDITIONAL_PARAMS;
    if (additionalParams) {
      try {
        const extra = JSON.parse(additionalParams);
        Object.assign(params, extra);
      } catch (error) {
        console.warn('[SMS_SERVICE] Invalid additional parameters format');
      }
    }

    return params;
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Bangladeshi phone numbers
    if (cleaned.startsWith('0')) {
      cleaned = '88' + cleaned; // Add country code
    } else if (cleaned.startsWith('88')) {
      // Already has country code
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      cleaned = '88' + cleaned; // Add country code for 11-digit numbers starting with 1
    }
    
    return cleaned;
  }

  private parseMessageId(response: string): string | null {
    try {
      // Try to parse as JSON first
      const json = JSON.parse(response);
      return json.messageId || json.message_id || json.id || json.smsId || null;
    } catch {
      // If not JSON, try to extract message ID from text response
      const patterns = [
        /message[_\s]?id[:\s]+([a-zA-Z0-9-]+)/i,
        /id[:\s]+([a-zA-Z0-9-]+)/i,
        /success[:\s]+([a-zA-Z0-9-]+)/i
      ];
      
      for (const pattern of patterns) {
        const match = response.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
    
    return null;
  }

  private formatSMSMessage(notification: any): string {
    const maxLength = 160; // Standard SMS length
    let message = `${notification.title}\n\n${notification.content}`;
    
    // Add priority indicator
    if (notification.priority === 'HIGH') {
      message = `[জরুরি] ${message}`;
    }
    
    // Truncate if too long
    if (message.length > maxLength) {
      message = message.substring(0, maxLength - 3) + '...';
    }
    
    return message;
  }

  private async getUserPhoneNumber(userId: string): Promise<string | null> {
    try {
      // Try to get phone number from staff table first
      const staff = await prisma.staff.findFirst({
        where: { userId },
        select: { contactNumber: true }
      });
      
      if (staff?.contactNumber) {
        return staff.contactNumber;
      }
      
      // If not staff, try to get from student's guardian
      const student = await prisma.student.findFirst({
        where: { 
          enrollments: {
            some: {
              student: {
                // This is a complex query - for now, we'll handle it differently
              }
            }
          }
        },
        include: {
          guardian: {
            select: { contactNumber: true }
          }
        }
      });
      
      if (student?.guardian?.contactNumber) {
        return student.guardian.contactNumber;
      }
      
      return null;
    } catch (error) {
      console.error('[SMS_PHONE_LOOKUP_ERROR]', error);
      return null;
    }
  }

  // Test SMS configuration
  async testConnection(): Promise<{success: boolean, error?: string}> {
    if (!this.gatewayConfig) {
      return { success: false, error: 'SMS gateway not configured' };
    }

    // For testing, we'll just validate the configuration
    const requiredFields = ['apiUrl', 'apiKey', 'senderId'];
    const missingFields = requiredFields.filter(field => !this.gatewayConfig![field as keyof SMSGatewayConfig]);
    
    if (missingFields.length > 0) {
      return { 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      };
    }

    return { success: true };
  }

  // Send test SMS
  async sendTestSMS(phoneNumber: string): Promise<{success: boolean, messageId?: string, error?: string}> {
    if (!this.gatewayConfig) {
      return { success: false, error: 'SMS gateway not configured' };
    }

    const testMessage = `EduPro Suite SMS Test\n\nThis is a test message to verify SMS functionality.\n\nTime: ${new Date().toLocaleString('bn-BD')}`;
    
    return await this.sendSMS(phoneNumber, testMessage);
  }

  // Get SMS statistics
  async getStats(): Promise<any> {
    // This would typically track SMS usage from a separate logging table
    // For now, return basic configuration info
    return {
      gatewayConfigured: !!this.gatewayConfig,
      gatewayName: this.gatewayConfig?.name || 'Not configured',
      senderId: this.gatewayConfig?.senderId || 'Not set'
    };
  }
}

// Export singleton instance
export const smsService = SMSService.getInstance();
