import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

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
    const classLevelId = searchParams.get('classLevelId');
    const sectionId = searchParams.get('sectionId');
    const subjectId = searchParams.get('subjectId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: any = {
      teacherId: teacher.id,
    };

    if (classLevelId) where.classLevelId = classLevelId;
    if (sectionId) where.sectionId = sectionId;
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;
    if (startDate && endDate) {
      where.lessonDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [lessonPlans, total] = await Promise.all([
      prisma.lessonPlan.findMany({
        where,
        include: {
          classLevel: true,
          section: true,
          subject: true,
          template: true,
          resources: true,
          shares: {
            include: {
              classLevel: true,
              section: true,
              student: true,
            },
          },
          _count: {
            select: {
              resources: true,
              shares: true,
            },
          },
        },
        orderBy: { lessonDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lessonPlan.count({ where }),
    ]);

    return NextResponse.json({
      lessonPlans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson plans' },
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
      lessonDate,
      assessmentMethods,
      notes,
      classLevelId,
      sectionId,
      subjectId,
      templateId,
      status = 'DRAFT',
    } = body;

    // Validate required fields
    if (!title || !classLevelId || !sectionId || !subjectId || !lessonDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify teacher has access to the class/section/subject
    const teacherAssignment = await prisma.teacherClassAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        classLevelId,
        sectionId,
        subjectId,
      },
    });

    if (!teacherAssignment) {
      return NextResponse.json(
        { error: 'Unauthorized to create lesson for this class/subject' },
        { status: 403 }
      );
    }

    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        title,
        description,
        objectives: objectives || [],
        activities: activities || [],
        duration: duration || 60,
        lessonDate: new Date(lessonDate),
        assessmentMethods: assessmentMethods || [],
        notes,
        classLevelId,
        sectionId,
        subjectId,
        teacherId: teacher.id,
        templateId,
        status,
      },
      include: {
        classLevel: true,
        section: true,
        subject: true,
        template: true,
        resources: true,
        shares: true,
      },
    });

    // Update template usage count if template was used
    if (templateId) {
      await prisma.lessonTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return NextResponse.json(lessonPlan, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson plan:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson plan' },
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
        { error: 'Lesson plan ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingLesson = await prisma.lessonPlan.findFirst({
      where: {
        id,
        teacherId: teacher.id,
      },
    });

    if (!existingLesson) {
      return NextResponse.json(
        { error: 'Lesson plan not found or unauthorized' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateFields: any = {};
    if (updateData.title) updateFields.title = updateData.title;
    if (updateData.description !== undefined) updateFields.description = updateData.description;
    if (updateData.objectives) updateFields.objectives = updateData.objectives;
    if (updateData.activities) updateFields.activities = updateData.activities;
    if (updateData.duration) updateFields.duration = updateData.duration;
    if (updateData.lessonDate) updateFields.lessonDate = new Date(updateData.lessonDate);
    if (updateData.assessmentMethods) updateFields.assessmentMethods = updateData.assessmentMethods;
    if (updateData.notes !== undefined) updateFields.notes = updateData.notes;
    if (updateData.status) updateFields.status = updateData.status;

    const updatedLessonPlan = await prisma.lessonPlan.update({
      where: { id },
      data: updateFields,
      include: {
        classLevel: true,
        section: true,
        subject: true,
        template: true,
        resources: true,
        shares: true,
      },
    });

    return NextResponse.json(updatedLessonPlan);
  } catch (error) {
    console.error('Error updating lesson plan:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson plan' },
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
        { error: 'Lesson plan ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingLesson = await prisma.lessonPlan.findFirst({
      where: {
        id,
        teacherId: teacher.id,
      },
    });

    if (!existingLesson) {
      return NextResponse.json(
        { error: 'Lesson plan not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.lessonPlan.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Lesson plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson plan' },
      { status: 500 }
    );
  }
}
