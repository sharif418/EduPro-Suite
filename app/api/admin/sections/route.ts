import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// GET - Fetch sections (optionally filtered by classLevelId)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const classLevelId = searchParams.get('classLevelId');

    const where = classLevelId ? { classLevelId } : {};

    const sections = await prisma.section.findMany({
      where,
      include: {
        classLevel: true,
      },
      orderBy: [
        { classLevel: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    return createSuccessResponse({ sections });
  } catch (error) {
    console.error('[SECTIONS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch sections');
  }
}

// POST - Create a new section
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { name, classLevelId } = body;

    if (!name || !classLevelId) {
      return createErrorResponse('Section name and class level ID are required', 400);
    }

    // Verify class level exists
    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classLevelId },
    });

    if (!classLevel) {
      return createErrorResponse('Class level not found', 404);
    }

    const section = await prisma.section.create({
      data: {
        name,
        classLevelId,
      },
      include: {
        classLevel: true,
      },
    });

    return createSuccessResponse({ section }, 201);
  } catch (error: any) {
    console.error('[SECTIONS_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Section already exists for this class', 400);
    }
    return createErrorResponse('Failed to create section');
  }
}

// PUT - Update a section
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, name, classLevelId } = body;

    if (!id) {
      return createErrorResponse('Section ID is required', 400);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (classLevelId !== undefined) {
      // Verify new class level exists
      const classLevel = await prisma.classLevel.findUnique({
        where: { id: classLevelId },
      });

      if (!classLevel) {
        return createErrorResponse('Class level not found', 404);
      }
      updateData.classLevelId = classLevelId;
    }

    const section = await prisma.section.update({
      where: { id },
      data: updateData,
      include: {
        classLevel: true,
      },
    });

    return createSuccessResponse({ section });
  } catch (error: any) {
    console.error('[SECTIONS_PUT_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Section not found', 404);
    }
    if (error.code === 'P2002') {
      return createErrorResponse('Section already exists for this class', 400);
    }
    return createErrorResponse('Failed to update section');
  }
}

// DELETE - Delete a section
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Section ID is required', 400);
    }

    await prisma.section.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Section deleted successfully' });
  } catch (error: any) {
    console.error('[SECTIONS_DELETE_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Section not found', 404);
    }
    return createErrorResponse('Failed to delete section');
  }
}
