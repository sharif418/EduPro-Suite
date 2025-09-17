import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// GET - Fetch all grading systems with their grades
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const gradingSystems = await prisma.gradingSystem.findMany({
      include: {
        grades: {
          orderBy: {
            minPercentage: 'desc', // Order by highest percentage first
          },
        },
      },
      orderBy: {
        isDefault: 'desc', // Default systems first
      },
    });

    return createSuccessResponse({ gradingSystems });
  } catch (error) {
    console.error('[GRADING_SYSTEMS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch grading systems');
  }
}

// POST - Create new grading system with grades
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { name, isDefault, grades } = body;

    // Validate required fields
    if (!name || !grades || !Array.isArray(grades) || grades.length === 0) {
      return createErrorResponse('Missing required fields: name and grades array', 400);
    }

    // Validate grades structure
    for (const grade of grades) {
      if (!grade.gradeName || grade.minPercentage === undefined || grade.maxPercentage === undefined || grade.points === undefined) {
        return createErrorResponse('Each grade must have gradeName, minPercentage, maxPercentage, and points', 400);
      }
      
      if (grade.minPercentage >= grade.maxPercentage) {
        return createErrorResponse('minPercentage must be less than maxPercentage', 400);
      }
    }

    // Sort grades by minPercentage to check for overlaps
    const sortedGrades = [...grades].sort((a, b) => a.minPercentage - b.minPercentage);
    
    // Check for overlapping ranges
    for (let i = 0; i < sortedGrades.length - 1; i++) {
      if (sortedGrades[i].maxPercentage > sortedGrades[i + 1].minPercentage) {
        return createErrorResponse('Grade percentage ranges cannot overlap', 400);
      }
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.gradingSystem.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create grading system with grades in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const gradingSystem = await tx.gradingSystem.create({
        data: {
          name,
          isDefault: isDefault || false,
        },
      });

      const createdGrades = await Promise.all(
        grades.map((grade: any) =>
          tx.grade.create({
            data: {
              gradingSystemId: gradingSystem.id,
              gradeName: grade.gradeName,
              minPercentage: grade.minPercentage,
              maxPercentage: grade.maxPercentage,
              points: grade.points,
            },
          })
        )
      );

      return { gradingSystem, grades: createdGrades };
    });

    // Fetch the complete grading system to return
    const completeGradingSystem = await prisma.gradingSystem.findUnique({
      where: { id: result.gradingSystem.id },
      include: {
        grades: {
          orderBy: {
            minPercentage: 'desc',
          },
        },
      },
    });

    return createSuccessResponse({ gradingSystem: completeGradingSystem }, 201);
  } catch (error: any) {
    console.error('[GRADING_SYSTEMS_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Grading system with this name already exists', 400);
    }
    return createErrorResponse('Failed to create grading system');
  }
}

// PUT - Update grading system
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, name, isDefault, grades } = body;

    if (!id) {
      return createErrorResponse('Grading system ID is required', 400);
    }

    // Check if grading system exists
    const existingSystem = await prisma.gradingSystem.findUnique({
      where: { id },
      include: { grades: true },
    });

    if (!existingSystem) {
      return createErrorResponse('Grading system not found', 404);
    }

    // If this is set as default, unset other defaults
    if (isDefault && !existingSystem.isDefault) {
      await prisma.gradingSystem.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update grading system
      const updatedSystem = await tx.gradingSystem.update({
        where: { id },
        data: {
          name: name || existingSystem.name,
          isDefault: isDefault !== undefined ? isDefault : existingSystem.isDefault,
        },
      });

      // If grades are provided, update them
      if (grades && Array.isArray(grades)) {
        // Delete existing grades
        await tx.grade.deleteMany({
          where: { gradingSystemId: id },
        });

        // Create new grades
        await Promise.all(
          grades.map((grade: any) =>
            tx.grade.create({
              data: {
                gradingSystemId: id,
                gradeName: grade.gradeName,
                minPercentage: grade.minPercentage,
                maxPercentage: grade.maxPercentage,
                points: grade.points,
              },
            })
          )
        );
      }

      return updatedSystem;
    });

    // Fetch the complete updated grading system
    const completeGradingSystem = await prisma.gradingSystem.findUnique({
      where: { id },
      include: {
        grades: {
          orderBy: {
            minPercentage: 'desc',
          },
        },
      },
    });

    return createSuccessResponse({ gradingSystem: completeGradingSystem });
  } catch (error: any) {
    console.error('[GRADING_SYSTEMS_PUT_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Grading system with this name already exists', 400);
    }
    return createErrorResponse('Failed to update grading system');
  }
}

// DELETE - Delete grading system
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Grading system ID is required', 400);
    }

    // Check if grading system exists
    const existingSystem = await prisma.gradingSystem.findUnique({
      where: { id },
      include: {
        results: true, // Check if it's being used in results
      },
    });

    if (!existingSystem) {
      return createErrorResponse('Grading system not found', 404);
    }

    // Prevent deletion if it's being used in results
    if (existingSystem.results.length > 0) {
      return createErrorResponse('Cannot delete grading system that is being used in results', 400);
    }

    // Delete grading system (grades will be deleted due to cascade)
    await prisma.gradingSystem.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Grading system deleted successfully' });
  } catch (error) {
    console.error('[GRADING_SYSTEMS_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete grading system');
  }
}
