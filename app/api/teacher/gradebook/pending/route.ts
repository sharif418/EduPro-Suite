import { NextRequest } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'TEACHER') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacher = await prisma.staff.findFirst({
      where: { user: { email: user.email } }
    });

    if (!teacher) {
      return Response.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    // Get pending assignment submissions
    const pendingSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignment: {
          teacherId: teacher.id
        },
        status: 'SUBMITTED',
        gradedAt: null
      },
      include: {
        assignment: {
          include: {
            subject: true,
            classLevel: true,
            section: true
          }
        },
        enrollment: {
          include: {
            student: true
          }
        }
      },
      orderBy: { submissionDate: 'asc' },
      take: 50
    });

    const formattedSubmissions = pendingSubmissions.map(submission => ({
      id: submission.id,
      assignmentTitle: submission.assignment.title,
      subject: submission.assignment.subject.name,
      class: `${submission.assignment.classLevel.name} - ${submission.assignment.section.name}`,
      studentName: submission.enrollment.student.name,
      studentId: submission.enrollment.student.studentId,
      submissionDate: submission.submissionDate,
      maxMarks: submission.assignment.maxMarks,
      fileUrls: submission.fileUrls,
      daysWaiting: Math.floor((Date.now() - new Date(submission.submissionDate!).getTime()) / (1000 * 60 * 60 * 24))
    }));

    return Response.json({
      success: true,
      pendingSubmissions: formattedSubmissions,
      totalPending: formattedSubmissions.length
    });

  } catch (error) {
    console.error('[TEACHER_PENDING_GRADEBOOK_ERROR]', error);
    return Response.json({ success: false, error: 'Failed to fetch pending grades' }, { status: 500 });
  }
}
