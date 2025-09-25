import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'TEACHER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const action = searchParams.get('action') || 'status';

    // Handle different external service integrations
    switch (service) {
      case 'sms':
        return handleSMSIntegration(action);
      case 'email':
        return handleEmailIntegration(action);
      case 'payment':
        return handlePaymentIntegration(action);
      case 'lms':
        return handleLMSIntegration(action);
      case 'analytics':
        return handleAnalyticsIntegration(action);
      default:
        return getIntegrationStatus();
    }

  } catch (error) {
    console.error('External integration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process external integration request',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'TEACHER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { service, action, data } = body;

    // Handle external service actions
    let result;
    switch (service) {
      case 'sms':
        result = await executeSMSAction(action, data);
        break;
      case 'email':
        result = await executeEmailAction(action, data);
        break;
      case 'payment':
        result = await executePaymentAction(action, data);
        break;
      case 'lms':
        result = await executeLMSAction(action, data);
        break;
      case 'analytics':
        result = await executeAnalyticsAction(action, data);
        break;
      default:
        throw new Error('Unknown service');
    }

    return NextResponse.json({
      success: true,
      service,
      action,
      result,
      executedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('External integration execution error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to execute external integration action',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// Helper functions for different integrations
function getIntegrationStatus() {
  return NextResponse.json({
    success: true,
    integrations: {
      sms: {
        provider: 'Twilio',
        status: 'connected',
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        messagesThisMonth: 245,
        remainingCredits: 755,
      },
      email: {
        provider: 'SendGrid',
        status: 'connected',
        lastUsed: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        emailsThisMonth: 1250,
        deliveryRate: 98.5,
      },
      payment: {
        provider: 'Stripe',
        status: 'connected',
        lastTransaction: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        transactionsThisMonth: 89,
        totalVolume: 125000,
      },
      lms: {
        provider: 'Canvas',
        status: 'configured',
        lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        syncedCourses: 12,
        syncedStudents: 450,
      },
      analytics: {
        provider: 'Google Analytics',
        status: 'connected',
        lastUpdate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        pageViews: 15420,
        activeUsers: 234,
      },
    },
  });
}

function handleSMSIntegration(action: string) {
  const smsData = {
    provider: 'Twilio',
    status: 'operational',
    capabilities: ['bulk_sms', 'scheduled_sms', 'delivery_reports'],
    rateLimit: '100 messages/minute',
    supportedCountries: ['BD', 'US', 'UK', 'CA'],
  };

  return NextResponse.json({
    success: true,
    service: 'sms',
    action,
    data: smsData,
  });
}

function handleEmailIntegration(action: string) {
  const emailData = {
    provider: 'SendGrid',
    status: 'operational',
    capabilities: ['bulk_email', 'templates', 'tracking', 'analytics'],
    dailyLimit: 10000,
    monthlyUsage: 1250,
  };

  return NextResponse.json({
    success: true,
    service: 'email',
    action,
    data: emailData,
  });
}

function handlePaymentIntegration(action: string) {
  const paymentData = {
    provider: 'Stripe',
    status: 'operational',
    capabilities: ['card_payments', 'bank_transfers', 'mobile_money'],
    supportedCurrencies: ['BDT', 'USD'],
    fees: {
      cardPayment: '2.9% + 30¢',
      bankTransfer: '0.8%',
    },
  };

  return NextResponse.json({
    success: true,
    service: 'payment',
    action,
    data: paymentData,
  });
}

function handleLMSIntegration(action: string) {
  const lmsData = {
    provider: 'Canvas',
    status: 'configured',
    capabilities: ['course_sync', 'grade_sync', 'assignment_sync'],
    lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    syncStatus: 'healthy',
  };

  return NextResponse.json({
    success: true,
    service: 'lms',
    action,
    data: lmsData,
  });
}

function handleAnalyticsIntegration(action: string) {
  const analyticsData = {
    provider: 'Google Analytics',
    status: 'operational',
    capabilities: ['page_tracking', 'event_tracking', 'user_analytics'],
    trackingId: 'GA-XXXXXXXXX',
    realTimeUsers: 45,
  };

  return NextResponse.json({
    success: true,
    service: 'analytics',
    action,
    data: analyticsData,
  });
}

// Action execution functions
async function executeSMSAction(action: string, data: any) {
  switch (action) {
    case 'send_bulk':
      return {
        messagesSent: data.recipients?.length || 0,
        estimatedDelivery: '2-5 minutes',
        cost: (data.recipients?.length || 0) * 0.05,
      };
    case 'check_balance':
      return {
        remainingCredits: 755,
        costPerMessage: 0.05,
      };
    default:
      return { message: 'SMS action executed' };
  }
}

async function executeEmailAction(action: string, data: any) {
  switch (action) {
    case 'send_bulk':
      return {
        emailsSent: data.recipients?.length || 0,
        deliveryRate: 98.5,
        estimatedDelivery: '1-2 minutes',
      };
    case 'create_template':
      return {
        templateId: `template_${Date.now()}`,
        templateName: data.name,
        status: 'created',
      };
    default:
      return { message: 'Email action executed' };
  }
}

async function executePaymentAction(action: string, data: any) {
  switch (action) {
    case 'create_payment_intent':
      return {
        paymentIntentId: `pi_${Date.now()}`,
        amount: data.amount,
        currency: data.currency || 'BDT',
        status: 'requires_payment_method',
      };
    case 'refund':
      return {
        refundId: `re_${Date.now()}`,
        amount: data.amount,
        status: 'succeeded',
      };
    default:
      return { message: 'Payment action executed' };
  }
}

async function executeLMSAction(action: string, data: any) {
  switch (action) {
    case 'sync_courses':
      return {
        coursesSynced: 12,
        studentsUpdated: 450,
        lastSync: new Date().toISOString(),
      };
    case 'sync_grades':
      return {
        gradesSynced: 1250,
        studentsAffected: 450,
        lastSync: new Date().toISOString(),
      };
    default:
      return { message: 'LMS action executed' };
  }
}

async function executeAnalyticsAction(action: string, data: any) {
  switch (action) {
    case 'track_event':
      return {
        eventTracked: data.eventName,
        timestamp: new Date().toISOString(),
        status: 'recorded',
      };
    case 'get_report':
      return {
        reportType: data.reportType,
        data: {
          pageViews: 15420,
          sessions: 3240,
          users: 1890,
          bounceRate: 35.2,
        },
      };
    default:
      return { message: 'Analytics action executed' };
  }
}
