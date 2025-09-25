import { NextRequest } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract error report data
    const {
      message,
      stack,
      componentStack,
      errorId,
      timestamp,
      userAgent,
      url,
      userId,
      context
    } = body;

    // Basic validation
    if (!message) {
      return Response.json({ error: 'Error message is required' }, { status: 400 });
    }

    // Try to get user info if available (optional for error reporting)
    let user = null;
    try {
      user = await verifyAuth(request);
    } catch (error) {
      // Ignore auth errors for error reporting - we still want to log the error
      console.log('Auth failed for error report, continuing without user info');
    }

    // Create error log entry
    const errorLog = {
      id: errorId || `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: message.substring(0, 1000), // Limit message length
      stack: stack ? stack.substring(0, 5000) : null, // Limit stack trace length
      componentStack: componentStack ? componentStack.substring(0, 3000) : null,
      userAgent: userAgent ? userAgent.substring(0, 500) : null,
      url: url ? url.substring(0, 500) : null,
      userId: userId || user?.userId || null,
      userEmail: user?.email || null,
      userRole: user?.role || null,
      context: context || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      severity: determineSeverity(message, stack),
      environment: process.env.NODE_ENV || 'development',
      createdAt: new Date()
    };

    // Log to console for immediate visibility
    console.error('[ERROR_REPORT]', {
      id: errorLog.id,
      message: errorLog.message,
      userId: errorLog.userId,
      url: errorLog.url,
      timestamp: errorLog.timestamp
    });

    // Try to save to database (if we have error logging table)
    try {
      // Note: This would require an ErrorLog model in Prisma schema
      // For now, we'll just log to console and file system
      
      // In production, you might want to:
      // 1. Save to a dedicated error logging service (Sentry, LogRocket, etc.)
      // 2. Save to a database table
      // 3. Send to external monitoring service
      // 4. Send email alerts for critical errors

      // Example of saving to external service:
      if (process.env.NODE_ENV === 'production') {
        // await sendToExternalErrorService(errorLog);
      }

      // For development, we can save to a simple log file or database
      if (process.env.NODE_ENV === 'development') {
        // Save detailed error for debugging
        console.error('[DETAILED_ERROR_REPORT]', errorLog);
      }

    } catch (dbError) {
      console.error('[ERROR_REPORT_SAVE_FAILED]', dbError);
      // Don't fail the request if we can't save to DB
    }

    // Send success response
    return Response.json({ 
      success: true,
      errorId: errorLog.id,
      message: 'Error report received successfully'
    });

  } catch (error) {
    console.error('[ERROR_REPORT_HANDLER_ERROR]', error);
    
    // Even if our error reporting fails, we should return success
    // to avoid infinite error loops in the client
    return Response.json({ 
      success: true,
      message: 'Error report received (with processing issues)',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

// Helper function to determine error severity
function determineSeverity(message: string, stack?: string): 'low' | 'medium' | 'high' | 'critical' {
  const lowerMessage = message.toLowerCase();
  const lowerStack = stack?.toLowerCase() || '';

  // Critical errors
  if (
    lowerMessage.includes('database') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('auth') ||
    lowerMessage.includes('payment') ||
    lowerStack.includes('prisma') ||
    lowerStack.includes('database')
  ) {
    return 'critical';
  }

  // High severity errors
  if (
    lowerMessage.includes('cannot read') ||
    lowerMessage.includes('undefined') ||
    lowerMessage.includes('null') ||
    lowerMessage.includes('failed to fetch') ||
    lowerStack.includes('typeerror') ||
    lowerStack.includes('referenceerror')
  ) {
    return 'high';
  }

  // Medium severity errors
  if (
    lowerMessage.includes('warning') ||
    lowerMessage.includes('deprecated') ||
    lowerStack.includes('warning')
  ) {
    return 'medium';
  }

  // Default to medium for unknown errors
  return 'medium';
}

// Helper function to send to external error service (placeholder)
async function sendToExternalErrorService(errorLog: any) {
  // Example integration with Sentry, LogRocket, or other services
  try {
    // if (process.env.SENTRY_DSN) {
    //   await Sentry.captureException(new Error(errorLog.message), {
    //     extra: errorLog,
    //     user: {
    //       id: errorLog.userId,
    //       email: errorLog.userEmail
    //     }
    //   });
    // }

    // if (process.env.LOGROCKET_APP_ID) {
    //   LogRocket.captureException(new Error(errorLog.message));
    // }

    console.log('[EXTERNAL_ERROR_SERVICE] Would send to external service:', errorLog.id);
  } catch (error) {
    console.error('[EXTERNAL_ERROR_SERVICE_FAILED]', error);
  }
}

// GET endpoint for retrieving error reports (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await verifyAuth(request);
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const severity = searchParams.get('severity');
    const userId = searchParams.get('userId');

    // For now, return a placeholder response
    // In a real implementation, you would query your error logs from database
    
    return Response.json({
      success: true,
      errors: [],
      total: 0,
      limit,
      offset,
      message: 'Error log retrieval not yet implemented - check server logs'
    });

  } catch (error) {
    console.error('[ERROR_REPORT_GET_ERROR]', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to retrieve error reports',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}
