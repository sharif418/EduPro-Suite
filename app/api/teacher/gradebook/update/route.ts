import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAuth } from '../../../../lib/auth-helpers';


export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Access denied. Teacher role required.' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, examId, subjectId, marksObtained } = body;

    if (!studentId || !examId || !subjectId || marksObtained === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, examId, subjectId, marksObtained' 
      }, { status: 400 });
    }

    if (marksObtained < 0) {
      return NextResponse.json({ 
        error: 'Marks obtained cannot be negative' 
      }, { status: 400 });
    }

    // Get current academic year
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true }
    });

    if (!currentAcademicYear) {
      return NextResponse.json({ error: 'No current academic year found' }, { status: 404 });
    }

    // Find the enrollment for this student
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        academicYearId: currentAcademicYear.id
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Student enrollment not found' }, { status: 404 });
    }

    // Verify teacher has access to this class
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId },
      include: {
        teacherClassAssignments: {
          where: {
            classLevelId: enrollment.classLevelId,
            sectionId: enrollment.sectionId
          }
        }
      }
    });

    if (!staff || staff.teacherClassAssignments.length === 0) {
      return NextResponse.json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Find the exam schedule for this exam, class, and subject
    const examSchedule = await prisma.examSchedule.findFirst({
      where: {
        examId,
        classLevelId: enrollment.classLevelId,
        subjectId
      }
    });

    if (!examSchedule) {
      return NextResponse.json({ error: 'Exam schedule not found for this combination' }, { status: 404 });
    }

    // Validate marks don't exceed full marks
    if (marksObtained > examSchedule.fullMarks) {
      return NextResponse.json({ 
        error: `Marks obtained (${marksObtained}) cannot exceed full marks (${examSchedule.fullMarks})` 
      }, { status: 400 });
    }

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

    // Calculate percentage and determine grade
    const percentage = (marksObtained / examSchedule.fullMarks) * 100;
    const grade = gradingSystem.grades.find((g: any) => 
      percentage >= g.minPercentage && percentage <= g.maxPercentage
    );

    if (!grade) {
      return NextResponse.json({ error: 'Could not determine grade for the given marks' }, { status: 400 });
    }

    // Update or create marks record
    const existingMark = await prisma.marks.findFirst({
      where: {
        enrollmentId: enrollment.id,
        examScheduleId: examSchedule.id
      }
    });

    let updatedMark;
    if (existingMark) {
      updatedMark = await prisma.marks.update({
        where: { id: existingMark.id },
        data: {
          marksObtained,
          gradeId: grade.id,
          updatedAt: new Date()
        }
      });
    } else {
      updatedMark = await prisma.marks.create({
        data: {
          enrollmentId: enrollment.id,
          examScheduleId: examSchedule.id,
          marksObtained,
          gradeId: grade.id
        }
      });
    }

    // Recalculate and update result if it exists
    const existingResult = await prisma.result.findFirst({
      where: {
        enrollmentId: enrollment.id,
        examId
      }
    });

    if (existingResult) {
      // Get all marks for this student and exam
      const allMarks = await prisma.marks.findMany({
        where: {
          enrollmentId: enrollment.id,
          examSchedule: {
            examId
          }
        },
        include: {
          examSchedule: true,
          grade: true
        }
      });

      // Calculate totals
      const totalMarks = allMarks.reduce((sum, mark) => sum + mark.marksObtained, 0);
      const totalFullMarks = allMarks.reduce((sum, mark) => sum + mark.examSchedule.fullMarks, 0);
      const overallPercentage = totalFullMarks > 0 ? (totalMarks / totalFullMarks) * 100 : 0;
      const overallGPA = allMarks.length > 0 
        ? allMarks.reduce((sum, mark) => sum + (mark.grade?.points || 0), 0) / allMarks.length 
        : 0;

      // Determine final grade
      const finalGrade = gradingSystem.grades.find((g: any) => 
        overallPercentage >= g.minPercentage && overallPercentage <= g.maxPercentage
      );

      if (finalGrade) {
        await prisma.result.update({
          where: { id: existingResult.id },
          data: {
            totalMarks,
            totalFullMarks,
            percentage: overallPercentage,
            gpa: overallGPA,
            finalGradeId: finalGrade.id,
            updatedAt: new Date()
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Grade updated successfully',
      data: {
        marksObtained,
        fullMarks: examSchedule.fullMarks,
        percentage: percentage.toFixed(2),
        grade: grade.gradeName,
        points: grade.points
      }
    });

  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
