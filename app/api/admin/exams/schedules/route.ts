import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// GET - Fetch exam schedules with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const classLevelId = searchParams.get('classLevelId');
    const subjectId = searchParams.get('subjectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};
    
    if (examId) whereClause.examId = examId;
    if (classLevelId) whereClause.classLevelId = classLevelId;
    if (subjectId) whereClause.subjectId = subjectId;

    // Fetch exam schedules with pagination
    const [examSchedules, totalCount] = await Promise.all([
      prisma.examSchedule.findMany({
        where: whereClause,
        include: {
          exam: {
            include: {
              academicYear: true,
            },
          },
          classLevel: true,
          subject: true,
          marks: {
            include: {
              enrollment: {
                include: {
                  student: true,
                },
              },
            },
          },
        },
        orderBy: [
          { examDate: 'asc' },
          { startTime: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.examSchedule.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return createSuccessResponse({
      examSchedules,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('[EXAM_SCHEDULES_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch exam schedules');
  }
}

// POST - Create new exam schedule
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { examId, classLevelId, subjectId, examDate, startTime, endTime, fullMarks, passMarks } = body;

    // Validate required fields
    if (!examId || !classLevelId || !subjectId || !examDate || !startTime || !endTime || fullMarks === undefined || passMarks === undefined) {
      return createErrorResponse('Missing required fields', 400);
    }

    // Validate marks
    if (fullMarks <= 0 || passMarks < 0 || passMarks > fullMarks) {
      return createErrorResponse('Invalid marks: fullMarks must be positive and passMarks must be between 0 and fullMarks', 400);
    }

    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return createErrorResponse('Exam not found', 404);
    }

    // Check if class level exists
    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classLevelId },
    });

    if (!classLevel) {
      return createErrorResponse('Class level not found', 404);
    }

    // Check if subject exists and is assigned to the class
    const classSubject = await prisma.classSubject.findFirst({
      where: {
        classLevelId,
        subjectId,
      },
      include: {
        subject: true,
      },
    });

    if (!classSubject) {
      return createErrorResponse('Subject is not assigned to this class level', 400);
    }

    // Check for duplicate schedule
    const existingSchedule = await prisma.examSchedule.findFirst({
      where: {
        examId,
        classLevelId,
        subjectId,
      },
    });

    if (existingSchedule) {
      return createErrorResponse('Exam schedule already exists for this exam, class, and subject combination', 400);
    }

    // Validate time format (basic validation)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return createErrorResponse('Invalid time format. Use HH:MM format', 400);
    }

    // Check if start time is before end time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes >= endMinutes) {
      return createErrorResponse('Start time must be before end time', 400);
    }

    // Create exam schedule
    const examSchedule = await prisma.examSchedule.create({
      data: {
        examId,
        classLevelId,
        subjectId,
        examDate: new Date(examDate),
        startTime,
        endTime,
        fullMarks,
        passMarks,
      },
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

    return createSuccessResponse({ examSchedule }, 201);
  } catch (error: any) {
    console.error('[EXAM_SCHEDULES_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Exam schedule already exists for this combination', 400);
    }
    return createErrorResponse('Failed to create exam schedule');
  }
}

// PUT - Update exam schedule
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, examDate, startTime, endTime, fullMarks, passMarks } = body;

    if (!id) {
      return createErrorResponse('Exam schedule ID is required', 400);
    }

    // Check if exam schedule exists
    const existingSchedule = await prisma.examSchedule.findUnique({
      where: { id },
      include: {
        marks: true,
      },
    });

    if (!existingSchedule) {
      return createErrorResponse('Exam schedule not found', 404);
    }

    // If there are existing marks and fullMarks is being changed, validate
    if (existingSchedule.marks.length > 0 && fullMarks !== undefined && fullMarks !== existingSchedule.fullMarks) {
      const maxMarksObtained = Math.max(...existingSchedule.marks.map(mark => mark.marksObtained));
      if (fullMarks < maxMarksObtained) {
        return createErrorResponse(`Cannot reduce full marks below ${maxMarksObtained} as some students have higher marks`, 400);
      }
    }

    // Validate marks if provided
    if (fullMarks !== undefined && passMarks !== undefined) {
      if (fullMarks <= 0 || passMarks < 0 || passMarks > fullMarks) {
        return createErrorResponse('Invalid marks: fullMarks must be positive and passMarks must be between 0 and fullMarks', 400);
      }
    }

    // Validate time format if provided
    if (startTime || endTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const newStartTime = startTime || existingSchedule.startTime;
      const newEndTime = endTime || existingSchedule.endTime;

      if (!timeRegex.test(newStartTime) || !timeRegex.test(newEndTime)) {
        return createErrorResponse('Invalid time format. Use HH:MM format', 400);
      }

      // Check if start time is before end time
      const [startHour, startMin] = newStartTime.split(':').map(Number);
      const [endHour, endMin] = newEndTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes >= endMinutes) {
        return createErrorResponse('Start time must be before end time', 400);
      }
    }

    // Update exam schedule
    const updatedSchedule = await prisma.examSchedule.update({
      where: { id },
      data: {
        ...(examDate && { examDate: new Date(examDate) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(fullMarks !== undefined && { fullMarks }),
        ...(passMarks !== undefined && { passMarks }),
      },
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

    return createSuccessResponse({ examSchedule: updatedSchedule });
  } catch (error) {
    console.error('[EXAM_SCHEDULES_PUT_ERROR]', error);
    return createErrorResponse('Failed to update exam schedule');
  }
}

// DELETE - Delete exam schedule
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Exam schedule ID is required', 400);
    }

    // Check if exam schedule exists
    const existingSchedule = await prisma.examSchedule.findUnique({
      where: { id },
      include: {
        marks: true,
      },
    });

    if (!existingSchedule) {
      return createErrorResponse('Exam schedule not found', 404);
    }

    // Check if schedule has any marks
    if (existingSchedule.marks.length > 0) {
      return createErrorResponse('Cannot delete exam schedule that has marks entered', 400);
    }

    // Delete exam schedule
    await prisma.examSchedule.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Exam schedule deleted successfully' });
  } catch (error) {
    console.error('[EXAM_SCHEDULES_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete exam schedule');
  }
}
