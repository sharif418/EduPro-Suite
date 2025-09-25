import { prisma } from './prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

export interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
  pendingTasks: number;
  todaySchedule: number;
  weeklyHours: number;
  averageAttendance: number;
}

export interface TodaySchedule {
  id: string;
  subject: string;
  className: string;
  section: string;
  startTime: string;
  endTime: string;
  room: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface PendingTask {
  id: string;
  type: 'assignment' | 'exam' | 'grading';
  title: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  count?: number;
}

export interface ClassPerformance {
  classId: string;
  className: string;
  section: string;
  totalStudents: number;
  averageGrade: number;
  attendanceRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RecentActivity {
  id: string;
  type: 'attendance' | 'grade' | 'assignment' | 'announcement';
  description: string;
  timestamp: Date;
  className?: string;
  studentCount?: number;
}

export class TeacherDashboardService {
  
  /**
   * Get comprehensive teacher statistics
   */
  static async getTeacherStats(teacherId: string): Promise<TeacherStats> {
    try {
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);
      const startOfThisWeek = startOfWeek(today);
      const endOfThisWeek = endOfWeek(today);

      // Get teacher's class assignments
      const classAssignments = await prisma.teacherClassAssignment.findMany({
        where: { teacherId },
        include: {
          classLevel: true,
          section: true,
          subject: true
        }
      });

      const totalClasses = classAssignments.length;

      // Get total students from enrollments for teacher's classes
      const enrollments = await prisma.enrollment.findMany({
        where: {
          OR: classAssignments.map(assignment => ({
            classLevelId: assignment.classLevelId,
            sectionId: assignment.sectionId
          }))
        }
      });

      const totalStudents = enrollments.length;

      // Get today's exam schedule count
      const todaySchedule = await prisma.examSchedule.count({
        where: {
          examDate: {
            gte: startOfToday,
            lte: endOfToday
          },
          classLevelId: {
            in: classAssignments.map(a => a.classLevelId)
          },
          subjectId: {
            in: classAssignments.map(a => a.subjectId)
          }
        }
      });

      const weeklyHours = classAssignments.length * 5; // Assuming 5 hours per week per class

      // Calculate pending tasks
      const pendingAssignments = await prisma.assignment.count({
        where: {
          teacherId,
          dueDate: { gte: today }
        }
      });

      const pendingGrading = await prisma.assignmentSubmission.count({
        where: {
          assignment: { teacherId },
          status: 'SUBMITTED'
        }
      });

      const pendingTasks = pendingAssignments + pendingGrading;

      // Calculate average attendance from student attendance records
      const attendanceRecords = await prisma.studentAttendance.findMany({
        where: {
          date: {
            gte: startOfThisWeek,
            lte: endOfThisWeek
          },
          markedBy: teacherId
        }
      });

      const totalAttendanceRecords = attendanceRecords.length;
      const presentRecords = attendanceRecords.filter(record => record.status === 'PRESENT').length;
      const averageAttendance = totalAttendanceRecords > 0 
        ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
        : 0;

      return {
        totalClasses,
        totalStudents,
        pendingTasks,
        todaySchedule,
        weeklyHours,
        averageAttendance
      };

    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      throw new Error('Failed to fetch teacher statistics');
    }
  }

