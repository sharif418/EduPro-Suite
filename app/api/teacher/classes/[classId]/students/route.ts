import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAuth } from '../../../../../lib/auth-helpers';


export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teacher role required.' }, { status: 403 });
    }

    const { classId } = params;
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
      return NextResponse.json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Get students in the class
    const students = await prisma.enrollment.findMany({
      where: {
        classLevelId,
        sectionId,
        academicYear: {
          isCurrent: true
        }
      },
      include: {
        student: {
          include: {
            guardian: true
          }
        },
        studentAttendances: {
          orderBy: {
            date: 'desc'
          },
          take: 10 // Last 10 attendance records
        }
      },
      orderBy: {
        rollNumber: 'asc'
      }
    });

    // Calculate attendance percentage for each student
    const studentsWithStats = students.map(enrollment => {
      const totalDays = enrollment.studentAttendances.length;
      const presentDays = enrollment.studentAttendances.filter(
        att => att.status === 'PRESENT'
      ).length;
      
      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        id: enrollment.student.id,
        studentId: enrollment.student.studentId,
        name: enrollment.student.name,
        rollNumber: enrollment.rollNumber,
        email: enrollment.student.email,
        photoUrl: enrollment.student.studentPhotoUrl,
        guardian: {
          name: enrollment.student.guardian.name,
          contactNumber: enrollment.student.guardian.contactNumber,
          relation: enrollment.student.guardian.relationToStudent
        },
        attendancePercentage: Math.round(attendancePercentage),
        lastAttendance: enrollment.studentAttendances[0] || null
      };
    });

    return NextResponse.json({
      success: true,
      students: studentsWithStats
    });

  } catch (error) {
    console.error('Error fetching class students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
