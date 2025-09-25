import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyTeacherAuth, createErrorResponse, createSuccessResponse } from '../../../lib/auth-helpers';


// GET attendance records
export async function GET(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');

    if (!classId || !date) {
      return createErrorResponse('classId and date are required', 400);
    }

    const [classLevelId, sectionId] = classId.split('-');

    // Verify teacher has access to this class
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId },
      include: {
        teacherClassAssignments: {
          where: {
            classLevelId,
            sectionId
          }
        }
      }
    });

    if (!staff || staff.teacherClassAssignments.length === 0) {
      return createErrorResponse('Access denied to this class', 403);
    }

    // Get attendance records for the date
    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: {
        date: new Date(date),
        enrollment: {
          classLevelId,
          sectionId,
          academicYear: {
            isCurrent: true
          }
        }
      },
      include: {
        enrollment: {
          include: {
            student: true
          }
        }
      }
    });

    return createSuccessResponse({ attendance: attendanceRecords });

  } catch (error) {
    console.error('[TEACHER_ATTENDANCE_GET_ERROR]', error);
    return createErrorResponse('Internal server error while fetching attendance', 500);
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Mark attendance
export async function POST(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const body = await request.json();
    const { classId, date, attendanceData } = body;

    if (!classId || !date || !attendanceData) {
      return createErrorResponse('Missing required fields', 400);
    }

    const [classLevelId, sectionId] = classId.split('-');

    // Get teacher's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId },
      include: {
        teacherClassAssignments: {
          where: {
            classLevelId,
            sectionId
          }
        }
      }
    });

    if (!staff || staff.teacherClassAssignments.length === 0) {
      return createErrorResponse('Access denied to this class', 403);
    }

    // Process attendance data
    const attendancePromises = attendanceData.map(async (record: any) => {
      return prisma.studentAttendance.upsert({
        where: {
          enrollmentId_date: {
            enrollmentId: record.enrollmentId,
            date: new Date(date)
          }
        },
        update: {
          status: record.status,
          remarks: record.remarks,
          markedBy: staff.id
        },
        create: {
          enrollmentId: record.enrollmentId,
          date: new Date(date),
          status: record.status,
          remarks: record.remarks,
          markedBy: staff.id
        }
      });
    });

    await Promise.all(attendancePromises);

    return createSuccessResponse({ message: 'Attendance marked successfully' });

  } catch (error) {
    console.error('[TEACHER_ATTENDANCE_POST_ERROR]', error);
    return createErrorResponse('Internal server error while marking attendance', 500);
  } finally {
    await prisma.$disconnect();
  }
}
