import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// GET - Fetch all exams with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get('academicYearId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (academicYearId) {
      whereClause.academicYearId = academicYearId;
    }

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Fetch exams with pagination
    const [exams, totalCount] = await Promise.all([
      prisma.exam.findMany({
        where: whereClause,
        include: {
          academicYear: true,
          examSchedules: {
            include: {
              classLevel: true,
              subject: true,
            },
          },
          results: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.exam.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return createSuccessResponse({
      exams,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('[EXAMS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch exams');
  }
}

// POST - Create new exam
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { name, academicYearId } = body;

    // Validate required fields
    if (!name || !academicYearId) {
      return createErrorResponse('Missing required fields: name and academicYearId', 400);
    }

    // Check if academic year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      return createErrorResponse('Academic year not found', 404);
    }

    // Check for duplicate exam name in the same academic year
    const existingExam = await prisma.exam.findFirst({
      where: {
        name,
        academicYearId,
      },
    });

    if (existingExam) {
      return createErrorResponse('Exam with this name already exists in the academic year', 400);
    }

    // Create exam
    const exam = await prisma.exam.create({
      data: {
        name,
        academicYearId,
      },
      include: {
        academicYear: true,
        examSchedules: {
          include: {
            classLevel: true,
            subject: true,
          },
        },
      },
    });

    return createSuccessResponse({ exam }, 201);
  } catch (error: any) {
    console.error('[EXAMS_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Exam with this name already exists in the academic year', 400);
    }
    return createErrorResponse('Failed to create exam');
  }
}

// PUT - Update exam
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, name, academicYearId } = body;

    if (!id) {
      return createErrorResponse('Exam ID is required', 400);
    }

    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id },
    });

    if (!existingExam) {
      return createErrorResponse('Exam not found', 404);
    }

    // If academicYearId is being changed, validate it
    if (academicYearId && academicYearId !== existingExam.academicYearId) {
      const academicYear = await prisma.academicYear.findUnique({
        where: { id: academicYearId },
      });

      if (!academicYear) {
        return createErrorResponse('Academic year not found', 404);
      }
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existingExam.name) {
      const duplicateExam = await prisma.exam.findFirst({
        where: {
          name,
          academicYearId: academicYearId || existingExam.academicYearId,
          id: { not: id },
        },
      });

      if (duplicateExam) {
        return createErrorResponse('Exam with this name already exists in the academic year', 400);
      }
    }

    // Update exam
    const updatedExam = await prisma.exam.update({
      where: { id },
      data: {
        name: name || existingExam.name,
        academicYearId: academicYearId || existingExam.academicYearId,
      },
      include: {
        academicYear: true,
        examSchedules: {
          include: {
            classLevel: true,
            subject: true,
          },
        },
      },
    });

    return createSuccessResponse({ exam: updatedExam });
  } catch (error: any) {
    console.error('[EXAMS_PUT_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Exam with this name already exists in the academic year', 400);
    }
    return createErrorResponse('Failed to update exam');
  }
}

// DELETE - Delete exam
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Exam ID is required', 400);
    }

    // Check if exam exists
    const existingExam = await prisma.exam.findUnique({
      where: { id },
      include: {
        examSchedules: {
          include: {
            marks: true,
          },
        },
        results: true,
      },
    });

    if (!existingExam) {
      return createErrorResponse('Exam not found', 404);
    }

    // Check if exam has any marks or results
    const hasMarks = existingExam.examSchedules.some(schedule => schedule.marks.length > 0);
    const hasResults = existingExam.results.length > 0;

    if (hasMarks || hasResults) {
      return createErrorResponse('Cannot delete exam that has marks or results', 400);
    }

    // Delete exam (schedules will be deleted due to cascade)
    await prisma.exam.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('[EXAMS_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete exam');
  }
}
