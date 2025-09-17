import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// GET - Fetch result for report card (public access)
export async function GET(
  request: NextRequest,
  { params }: { params: { resultId: string } }
) {
  try {
    const { resultId } = params;

    if (!resultId) {
      return createErrorResponse('Result ID is required', 400);
    }

    // Fetch the result with all necessary relations
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        enrollment: {
          include: {
            student: true,
            classLevel: true,
            section: true,
            academicYear: true,
          },
        },
        exam: {
          include: {
            academicYear: true,
            examSchedules: {
              where: {
                classLevelId: {
                  // We'll get this from the enrollment
                },
              },
              include: {
                subject: true,
                marks: {
                  where: {
                    // We'll filter by enrollment
                  },
                  include: {
                    grade: true,
                  },
                },
              },
            },
          },
        },
        finalGrade: true,
        gradingSystem: {
          include: {
            grades: {
              orderBy: {
                minPercentage: 'desc',
              },
            },
          },
        },
      },
    });

    if (!result) {
      return createErrorResponse('Result not found', 404);
    }

    // Get all exam schedules for this exam and class
    const examSchedules = await prisma.examSchedule.findMany({
      where: {
        examId: result.examId,
        classLevelId: result.enrollment.classLevelId,
      },
      include: {
        subject: true,
        marks: {
          where: {
            enrollmentId: result.enrollmentId,
          },
          include: {
            grade: true,
          },
        },
      },
    });

    // Build subject marks array
    const subjectMarks = examSchedules.map(schedule => {
      const mark = schedule.marks[0]; // Should only be one mark per student per schedule
      
      if (!mark) {
        return null; // Skip if no mark found
      }

      const percentage = (mark.marksObtained / schedule.fullMarks) * 100;

      return {
        subject: {
          name: schedule.subject.name,
          subjectCode: schedule.subject.subjectCode,
        },
        marksObtained: mark.marksObtained,
        fullMarks: schedule.fullMarks,
        passMarks: schedule.passMarks,
        percentage: percentage,
        grade: mark.grade || {
          gradeName: 'N/A',
          points: 0,
        },
      };
    }).filter(Boolean); // Remove null entries

    // Prepare the response data
    const reportCardData = {
      id: result.id,
      totalMarks: result.totalMarks,
      totalFullMarks: result.totalFullMarks,
      percentage: result.percentage,
      gpa: result.gpa,
      rank: result.rank,
      enrollment: {
        rollNumber: result.enrollment.rollNumber,
        student: {
          id: result.enrollment.student.id,
          name: result.enrollment.student.name,
          studentId: result.enrollment.student.studentId,
          dateOfBirth: result.enrollment.student.dateOfBirth,
          gender: result.enrollment.student.gender,
        },
        classLevel: {
          name: result.enrollment.classLevel.name,
        },
        section: {
          name: result.enrollment.section.name,
        },
        academicYear: {
          year: result.enrollment.academicYear.year,
        },
      },
      exam: {
        name: result.exam.name,
        academicYear: {
          year: result.exam.academicYear.year,
        },
      },
      finalGrade: {
        gradeName: result.finalGrade.gradeName,
        points: result.finalGrade.points,
      },
      gradingSystem: {
        name: result.gradingSystem.name,
        grades: result.gradingSystem.grades.map(grade => ({
          gradeName: grade.gradeName,
          points: grade.points,
          minPercentage: grade.minPercentage,
          maxPercentage: grade.maxPercentage,
        })),
      },
      subjectMarks: subjectMarks,
    };

    return createSuccessResponse({ result: reportCardData });
  } catch (error) {
    console.error('[RESULT_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch result');
  }
}
