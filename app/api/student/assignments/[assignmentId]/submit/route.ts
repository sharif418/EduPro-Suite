import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAuth } from '@/app/lib/auth-helpers';


export async function POST(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = params;
    const body = await request.json();
    const { fileUrls, textSubmission } = body;

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

    // Verify assignment exists and is for student's class, include teacher userId
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        classLevelId: enrollment.classLevelId,
        sectionId: enrollment.sectionId
      },
      include: {
        teacher: {
          select: {
            name: true,
            email: true,
            userId: true
          }
        }
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found or not accessible' }, { status: 404 });
    }

    // Check if assignment is still open for submission
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (now > dueDate) {
      return NextResponse.json({ error: 'Assignment submission deadline has passed' }, { status: 400 });
    }

    // Get existing submission
    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_enrollmentId: {
          assignmentId,
          enrollmentId: enrollment.id
        }
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission record not found' }, { status: 404 });
    }

    if (existingSubmission.status === 'GRADED') {
      return NextResponse.json({ error: 'Cannot resubmit a graded assignment' }, { status: 400 });
    }

    // Prepare submission data
    const submissionData: any = {
      submissionDate: new Date(),
      status: 'SUBMITTED'
    };

    if (fileUrls && fileUrls.length > 0) {
      submissionData.fileUrls = fileUrls;
    }

    if (textSubmission) {
      submissionData.fileUrls = submissionData.fileUrls || [];
      submissionData.fileUrls.push({
        type: 'text',
        content: textSubmission,
        submittedAt: new Date().toISOString()
      });
    }

    // Update submission
    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: existingSubmission.id },
      data: submissionData
    });

    // Send notification to teacher (use teacher.userId if available)
    if (assignment.teacher && assignment.teacher.userId) {
      await prisma.notification.create({
        data: {
          userId: assignment.teacher.userId,
          type: 'ACADEMIC',
          priority: 'MEDIUM',
          title: 'New Assignment Submission',
          content: `${student.name} has submitted assignment "${assignment.title}"`
        }
      });
    }

    return NextResponse.json({ 
      submission: updatedSubmission,
      message: 'Assignment submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = params;
    const body = await request.json();
    const { fileUrls, textSubmission } = body;

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

    // Verify assignment exists and allows resubmission
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        classLevelId: enrollment.classLevelId,
        sectionId: enrollment.sectionId
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found or not accessible' }, { status: 404 });
    }

    // Check if assignment is still open for resubmission
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    
    if (now > dueDate) {
      return NextResponse.json({ error: 'Assignment resubmission deadline has passed' }, { status: 400 });
    }

    // Get existing submission
    const existingSubmission = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_enrollmentId: {
          assignmentId,
          enrollmentId: enrollment.id
        }
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission record not found' }, { status: 404 });
    }

    if (existingSubmission.status === 'GRADED') {
      return NextResponse.json({ error: 'Cannot resubmit a graded assignment' }, { status: 400 });
    }

    // Prepare resubmission data
    const submissionData: any = {
      submissionDate: new Date(),
      status: 'SUBMITTED',
      // Reset grading fields on resubmission
      marksObtained: null,
      feedback: null,
      gradedAt: null,
      gradedBy: null
    };

    if (fileUrls && fileUrls.length > 0) {
      submissionData.fileUrls = fileUrls;
    }

    if (textSubmission) {
      submissionData.fileUrls = submissionData.fileUrls || [];
      submissionData.fileUrls.push({
        type: 'text',
        content: textSubmission,
        resubmittedAt: new Date().toISOString()
      });
    }

    // Update submission
    const updatedSubmission = await prisma.assignmentSubmission.update({
      where: { id: existingSubmission.id },
      data: submissionData
    });

    return NextResponse.json({ 
      submission: updatedSubmission,
      message: 'Assignment resubmitted successfully'
    });
  } catch (error) {
    console.error('Error resubmitting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
