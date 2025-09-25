import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get student information with current enrollment
    const student = await prisma.student.findUnique({
      where: { email: user.email },
      include: {
        enrollments: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get the most recent enrollment
          include: {
            classLevel: true,
            section: true,
          },
        },
      },
    });

    if (!student || student.enrollments.length === 0) {
      return NextResponse.json({ error: 'Student enrollment not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const currentEnrollment = student.enrollments[0];

    // Build where clause for shared lessons
    const where: any = {
      lessonPlan: {
        status: 'PUBLISHED', // Only show published lessons
      },
      isActive: true,
      OR: [
        // Lessons shared with the entire class
        {
          sharedWith: 'CLASS',
          classLevelId: currentEnrollment.classLevelId,
        },
        // Lessons shared with the specific section
        {
          sharedWith: 'SECTION',
          classLevelId: currentEnrollment.classLevelId,
          sectionId: currentEnrollment.sectionId,
        },
        // Lessons shared individually with this student
        {
          sharedWith: 'INDIVIDUAL',
          studentId: student.id,
        },
      ],
    };

    // Add subject filter if provided
    if (subjectId) {
      where.lessonPlan.subjectId = subjectId;
    }

    // Add date range filter if provided
    if (startDate && endDate) {
      where.lessonPlan.lessonDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // For now, return empty array until migration is complete
    // This will be replaced with proper lessonShare queries once Prisma client is updated
    const lessons: any[] = [];
    const total = 0;

    return NextResponse.json({
      lessons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching student lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
