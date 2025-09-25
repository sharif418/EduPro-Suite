import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherAuth } from '../../../../lib/auth-helpers';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, studentIds, status, date, notes } = await request.json();

    if (!classId || !studentIds || !Array.isArray(studentIds) || !status || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get teacher's staff record
    const teacherStaff = await prisma.staff.findFirst({
      where: {
        userId: user.userId
      }
    });

    if (!teacherStaff) {
      return NextResponse.json({ error: 'Teacher staff record not found' }, { status: 404 });
    }

    // Verify teacher has access to this class by checking class level and section
    const [classLevel, section] = classId.split('-');
    const teacherClass = await prisma.teacherClassAssignment.findFirst({
      where: {
        teacherId: teacherStaff.id,
        classLevel: {
          id: classLevel
        },
        section: {
          id: section
        }
      }
    });

    if (!teacherClass) {
      return NextResponse.json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Validate attendance status
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid attendance status' }, { status: 400 });
    }

    // Parse date
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Get enrollments for the students in this class
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: { in: studentIds },
        classLevelId: classLevel,
        sectionId: section
      }
    });

    if (enrollments.length !== studentIds.length) {
      return NextResponse.json({ error: 'Some students are not enrolled in this class' }, { status: 400 });
    }

    // Create attendance records in bulk
    const attendanceRecords = enrollments.map(enrollment => ({
      enrollmentId: enrollment.id,
      date: attendanceDate,
      status: status as any,
      markedBy: teacherStaff.id,
      remarks: notes || ''
    }));

    // Use transaction to ensure all records are created or none
    const result = await prisma.$transaction(async (tx) => {
      // First, delete any existing attendance records for the same date and enrollments
      await tx.studentAttendance.deleteMany({
        where: {
          enrollmentId: { in: enrollments.map(e => e.id) },
          date: attendanceDate
        }
      });

      // Then create new attendance records
      const createdRecords = await tx.studentAttendance.createMany({
        data: attendanceRecords
      });

      return createdRecords;
    });

    // Send notifications to guardians for absent students
    if (status === 'ABSENT') {
      try {
        // Get student and guardian information
        const students = await prisma.student.findMany({
          where: {
            id: { in: studentIds }
          },
          include: {
            guardian: true
          }
        });

        // Send notifications (fire and forget)
        students.forEach(async (student) => {
          if (student.guardian?.contactNumber) {
            // This would integrate with your notification service
            // For now, we'll just log it
            console.log(`Sending absence notification to guardian ${student.guardian.name} for student ${student.name}`);
          }
        });
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't fail the main request if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully marked attendance for ${studentIds.length} students`,
      recordsCreated: result.count
    });

  } catch (error) {
    console.error('Error in bulk attendance marking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Get teacher's staff record
    const teacherStaff = await prisma.staff.findFirst({
      where: {
        userId: user.userId
      }
    });

    if (!teacherStaff) {
      return NextResponse.json({ error: 'Teacher staff record not found' }, { status: 404 });
    }

    // Parse class ID to get class level and section
    const [classLevel, section] = classId.split('-');

    // Verify teacher has access to this class
    const teacherClass = await prisma.teacherClassAssignment.findFirst({
      where: {
        teacherId: teacherStaff.id,
        classLevel: {
          id: classLevel
        },
        section: {
          id: section
        }
      }
    });

    if (!teacherClass) {
      return NextResponse.json({ error: 'Access denied to this class' }, { status: 403 });
    }

    const whereClause: any = {
      enrollment: {
        classLevelId: classLevel,
        sectionId: section
      }
    };

    if (date) {
      const attendanceDate = new Date(date);
      if (!isNaN(attendanceDate.getTime())) {
        whereClause.date = attendanceDate;
      }
    }

    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: whereClause,
      include: {
        enrollment: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                studentId: true
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { enrollment: { rollNumber: 'asc' } }
      ]
    });

    // Transform the data to match expected format
    const transformedRecords = attendanceRecords.map(record => ({
      id: record.id,
      date: record.date,
      status: record.status,
      markedAt: record.createdAt,
      notes: record.remarks,
      student: {
        id: record.enrollment.student.id,
        name: record.enrollment.student.name,
        rollNumber: record.enrollment.rollNumber,
        studentId: record.enrollment.student.studentId
      }
    }));

    return NextResponse.json({
      success: true,
      records: transformedRecords
    });

  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
