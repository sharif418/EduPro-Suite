import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// GET - Fetch all class levels
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const classLevels = await prisma.classLevel.findMany({
      include: {
        sections: true,
        classSubjects: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return createSuccessResponse({ classLevels });
  } catch (error) {
    console.error('[CLASS_LEVELS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch class levels');
  }
}

// POST - Create a new class level
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return createErrorResponse('Class name is required', 400);
    }

    const classLevel = await prisma.classLevel.create({
      data: { name },
      include: {
        sections: true,
        classSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    return createSuccessResponse({ classLevel }, 201);
  } catch (error: any) {
    console.error('[CLASS_LEVELS_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Class level already exists', 400);
    }
    return createErrorResponse('Failed to create class level');
  }
}

// PUT - Update a class level
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return createErrorResponse('Class level ID is required', 400);
    }

    if (!name) {
      return createErrorResponse('Class name is required', 400);
    }

    const classLevel = await prisma.classLevel.update({
      where: { id },
      data: { name },
      include: {
        sections: true,
        classSubjects: {
          include: {
            subject: true,
          },
        },
      },
    });

    return createSuccessResponse({ classLevel });
  } catch (error: any) {
    console.error('[CLASS_LEVELS_PUT_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Class level not found', 404);
    }
    if (error.code === 'P2002') {
      return createErrorResponse('Class level already exists', 400);
    }
    return createErrorResponse('Failed to update class level');
  }
}

// DELETE - Delete a class level
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Class level ID is required', 400);
    }

    // This will cascade delete sections and class-subject relationships
    await prisma.classLevel.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Class level deleted successfully' });
  } catch (error: any) {
    console.error('[CLASS_LEVELS_DELETE_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Class level not found', 404);
    }
    return createErrorResponse('Failed to delete class level');
  }
}
