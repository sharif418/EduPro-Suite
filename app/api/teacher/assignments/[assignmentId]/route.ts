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

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId: teacher.id
      },
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
          },
          orderBy: {
            enrollment: {
              student: {
                name: 'asc'
              }
            }
          }
        },
        files: true
      }
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Calculate statistics
    const stats = {
      totalStudents: assignment.submissions.length,
      pendingSubmissions: assignment.submissions.filter((s: any) => s.status === 'PENDING').length,
      submittedCount: assignment.submissions.filter((s: any) => s.status === 'SUBMITTED').length,
      gradedCount: assignment.submissions.filter((s: any) => s.status === 'GRADED').length,
      averageMarks: assignment.submissions
        .filter((s: any) => s.marksObtained !== null)
        .reduce((sum: number, s: any) => sum + (s.marksObtained || 0), 0) / 
        assignment.submissions.filter((s: any) => s.marksObtained !== null).length || 0,
      onTimeSubmissions: assignment.submissions.filter((s: any) => 
        s.submissionDate && new Date(s.submissionDate) <= new Date(assignment.dueDate)
      ).length,
      lateSubmissions: assignment.submissions.filter((s: any) => 
        s.submissionDate && new Date(s.submissionDate) > new Date(assignment.dueDate)
      ).length
    };

    return NextResponse.json({ 
      assignment: {
        ...assignment,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
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
    const { title, description, instructions, dueDate, maxMarks } = body;

    // Get teacher's staff record
    const teacher = await prisma.staff.findUnique({
      where: { email: user.email }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Verify teacher owns this assignment
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId: teacher.id
      }
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 });
    }

    // Update assignment
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title,
        description,
        instructions,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        maxMarks: maxMarks ? parseInt(maxMarks) : null
      },
      include: {
        classLevel: true,
        section: true,
        subject: true
      }
    });

    return NextResponse.json({ 
      assignment: updatedAssignment,
      message: 'Assignment updated successfully'
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        teacherId: teacher.id
      }
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Assignment not found or access denied' }, { status: 404 });
    }

    // Check if there are any submissions
    const submissionCount = await prisma.assignmentSubmission.count({
      where: { assignmentId }
    });

    if (submissionCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete assignment with existing submissions. Please contact administrator.' 
      }, { status: 400 });
    }

    // Delete assignment (this will cascade delete submissions due to schema)
    await prisma.assignment.delete({
      where: { id: assignmentId }
    });

    return NextResponse.json({ 
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
