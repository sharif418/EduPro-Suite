import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// Helper function to update invoice status based on payments
async function updateInvoiceStatus(invoiceId: string, tx: any) {
  const invoice = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
    },
  });

  if (!invoice) return;

  const totalPaid = invoice.payments.reduce((sum: number, payment: any) => sum + Number(payment.amountPaid), 0);
  const totalAmount = Number(invoice.totalAmount);

  let status: 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';
  
  if (totalPaid === 0) {
    status = 'PENDING';
  } else if (totalPaid >= totalAmount) {
    status = 'PAID';
  } else {
    status = 'PARTIALLY_PAID';
  }

  // Check if overdue
  if (status === 'PENDING' && new Date() > invoice.dueDate) {
    status = 'OVERDUE';
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { status },
  });
}

// GET - Fetch payments with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const invoiceId = searchParams.get('invoiceId');
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: any = {};

    if (invoiceId) {
      whereClause.invoiceId = invoiceId;
    }

    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.paymentDate = {};
      if (startDate) {
        whereClause.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.paymentDate.lte = new Date(endDate);
      }
    }

    // Fetch payments with pagination
    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        include: {
          invoice: {
            include: {
              student: {
                include: {
                  enrollments: {
                    include: {
                      classLevel: true,
                      section: true,
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
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return createSuccessResponse({
      payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('[PAYMENTS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch payments');
  }
}

// POST - Record new payment
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { invoiceId, amountPaid, paymentMethod, transactionId, remarks } = body;

    // Validate required fields
    if (!invoiceId || !amountPaid || !paymentMethod) {
      return createErrorResponse('Invoice ID, amount paid, and payment method are required', 400);
    }

    // Validate amount is positive
    if (parseFloat(amountPaid) <= 0) {
      return createErrorResponse('Amount paid must be positive', 400);
    }

    // Validate payment method
    const validPaymentMethods = ['CASH', 'CARD', 'MOBILE_BANKING', 'ONLINE_GATEWAY'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return createErrorResponse('Invalid payment method', 400);
    }

    // Check if invoice exists and get current payment info
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        student: true,
      },
    });

    if (!invoice) {
      return createErrorResponse('Invoice not found', 404);
    }

    // Calculate current total paid and remaining balance
    const currentTotalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
    const remainingBalance = Number(invoice.totalAmount) - currentTotalPaid;

    // Validate payment amount doesn't exceed remaining balance
    if (parseFloat(amountPaid) > remainingBalance) {
      return createErrorResponse(`Payment amount cannot exceed remaining balance of ${remainingBalance}`, 400);
    }

    // Create payment and update invoice status in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          amountPaid: parseFloat(amountPaid),
          paymentMethod,
          transactionId: transactionId || null,
          remarks: remarks || null,
        },
        include: {
          invoice: {
            include: {
              student: {
                include: {
                  enrollments: {
                    include: {
                      classLevel: true,
                      section: true,
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
            },
          },
        },
      });

      // Update invoice status
      await updateInvoiceStatus(invoiceId, tx);

      return payment;
    });

    return createSuccessResponse({ payment: result }, 201);
  } catch (error) {
    console.error('[PAYMENTS_POST_ERROR]', error);
    return createErrorResponse('Failed to record payment');
  }
}

// DELETE - Delete payment (admin only, for corrections)
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Payment ID is required', 400);
    }

    // Check if payment exists
    const existingPayment = await prisma.payment.findUnique({
      where: { id },
      include: {
        invoice: true,
      },
    });

    if (!existingPayment) {
      return createErrorResponse('Payment not found', 404);
    }

    // Delete payment and update invoice status in transaction
    await prisma.$transaction(async (tx) => {
      // Delete payment
      await tx.payment.delete({
        where: { id },
      });

      // Update invoice status
      await updateInvoiceStatus(existingPayment.invoiceId, tx);
    });

    return createSuccessResponse({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('[PAYMENTS_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete payment');
  }
}
