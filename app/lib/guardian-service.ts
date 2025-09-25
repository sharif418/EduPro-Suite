import { prisma } from './prisma';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export interface ChildProgress {
  studentId: string;
  studentName: string;
  className: string;
  section: string;
  overallGrade: number;
  attendanceRate: number;
  recentMarks: {
    subject: string;
    marks: number;
    fullMarks: number;
    examName: string;
    date: Date;
  }[];
  upcomingExams: {
    examName: string;
    subject: string;
    date: Date;
    startTime: string;
    endTime: string;
  }[];
}

export interface AttendanceAlert {
  studentId: string;
  studentName: string;
  alertType: 'low_attendance' | 'consecutive_absent' | 'late_pattern';
  message: string;
  severity: 'low' | 'medium' | 'high';
  date: Date;
}

export interface FeeStatus {
  studentId: string;
  studentName: string;
  totalDue: number;
  overdueDays: number;
  invoices: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    dueDate: Date;
    status: string;
    feeHeads: string[];
  }[];
  paymentHistory: {
    paymentId: string;
    amount: number;
    paymentDate: Date;
    method: string;
    transactionId?: string;
  }[];
}

export interface TeacherCommunication {
  id: string;
  teacherName: string;
  subject: string;
  message: string;
  type: 'announcement' | 'feedback' | 'concern' | 'meeting_request';
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  isRead: boolean;
  studentId?: string;
}

export interface GuardianStats {
  totalChildren: number;
  totalDueAmount: number;
  averageAttendance: number;
  upcomingExams: number;
  unreadMessages: number;
  pendingMeetings: number;
}

export class GuardianService {
  
  /**
   * Get guardian statistics overview
   */
  static async getGuardianStats(guardianId: string): Promise<GuardianStats> {
    try {
      // Get all children for this guardian
      const children = await prisma.student.findMany({
        where: { guardianId },
        include: {
          invoices: {
            where: { status: { in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } }
          },
          enrollments: {
            include: {
              studentAttendances: {
                where: {
                  date: {
                    gte: startOfMonth(new Date()),
                    lte: endOfMonth(new Date())
                  }
                }
              }
            }
          }
        }
      });

      const totalChildren = children.length;

      // Calculate total due amount
      const totalDueAmount = children.reduce((total, child) => {
        return total + child.invoices.reduce((sum, invoice) => {
          return sum + parseFloat(invoice.totalAmount.toString());
        }, 0);
      }, 0);

      // Calculate average attendance
      let totalAttendanceRecords = 0;
      let totalPresentRecords = 0;

      children.forEach(child => {
        child.enrollments.forEach(enrollment => {
          totalAttendanceRecords += enrollment.studentAttendances.length;
          totalPresentRecords += enrollment.studentAttendances.filter(
            attendance => attendance.status === 'PRESENT'
          ).length;
        });
      });

      const averageAttendance = totalAttendanceRecords > 0 
        ? Math.round((totalPresentRecords / totalAttendanceRecords) * 100) 
        : 0;

      // Get upcoming exams count
      const upcomingExams = await prisma.examSchedule.count({
        where: {
          examDate: { gte: new Date() },
          classLevelId: {
            in: children.flatMap(child => 
              child.enrollments.map(enrollment => enrollment.classLevelId)
            )
          }
        }
      });

      // Mock data for unread messages and pending meetings
      const unreadMessages = 0; // Would be calculated from a messages system
      const pendingMeetings = 0; // Would be calculated from a meetings system

      return {
        totalChildren,
        totalDueAmount,
        averageAttendance,
        upcomingExams,
        unreadMessages,
        pendingMeetings
      };

    } catch (error) {
      console.error('Error fetching guardian stats:', error);
      throw new Error('Failed to fetch guardian statistics');
    }
  }

