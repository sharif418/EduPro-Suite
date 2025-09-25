import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAuth } from '../../../lib/auth-helpers';


export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teacher role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json({ error: 'classId is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Get current academic year
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true }
    });

    if (!currentAcademicYear) {
      return NextResponse.json({ error: 'No current academic year found' }, { status: 404 });
    }

    // Get all students in the class
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classLevelId,
        sectionId,
        academicYearId: currentAcademicYear.id
      },
      include: {
        student: true,
        results: {
          include: {
            exam: true,
            finalGrade: true
          }
        },
        studentAttendances: {
          where: {
            date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1) // Last 3 months
            }
          }
        }
      }
    });

    // Calculate attendance statistics
    const attendanceStats = {
      totalStudents: enrollments.length,
      averageAttendance: 0,
      attendanceDistribution: {
        excellent: 0, // 90%+
        good: 0,      // 75-89%
        average: 0,   // 60-74%
        poor: 0       // <60%
      }
    };

    let totalAttendancePercentage = 0;

    enrollments.forEach(enrollment => {
      const totalDays = enrollment.studentAttendances.length;
      const presentDays = enrollment.studentAttendances.filter(
        att => att.status === 'PRESENT'
      ).length;
      
      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
      totalAttendancePercentage += attendancePercentage;

      if (attendancePercentage >= 90) attendanceStats.attendanceDistribution.excellent++;
      else if (attendancePercentage >= 75) attendanceStats.attendanceDistribution.good++;
      else if (attendancePercentage >= 60) attendanceStats.attendanceDistribution.average++;
      else attendanceStats.attendanceDistribution.poor++;
    });

    attendanceStats.averageAttendance = enrollments.length > 0 
      ? Math.round(totalAttendancePercentage / enrollments.length) 
      : 0;

    // Calculate performance statistics
    const performanceStats = {
      totalExams: 0,
      averageScore: 0,
      gradeDistribution: {} as { [key: string]: number },
      examTrends: [] as Array<{
        examName: string;
        averageScore: number;
        totalStudents: number;
      }>
    };

    // Get all exams for this class
    const exams = await prisma.exam.findMany({
      where: {
        academicYearId: currentAcademicYear.id,
        results: {
          some: {
            enrollment: {
              classLevelId,
              sectionId
            }
          }
        }
      },
      include: {
        results: {
          where: {
            enrollment: {
              classLevelId,
              sectionId
            }
          },
          include: {
            finalGrade: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    performanceStats.totalExams = exams.length;

    if (exams.length > 0) {
      let totalScore = 0;
      let totalResults = 0;
      const gradeCount: { [key: string]: number } = {};

      exams.forEach(exam => {
        const examResults = exam.results;
        let examTotalScore = 0;

        examResults.forEach(result => {
          totalScore += result.percentage;
          examTotalScore += result.percentage;
          totalResults++;

          const gradeName = result.finalGrade.gradeName;
          gradeCount[gradeName] = (gradeCount[gradeName] || 0) + 1;
        });

        performanceStats.examTrends.push({
          examName: exam.name,
          averageScore: examResults.length > 0 ? Math.round(examTotalScore / examResults.length) : 0,
          totalStudents: examResults.length
        });
      });

      performanceStats.averageScore = totalResults > 0 ? Math.round(totalScore / totalResults) : 0;
      performanceStats.gradeDistribution = gradeCount;
    }

    // Get subject-wise performance (if teacher teaches multiple subjects)
    const subjectPerformance: Array<{
      subject: string;
      averageScore: number;
      totalExams: number;
    }> = [];
    
    // Get class info
    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classLevelId }
    });
    
    const section = await prisma.section.findUnique({
      where: { id: sectionId }
    });

    return NextResponse.json({
      success: true,
      analytics: {
        attendance: attendanceStats,
        performance: performanceStats,
        subjectPerformance,
        classInfo: {
          totalStudents: enrollments.length,
          className: `${classLevel?.name || 'Unknown'} - ${section?.name || 'Unknown'}`
        }
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