  /**
   * Get today's class schedule for teacher
   */
  static async getTodaySchedule(teacherId: string): Promise<TodaySchedule[]> {
    try {
      const schedules = await prisma.teacherClassAssignment.findMany({
        where: { teacherId },
        include: {
          classLevel: true,
          section: true,
          subject: true
        }
      });

      // Transform to today's schedule format
      const todaySchedule: TodaySchedule[] = schedules.map((schedule, index) => {
        // Generate time slots (this would ideally come from a timetable system)
        const startHour = 8 + index; // Starting from 8 AM
        const startTime = `${startHour.toString().padStart(2, '0')}:00`;
        const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`;
        
        // Determine status based on current time
        const currentTime = new Date();
        const scheduleStartTime = new Date();
        scheduleStartTime.setHours(startHour, 0, 0, 0);
        const scheduleEndTime = new Date();
        scheduleEndTime.setHours(startHour + 1, 0, 0, 0);
        
        let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
        if (currentTime >= scheduleEndTime) {
          status = 'completed';
        } else if (currentTime >= scheduleStartTime && currentTime < scheduleEndTime) {
          status = 'ongoing';
        }

        return {
          id: schedule.id,
          subject: schedule.subject.name,
          className: schedule.classLevel.name,
          section: schedule.section.name,
          startTime,
          endTime,
          room: `Room ${index + 1}`, // This would come from a room assignment system
          status
        };
      });

      return todaySchedule;

    } catch (error) {
      console.error('Error fetching today schedule:', error);
      throw new Error('Failed to fetch today\'s schedule');
    }
  }

  /**
   * Get pending tasks for teacher
   */
  static async getPendingTasks(teacherId: string): Promise<PendingTask[]> {
    try {
      const today = new Date();
      const tasks: PendingTask[] = [];

      // Get pending assignments
      const assignments = await prisma.assignment.findMany({
        where: {
          teacherId,
          dueDate: { gte: today }
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      });

      assignments.forEach(assignment => {
        const daysUntilDue = Math.ceil((assignment.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let priority: 'low' | 'medium' | 'high' = 'low';
        
        if (daysUntilDue <= 1) priority = 'high';
        else if (daysUntilDue <= 3) priority = 'medium';

        tasks.push({
          id: assignment.id,
          type: 'assignment',
          title: assignment.title,
          dueDate: assignment.dueDate,
          priority
        });
      });

      // Get pending grading
      const submissionsToGrade = await prisma.assignmentSubmission.findMany({
        where: {
          assignment: { teacherId },
          status: 'SUBMITTED'
        },
        include: {
          assignment: true
        },
        orderBy: { createdAt: 'asc' },
        take: 10
      });

      if (submissionsToGrade.length > 0) {
        tasks.push({
          id: 'grading-pending',
          type: 'grading',
          title: 'Pending Submissions to Grade',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          priority: submissionsToGrade.length > 10 ? 'high' : 'medium',
          count: submissionsToGrade.length
        });
      }

      // Get upcoming exams for teacher's classes
      const classAssignments = await prisma.teacherClassAssignment.findMany({
        where: { teacherId },
        select: { classLevelId: true, subjectId: true }
      });

      const upcomingExams = await prisma.examSchedule.findMany({
        where: {
          examDate: { gte: today },
          OR: classAssignments.map(assignment => ({
            classLevelId: assignment.classLevelId,
            subjectId: assignment.subjectId
          }))
        },
        include: {
          exam: true
        },
        orderBy: { examDate: 'asc' },
        take: 5
      });

      upcomingExams.forEach(examSchedule => {
        const daysUntilExam = Math.ceil((examSchedule.examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let priority: 'low' | 'medium' | 'high' = 'low';
        
        if (daysUntilExam <= 2) priority = 'high';
        else if (daysUntilExam <= 7) priority = 'medium';

        tasks.push({
          id: examSchedule.id,
          type: 'exam',
          title: `${examSchedule.exam.name} - Exam`,
          dueDate: examSchedule.examDate,
          priority
        });
      });

      return tasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      throw new Error('Failed to fetch pending tasks');
    }
  }

  /**
   * Get class performance analytics
   */
  static async getClassPerformance(teacherId: string): Promise<ClassPerformance[]> {
    try {
      const classAssignments = await prisma.teacherClassAssignment.findMany({
        where: { teacherId },
        include: {
          classLevel: true,
          section: true
        }
      });

      const performance: ClassPerformance[] = [];

      for (const assignment of classAssignments) {
        // Get enrollments for this class
        const enrollments = await prisma.enrollment.findMany({
          where: {
            classLevelId: assignment.classLevelId,
            sectionId: assignment.sectionId
          },
          include: {
            marks: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
              }
            }
          }
        });

        const totalStudents = enrollments.length;
        
        // Calculate average grade from marks
        const allMarks = enrollments.flatMap(enrollment => 
          enrollment.marks.map(mark => mark.marksObtained)
        );
        const averageGrade = allMarks.length > 0 
          ? allMarks.reduce((sum, mark) => sum + mark, 0) / allMarks.length 
          : 0;

        // Calculate attendance rate
        const attendanceRecords = await prisma.studentAttendance.findMany({
          where: {
            enrollment: {
              classLevelId: assignment.classLevelId,
              sectionId: assignment.sectionId
            },
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        });

        const totalAttendanceRecords = attendanceRecords.length;
        const presentRecords = attendanceRecords.filter(record => record.status === 'PRESENT').length;
        const attendanceRate = totalAttendanceRecords > 0 
          ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
          : 0;

        // Determine trend (simplified - would need historical data for accurate trending)
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (averageGrade > 75) trend = 'up';
        else if (averageGrade < 60) trend = 'down';

        performance.push({
          classId: assignment.id,
          className: assignment.classLevel.name,
          section: assignment.section.name,
          totalStudents,
          averageGrade: Math.round(averageGrade * 100) / 100,
          attendanceRate,
          trend
        });
      }

      return performance;

    } catch (error) {
      console.error('Error fetching class performance:', error);
      throw new Error('Failed to fetch class performance data');
    }
  }

  /**
   * Get recent activities for teacher
   */
  static async getRecentActivities(teacherId: string, limit: number = 10): Promise<RecentActivity[]> {
    try {
      const activities: RecentActivity[] = [];

      // Get recent attendance records
      const recentAttendance = await prisma.studentAttendance.findMany({
        where: {
          markedBy: teacherId
        },
        include: {
          enrollment: {
            include: {
              classLevel: true,
              section: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      recentAttendance.forEach(attendance => {
        activities.push({
          id: attendance.id,
          type: 'attendance',
          description: `Marked attendance for ${attendance.enrollment.classLevel.name} ${attendance.enrollment.section.name}`,
          timestamp: attendance.createdAt,
          className: `${attendance.enrollment.classLevel.name} ${attendance.enrollment.section.name}`
        });
      });

      // Get recent assignments
      const recentAssignments = await prisma.assignment.findMany({
        where: { teacherId },
        include: {
          classLevel: true,
          section: true,
          submissions: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      recentAssignments.forEach(assignment => {
        activities.push({
          id: assignment.id,
          type: 'assignment',
          description: `Created assignment: ${assignment.title}`,
          timestamp: assignment.createdAt,
          className: `${assignment.classLevel.name} ${assignment.section.name}`,
          studentCount: assignment.submissions.length
        });
      });

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw new Error('Failed to fetch recent activities');
    }
  }

  /**
   * Get teacher's weekly schedule summary
   */
  static async getWeeklyScheduleSummary(teacherId: string): Promise<{
    totalHours: number;
    classesPerDay: { [key: string]: number };
    subjectDistribution: { [key: string]: number };
  }> {
    try {
      const classAssignments = await prisma.teacherClassAssignment.findMany({
        where: { teacherId },
        include: {
          subject: true
        }
      });

      const totalHours = classAssignments.length * 5; // Assuming 5 hours per week per class
      
      // This would be more accurate with a proper timetable system
      const classesPerDay = {
        'Monday': Math.ceil(classAssignments.length / 5),
        'Tuesday': Math.ceil(classAssignments.length / 5),
        'Wednesday': Math.ceil(classAssignments.length / 5),
        'Thursday': Math.ceil(classAssignments.length / 5),
        'Friday': Math.ceil(classAssignments.length / 5)
      };

      const subjectDistribution: { [key: string]: number } = {};
      classAssignments.forEach(assignment => {
        const subjectName = assignment.subject.name;
        subjectDistribution[subjectName] = (subjectDistribution[subjectName] || 0) + 1;
      });

      return {
        totalHours,
        classesPerDay,
        subjectDistribution
      };

    } catch (error) {
      console.error('Error fetching weekly schedule summary:', error);
      throw new Error('Failed to fetch weekly schedule summary');
    }
  }
}
