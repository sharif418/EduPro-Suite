import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAuth } from '@/app/lib/auth-helpers';


export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get student record
    const student = await prisma.student.findUnique({
      where: { email: user.email }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get current academic year
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true }
    });

    if (!currentAcademicYear) {
      return NextResponse.json({ error: 'No current academic year found' }, { status: 400 });
    }

    // Get student's current enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        academicYearId: currentAcademicYear.id
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Student enrollment not found' }, { status: 404 });
    }

    // Build filter conditions for assignments
    const whereConditions: any = {
      classLevelId: enrollment.classLevelId,
      sectionId: enrollment.sectionId
    };

    if (subjectId) whereConditions.subjectId = subjectId;
    if (dateFrom || dateTo) {
      whereConditions.dueDate = {};
      if (dateFrom) whereConditions.dueDate.gte = new Date(dateFrom);
      if (dateTo) whereConditions.dueDate.lte = new Date(dateTo);
    }

    // Get assignments for student's class
    const assignments = await prisma.assignment.findMany({
      where: whereConditions,
      include: {
        classLevel: true,
        section: true,
        subject: true,
        teacher: {
          select: {
            name: true,
            email: true
          }
        },
        submissions: {
          where: {
            enrollmentId: enrollment.id
          },
          select: {
            id: true,
            status: true,
            submissionDate: true,
            marksObtained: true,
            feedback: true,
            gradedAt: true,
            fileUrls: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Filter by submission status if requested
    let filteredAssignments = assignments;
    if (status) {
      filteredAssignments = assignments.filter((assignment: any) => {
        const submission = assignment.submissions[0];
        if (!submission) return status === 'PENDING';
        return submission.status === status;
      });
    }

    // Add computed fields
    const assignmentsWithStatus = filteredAssignments.map((assignment: any) => {
      const submission = assignment.submissions[0];
      const now = new Date();
      const dueDate = new Date(assignment.dueDate);
      
      return {
        ...assignment,
        submission: submission || null,
        isOverdue: !submission?.submissionDate && now > dueDate,
        daysUntilDue: Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        canSubmit: !submission?.submissionDate || submission?.status === 'PENDING'
      };
    });

    return NextResponse.json({ assignments: assignmentsWithStatus });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
