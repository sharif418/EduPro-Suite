import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyTeacherAuth } from '@/app/lib/auth-helpers';


export async function GET(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher's staff record
    const teacher = await prisma.staff.findUnique({
      where: { email: user.email }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view') || 'month'; // month, week, day

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Get lesson plans within date range
    const lessonPlans = await prisma.lessonPlan.findMany({
      where: {
        teacherId: teacher.id,
        lessonDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        classLevel: true,
        section: true,
        subject: true,
        resources: true,
        _count: {
          select: {
            resources: true,
            shares: true,
          },
        },
      },
      orderBy: { lessonDate: 'asc' },
    });

    // Transform to calendar events format
    const events = lessonPlans.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      start: lesson.lessonDate,
      end: new Date(lesson.lessonDate.getTime() + lesson.duration * 60000), // Add duration in milliseconds
      description: lesson.description,
      status: lesson.status,
      classLevel: lesson.classLevel.name,
      section: lesson.section.name,
      subject: lesson.subject.name,
      duration: lesson.duration,
      resourceCount: lesson._count.resources,
      shareCount: lesson._count.shares,
      backgroundColor: getStatusColor(lesson.status),
      borderColor: getStatusColor(lesson.status),
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching lesson calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson calendar' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher's staff record
    const teacher = await prisma.staff.findUnique({
      where: { email: user.email }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      lessonPlanId,
      newDate,
      newTime,
    } = body;

    if (!lessonPlanId || !newDate) {
      return NextResponse.json(
        { error: 'Lesson plan ID and new date are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingLesson = await prisma.lessonPlan.findFirst({
      where: {
        id: lessonPlanId,
        teacherId: teacher.id,
      },
    });

    if (!existingLesson) {
      return NextResponse.json(
        { error: 'Lesson plan not found or unauthorized' },
        { status: 404 }
      );
    }

    // Parse new date and time
    let newDateTime = new Date(newDate);
    if (newTime) {
      const [hours, minutes] = newTime.split(':').map(Number);
      newDateTime.setHours(hours, minutes, 0, 0);
    }

    // Check for conflicts (optional - you can implement conflict detection logic here)
    const conflictingLessons = await prisma.lessonPlan.findMany({
      where: {
        teacherId: teacher.id,
        id: { not: lessonPlanId },
        lessonDate: {
          gte: newDateTime,
          lt: new Date(newDateTime.getTime() + existingLesson.duration * 60000),
        },
      },
    });

    if (conflictingLessons.length > 0) {
      return NextResponse.json(
        { 
          error: 'Schedule conflict detected',
          conflicts: conflictingLessons.map(l => ({
            id: l.id,
            title: l.title,
            date: l.lessonDate,
          }))
        },
        { status: 409 }
      );
    }

    // Update lesson date
    const updatedLesson = await prisma.lessonPlan.update({
      where: { id: lessonPlanId },
      data: { lessonDate: newDateTime },
      include: {
        classLevel: true,
        section: true,
        subject: true,
        resources: true,
      },
    });

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error('Error rescheduling lesson:', error);
    return NextResponse.json(
      { error: 'Failed to reschedule lesson' },
      { status: 500 }
    );
  }
}

// Helper function to get status colors
function getStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT':
      return '#6c757d'; // Gray
    case 'PUBLISHED':
      return '#28a745'; // Green
    case 'ARCHIVED':
      return '#dc3545'; // Red
    default:
      return '#007bff'; // Blue
  }
}
