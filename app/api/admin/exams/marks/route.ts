import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// Helper function to calculate grade based on percentage and grading system
async function calculateGrade(percentage: number, gradingSystemId: string) {
  const grade = await prisma.grade.findFirst({
    where: {
      gradingSystemId,
      minPercentage: { lte: percentage },
      maxPercentage: { gte: percentage },
    },
  });
  return grade;
}

// GET - Fetch marks with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const examScheduleId = searchParams.get('examScheduleId');
    const enrollmentId = searchParams.get('enrollmentId');
    const examId = searchParams.get('examId');
    const classLevelId = searchParams.get('classLevelId');
    const sectionId = searchParams.get('sectionId');

    // Build where clause
    const whereClause: any = {};
    
    if (examScheduleId) whereClause.examScheduleId = examScheduleId;
    if (enrollmentId) whereClause.enrollmentId = enrollmentId;

    // If filtering by exam, class, or section, we need to join through examSchedule and enrollment
    if (examId || classLevelId || sectionId) {
      const examScheduleWhere: any = {};
      const enrollmentWhere: any = {};

      if (examId) examScheduleWhere.examId = examId;
      if (classLevelId) enrollmentWhere.classLevelId = classLevelId;
      if (sectionId) enrollmentWhere.sectionId = sectionId;

      whereClause.examSchedule = examScheduleWhere;
      whereClause.enrollment = enrollmentWhere;
    }

    const marks = await prisma.marks.findMany({
      where: whereClause,
      include: {
        enrollment: {
          include: {
            student: true,
            classLevel: true,
            section: true,
            academicYear: true,
          },
        },
        examSchedule: {
          include: {
            exam: true,
            subject: true,
            classLevel: true,
          },
        },
        grade: true,
      },
      orderBy: [
        { enrollment: { rollNumber: 'asc' } },
        { examSchedule: { subject: { name: 'asc' } } },
      ],
    });

    return createSuccessResponse({ marks });
  } catch (error) {
    console.error('[MARKS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch marks');
  }
}

// POST - Bulk marks entry
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { examScheduleId, marks: marksData, gradingSystemId } = body;

    // Validate required fields
    if (!examScheduleId || !marksData || !Array.isArray(marksData) || marksData.length === 0) {
      return createErrorResponse('Missing required fields: examScheduleId and marks array', 400);
    }

    // Check if exam schedule exists
    const examSchedule = await prisma.examSchedule.findUnique({
      where: { id: examScheduleId },
      include: {
        exam: {
          include: {
            academicYear: true,
          },
        },
        classLevel: true,
        subject: true,
      },
    });

    if (!examSchedule) {
      return createErrorResponse('Exam schedule not found', 404);
    }

    // Get default grading system if not provided
    let gradingSystem;
    if (gradingSystemId) {
      gradingSystem = await prisma.gradingSystem.findUnique({
        where: { id: gradingSystemId },
        include: { grades: true },
      });
    } else {
      gradingSystem = await prisma.gradingSystem.findFirst({
        where: { isDefault: true },
        include: { grades: true },
      });
    }

    if (!gradingSystem) {
      return createErrorResponse('No grading system found. Please create a default grading system first.', 400);
    }

    // Validate marks data
    for (const markData of marksData) {
      if (!markData.enrollmentId || markData.marksObtained === undefined) {
        return createErrorResponse('Each mark entry must have enrollmentId and marksObtained', 400);
      }

      if (markData.marksObtained < 0 || markData.marksObtained > examSchedule.fullMarks) {
        return createErrorResponse(`Marks must be between 0 and ${examSchedule.fullMarks}`, 400);
      }

      // Verify enrollment exists and is for the correct class
      const enrollment = await prisma.enrollment.findUnique({
        where: { id: markData.enrollmentId },
      });

      if (!enrollment) {
        return createErrorResponse(`Enrollment ${markData.enrollmentId} not found`, 404);
      }

      if (enrollment.classLevelId !== examSchedule.classLevelId) {
        return createErrorResponse(`Enrollment ${markData.enrollmentId} is not for the correct class level`, 400);
      }
    }

    // Process marks in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const processedMarks = [];

      for (const markData of marksData) {
        const { enrollmentId, marksObtained, remarks } = markData;

        // Calculate percentage and grade
        const percentage = (marksObtained / examSchedule.fullMarks) * 100;
        const grade = await calculateGrade(percentage, gradingSystem.id);

        // Upsert marks (update if exists, create if not)
        const mark = await tx.marks.upsert({
          where: {
            enrollmentId_examScheduleId: {
              enrollmentId,
              examScheduleId,
            },
          },
          update: {
            marksObtained,
            gradeId: grade?.id || null,
            remarks: remarks || null,
          },
          create: {
            enrollmentId,
            examScheduleId,
            marksObtained,
            gradeId: grade?.id || null,
            remarks: remarks || null,
          },
          include: {
            enrollment: {
              include: {
                student: true,
              },
            },
            grade: true,
          },
        });

        processedMarks.push(mark);
      }

      return processedMarks;
    });

    return createSuccessResponse({ 
      message: `Successfully processed ${result.length} marks`,
      marks: result 
    }, 201);
  } catch (error: any) {
    console.error('[MARKS_POST_ERROR]', error);
    return createErrorResponse('Failed to process marks');
  }
}

