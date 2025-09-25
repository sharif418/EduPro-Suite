import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// GET - Fetch all fee heads
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const feeHeads = await prisma.feeHead.findMany({
      where: whereClause,
      include: {
        feeStructures: {
          include: {
            classLevel: true,
          },
        },
        _count: {
          select: {
            feeStructures: true,
            invoiceItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return createSuccessResponse({ feeHeads });
  } catch (error) {
    console.error('[FEE_HEADS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch fee heads');
  }
}

// POST - Create new fee head
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { name, description } = body;

    // Validate required fields
    if (!name) {
      return createErrorResponse('Fee head name is required', 400);
    }

    // Check if fee head with same name already exists
    const existingFeeHead = await prisma.feeHead.findUnique({
      where: { name },
    });

    if (existingFeeHead) {
      return createErrorResponse('Fee head with this name already exists', 400);
    }

    const feeHead = await prisma.feeHead.create({
      data: {
        name,
        description: description || null,
      },
      include: {
        feeStructures: {
          include: {
            classLevel: true,
          },
        },
        _count: {
          select: {
            feeStructures: true,
            invoiceItems: true,
          },
        },
      },
    });

    return createSuccessResponse({ feeHead }, 201);
  } catch (error: any) {
    console.error('[FEE_HEADS_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Fee head with this name already exists', 400);
    }
    return createErrorResponse('Failed to create fee head');
  }
}

// PUT - Update fee head
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, name, description } = body;

    // Validate required fields
    if (!id || !name) {
      return createErrorResponse('Fee head ID and name are required', 400);
    }

    // Check if fee head exists
    const existingFeeHead = await prisma.feeHead.findUnique({
      where: { id },
    });

    if (!existingFeeHead) {
      return createErrorResponse('Fee head not found', 404);
    }

    // Check if another fee head with same name exists
    const duplicateFeeHead = await prisma.feeHead.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (duplicateFeeHead) {
      return createErrorResponse('Fee head with this name already exists', 400);
    }

    const feeHead = await prisma.feeHead.update({
      where: { id },
      data: {
        name,
        description: description || null,
      },
      include: {
        feeStructures: {
          include: {
            classLevel: true,
          },
        },
        _count: {
          select: {
            feeStructures: true,
            invoiceItems: true,
          },
        },
      },
    });

    return createSuccessResponse({ feeHead });
  } catch (error: any) {
    console.error('[FEE_HEADS_PUT_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Fee head with this name already exists', 400);
    }
    return createErrorResponse('Failed to update fee head');
  }
}

// DELETE - Delete fee head
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Fee head ID is required', 400);
    }

    // Check if fee head exists
    const existingFeeHead = await prisma.feeHead.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            feeStructures: true,
            invoiceItems: true,
          },
        },
      },
    });

    if (!existingFeeHead) {
      return createErrorResponse('Fee head not found', 404);
    }

    // Check if fee head is being used in invoices
    if (existingFeeHead._count.invoiceItems > 0) {
      return createErrorResponse('Cannot delete fee head that is used in invoices', 400);
    }

    await prisma.feeHead.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Fee head deleted successfully' });
  } catch (error) {
    console.error('[FEE_HEADS_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete fee head');
  }
}
