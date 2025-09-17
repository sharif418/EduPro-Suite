import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// Helper function to generate unique invoice number
async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  
  // Find the last invoice number for this year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// Helper function to calculate invoice status based on payments
function calculateInvoiceStatus(totalAmount: number, totalPaid: number): 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' {
  if (totalPaid === 0) {
    return 'PENDING';
  } else if (totalPaid >= totalAmount) {
    return 'PAID';
  } else {
    return 'PARTIALLY_PAID';
  }
}

// GET - Fetch invoices with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const classLevelId = searchParams.get('classLevelId') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: any = {};

    // Search by invoice number or student name
    if (search) {
      whereClause.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { studentId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by class level through student enrollment
    if (classLevelId) {
      whereClause.student = {
        enrollments: {
          some: {
            classLevelId,
          },
        },
      };
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.issueDate = {};
      if (startDate) {
        whereClause.issueDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.issueDate.lte = new Date(endDate);
      }
    }

    // Fetch invoices with pagination
    const [invoices, totalCount] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          student: {
            include: {
              enrollments: {
                include: {
                  classLevel: true,
                  section: true,
                  academicYear: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 1, // Get latest enrollment
              },
            },
          },
          invoiceItems: {
            include: {
              feeHead: true,
            },
          },
          payments: true,
          _count: {
            select: {
              payments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where: whereClause }),
    ]);

    // Calculate payment totals for each invoice
    const invoicesWithPaymentInfo = invoices.map(invoice => {
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
      const balance = Number(invoice.totalAmount) - totalPaid;
      
      return {
        ...invoice,
        totalPaid,
        balance,
        isOverdue: invoice.status === 'PENDING' && new Date() > invoice.dueDate,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return createSuccessResponse({
      invoices: invoicesWithPaymentInfo,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('[INVOICES_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch invoices');
  }
}

// POST - Generate bulk invoices for students
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { classLevelIds, academicYearId, dueDate, feeHeadIds } = body;

    // Validate required fields
    if (!classLevelIds || !Array.isArray(classLevelIds) || classLevelIds.length === 0) {
      return createErrorResponse('Class level IDs are required', 400);
    }

    if (!academicYearId) {
      return createErrorResponse('Academic year ID is required', 400);
    }

    if (!dueDate) {
      return createErrorResponse('Due date is required', 400);
    }

    if (!feeHeadIds || !Array.isArray(feeHeadIds) || feeHeadIds.length === 0) {
      return createErrorResponse('Fee head IDs are required', 400);
    }

    // Get students enrolled in the specified classes and academic year
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classLevelId: { in: classLevelIds },
        academicYearId,
      },
      include: {
        student: true,
        classLevel: true,
      },
    });

    if (enrollments.length === 0) {
      return createErrorResponse('No students found for the specified criteria', 404);
    }

    // Get fee structures for the specified fee heads and class levels
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        feeHeadId: { in: feeHeadIds },
        classLevelId: { in: classLevelIds },
      },
      include: {
        feeHead: true,
        classLevel: true,
      },
    });

    if (feeStructures.length === 0) {
      return createErrorResponse('No fee structures found for the specified criteria', 404);
    }

    // Group fee structures by class level
    const feeStructuresByClass = feeStructures.reduce((acc, fs) => {
      if (!acc[fs.classLevelId]) {
        acc[fs.classLevelId] = [];
      }
      acc[fs.classLevelId].push(fs);
      return acc;
    }, {} as Record<string, typeof feeStructures>);

    const createdInvoices = [];

    // Create invoices in transaction
    await prisma.$transaction(async (tx) => {
      for (const enrollment of enrollments) {
        const classLevelFeeStructures = feeStructuresByClass[enrollment.classLevelId];
        
        if (!classLevelFeeStructures || classLevelFeeStructures.length === 0) {
          continue; // Skip if no fee structures for this class
        }

        // Check if student already has a pending invoice for these fee heads
        const existingInvoice = await tx.invoice.findFirst({
          where: {
            studentId: enrollment.student.id,
            status: { in: ['PENDING', 'PARTIALLY_PAID'] },
            invoiceItems: {
              some: {
                feeHeadId: { in: feeHeadIds },
              },
            },
          },
        });

        if (existingInvoice) {
          continue; // Skip if student already has pending invoice
        }

        // Calculate total amount
        const totalAmount = classLevelFeeStructures.reduce((sum, fs) => sum + Number(fs.amount), 0);

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber();

        // Create invoice
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            studentId: enrollment.student.id,
            dueDate: new Date(dueDate),
            totalAmount,
            status: 'PENDING',
          },
        });

        // Create invoice items
        for (const feeStructure of classLevelFeeStructures) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              feeHeadId: feeStructure.feeHeadId,
              amount: feeStructure.amount,
            },
          });
        }

        createdInvoices.push(invoice);
      }
    });

    return createSuccessResponse({
      message: `Successfully generated ${createdInvoices.length} invoices`,
      invoicesCreated: createdInvoices.length,
    }, 201);
  } catch (error) {
    console.error('[INVOICES_POST_ERROR]', error);
    return createErrorResponse('Failed to generate invoices');
  }
}
