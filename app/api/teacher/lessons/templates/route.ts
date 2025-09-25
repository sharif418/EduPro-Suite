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
    const subjectId = searchParams.get('subjectId');
    const category = searchParams.get('category');
    const isPublic = searchParams.get('isPublic');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {
      OR: [
        { createdById: teacher.id },
        { isPublic: true },
      ],
    };

    if (subjectId) where.subjectId = subjectId;
    if (category) where.category = category;
    if (isPublic !== null) where.isPublic = isPublic === 'true';

    const [templates, total] = await Promise.all([
      prisma.lessonTemplate.findMany({
        where,
        include: {
          subject: true,
          createdBy: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              lessonPlans: true,
            },
          },
        },
        orderBy: [
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lessonTemplate.count({ where }),
    ]);

    return NextResponse.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching lesson templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson templates' },
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
      title,
      description,
      objectives,
      activities,
      duration,
      assessmentMethods,
      category,
      isPublic,
      subjectId,
      fromLessonPlanId,
    } = body;

    // Validate required fields
    if (!title || !subjectId) {
      return NextResponse.json(
        { error: 'Title and subject are required' },
        { status: 400 }
      );
    }

    let templateData: any = {
      title,
      description,
      objectives: objectives || [],
      activities: activities || [],
      duration: duration || 60,
      assessmentMethods: assessmentMethods || [],
      category,
      isPublic: isPublic || false,
      subjectId,
      createdById: teacher.id,
    };

    // If creating from existing lesson plan
    if (fromLessonPlanId) {
      const lessonPlan = await prisma.lessonPlan.findFirst({
        where: {
          id: fromLessonPlanId,
          teacherId: teacher.id,
        },
      });

      if (!lessonPlan) {
        return NextResponse.json(
          { error: 'Lesson plan not found or unauthorized' },
          { status: 404 }
        );
      }

      templateData = {
        ...templateData,
        title: templateData.title || `${lessonPlan.title} Template`,
        description: templateData.description || lessonPlan.description,
        objectives: templateData.objectives.length > 0 ? templateData.objectives : lessonPlan.objectives,
        activities: templateData.activities.length > 0 ? templateData.activities : lessonPlan.activities,
        duration: templateData.duration || lessonPlan.duration,
        assessmentMethods: templateData.assessmentMethods.length > 0 ? templateData.assessmentMethods : lessonPlan.assessmentMethods,
        subjectId: templateData.subjectId || lessonPlan.subjectId,
      };
    }

    const template = await prisma.lessonTemplate.create({
      data: templateData,
      include: {
        subject: true,
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson template:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson template' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingTemplate = await prisma.lessonTemplate.findFirst({
      where: {
        id,
        createdById: teacher.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      );
    }

    const updatedTemplate = await prisma.lessonTemplate.update({
      where: { id },
      data: updateData,
      include: {
        subject: true,
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating lesson template:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingTemplate = await prisma.lessonTemplate.findFirst({
      where: {
        id,
        createdById: teacher.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.lessonTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson template:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson template' },
      { status: 500 }
    );
  }
}
