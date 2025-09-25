import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// GET - Fetch fee structures with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const feeHeadId = searchParams.get('feeHeadId');
    const classLevelId = searchParams.get('classLevelId');

    const whereClause: any = {};
    if (feeHeadId) {
      whereClause.feeHeadId = feeHeadId;
    }
    if (classLevelId) {
      whereClause.classLevelId = classLevelId;
    }

    const feeStructures = await prisma.feeStructure.findMany({
      where: whereClause,
      include: {
        feeHead: true,
        classLevel: true,
      },
      orderBy: [
        { classLevel: { name: 'asc' } },
        { feeHead: { name: 'asc' } },
      ],
    });

    return createSuccessResponse({ feeStructures });
  } catch (error) {
    console.error('[FEE_STRUCTURES_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch fee structures');
  }
}

// POST - Create new fee structure
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { feeHeadId, classLevelId, amount } = body;

    // Validate required fields
    if (!feeHeadId || !classLevelId || amount === undefined || amount === null) {
      return createErrorResponse('Fee head, class level, and amount are required', 400);
    }

    // Validate amount is positive
    if (parseFloat(amount) < 0) {
      return createErrorResponse('Amount must be positive', 400);
    }

    // Check if fee head exists
    const feeHead = await prisma.feeHead.findUnique({
      where: { id: feeHeadId },
    });

    if (!feeHead) {
      return createErrorResponse('Fee head not found', 404);
    }

    // Check if class level exists
    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classLevelId },
    });

    if (!classLevel) {
      return createErrorResponse('Class level not found', 404);
    }

    // Check if fee structure already exists for this combination
    const existingFeeStructure = await prisma.feeStructure.findUnique({
      where: {
        feeHeadId_classLevelId: {
          feeHeadId,
          classLevelId,
        },
      },
    });

    if (existingFeeStructure) {
      return createErrorResponse('Fee structure already exists for this fee head and class level', 400);
    }

    const feeStructure = await prisma.feeStructure.create({
      data: {
        feeHeadId,
        classLevelId,
        amount: parseFloat(amount),
      },
      include: {
        feeHead: true,
        classLevel: true,
      },
    });

    return createSuccessResponse({ feeStructure }, 201);
  } catch (error: any) {
    console.error('[FEE_STRUCTURES_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Fee structure already exists for this fee head and class level', 400);
    }
    return createErrorResponse('Failed to create fee structure');
  }
}

// PUT - Update fee structure
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, amount } = body;

    // Validate required fields
    if (!id || amount === undefined || amount === null) {
      return createErrorResponse('Fee structure ID and amount are required', 400);
    }

    // Validate amount is positive
    if (parseFloat(amount) < 0) {
      return createErrorResponse('Amount must be positive', 400);
    }

    // Check if fee structure exists
    const existingFeeStructure = await prisma.feeStructure.findUnique({
      where: { id },
    });

    if (!existingFeeStructure) {
      return createErrorResponse('Fee structure not found', 404);
    }

    const feeStructure = await prisma.feeStructure.update({
      where: { id },
      data: {
        amount: parseFloat(amount),
      },
      include: {
        feeHead: true,
        classLevel: true,
      },
    });

    return createSuccessResponse({ feeStructure });
  } catch (error) {
    console.error('[FEE_STRUCTURES_PUT_ERROR]', error);
    return createErrorResponse('Failed to update fee structure');
  }
}

// DELETE - Delete fee structure
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Fee structure ID is required', 400);
    }

    // Check if fee structure exists
    const existingFeeStructure = await prisma.feeStructure.findUnique({
      where: { id },
      include: {
        feeHead: {
          include: {
            _count: {
              select: {
                invoiceItems: true,
              },
            },
          },
        },
      },
    });

    if (!existingFeeStructure) {
      return createErrorResponse('Fee structure not found', 404);
    }

    // Check if fee head is being used in invoices
    if (existingFeeStructure.feeHead._count.invoiceItems > 0) {
      return createErrorResponse('Cannot delete fee structure for fee head that is used in invoices', 400);
    }

    await prisma.feeStructure.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Fee structure deleted successfully' });
  } catch (error) {
    console.error('[FEE_STRUCTURES_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete fee structure');
  }
}
