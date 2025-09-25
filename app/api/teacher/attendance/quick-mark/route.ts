import { NextRequest } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and role
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER') {
      return Response.json({ error: 'Forbidden - Teacher access required' }, { status: 403 });
    }

    const body = await request.json();
    const { classId, date, method, attendanceData } = body;

    // Validate required fields
    if (!classId || !date) {
      return Response.json({ error: 'Class ID and date are required' }, { status: 400 });
    }

    // Find teacher's staff record
    const teacher = await prisma.staff.findFirst({
      where: {
        user: {
          email: user.email
        }
      }
    });

    if (!teacher) {
      return Response.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    // Parse the date
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return Response.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // For quick-mark method, we'll mark all students as present by default
    if (method === 'quick-mark') {
      // Find all enrollments for the specified class (simplified approach)
      // In a real implementation, you'd need to properly identify the class/section
      const enrollments = await prisma.enrollment.findMany({
        where: {
          academicYear: {
            isCurrent: true
          }
        },
        include: {
          student: true
        },
        take: 30 // Limit for quick demo
      });

      const attendanceRecords = [];
      let studentsCount = 0;

      for (const enrollment of enrollments) {
        // Check if attendance already exists for this date
        const existingAttendance = await prisma.studentAttendance.findUnique({
          where: {
            enrollmentId_date: {
              enrollmentId: enrollment.id,
              date: attendanceDate
            }
          }
        });

        if (!existingAttendance) {
          // Create new attendance record
          const attendance = await prisma.studentAttendance.create({
            data: {
              enrollmentId: enrollment.id,
              date: attendanceDate,
              status: 'PRESENT', // Quick mark as present
              markedBy: teacher.id,
              remarks: 'Quick marked by teacher'
            }
          });
          
          attendanceRecords.push(attendance);
          studentsCount++;
        }
      }

      return Response.json({
        success: true,
        message: 'Attendance marked successfully',
        studentsCount,
        date: attendanceDate.toISOString().split('T')[0],
        method: 'quick-mark',
        markedBy: teacher.name
      });
    }

    // For detailed attendance marking
    if (method === 'detailed' && attendanceData) {
      const attendanceRecords = [];
      let studentsCount = 0;

      for (const record of attendanceData) {
        const { enrollmentId, status, remarks } = record;

        if (!enrollmentId || !status) {
          continue; // Skip invalid records
        }

        // Validate status
        const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'];
        if (!validStatuses.includes(status)) {
          continue; // Skip invalid status
        }

        // Check if attendance already exists
        const existingAttendance = await prisma.studentAttendance.findUnique({
          where: {
            enrollmentId_date: {
              enrollmentId,
              date: attendanceDate
            }
          }
        });

        if (existingAttendance) {
          // Update existing record
          const updated = await prisma.studentAttendance.update({
            where: {
              enrollmentId_date: {
                enrollmentId,
                date: attendanceDate
              }
            },
            data: {
              status,
              remarks: remarks || null,
              markedBy: teacher.id
            }
          });
          attendanceRecords.push(updated);
        } else {
          // Create new record
          const created = await prisma.studentAttendance.create({
            data: {
              enrollmentId,
              date: attendanceDate,
              status,
              remarks: remarks || null,
              markedBy: teacher.id
            }
          });
          attendanceRecords.push(created);
        }
        
        studentsCount++;
      }

      return Response.json({
        success: true,
        message: 'Detailed attendance marked successfully',
        studentsCount,
        date: attendanceDate.toISOString().split('T')[0],
        method: 'detailed',
        markedBy: teacher.name
      });
    }

    return Response.json({ error: 'Invalid method or missing data' }, { status: 400 });

  } catch (error) {
    console.error('[TEACHER_QUICK_ATTENDANCE_ERROR]', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to mark attendance',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve attendance data for a specific date/class
export async function GET(request: NextRequest) {
  try {
    // Verify authentication and role
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER') {
      return Response.json({ error: 'Forbidden - Teacher access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');

    if (!date) {
      return Response.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return Response.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Find teacher's staff record
    const teacher = await prisma.staff.findFirst({
      where: {
        user: {
          email: user.email
        }
      }
    });

    if (!teacher) {
      return Response.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    // Get attendance records for the date
    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: {
        date: attendanceDate,
        markedByStaff: {
          id: teacher.id
        }
      },
      include: {
        enrollment: {
          include: {
            student: true,
            classLevel: true,
            section: true
          }
        }
      }
    });

    const formattedRecords = attendanceRecords.map(record => ({
      id: record.id,
      enrollmentId: record.enrollmentId,
      student: {
        id: record.enrollment.student.id,
        name: record.enrollment.student.name,
        studentId: record.enrollment.student.studentId,
        rollNumber: record.enrollment.rollNumber
      },
      class: {
        name: record.enrollment.classLevel.name,
        section: record.enrollment.section.name
      },
      status: record.status,
      remarks: record.remarks,
      markedAt: record.createdAt
    }));

    return Response.json({
      success: true,
      date: attendanceDate.toISOString().split('T')[0],
      totalRecords: formattedRecords.length,
      records: formattedRecords,
      summary: {
        present: formattedRecords.filter(r => r.status === 'PRESENT').length,
        absent: formattedRecords.filter(r => r.status === 'ABSENT').length,
        late: formattedRecords.filter(r => r.status === 'LATE').length,
        onLeave: formattedRecords.filter(r => r.status === 'ON_LEAVE').length
      }
    });

  } catch (error) {
    console.error('[TEACHER_GET_ATTENDANCE_ERROR]', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to retrieve attendance data',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}
