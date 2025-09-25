import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// Helper function to calculate grade based on percentage and grading system
async function calculateGrade(percentage: number, gradingSystemId: string) {
  const grade = await prisma.grade.findFirst({
    where: {
      gradingSystemId,
      minPercentage: { lte: percentage },
      maxPercentage: { gte: percentage },
    },
  });
  return grade;
}

// Helper function to calculate GPA based on grade points
function calculateGPA(gradePoints: number[], gradingSystem: any) {
  if (gradePoints.length === 0) return 0;
  
  const totalPoints = gradePoints.reduce((sum, points) => sum + points, 0);
  return totalPoints / gradePoints.length;
}

// POST - Process results for an exam and class
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { examId, classLevelId, sectionId, gradingSystemId } = body;

    // Validate required fields
    if (!examId || !classLevelId) {
      return createErrorResponse('Missing required fields: examId and classLevelId', 400);
    }

    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        academicYear: true,
      },
    });

    if (!exam) {
      return createErrorResponse('Exam not found', 404);
    }

    // Check if class level exists
    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classLevelId },
    });

    if (!classLevel) {
      return createErrorResponse('Class level not found', 404);
    }

    // Get grading system
    let gradingSystem;
    if (gradingSystemId) {
      gradingSystem = await prisma.gradingSystem.findUnique({
        where: { id: gradingSystemId },
        include: { grades: true },
      });
    } else {
      gradingSystem = await prisma.gradingSystem.findFirst({
        where: { isDefault: true },
        include: { grades: true },
      });
    }

    if (!gradingSystem) {
      return createErrorResponse('No grading system found. Please create a default grading system first.', 400);
    }

    // Get all exam schedules for this exam and class
    const examSchedules = await prisma.examSchedule.findMany({
      where: {
        examId,
        classLevelId,
      },
      include: {
        subject: true,
        marks: {
          include: {
            enrollment: {
              include: {
                student: true,
                section: true,
              },
            },
          },
        },
      },
    });

    if (examSchedules.length === 0) {
      return createErrorResponse('No exam schedules found for this exam and class', 404);
    }

    // Get all enrollments for this class and academic year
    const whereClause: any = {
      classLevelId,
      academicYearId: exam.academicYearId,
    };

    if (sectionId) {
      whereClause.sectionId = sectionId;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: whereClause,
      include: {
        student: true,
        section: true,
      },
    });

    if (enrollments.length === 0) {
      return createErrorResponse('No students found for this class and academic year', 404);
    }

    // Check if all students have marks for all subjects
    const missingMarks = [];
    for (const enrollment of enrollments) {
      for (const schedule of examSchedules) {
        const hasMark = schedule.marks.some(mark => mark.enrollmentId === enrollment.id);
        if (!hasMark) {
          missingMarks.push({
            student: enrollment.student.name,
            subject: schedule.subject.name,
            rollNumber: enrollment.rollNumber,
          });
        }
      }
    }

    if (missingMarks.length > 0) {
      return createErrorResponse(
        `Cannot process results. Missing marks for ${missingMarks.length} student-subject combinations. Please enter all marks first.`,
        400
      );
    }

    // Process results in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const processedResults = [];

      for (const enrollment of enrollments) {
        // Get all marks for this student in this exam
        const studentMarks = [];
        let totalMarks = 0;
        let totalFullMarks = 0;
        const gradePoints = [];

        for (const schedule of examSchedules) {
          const mark = schedule.marks.find(m => m.enrollmentId === enrollment.id);
          if (mark) {
            studentMarks.push({
              subject: schedule.subject.name,
              marksObtained: mark.marksObtained,
              fullMarks: schedule.fullMarks,
              percentage: (mark.marksObtained / schedule.fullMarks) * 100,
            });

            totalMarks += mark.marksObtained;
            totalFullMarks += schedule.fullMarks;

            // Calculate grade points for this subject
            const subjectPercentage = (mark.marksObtained / schedule.fullMarks) * 100;
            const grade = await calculateGrade(subjectPercentage, gradingSystem.id);
            if (grade) {
              gradePoints.push(grade.points);
            }
          }
        }

        // Calculate overall percentage and GPA
        const percentage = totalFullMarks > 0 ? (totalMarks / totalFullMarks) * 100 : 0;
        const gpa = calculateGPA(gradePoints, gradingSystem);

        // Get overall grade based on percentage
        const finalGrade = await calculateGrade(percentage, gradingSystem.id);

        if (!finalGrade) {
          throw new Error(`No grade found for percentage ${percentage} in grading system ${gradingSystem.name}`);
        }

        // Upsert result
        const result = await tx.result.upsert({
          where: {
            enrollmentId_examId: {
              enrollmentId: enrollment.id,
              examId,
            },
          },
          update: {
            totalMarks,
            totalFullMarks,
            percentage,
            gpa,
            finalGradeId: finalGrade.id,
            gradingSystemId: gradingSystem.id,
            rank: null, // Will be calculated after all results are processed
          },
          create: {
            enrollmentId: enrollment.id,
            examId,
            totalMarks,
            totalFullMarks,
            percentage,
            gpa,
            finalGradeId: finalGrade.id,
            gradingSystemId: gradingSystem.id,
            rank: null,
          },
          include: {
            enrollment: {
              include: {
                student: true,
                section: true,
              },
            },
            finalGrade: true,
          },
        });

        processedResults.push(result);
      }

      return processedResults;
    });

    // Calculate ranks in a separate transaction
    await prisma.$transaction(async (tx) => {
      // Get all results for this exam and class, sorted by percentage (descending)
      const whereClause: any = {
        examId,
        enrollment: {
          classLevelId,
          academicYearId: exam.academicYearId,
        },
      };

      if (sectionId) {
        whereClause.enrollment.sectionId = sectionId;
      }

      const sortedResults = await tx.result.findMany({
        where: whereClause,
        orderBy: [
          { percentage: 'desc' },
          { totalMarks: 'desc' },
        ],
        include: {
          enrollment: {
            include: {
              student: true,
            },
          },
        },
      });

      // Assign ranks
      for (let i = 0; i < sortedResults.length; i++) {
        const rank = i + 1;
        await tx.result.update({
          where: { id: sortedResults[i].id },
          data: { rank },
        });
      }
    });

    // Fetch final results with all relations
    const finalResults = await prisma.result.findMany({
      where: {
        examId,
        enrollment: {
          classLevelId,
          academicYearId: exam.academicYearId,
          ...(sectionId && { sectionId }),
        },
      },
      include: {
        enrollment: {
          include: {
            student: true,
            section: true,
            classLevel: true,
          },
        },
        exam: {
          include: {
            academicYear: true,
          },
        },
        finalGrade: true,
        gradingSystem: true,
      },
      orderBy: {
        rank: 'asc',
      },
    });

    return createSuccessResponse({
      message: `Successfully processed results for ${finalResults.length} students`,
      results: finalResults,
      summary: {
        totalStudents: finalResults.length,
        examName: exam.name,
        className: classLevel.name,
        academicYear: exam.academicYear.year,
        gradingSystem: gradingSystem.name,
        averagePercentage: finalResults.reduce((sum, r) => sum + r.percentage, 0) / finalResults.length,
        averageGPA: finalResults.reduce((sum, r) => sum + r.gpa, 0) / finalResults.length,
        highestPercentage: Math.max(...finalResults.map(r => r.percentage)),
        lowestPercentage: Math.min(...finalResults.map(r => r.percentage)),
      },
    });
  } catch (error: any) {
    console.error('[RESULTS_PROCESS_ERROR]', error);
    return createErrorResponse(`Failed to process results: ${error.message}`);
  }
}

// GET - Fetch processed results
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const classLevelId = searchParams.get('classLevelId');
    const sectionId = searchParams.get('sectionId');
    const enrollmentId = searchParams.get('enrollmentId');

    // Build where clause
    const whereClause: any = {};
    
    if (examId) whereClause.examId = examId;
    if (enrollmentId) whereClause.enrollmentId = enrollmentId;

    if (classLevelId || sectionId) {
      whereClause.enrollment = {};
      if (classLevelId) whereClause.enrollment.classLevelId = classLevelId;
      if (sectionId) whereClause.enrollment.sectionId = sectionId;
    }

    const results = await prisma.result.findMany({
      where: whereClause,
      include: {
        enrollment: {
          include: {
            student: true,
            section: true,
            classLevel: true,
            academicYear: true,
          },
        },
        exam: {
          include: {
            academicYear: true,
          },
        },
        finalGrade: true,
        gradingSystem: {
          include: {
            grades: true,
          },
        },
      },
      orderBy: [
        { exam: { name: 'desc' } },
        { rank: 'asc' },
      ],
    });

    return createSuccessResponse({ results });
  } catch (error) {
    console.error('[RESULTS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch results');
  }
}
