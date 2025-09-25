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
    const lessonPlanId = searchParams.get('lessonPlanId');

    if (!lessonPlanId) {
      return NextResponse.json(
        { error: 'Lesson plan ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership of lesson plan
    const lessonPlan = await prisma.lessonPlan.findFirst({
      where: {
        id: lessonPlanId,
        teacherId: teacher.id,
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { error: 'Lesson plan not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get all shares for this lesson plan
    const shares = await prisma.lessonShare.findMany({
      where: {
        lessonPlanId,
        sharedById: teacher.id,
      },
      include: {
        classLevel: true,
        section: true,
        student: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ shares });
  } catch (error) {
    console.error('Error fetching lesson shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson shares' },
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
      sharedWith,
      classLevelId,
      sectionId,
      studentIds,
      permissions = 'VIEW_ONLY',
    } = body;

    // Validate required fields
    if (!lessonPlanId || !sharedWith) {
      return NextResponse.json(
        { error: 'Lesson plan ID and share target are required' },
        { status: 400 }
      );
    }

    // Verify ownership of lesson plan
    const lessonPlan = await prisma.lessonPlan.findFirst({
      where: {
        id: lessonPlanId,
        teacherId: teacher.id,
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { error: 'Lesson plan not found or unauthorized' },
        { status: 404 }
      );
    }

    const shares = [];

    if (sharedWith === 'CLASS' && classLevelId) {
      // Share with entire class
      const share = await prisma.lessonShare.create({
        data: {
          lessonPlanId,
          sharedWith: 'CLASS',
          classLevelId,
          permissions,
          sharedById: teacher.id,
        },
        include: {
          classLevel: true,
        },
      });
      shares.push(share);
    } else if (sharedWith === 'SECTION' && classLevelId && sectionId) {
      // Share with specific section
      const share = await prisma.lessonShare.create({
        data: {
          lessonPlanId,
          sharedWith: 'SECTION',
          classLevelId,
          sectionId,
          permissions,
          sharedById: teacher.id,
        },
        include: {
          classLevel: true,
          section: true,
        },
      });
      shares.push(share);
    } else if (sharedWith === 'INDIVIDUAL' && studentIds && studentIds.length > 0) {
      // Share with individual students
      const sharePromises = studentIds.map((studentId: string) =>
        prisma.lessonShare.create({
          data: {
            lessonPlanId,
            sharedWith: 'INDIVIDUAL',
            studentId,
            permissions,
            sharedById: teacher.id,
          },
          include: {
            student: true,
          },
        })
      );
      const individualShares = await Promise.all(sharePromises);
      shares.push(...individualShares);
    } else {
      return NextResponse.json(
        { error: 'Invalid sharing configuration' },
        { status: 400 }
      );
    }

    return NextResponse.json({ shares }, { status: 201 });
  } catch (error) {
    console.error('Error sharing lesson plan:', error);
    return NextResponse.json(
      { error: 'Failed to share lesson plan' },
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
    const { shareId, permissions, isActive } = body;

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingShare = await prisma.lessonShare.findFirst({
      where: {
        id: shareId,
        sharedById: teacher.id,
      },
    });

    if (!existingShare) {
      return NextResponse.json(
        { error: 'Share not found or unauthorized' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (permissions) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedShare = await prisma.lessonShare.update({
      where: { id: shareId },
      data: updateData,
      include: {
        classLevel: true,
        section: true,
        student: true,
      },
    });

    return NextResponse.json(updatedShare);
  } catch (error) {
    console.error('Error updating lesson share:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson share' },
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
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Share ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existingShare = await prisma.lessonShare.findFirst({
      where: {
        id: shareId,
        sharedById: teacher.id,
      },
    });

    if (!existingShare) {
      return NextResponse.json(
        { error: 'Share not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.lessonShare.delete({
      where: { id: shareId },
    });

    return NextResponse.json({ message: 'Share removed successfully' });
  } catch (error) {
    console.error('Error removing lesson share:', error);
    return NextResponse.json(
      { error: 'Failed to remove lesson share' },
      { status: 500 }
    );
  }
}
