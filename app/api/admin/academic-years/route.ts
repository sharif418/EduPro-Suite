import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// GET - Fetch all academic years
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const academicYears = await prisma.academicYear.findMany({
      orderBy: { year: 'desc' },
    });

    return createSuccessResponse({ academicYears });
  } catch (error) {
    console.error('[ACADEMIC_YEARS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch academic years');
  }
}

// POST - Create a new academic year
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { year, startDate, endDate, isCurrent } = body;

    // Validate required fields
    if (!year || !startDate || !endDate) {
      return createErrorResponse('Year, start date, and end date are required', 400);
    }

    // If setting as current, unset all other years
    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isCurrent: isCurrent || false,
      },
    });

    return createSuccessResponse({ academicYear }, 201);
  } catch (error: any) {
    console.error('[ACADEMIC_YEARS_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Academic year already exists', 400);
    }
    return createErrorResponse('Failed to create academic year');
  }
}

// PUT - Update an academic year
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, year, startDate, endDate, isCurrent } = body;

    if (!id) {
      return createErrorResponse('Academic year ID is required', 400);
    }

    // If setting as current, unset all other years
    if (isCurrent) {
      await prisma.academicYear.updateMany({
        where: { 
          isCurrent: true,
          NOT: { id }
        },
        data: { isCurrent: false },
      });
    }

    const updateData: any = {};
    if (year !== undefined) updateData.year = year;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isCurrent !== undefined) updateData.isCurrent = isCurrent;

    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: updateData,
    });

    return createSuccessResponse({ academicYear });
  } catch (error: any) {
    console.error('[ACADEMIC_YEARS_PUT_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Academic year not found', 404);
    }
    if (error.code === 'P2002') {
      return createErrorResponse('Academic year already exists', 400);
    }
    return createErrorResponse('Failed to update academic year');
  }
}

// DELETE - Delete an academic year
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Academic year ID is required', 400);
    }

    await prisma.academicYear.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Academic year deleted successfully' });
  } catch (error: any) {
    console.error('[ACADEMIC_YEARS_DELETE_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Academic year not found', 404);
    }
    return createErrorResponse('Failed to delete academic year');
  }
}
