import { NextRequest } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and role
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'STUDENT') {
      return Response.json({ error: 'Forbidden - Student access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.userId;

    // Ensure student can only access their own data
    if (user.role === 'STUDENT' && userId !== user.userId) {
      return Response.json({ error: 'Forbidden - Can only access own data' }, { status: 403 });
    }

    // Find student record
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: user.email }
        ]
      },
      include: {
        guardian: true,
        address: true,
        enrollments: {
          include: {
            classLevel: true,
            section: true,
            academicYear: true
          }
        }
      }
    });

    if (!student) {
      return Response.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Get current enrollment
    const currentEnrollment = student.enrollments.find(e => e.academicYear.isCurrent) || student.enrollments[0];

    // Fetch student-specific dashboard stats
    const [
      assignments,
      attendanceRecords,
      marks,
      upcomingExams,
      notifications
    ] = await Promise.all([
      // Assignments for current class
      currentEnrollment ? prisma.assignment.findMany({
        where: {
          classLevelId: currentEnrollment.classLevelId,
          sectionId: currentEnrollment.sectionId
        },
        include: {
          submissions: {
            where: { enrollmentId: currentEnrollment.id }
          },
          subject: true
        },
        orderBy: { dueDate: 'asc' },
        take: 20
      }) : [],

      // Attendance records
      currentEnrollment ? prisma.studentAttendance.findMany({
        where: { enrollmentId: currentEnrollment.id },
        orderBy: { date: 'desc' },
        take: 30
      }) : [],

      // Marks/grades
      currentEnrollment ? prisma.marks.findMany({
        where: { enrollmentId: currentEnrollment.id },
        include: {
          examSchedule: {
            include: {
              exam: true,
              subject: true
            }
          },
          grade: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      }) : [],

      // Upcoming exams
      currentEnrollment ? prisma.examSchedule.findMany({
        where: {
          classLevelId: currentEnrollment.classLevelId,
          examDate: {
            gte: new Date()
          }
        },
        include: {
          exam: true,
          subject: true
        },
        orderBy: { examDate: 'asc' },
        take: 10
      }) : [],

      // Notifications
      prisma.notification.findMany({
        where: {
          userId: user.userId,
          status: {
            not: 'READ'
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    // Calculate stats
    const totalClasses = currentEnrollment ? 1 : 0;
    
    const pendingAssignments = assignments.filter((assignment: any) => {
      const submission = assignment.submissions.find((s: any) => s.enrollmentId === currentEnrollment?.id);
      return !submission && new Date(assignment.dueDate) > new Date();
    }).length;

    const submittedAssignments = assignments.filter((assignment: any) => {
      const submission = assignment.submissions.find((s: any) => s.enrollmentId === currentEnrollment?.id);
      return submission;
    }).length;

    const overDueAssignments = assignments.filter((assignment: any) => {
      const submission = assignment.submissions.find((s: any) => s.enrollmentId === currentEnrollment?.id);
      return !submission && new Date(assignment.dueDate) < new Date();
    }).length;

    // Calculate attendance rate
    const totalAttendanceRecords = attendanceRecords.length;
    const presentRecords = attendanceRecords.filter((record: any) => record.status === 'PRESENT').length;
    const attendanceRate = totalAttendanceRecords > 0 ? Math.round((presentRecords / totalAttendanceRecords) * 100) : 0;

    // Calculate average grade
    const gradeValues = marks.map((mark: any) => parseFloat(mark.marksObtained.toString())).filter((score: number) => !isNaN(score));
    const averageGrade = gradeValues.length > 0 ? Math.round(gradeValues.reduce((sum: number, grade: number) => sum + grade, 0) / gradeValues.length) : 0;

    const upcomingExamsCount = upcomingExams.length;
    const unreadNotifications = notifications.length;

    // Format recent activities (simplified)
    const formattedActivities = marks.slice(0, 5).map((mark: any) => ({
      id: mark.id,
      type: 'grade' as const,
      title: `Grade received for ${mark.examSchedule.subject.name}`,
      description: `Scored ${mark.marksObtained}/${mark.examSchedule.fullMarks}`,
      timestamp: mark.createdAt,
      metadata: {
        subject: mark.examSchedule.subject.name,
        marks: mark.marksObtained,
        fullMarks: mark.examSchedule.fullMarks
      }
    }));

    // Get fee status (simplified - using Invoice model)
    const feeStatus = await prisma.invoice.findFirst({
      where: { 
        studentId: student.id
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate assignment completion rate
    const totalAssignments = assignments.length;
    const completedAssignments = submittedAssignments;
    const assignmentCompletion = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

    // Calculate graded assignments
    const gradedAssignments = assignments.filter((assignment: any) => {
      const submission = assignment.submissions.find((s: any) => s.enrollmentId === currentEnrollment?.id);
      return submission && submission.marksObtained !== null;
    }).length;

    // Format assignments for the dashboard
    const formattedAssignments = assignments.slice(0, 10).map((assignment: any) => {
      const submission = assignment.submissions.find((s: any) => s.enrollmentId === currentEnrollment?.id);
      return {
        id: assignment.id,
        title: assignment.title,
        subject: {
          name: assignment.subject.name
        },
        dueDate: assignment.dueDate,
        submission: submission ? {
          status: submission.marksObtained !== null ? 'GRADED' : 'SUBMITTED',
          marksObtained: submission.marksObtained
        } : null,
        maxMarks: assignment.maxMarks,
        isOverdue: !submission && new Date(assignment.dueDate) < new Date(),
        daysUntilDue: Math.ceil((new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      };
    });

    const stats = {
      success: true,
      pendingAssignments,
      submittedAssignments,
      gradedAssignments,
      averageGrade,
      attendanceRate,
      assignmentCompletion,
      assignments: formattedAssignments,
      recentActivities: formattedActivities,
      lastUpdated: new Date().toISOString()
    };

    return Response.json(stats);

  } catch (error) {
    console.error('[STUDENT_DASHBOARD_STATS_ERROR]', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard stats',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}
