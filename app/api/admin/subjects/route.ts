import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// GET - Fetch all subjects
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const subjects = await prisma.subject.findMany({
      include: {
        classSubjects: {
          include: {
            classLevel: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return createSuccessResponse({ subjects });
  } catch (error) {
    console.error('[SUBJECTS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch subjects');
  }
}

// POST - Create a new subject
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { name, subjectCode } = body;

    if (!name || !subjectCode) {
      return createErrorResponse('Subject name and code are required', 400);
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        subjectCode: subjectCode.toUpperCase(),
      },
      include: {
        classSubjects: {
          include: {
            classLevel: true,
          },
        },
      },
    });

    return createSuccessResponse({ subject }, 201);
  } catch (error: any) {
    console.error('[SUBJECTS_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Subject code already exists', 400);
    }
    return createErrorResponse('Failed to create subject');
  }
}

// PUT - Update a subject
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, name, subjectCode } = body;

    if (!id) {
      return createErrorResponse('Subject ID is required', 400);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (subjectCode !== undefined) updateData.subjectCode = subjectCode.toUpperCase();

    const subject = await prisma.subject.update({
      where: { id },
      data: updateData,
      include: {
        classSubjects: {
          include: {
            classLevel: true,
          },
        },
      },
    });

    return createSuccessResponse({ subject });
  } catch (error: any) {
    console.error('[SUBJECTS_PUT_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Subject not found', 404);
    }
    if (error.code === 'P2002') {
      return createErrorResponse('Subject code already exists', 400);
    }
    return createErrorResponse('Failed to update subject');
  }
}

// DELETE - Delete a subject
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Subject ID is required', 400);
    }

    // This will cascade delete class-subject relationships
    await prisma.subject.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    console.error('[SUBJECTS_DELETE_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Subject not found', 404);
    }
    return createErrorResponse('Failed to delete subject');
  }
}
