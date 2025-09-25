import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyTeacherAuth } from '@/app/lib/auth-helpers';


export async function GET(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classLevelId = searchParams.get('classLevelId');
    const sectionId = searchParams.get('sectionId');
    const subjectId = searchParams.get('subjectId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get teacher's staff record
    const teacher = await prisma.staff.findUnique({
      where: { email: user.email }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Build filter conditions
    const whereConditions: any = {
      teacherId: teacher.id
    };

    if (classLevelId) whereConditions.classLevelId = classLevelId;
    if (sectionId) whereConditions.sectionId = sectionId;
    if (subjectId) whereConditions.subjectId = subjectId;
    if (dateFrom || dateTo) {
      whereConditions.dueDate = {};
      if (dateFrom) whereConditions.dueDate.gte = new Date(dateFrom);
      if (dateTo) whereConditions.dueDate.lte = new Date(dateTo);
    }

    const assignments = await prisma.assignment.findMany({
      where: whereConditions,
      include: {
        classLevel: true,
        section: true,
        subject: true,
        submissions: {
          include: {
            enrollment: {
              include: {
                student: true
              }
            }
          }
        },
        _count: {
          select: {
            submissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Add submission statistics
    const assignmentsWithStats = assignments.map((assignment: any) => ({
      ...assignment,
      stats: {
        totalSubmissions: assignment.submissions.length,
        pendingSubmissions: assignment.submissions.filter((s: any) => s.status === 'PENDING').length,
        submittedCount: assignment.submissions.filter((s: any) => s.status === 'SUBMITTED').length,
        gradedCount: assignment.submissions.filter((s: any) => s.status === 'GRADED').length,
        averageMarks: assignment.submissions
          .filter((s: any) => s.marksObtained !== null)
          .reduce((sum: number, s: any) => sum + (s.marksObtained || 0), 0) / 
          assignment.submissions.filter((s: any) => s.marksObtained !== null).length || 0
      }
    }));

    return NextResponse.json({ assignments: assignmentsWithStats });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      title, 
      description, 
      instructions, 
      classLevelId, 
      sectionId, 
      subjectId, 
      dueDate, 
      maxMarks, 
      attachments 
    } = body;

    // Get teacher's staff record
    const teacher = await prisma.staff.findUnique({
      where: { email: user.email }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Verify teacher has access to this class through TeacherClassAssignment
    const hasAccess = await prisma.teacherClassAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        classLevelId,
        sectionId,
        subjectId
      }
    });

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        instructions,
        classLevelId,
        sectionId,
        subjectId,
        teacherId: teacher.id,
        dueDate: new Date(dueDate),
        maxMarks: maxMarks ? parseInt(maxMarks) : null,
        attachments: attachments || null
      },
      include: {
        classLevel: true,
        section: true,
        subject: true
      }
    });

    // Get current academic year (you might need to adjust this logic)
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { isCurrent: true }
    });

    if (!currentAcademicYear) {
      return NextResponse.json({ error: 'No current academic year found' }, { status: 400 });
    }

    // Get all enrolled students for this class/section
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classLevelId,
        sectionId,
        academicYearId: currentAcademicYear.id
      },
      include: {
        student: true
      }
    });

    // Create assignment submissions for all enrolled students
    const submissionPromises = enrollments.map(enrollment =>
      prisma.assignmentSubmission.create({
        data: {
          assignmentId: assignment.id,
          enrollmentId: enrollment.id,
          status: 'PENDING'
        }
      })
    );

    await Promise.all(submissionPromises);

    // Send notifications to students (integrate with existing notification service)

    // Fetch User.id for each student by joining User table using student.email
    const notificationPromises = enrollments.map(async (enrollment) => {
      const studentEmail = enrollment.student.email;
      if (!studentEmail) return null;
      const user = await prisma.user.findUnique({ where: { email: studentEmail } });
      if (!user) return null;
      return prisma.notification.create({
        data: {
          userId: user.id,
          type: 'ACADEMIC',
          priority: 'MEDIUM',
          title: 'New Assignment',
          content: `New assignment "${title}" has been assigned for ${assignment.subject.name}. Due date: ${new Date(dueDate).toLocaleDateString()}`
        }
      });
    });
    await Promise.all(notificationPromises.filter(Boolean));

    return NextResponse.json({ 
      assignment,
      message: 'Assignment created successfully and notifications sent to students'
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