// PUT - Update individual mark
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, marksObtained, remarks, gradingSystemId } = body;

    if (!id) {
      return createErrorResponse('Mark ID is required', 400);
    }

    // Check if mark exists
    const existingMark = await prisma.marks.findUnique({
      where: { id },
      include: {
        examSchedule: true,
      },
    });

    if (!existingMark) {
      return createErrorResponse('Mark not found', 404);
    }

    // Validate marks if provided
    if (marksObtained !== undefined) {
      if (marksObtained < 0 || marksObtained > existingMark.examSchedule.fullMarks) {
        return createErrorResponse(`Marks must be between 0 and ${existingMark.examSchedule.fullMarks}`, 400);
      }
    }

    // Get grading system
    let gradingSystem;
    if (gradingSystemId) {
      gradingSystem = await prisma.gradingSystem.findUnique({
        where: { id: gradingSystemId },
      });
    } else {
      gradingSystem = await prisma.gradingSystem.findFirst({
        where: { isDefault: true },
      });
    }

    if (!gradingSystem) {
      return createErrorResponse('No grading system found', 400);
    }

    // Calculate new grade if marks changed
    let newGradeId = existingMark.gradeId;
    if (marksObtained !== undefined && marksObtained !== existingMark.marksObtained) {
      const percentage = (marksObtained / existingMark.examSchedule.fullMarks) * 100;
      const grade = await calculateGrade(percentage, gradingSystem.id);
      newGradeId = grade?.id || null;
    }

    // Update mark
    const updatedMark = await prisma.marks.update({
      where: { id },
      data: {
        ...(marksObtained !== undefined && { marksObtained }),
        ...(remarks !== undefined && { remarks }),
        gradeId: newGradeId,
      },
      include: {
        enrollment: {
          include: {
            student: true,
          },
        },
        examSchedule: {
          include: {
            exam: true,
            subject: true,
          },
        },
        grade: true,
      },
    });

    return createSuccessResponse({ mark: updatedMark });
  } catch (error) {
    console.error('[MARKS_PUT_ERROR]', error);
    return createErrorResponse('Failed to update mark');
  }
}

// DELETE - Delete mark
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Mark ID is required', 400);
    }

    // Check if mark exists
    const existingMark = await prisma.marks.findUnique({
      where: { id },
    });

    if (!existingMark) {
      return createErrorResponse('Mark not found', 404);
    }

    // Delete mark
    await prisma.marks.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Mark deleted successfully' });
  } catch (error) {
    console.error('[MARKS_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete mark');
  }
}
