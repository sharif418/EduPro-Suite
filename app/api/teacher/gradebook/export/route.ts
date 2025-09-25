import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAuth } from '../../../../lib/auth-helpers';
import * as XLSX from 'xlsx';


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

    // Get class and section info
    const classLevel = await prisma.classLevel.findUnique({
      where: { id: classLevelId }
    });
    
    const section = await prisma.section.findUnique({
      where: { id: sectionId }
    });

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
            finalGrade: true
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

    // Filter exams if examId is provided
    const filteredExams = examId ? exams.filter(exam => exam.id === examId) : exams;

    // Build Excel data
    const worksheetData: any[][] = [];
    
    // Header row 1: Class info
    worksheetData.push([
      `Grade Book - ${classLevel?.name || 'Unknown'} - ${section?.name || 'Unknown'}`,
      '',
      '',
      `Academic Year: ${currentAcademicYear.year}`,
      '',
      `Generated: ${new Date().toLocaleDateString()}`
    ]);
    
    // Empty row
    worksheetData.push([]);
    
    // Header row 2: Column headers
    const headerRow = ['Roll No.', 'Student Name'];
    
    // Add exam-subject columns
    filteredExams.forEach((exam: any) => {
      exam.examSchedules.forEach((schedule: any) => {
        headerRow.push(`${exam.name} - ${schedule.subject.name} (${schedule.fullMarks})`);
      });
    });
    
    // Add summary columns
    headerRow.push('GPA', 'Overall Grade');
    worksheetData.push(headerRow);

    // Student data rows
    enrollments.forEach((enrollment: any) => {
      const studentMarks = enrollment.marks;
      const studentResults = enrollment.results;
      
      const row = [
        enrollment.rollNumber.toString(),
        enrollment.student.name
      ];
      
      // Add marks for each exam-subject combination
      filteredExams.forEach((exam: any) => {
        exam.examSchedules.forEach((schedule: any) => {
          const mark = studentMarks.find((m: any) => 
            m.examSchedule.examId === exam.id && 
            m.examSchedule.subject.id === schedule.subject.id
          );
          
          if (mark) {
            row.push(`${mark.marksObtained}/${schedule.fullMarks} (${mark.grade?.gradeName || 'N/A'})`);
          } else {
            row.push('-');
          }
        });
      });
      
      // Calculate GPA and overall grade
      let gpa = 0;
      let overallGrade = 'F';
      
      if (studentResults.length > 0) {
        gpa = studentResults.reduce((sum: number, result: any) => sum + result.gpa, 0) / studentResults.length;
        const avgPercentage = studentResults.reduce((sum: number, result: any) => sum + result.percentage, 0) / studentResults.length;
        const overallGradeObj = gradingSystem.grades.find((g: any) => 
          avgPercentage >= g.minPercentage && avgPercentage <= g.maxPercentage
        );
        overallGrade = overallGradeObj?.gradeName || 'F';
      } else if (studentMarks.length > 0) {
        const grades = studentMarks.map((mark: any) => {
          const percentage = (mark.marksObtained / mark.examSchedule.fullMarks) * 100;
          const grade = gradingSystem.grades.find((g: any) => 
            percentage >= g.minPercentage && percentage <= g.maxPercentage
          );
          return grade?.points || 0;
        });
        
        if (grades.length > 0) {
          gpa = grades.reduce((sum: number, points: number) => sum + points, 0) / grades.length;
          const avgPercentage = studentMarks.reduce((sum: number, mark: any) => {
            return sum + (mark.marksObtained / mark.examSchedule.fullMarks * 100);
          }, 0) / studentMarks.length;
          
          const overallGradeObj = gradingSystem.grades.find((g: any) => 
            avgPercentage >= g.minPercentage && avgPercentage <= g.maxPercentage
          );
          overallGrade = overallGradeObj?.gradeName || 'F';
        }
      }
      
      row.push(gpa.toFixed(2), overallGrade);
      worksheetData.push(row);
    });

    // Add summary statistics
    worksheetData.push([]);
    worksheetData.push(['Summary Statistics']);
    worksheetData.push(['Total Students:', enrollments.length.toString()]);
    
    if (enrollments.length > 0) {
      const allGPAs = enrollments.map((enrollment: any) => {
        const studentResults = enrollment.results;
        if (studentResults.length > 0) {
          return studentResults.reduce((sum: number, result: any) => sum + result.gpa, 0) / studentResults.length;
        }
        return 0;
      });
      
      const avgGPA = allGPAs.reduce((sum, gpa) => sum + gpa, 0) / allGPAs.length;
      const maxGPA = Math.max(...allGPAs);
      const minGPA = Math.min(...allGPAs);
      
      worksheetData.push(['Average GPA:', avgGPA.toFixed(2)]);
      worksheetData.push(['Highest GPA:', maxGPA.toFixed(2)]);
      worksheetData.push(['Lowest GPA:', minGPA.toFixed(2)]);
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    const columnWidths = [
      { wch: 10 }, // Roll No.
      { wch: 25 }, // Student Name
    ];
    
    // Add widths for exam-subject columns
    filteredExams.forEach((exam: any) => {
      exam.examSchedules.forEach(() => {
        columnWidths.push({ wch: 20 });
      });
    });
    
    columnWidths.push({ wch: 8 }); // GPA
    columnWidths.push({ wch: 12 }); // Overall Grade
    
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook
    const sheetName = examId ? 'Exam Grades' : 'Grade Book';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    });
    
    // Create filename
    const className = `${classLevel?.name || 'Class'}_${section?.name || 'Section'}`;
    const examSuffix = examId ? `_${filteredExams[0]?.name || 'Exam'}` : '';
    const filename = `GradeBook_${className}${examSuffix}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Return Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error exporting grade book:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
