import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyTeacherAuth, createErrorResponse, createSuccessResponse } from '../../../lib/auth-helpers';


// GET seating arrangements
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

    // Get seating arrangements for this class
    const seatingArrangements = await prisma.seatingArrangement.findMany({
      where: {
        classLevelId,
        sectionId
      },
      include: {
        creator: {
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
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return createSuccessResponse({ seatingArrangements });

  } catch (error) {
    console.error('[TEACHER_SEATING_GET_ERROR]', error);
    return createErrorResponse('Internal server error while fetching seating arrangements', 500);
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create seating arrangement
export async function POST(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const body = await request.json();
    const { name, classId, layout, rows, columns, isActive } = body;

    if (!name || !classId || !layout || !rows || !columns) {
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

    // If this arrangement is set as active, deactivate others
    if (isActive) {
      await prisma.seatingArrangement.updateMany({
        where: {
          classLevelId,
          sectionId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });
    }

    // Create seating arrangement
    const seatingArrangement = await prisma.seatingArrangement.create({
      data: {
        name,
        classLevelId,
        sectionId,
        layout,
        rows: parseInt(rows),
        columns: parseInt(columns),
        createdBy: staff.id,
        isActive: isActive || false
      },
      include: {
        creator: {
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
      seatingArrangement,
      message: 'Seating arrangement created successfully' 
    });

  } catch (error) {
    console.error('[TEACHER_SEATING_POST_ERROR]', error);
    return createErrorResponse('Internal server error while creating seating arrangement', 500);
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update seating arrangement
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const body = await request.json();
    const { id, name, layout, rows, columns, isActive } = body;

    if (!id) {
      return createErrorResponse('Seating arrangement ID is required', 400);
    }

    // Get teacher's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId }
    });

    if (!staff) {
      return createErrorResponse('Staff record not found', 404);
    }

    // Verify teacher owns this seating arrangement
    const existingArrangement = await prisma.seatingArrangement.findUnique({
      where: { id }
    });

    if (!existingArrangement) {
      return createErrorResponse('Seating arrangement not found', 404);
    }

    if (existingArrangement.createdBy !== staff.id) {
      return createErrorResponse('Access denied. You can only edit your own seating arrangements.', 403);
    }

    // If this arrangement is set as active, deactivate others
    if (isActive && !existingArrangement.isActive) {
      await prisma.seatingArrangement.updateMany({
        where: {
          classLevelId: existingArrangement.classLevelId,
          sectionId: existingArrangement.sectionId,
          isActive: true,
          id: { not: id }
        },
        data: {
          isActive: false
        }
      });
    }

    // Update seating arrangement
    const updatedArrangement = await prisma.seatingArrangement.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(layout && { layout }),
        ...(rows && { rows: parseInt(rows) }),
        ...(columns && { columns: parseInt(columns) }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        creator: {
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
      seatingArrangement: updatedArrangement,
      message: 'Seating arrangement updated successfully' 
    });

  } catch (error) {
    console.error('[TEACHER_SEATING_PUT_ERROR]', error);
    return createErrorResponse('Internal server error while updating seating arrangement', 500);
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete seating arrangement
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Seating arrangement ID is required', 400);
    }

    // Get teacher's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId }
    });

    if (!staff) {
      return createErrorResponse('Staff record not found', 404);
    }

    // Verify teacher owns this seating arrangement
    const existingArrangement = await prisma.seatingArrangement.findUnique({
      where: { id }
    });

    if (!existingArrangement) {
      return createErrorResponse('Seating arrangement not found', 404);
    }

    if (existingArrangement.createdBy !== staff.id) {
      return createErrorResponse('Access denied. You can only delete your own seating arrangements.', 403);
    }

    // Delete seating arrangement
    await prisma.seatingArrangement.delete({
      where: { id }
    });

    return createSuccessResponse({ message: 'Seating arrangement deleted successfully' });

  } catch (error) {
    console.error('[TEACHER_SEATING_DELETE_ERROR]', error);
    return createErrorResponse('Internal server error while deleting seating arrangement', 500);
  } finally {
    await prisma.$disconnect();
  }
}
