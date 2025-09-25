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
    const examId = searchParams.get('examId');

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
        marks: {
          where: examId ? { 
            examSchedule: {
              examId: examId
            }
          } : {},
          include: {
            examSchedule: {
              include: {
                exam: true,
                subject: true
              }
            },
            grade: true
          }
        },
        results: {
          where: examId ? { examId } : {},
          include: {
            exam: true,
            finalGrade: true,
            gradingSystem: true
          }
        }
      },
      orderBy: {
        rollNumber: 'asc'
      }
    });

    // Get all exams for this class
    const exams = await prisma.exam.findMany({
      where: {
        academicYearId: currentAcademicYear.id,
        examSchedules: {
          some: {
            classLevelId,
          }
        }
      },
      include: {
        examSchedules: {
          where: {
            classLevelId,
          },
          include: {
            subject: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get active grading system
    const gradingSystem = await prisma.gradingSystem.findFirst({
      where: { isDefault: true },
      include: {
        grades: {
          orderBy: { minPercentage: 'desc' }
        }
      }
    });

    if (!gradingSystem) {
      return NextResponse.json({ error: 'No active grading system found' }, { status: 404 });
    }

    // Build grade book data matching the UI interface
    const gradeBookData = {
      students: enrollments.map((enrollment: any) => {
        const studentMarks = enrollment.marks;
        const studentResults = enrollment.results;
        
        // Build grades array for this student
        const grades = studentMarks.map((mark: any) => {
          const percentage = (mark.marksObtained / mark.examSchedule.fullMarks) * 100;
          const grade = gradingSystem.grades.find((g: any) => 
            percentage >= g.minPercentage && percentage <= g.maxPercentage
          );

          return {
            examId: mark.examSchedule.examId,
            examName: mark.examSchedule.exam.name,
            subjectId: mark.examSchedule.subject.id,
            subjectName: mark.examSchedule.subject.name,
            marksObtained: mark.marksObtained,
            fullMarks: mark.examSchedule.fullMarks,
            grade: grade?.gradeName || 'F',
            points: grade?.points || 0
          };
        });

        // Calculate GPA from results or from grades
        let gpa = 0;
        let overallGrade = 'F';
        
        if (studentResults.length > 0) {
          gpa = studentResults.reduce((sum: number, result: any) => sum + result.gpa, 0) / studentResults.length;
          // Get overall grade based on average GPA
          const avgPercentage = studentResults.reduce((sum: number, result: any) => sum + result.percentage, 0) / studentResults.length;
          const overallGradeObj = gradingSystem.grades.find((g: any) => 
            avgPercentage >= g.minPercentage && avgPercentage <= g.maxPercentage
          );
          overallGrade = overallGradeObj?.gradeName || 'F';
        } else if (grades.length > 0) {
          // Calculate GPA from individual grades
          gpa = grades.reduce((sum: number, grade: any) => sum + grade.points, 0) / grades.length;
          const avgPercentage = grades.reduce((sum: number, grade: any) => sum + (grade.marksObtained / grade.fullMarks * 100), 0) / grades.length;
          const overallGradeObj = gradingSystem.grades.find((g: any) => 
            avgPercentage >= g.minPercentage && avgPercentage <= g.maxPercentage
          );
          overallGrade = overallGradeObj?.gradeName || 'F';
        }

        return {
          id: enrollment.student.id,
          name: enrollment.student.name,
          rollNumber: enrollment.rollNumber.toString(),
          grades,
          gpa: parseFloat(gpa.toFixed(2)),
          overallGrade
        };
      }),
      exams: exams.map((exam: any) => ({
        id: exam.id,
        name: exam.name,
        date: exam.createdAt.toISOString(),
        subjects: exam.examSchedules.map((schedule: any) => ({
          id: schedule.subject.id,
          name: schedule.subject.name,
          fullMarks: schedule.fullMarks,
          passMarks: schedule.passMarks
        }))
      })),
      gradingSystem: {
        id: gradingSystem.id,
        name: gradingSystem.name,
        grades: gradingSystem.grades.map((grade: any) => ({
          gradeName: grade.gradeName,
          minPercentage: grade.minPercentage,
          maxPercentage: grade.maxPercentage,
          points: grade.points
        }))
      }
    };

    return NextResponse.json({
      success: true,
      gradeBook: gradeBookData
    });

  } catch (error) {
    console.error('Error fetching grade book:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
