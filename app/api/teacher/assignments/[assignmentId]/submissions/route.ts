import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyTeacherAuth } from '@/app/lib/auth-helpers';


export async function GET(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = params;

    // Get teacher's staff record
    const teacher = await prisma.staff.findUnique({
      where: { email: user.email }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Verify teacher owns this assignment
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId: teacher.id
      },
      include: {
        classLevel: true,
        section: true,
        subject: true
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 });
    }

    // Get all submissions for this assignment
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        enrollment: {
          include: {
            student: true
          }
        },
        grader: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { 
          enrollment: {
            student: {
              name: 'asc'
            }
          }
        }
      ]
    });

    return NextResponse.json({ 
      assignment,
      submissions
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = params;
    const body = await request.json();
    const { submissions } = body; // Array of { submissionId, marksObtained, feedback }

    // Get teacher's staff record
    const teacher = await prisma.staff.findUnique({
      where: { email: user.email }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Verify teacher owns this assignment
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId: teacher.id
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 });
    }

    // Update submissions in bulk
    const updatePromises = submissions.map((submission: any) =>
      prisma.assignmentSubmission.update({
        where: { id: submission.submissionId },
        data: {
          marksObtained: submission.marksObtained ? parseInt(submission.marksObtained) : null,
          feedback: submission.feedback || null,
          status: submission.marksObtained !== null ? 'GRADED' : 'SUBMITTED',
          gradedAt: submission.marksObtained !== null ? new Date() : null,
          gradedBy: submission.marksObtained !== null ? teacher.id : null
        }
      })
    );

    await Promise.all(updatePromises);

    // Send notifications to students about their grades
    const gradedSubmissions = submissions.filter((s: any) => s.marksObtained !== null);
    if (gradedSubmissions.length > 0) {
      // Get graded submission details with student email
      const submissionDetails = await prisma.assignmentSubmission.findMany({
        where: {
          id: { in: gradedSubmissions.map((s: any) => s.submissionId) }
        },
        include: {
          enrollment: {
            include: {
              student: true
            }
          }
        }
      });

      // Use helper to resolve userId by student email
      const notificationPromises = submissionDetails.map(async (submission) => {
        const studentEmail = submission.enrollment.student.email;
        const userId = await import('@/app/lib/auth-helpers').then(m => m.resolveUserIdByEmail(studentEmail));
        if (!userId) return null;
        return prisma.notification.create({
          data: {
            userId,
            type: 'ACADEMIC',
            priority: 'MEDIUM',
            title: 'Assignment Graded',
            content: `Your assignment "${assignment.title}" has been graded. Marks: ${submission.marksObtained}/${assignment.maxMarks || 'N/A'}`
          }
        });
      });
      await Promise.all(notificationPromises.map(p => p && typeof p.then === 'function' ? p : Promise.resolve(null)));
    }

    return NextResponse.json({ 
      message: `Successfully graded ${submissions.length} submissions`,
      gradedCount: gradedSubmissions.length
    });
  } catch (error) {
    console.error('Error grading submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
