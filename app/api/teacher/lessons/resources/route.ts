import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

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
      fileName,
      fileUrl,
      fileType,
      fileSize,
      resourceType = 'DOCUMENT',
      description,
    } = body;

    // Validate required fields
    if (!lessonPlanId || !fileName || !fileUrl || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify teacher owns the lesson plan
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

    // Validate file size (max 50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/avi',
      'audio/mp3',
      'audio/wav',
      'text/plain',
    ];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Create the lesson resource
    const resource = await prisma.lessonResource.create({
      data: {
        fileName,
        fileUrl,
        fileType,
        fileSize,
        resourceType,
        description,
        lessonPlanId,
        uploadedById: teacher.id,
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson resource:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson resource' },
      { status: 500 }
    );
  }
}

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

    // Verify teacher owns the lesson plan
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

    // Get resources for the lesson plan
    const resources = await prisma.lessonResource.findMany({
      where: {
        lessonPlanId,
      },
      include: {
        uploadedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Error fetching lesson resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson resources' },
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
    const resourceId = searchParams.get('id');

    if (!resourceId) {
      return NextResponse.json(
        { error: 'Resource ID is required' },
        { status: 400 }
      );
    }

    // Verify teacher owns the resource
    const resource = await prisma.lessonResource.findFirst({
      where: {
        id: resourceId,
        uploadedById: teacher.id,
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete the resource
    await prisma.lessonResource.delete({
      where: { id: resourceId },
    });

    return NextResponse.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson resource:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson resource' },
      { status: 500 }
    );
  }
}
