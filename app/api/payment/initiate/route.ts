import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// POST - Initiate payment for an invoice (for students/guardians)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    // Only students and guardians can initiate payments
    if (!['STUDENT', 'GUARDIAN'].includes(user.role)) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { invoiceId } = body;

    // Validate required fields
    if (!invoiceId) {
      return createErrorResponse('Invoice ID is required', 400);
    }

    // Get invoice details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: {
          include: {
            guardian: true,
            enrollments: {
              include: {
                classLevel: true,
                section: true,
                academicYear: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
        invoiceItems: {
          include: {
            feeHead: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      return createErrorResponse('Invoice not found', 404);
    }

    // Check if invoice is already paid
    if (invoice.status === 'PAID') {
      return createErrorResponse('Invoice is already paid', 400);
    }

    // Calculate remaining balance
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
    const remainingBalance = Number(invoice.totalAmount) - totalPaid;

    if (remainingBalance <= 0) {
      return createErrorResponse('Invoice is already fully paid', 400);
    }

    // For now, we'll create a dummy SSLCommerz integration
    // In a real implementation, you would integrate with actual payment gateway
    const paymentData = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentName: invoice.student.name,
      studentId: invoice.student.studentId,
      amount: remainingBalance,
      currency: 'BDT',
      description: `Payment for ${invoice.invoiceItems.map(item => item.feeHead.name).join(', ')}`,
      
      // Dummy SSLCommerz data - replace with actual integration
      paymentUrl: `https://sandbox.sslcommerz.com/gwprocess/v4/api.php?sessionkey=dummy_session_${invoice.id}`,
      sessionKey: `dummy_session_${invoice.id}`,
      
      // Success/Fail/Cancel URLs (these would be actual URLs in production)
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?invoice=${invoice.id}`,
      failUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/fail?invoice=${invoice.id}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel?invoice=${invoice.id}`,
    };

    // In a real implementation, you would:
    // 1. Create a session with SSLCommerz
    // 2. Get the actual payment URL
    // 3. Store the session information
    // 4. Return the payment URL for redirect

    return createSuccessResponse({
      message: 'Payment session created successfully',
      paymentData,
      redirectUrl: paymentData.paymentUrl,
    });
  } catch (error) {
    console.error('[PAYMENT_INITIATE_ERROR]', error);
    return createErrorResponse('Failed to initiate payment');
  }
}

// GET - Get payment status (for checking payment completion)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');
    const sessionKey = searchParams.get('sessionKey');

    if (!invoiceId) {
      return createErrorResponse('Invoice ID is required', 400);
    }

    // Get invoice with payment details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: true,
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
        invoiceItems: {
          include: {
            feeHead: true,
          },
        },
      },
    });

    if (!invoice) {
      return createErrorResponse('Invoice not found', 404);
    }

    // Calculate payment summary
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
    const remainingBalance = Number(invoice.totalAmount) - totalPaid;

    const paymentStatus = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      totalAmount: Number(invoice.totalAmount),
      totalPaid,
      remainingBalance,
      dueDate: invoice.dueDate,
      isOverdue: invoice.status === 'PENDING' && new Date() > invoice.dueDate,
      payments: invoice.payments,
      invoiceItems: invoice.invoiceItems,
    };

    return createSuccessResponse({ paymentStatus });
  } catch (error) {
    console.error('[PAYMENT_STATUS_ERROR]', error);
    return createErrorResponse('Failed to get payment status');
  }
}
