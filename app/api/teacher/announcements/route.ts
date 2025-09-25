import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyTeacherAuth, createErrorResponse, createSuccessResponse } from '../../../lib/auth-helpers';


// GET announcements
export async function GET(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return createErrorResponse('classId is required', 400);
    }

    const [classLevelId, sectionId] = classId.split('-');

    // Verify teacher has access to this class
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId },
      include: {
        teacherClassAssignments: {
          where: {
            classLevelId,
            sectionId
          }
        }
      }
    });

    if (!staff || staff.teacherClassAssignments.length === 0) {
      return createErrorResponse('Access denied to this class', 403);
    }

    // Get announcements for this class
    const announcements = await prisma.classAnnouncement.findMany({
      where: {
        classLevelId,
        sectionId
      },
      include: {
        author: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' }
      ]
    });

    return createSuccessResponse({ announcements });

  } catch (error) {
    console.error('[TEACHER_ANNOUNCEMENTS_GET_ERROR]', error);
    return createErrorResponse('Internal server error while fetching announcements', 500);
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create announcement
export async function POST(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const body = await request.json();
    const { title, content, classId, isPinned, attachments, expiresAt } = body;

    if (!title || !content || !classId) {
      return createErrorResponse('Missing required fields', 400);
    }

    const [classLevelId, sectionId] = classId.split('-');

    // Get teacher's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId },
      include: {
        teacherClassAssignments: {
          where: {
            classLevelId,
            sectionId
          }
        }
      }
    });

    if (!staff || staff.teacherClassAssignments.length === 0) {
      return createErrorResponse('Access denied to this class', 403);
    }

    // Create announcement
    const announcement = await prisma.classAnnouncement.create({
      data: {
        title,
        content,
        classLevelId,
        sectionId,
        authorId: staff.id,
        isPinned: isPinned || false,
        attachments: attachments || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: {
        author: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return createSuccessResponse({ 
      announcement,
      message: 'Announcement created successfully' 
    });

  } catch (error) {
    console.error('[TEACHER_ANNOUNCEMENTS_POST_ERROR]', error);
    return createErrorResponse('Internal server error while creating announcement', 500);
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update announcement
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const body = await request.json();
    const { id, title, content, isPinned, attachments, expiresAt } = body;

    if (!id) {
      return createErrorResponse('Announcement ID is required', 400);
    }

    // Get teacher's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId }
    });

    if (!staff) {
      return createErrorResponse('Staff record not found', 404);
    }

    // Verify teacher owns this announcement
    const existingAnnouncement = await prisma.classAnnouncement.findUnique({
      where: { id },
      include: {
        author: true
      }
    });

    if (!existingAnnouncement) {
      return createErrorResponse('Announcement not found', 404);
    }

    if (existingAnnouncement.authorId !== staff.id) {
      return createErrorResponse('Access denied. You can only edit your own announcements.', 403);
    }

    // Update announcement
    const updatedAnnouncement = await prisma.classAnnouncement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(isPinned !== undefined && { isPinned }),
        ...(attachments && { attachments }),
        ...(expiresAt && { expiresAt: new Date(expiresAt) })
      },
      include: {
        author: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return createSuccessResponse({ 
      announcement: updatedAnnouncement,
      message: 'Announcement updated successfully' 
    });

  } catch (error) {
    console.error('[TEACHER_ANNOUNCEMENTS_PUT_ERROR]', error);
    return createErrorResponse('Internal server error while updating announcement', 500);
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete announcement
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Announcement ID is required', 400);
    }

    // Get teacher's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId }
    });

    if (!staff) {
      return createErrorResponse('Staff record not found', 404);
    }

    // Verify teacher owns this announcement
    const existingAnnouncement = await prisma.classAnnouncement.findUnique({
      where: { id }
    });

    if (!existingAnnouncement) {
      return createErrorResponse('Announcement not found', 404);
    }

    if (existingAnnouncement.authorId !== staff.id) {
      return createErrorResponse('Access denied. You can only delete your own announcements.', 403);
    }

    // Delete announcement
    await prisma.classAnnouncement.delete({
      where: { id }
    });

    return createSuccessResponse({ message: 'Announcement deleted successfully' });

  } catch (error) {
    console.error('[TEACHER_ANNOUNCEMENTS_DELETE_ERROR]', error);
    return createErrorResponse('Internal server error while deleting announcement', 500);
  } finally {
    await prisma.$disconnect();
  }
}
