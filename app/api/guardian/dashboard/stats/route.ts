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

    if (user.role !== 'GUARDIAN') {
      return Response.json({ error: 'Forbidden - Guardian access required' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.userId;

    // Ensure guardian can only access their own data
    if (user.role === 'GUARDIAN' && userId !== user.userId) {
      return Response.json({ error: 'Forbidden - Can only access own data' }, { status: 403 });
    }

    // Find guardian record and their students
    const guardian = await prisma.guardian.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: user.email }
        ]
      },
      include: {
        students: {
          include: {
            enrollments: {
              include: {
                classLevel: true,
                section: true,
                academicYear: true
              }
            }
          }
        }
      }
    });

    if (!guardian) {
      return Response.json({ error: 'Guardian record not found' }, { status: 404 });
    }

    const students = guardian.students;
    const totalStudents = students.length;

    if (totalStudents === 0) {
      return Response.json({
        success: true,
        totalStudents: 0,
        studentsOverview: [],
        upcomingEvents: [],
        notifications: 0,
        recentActivities: [],
        feesSummary: {
          totalDue: 0,
          totalPaid: 0,
          overdue: 0
        }
      });
    }

    // Get current enrollments for all students
    const currentEnrollments = students.flatMap(student => 
      student.enrollments.filter(e => e.academicYear.isCurrent)
    );

    // Fetch aggregated data for all students
    const [
      allAttendanceRecords,
      allMarks,
      upcomingExams,
      allAssignments,
      notifications,
      allInvoices
    ] = await Promise.all([
      // Attendance records for all students
      prisma.studentAttendance.findMany({
        where: {
          enrollmentId: {
            in: currentEnrollments.map(e => e.id)
          }
        },
        include: {
          enrollment: {
            include: {
              student: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 100
      }),

      // Marks for all students
      prisma.marks.findMany({
        where: {
          enrollmentId: {
            in: currentEnrollments.map(e => e.id)
          }
        },
        include: {
          enrollment: {
            include: {
              student: true
            }
          },
          examSchedule: {
            include: {
              exam: true,
              subject: true
            }
          },
          grade: true
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),

      // Upcoming exams for all students' classes
      prisma.examSchedule.findMany({
        where: {
          classLevelId: {
            in: currentEnrollments.map(e => e.classLevelId)
          },
          examDate: {
            gte: new Date()
          }
        },
        include: {
          exam: true,
          subject: true,
          classLevel: true
        },
        orderBy: { examDate: 'asc' },
        take: 20
      }),

      // Assignments for all students' classes
      prisma.assignment.findMany({
        where: {
          OR: currentEnrollments.map(e => ({
            classLevelId: e.classLevelId,
            sectionId: e.sectionId
          }))
        },
        include: {
          submissions: {
            where: {
              enrollmentId: {
                in: currentEnrollments.map(e => e.id)
              }
            }
          },
          subject: true,
          classLevel: true,
          section: true
        },
        orderBy: { dueDate: 'asc' },
        take: 30
      }),

      // Notifications for guardian
      prisma.notification.findMany({
        where: {
          userId: user.userId,
          status: {
            not: 'READ'
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Fee invoices for all students
      prisma.invoice.findMany({
        where: {
          studentId: {
            in: students.map(s => s.id)
          }
        },
        include: {
          student: true,
          payments: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Calculate stats for each student
    const studentsOverview = students.map(student => {
      const enrollment = student.enrollments.find(e => e.academicYear.isCurrent);
      
      // Student's attendance
      const studentAttendance = allAttendanceRecords.filter(
        record => record.enrollment.student.id === student.id
      );
      const totalAttendance = studentAttendance.length;
      const presentCount = studentAttendance.filter(record => record.status === 'PRESENT').length;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

      // Student's grades
      const studentMarks = allMarks.filter(
        mark => mark.enrollment.student.id === student.id
      );
      const gradeValues = studentMarks.map(mark => parseFloat(mark.marksObtained.toString())).filter(score => !isNaN(score));
      const averageGrade = gradeValues.length > 0 ? Math.round(gradeValues.reduce((sum, grade) => sum + grade, 0) / gradeValues.length) : 0;

      // Student's assignments
      const studentAssignments = allAssignments.filter(assignment => 
        assignment.classLevelId === enrollment?.classLevelId && 
        assignment.sectionId === enrollment?.sectionId
      );
      const pendingAssignments = studentAssignments.filter(assignment => {
        const submission = assignment.submissions.find(s => s.enrollmentId === enrollment?.id);
        return !submission && new Date(assignment.dueDate) > new Date();
      }).length;

      return {
        studentId: student.id,
        name: student.name,
        studentIdNumber: student.studentId,
        class: enrollment?.classLevel?.name,
        section: enrollment?.section?.name,
        rollNumber: enrollment?.rollNumber,
        attendanceRate,
        averageGrade,
        pendingAssignments,
        recentGrades: studentMarks.slice(0, 3).map(mark => ({
          subject: mark.examSchedule.subject.name,
          marks: mark.marksObtained,
          fullMarks: mark.examSchedule.fullMarks,
          exam: mark.examSchedule.exam.name,
          date: mark.createdAt
        }))
      };
    });

    // Calculate fees summary
    const feesSummary = allInvoices.reduce((summary, invoice) => {
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + parseFloat(payment.amountPaid.toString()), 0);
      const totalAmount = parseFloat(invoice.totalAmount.toString());
      const due = totalAmount - totalPaid;
      
      summary.totalDue += due;
      summary.totalPaid += totalPaid;
      
      if (due > 0 && new Date(invoice.dueDate) < new Date()) {
        summary.overdue += due;
      }
      
      return summary;
    }, { totalDue: 0, totalPaid: 0, overdue: 0 });

    // Format recent activities
    const recentActivities = allMarks.slice(0, 10).map(mark => ({
      id: mark.id,
      type: 'grade' as const,
      title: `${mark.enrollment.student.name} received grade`,
      description: `${mark.examSchedule.subject.name}: ${mark.marksObtained}/${mark.examSchedule.fullMarks}`,
      timestamp: mark.createdAt,
      studentName: mark.enrollment.student.name,
      metadata: {
        studentId: mark.enrollment.student.id,
        subject: mark.examSchedule.subject.name,
        marks: mark.marksObtained,
        fullMarks: mark.examSchedule.fullMarks
      }
    }));

    // Format upcoming events
    const upcomingEvents = upcomingExams.slice(0, 10).map(exam => ({
      id: exam.id,
      type: 'exam' as const,
      title: `${exam.exam.name} - ${exam.subject.name}`,
      description: `${exam.classLevel.name} exam`,
      date: exam.examDate,
      time: `${exam.startTime} - ${exam.endTime}`,
      class: exam.classLevel.name,
      subject: exam.subject.name
    }));

    // Calculate overall attendance rate across all children
    const totalAttendanceRecords = allAttendanceRecords.length;
    const totalPresentRecords = allAttendanceRecords.filter(record => record.status === 'PRESENT').length;
    const overallAttendanceRate = totalAttendanceRecords > 0 ? Math.round((totalPresentRecords / totalAttendanceRecords) * 100) : 0;

    // Create attendance alerts for low attendance
    const attendanceAlerts = studentsOverview
      .filter(student => student.attendanceRate < 80)
      .map(student => ({
        id: `alert-${student.studentId}`,
        studentName: student.name,
        type: 'attendance',
        message: `${student.name} has low attendance: ${student.attendanceRate}%`,
        severity: student.attendanceRate < 60 ? 'high' : 'medium',
        date: new Date().toISOString()
      }));

    // Create communications (mock data for now)
    const communications = [
      {
        id: 'comm-1',
        teacherName: 'Ms. Sarah Ahmed',
        subject: 'Parent-Teacher Meeting',
        message: 'Please schedule a meeting to discuss your child\'s progress',
        type: 'meeting',
        priority: 'medium',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: false
      }
    ];

    // Create fee status for each child
    const feeStatus = studentsOverview.map(student => {
      const studentInvoices = allInvoices.filter(invoice => invoice.student.id === student.studentId);
      const totalDue = studentInvoices.reduce((sum, invoice) => {
        const paid = invoice.payments.reduce((paidSum, payment) => paidSum + parseFloat(payment.amountPaid.toString()), 0);
        return sum + (parseFloat(invoice.totalAmount.toString()) - paid);
      }, 0);
      
      const overdueDays = studentInvoices.some(invoice => new Date(invoice.dueDate) < new Date()) ? 
        Math.ceil((new Date().getTime() - new Date(Math.min(...studentInvoices.map(i => new Date(i.dueDate).getTime()))).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        studentId: student.studentId,
        studentName: student.name,
        totalDue: Math.round(totalDue),
        overdueDays,
        invoices: studentInvoices,
        paymentHistory: studentInvoices.flatMap(invoice => invoice.payments)
      };
    });

    const stats = {
      success: true,
      totalChildren: totalStudents,
      attendanceRate: overallAttendanceRate,
      pendingFees: Math.round(feesSummary.totalDue),
      upcomingExams: upcomingEvents.length,
      childrenProgress: studentsOverview,
      attendanceAlerts,
      communications,
      feeStatus,
      unreadMessages: communications.filter(comm => !comm.isRead).length,
      recentActivities,
      lastUpdated: new Date().toISOString()
    };

    return Response.json(stats);

  } catch (error) {
    console.error('[GUARDIAN_DASHBOARD_STATS_ERROR]', error);
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