  /**
   * Get progress data for all children
   */
  static async getChildrenProgress(guardianId: string): Promise<ChildProgress[]> {
    try {
      const children = await prisma.student.findMany({
        where: { guardianId },
        include: {
          enrollments: {
            include: {
              classLevel: true,
              section: true,
              marks: {
                include: {
                  examSchedule: {
                    include: {
                      exam: true,
                      subject: true
                    }
                  }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
              },
              studentAttendances: {
                where: {
                  date: {
                    gte: startOfMonth(new Date()),
                    lte: endOfMonth(new Date())
                  }
                }
              }
            }
          }
        }
      });

      const progressData: ChildProgress[] = [];

      for (const child of children) {
        const currentEnrollment = child.enrollments[0]; // Assuming current academic year
        
        if (!currentEnrollment) continue;

        // Calculate overall grade from recent marks
        const recentMarks = currentEnrollment.marks.map(mark => ({
          subject: mark.examSchedule.subject.name,
          marks: mark.marksObtained,
          fullMarks: mark.examSchedule.fullMarks,
          examName: mark.examSchedule.exam.name,
          date: mark.createdAt
        }));

        const overallGrade = recentMarks.length > 0
          ? recentMarks.reduce((sum, mark) => sum + (mark.marks / mark.fullMarks * 100), 0) / recentMarks.length
          : 0;

        // Calculate attendance rate
        const attendanceRecords = currentEnrollment.studentAttendances;
        const presentRecords = attendanceRecords.filter(record => record.status === 'PRESENT');
        const attendanceRate = attendanceRecords.length > 0 
          ? Math.round((presentRecords.length / attendanceRecords.length) * 100) 
          : 0;

        // Get upcoming exams for this child
        const upcomingExams = await prisma.examSchedule.findMany({
          where: {
            classLevelId: currentEnrollment.classLevelId,
            examDate: { gte: new Date() }
          },
          include: {
            exam: true,
            subject: true
          },
          orderBy: { examDate: 'asc' },
          take: 5
        });

        progressData.push({
          studentId: child.id,
          studentName: child.name,
          className: currentEnrollment.classLevel.name,
          section: currentEnrollment.section.name,
          overallGrade: Math.round(overallGrade * 100) / 100,
          attendanceRate,
          recentMarks,
          upcomingExams: upcomingExams.map(exam => ({
            examName: exam.exam.name,
            subject: exam.subject.name,
            date: exam.examDate,
            startTime: exam.startTime,
            endTime: exam.endTime
          }))
        });
      }

      return progressData;

    } catch (error) {
      console.error('Error fetching children progress:', error);
      throw new Error('Failed to fetch children progress data');
    }
  }

  /**
   * Get attendance alerts for guardian's children
   */
  static async getAttendanceAlerts(guardianId: string): Promise<AttendanceAlert[]> {
    try {
      const children = await prisma.student.findMany({
        where: { guardianId },
        include: {
          enrollments: {
            include: {
              studentAttendances: {
                where: {
                  date: {
                    gte: startOfWeek(new Date()),
                    lte: endOfWeek(new Date())
                  }
                },
                orderBy: { date: 'desc' }
              }
            }
          }
        }
      });

      const alerts: AttendanceAlert[] = [];

      for (const child of children) {
        const currentEnrollment = child.enrollments[0];
        if (!currentEnrollment) continue;

        const attendanceRecords = currentEnrollment.studentAttendances;
        const presentCount = attendanceRecords.filter(record => record.status === 'PRESENT').length;
        const attendanceRate = attendanceRecords.length > 0 
          ? (presentCount / attendanceRecords.length) * 100 
          : 0;

        // Check for low attendance
        if (attendanceRate < 75 && attendanceRecords.length >= 3) {
          alerts.push({
            studentId: child.id,
            studentName: child.name,
            alertType: 'low_attendance',
            message: `${child.name} has ${attendanceRate.toFixed(1)}% attendance this week`,
            severity: attendanceRate < 50 ? 'high' : 'medium',
            date: new Date()
          });
        }

        // Check for consecutive absences
        const recentAbsences = attendanceRecords
          .slice(0, 3)
          .filter(record => record.status === 'ABSENT');

        if (recentAbsences.length >= 3) {
          alerts.push({
            studentId: child.id,
            studentName: child.name,
            alertType: 'consecutive_absent',
            message: `${child.name} has been absent for 3 consecutive days`,
            severity: 'high',
            date: new Date()
          });
        }

        // Check for late pattern
        const lateCount = attendanceRecords.filter(record => record.status === 'LATE').length;
        if (lateCount >= 3) {
          alerts.push({
            studentId: child.id,
            studentName: child.name,
            alertType: 'late_pattern',
            message: `${child.name} has been late ${lateCount} times this week`,
            severity: 'medium',
            date: new Date()
          });
        }
      }

      return alerts;

    } catch (error) {
      console.error('Error fetching attendance alerts:', error);
      throw new Error('Failed to fetch attendance alerts');
    }
  }

  /**
   * Get fee status for all children
   */
  static async getFeeStatus(guardianId: string): Promise<FeeStatus[]> {
    try {
      const children = await prisma.student.findMany({
        where: { guardianId },
        include: {
          invoices: {
            include: {
              invoiceItems: {
                include: {
                  feeHead: true
                }
              },
              payments: true
            },
            orderBy: { dueDate: 'asc' }
          }
        }
      });

      const feeStatusData: FeeStatus[] = [];

      for (const child of children) {
        const pendingInvoices = child.invoices.filter(
          invoice => invoice.status !== 'PAID'
        );

        const totalDue = pendingInvoices.reduce((sum, invoice) => {
          const paidAmount = invoice.payments.reduce((paidSum, payment) => 
            paidSum + parseFloat(payment.amountPaid.toString()), 0
          );
          return sum + (parseFloat(invoice.totalAmount.toString()) - paidAmount);
        }, 0);

        // Calculate overdue days for the oldest unpaid invoice
        const oldestInvoice = pendingInvoices[0];
        const overdueDays = oldestInvoice 
          ? Math.max(0, Math.floor((new Date().getTime() - oldestInvoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        const invoices = pendingInvoices.map(invoice => ({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: parseFloat(invoice.totalAmount.toString()),
          dueDate: invoice.dueDate,
          status: invoice.status,
          feeHeads: invoice.invoiceItems.map(item => item.feeHead.name)
        }));

        const paymentHistory = child.invoices.flatMap(invoice => 
          invoice.payments.map(payment => ({
            paymentId: payment.id,
            amount: parseFloat(payment.amountPaid.toString()),
            paymentDate: payment.paymentDate,
            method: payment.paymentMethod.toString(),
            transactionId: payment.transactionId || undefined
          }))
        ).sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());

        feeStatusData.push({
          studentId: child.id,
          studentName: child.name,
          totalDue,
          overdueDays,
          invoices,
          paymentHistory
        });
      }

      return feeStatusData;

    } catch (error) {
      console.error('Error fetching fee status:', error);
      throw new Error('Failed to fetch fee status data');
    }
  }

  /**
   * Get teacher communications for guardian
   */
  static async getTeacherCommunications(guardianId: string, limit: number = 10): Promise<TeacherCommunication[]> {
    try {
      // Get all children for this guardian
      const children = await prisma.student.findMany({
        where: { guardianId },
        select: { id: true }
      });

      const childIds = children.map(child => child.id);

      // Get class announcements for children's classes
      const announcements = await prisma.classAnnouncement.findMany({
        where: {
          OR: children.map(child => ({
            classLevel: {
              enrollments: {
                some: { studentId: child.id }
              }
            }
          }))
        },
        include: {
          author: true,
          classLevel: true,
          section: true
        },
        orderBy: { publishedAt: 'desc' },
        take: limit
      });

      const communications: TeacherCommunication[] = announcements.map(announcement => ({
        id: announcement.id,
        teacherName: announcement.author.name,
        subject: announcement.title,
        message: announcement.content,
        type: 'announcement',
        priority: announcement.isPinned ? 'high' : 'medium',
        timestamp: announcement.publishedAt,
        isRead: false // Would be tracked in a separate read status table
      }));

      return communications;

    } catch (error) {
      console.error('Error fetching teacher communications:', error);
      throw new Error('Failed to fetch teacher communications');
    }
  }

  /**
   * Get multi-child account summary
   */
  static async getMultiChildSummary(guardianId: string): Promise<{
    children: {
      id: string;
      name: string;
      className: string;
      section: string;
      overallGrade: number;
      attendanceRate: number;
      pendingFees: number;
      upcomingExams: number;
    }[];
    totalPendingFees: number;
    averagePerformance: number;
    averageAttendance: number;
  }> {
    try {
      const childrenProgress = await this.getChildrenProgress(guardianId);
      const feeStatus = await this.getFeeStatus(guardianId);

      const children = childrenProgress.map(child => {
        const childFees = feeStatus.find(fee => fee.studentId === child.studentId);
        
        return {
          id: child.studentId,
          name: child.studentName,
          className: child.className,
          section: child.section,
          overallGrade: child.overallGrade,
          attendanceRate: child.attendanceRate,
          pendingFees: childFees?.totalDue || 0,
          upcomingExams: child.upcomingExams.length
        };
      });

      const totalPendingFees = feeStatus.reduce((sum, fee) => sum + fee.totalDue, 0);
      const averagePerformance = children.length > 0 
        ? children.reduce((sum, child) => sum + child.overallGrade, 0) / children.length 
        : 0;
      const averageAttendance = children.length > 0 
        ? children.reduce((sum, child) => sum + child.attendanceRate, 0) / children.length 
        : 0;

      return {
        children,
        totalPendingFees,
        averagePerformance: Math.round(averagePerformance * 100) / 100,
        averageAttendance: Math.round(averageAttendance * 100) / 100
      };

    } catch (error) {
      console.error('Error fetching multi-child summary:', error);
      throw new Error('Failed to fetch multi-child summary');
    }
  }
}
