import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// GET - Fetch class-subject relationships (optionally filtered by classLevelId)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const classLevelId = searchParams.get('classLevelId');

    if (classLevelId) {
      // Get subjects for a specific class
      const classSubjects = await prisma.classSubject.findMany({
        where: { classLevelId },
        include: {
          subject: true,
          classLevel: true,
        },
      });

      // Also get available subjects not assigned to this class
      const assignedSubjectIds = classSubjects.map(cs => cs.subjectId);
      const availableSubjects = await prisma.subject.findMany({
        where: {
          id: {
            notIn: assignedSubjectIds,
          },
        },
        orderBy: { name: 'asc' },
      });

      return createSuccessResponse({ 
        classSubjects,
        availableSubjects,
        assignedSubjects: classSubjects.map(cs => cs.subject),
      });
    } else {
      // Get all class-subject relationships
      const classSubjects = await prisma.classSubject.findMany({
        include: {
          subject: true,
          classLevel: true,
        },
        orderBy: [
          { classLevel: { name: 'asc' } },
          { subject: { name: 'asc' } },
        ],
      });

      return createSuccessResponse({ classSubjects });
    }
  } catch (error) {
    console.error('[CLASS_SUBJECTS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch class-subject relationships');
  }
}

// POST - Assign subjects to a class
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { classLevelId, subjectIds } = body;

    if (!classLevelId || !Array.isArray(subjectIds)) {
      return createErrorResponse('Class level ID and subject IDs array are required', 400);
    }

    // Verify class level exists
    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classLevelId },
    });

    if (!classLevel) {
      return createErrorResponse('Class level not found', 404);
    }

    // Verify all subjects exist
    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
      },
    });

    if (subjects.length !== subjectIds.length) {
      return createErrorResponse('One or more subjects not found', 404);
    }

    // Remove existing assignments for this class
    await prisma.classSubject.deleteMany({
      where: { classLevelId },
    });

    // Create new assignments
    const classSubjects = await prisma.classSubject.createMany({
      data: subjectIds.map((subjectId: string) => ({
        classLevelId,
        subjectId,
      })),
    });

    // Fetch the created relationships with includes
    const createdClassSubjects = await prisma.classSubject.findMany({
      where: { classLevelId },
      include: {
        subject: true,
        classLevel: true,
      },
    });

    return createSuccessResponse({ 
      message: 'Subjects assigned successfully',
      classSubjects: createdClassSubjects,
    });
  } catch (error: any) {
    console.error('[CLASS_SUBJECTS_POST_ERROR]', error);
    return createErrorResponse('Failed to assign subjects to class');
  }
}

// PUT - Update subject assignments for a class (same as POST for this use case)
export async function PUT(request: NextRequest) {
  return POST(request);
}

// DELETE - Remove a specific class-subject relationship
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const classLevelId = searchParams.get('classLevelId');
    const subjectId = searchParams.get('subjectId');

    if (!classLevelId || !subjectId) {
      return createErrorResponse('Class level ID and subject ID are required', 400);
    }

    await prisma.classSubject.deleteMany({
      where: {
        classLevelId,
        subjectId,
      },
    });

    return createSuccessResponse({ message: 'Subject unassigned successfully' });
  } catch (error: any) {
    console.error('[CLASS_SUBJECTS_DELETE_ERROR]', error);
    return createErrorResponse('Failed to unassign subject from class');
  }
}
