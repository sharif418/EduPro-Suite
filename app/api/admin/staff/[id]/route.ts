import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// GET - Fetch single staff member details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { id } = await params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        address: true,
        attendances: {
          orderBy: { date: 'desc' },
          take: 30, // Last 30 attendance records
        },
        leaveRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 leave requests
        },
        _count: {
          select: {
            attendances: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!staff) {
      return createErrorResponse('Staff member not found', 404);
    }

    return createSuccessResponse({ staff });
  } catch (error) {
    console.error('[STAFF_GET_BY_ID_ERROR]', error);
    return createErrorResponse('Failed to fetch staff member');
  }
}

// PUT - Update staff member details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();

    const {
      // Personal information
      name,
      email,
      dateOfBirth,
      gender,
      contactNumber,
      // Professional information
      designation,
      department,
      qualification,
      // Address information
      presentAddress,
      permanentAddress,
    } = body;

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
      include: { user: true, address: true },
    });

    if (!existingStaff) {
      return createErrorResponse('Staff member not found', 404);
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingStaff.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: existingStaff.userId },
        },
      });

      if (emailExists) {
        return createErrorResponse('Email already exists', 400);
      }
    }

    // Perform database transaction to update all related records
    const result = await prisma.$transaction(async (tx) => {
      // Update user if email changed
      if (email && email !== existingStaff.email) {
        await tx.user.update({
          where: { id: existingStaff.userId },
          data: { email, name },
        });
      } else if (name && name !== existingStaff.name) {
        await tx.user.update({
          where: { id: existingStaff.userId },
          data: { name },
        });
      }

      // Update address if provided
      if (presentAddress || permanentAddress) {
        await tx.staffAddress.update({
          where: { id: existingStaff.addressId },
          data: {
            ...(presentAddress && { presentAddress }),
            ...(permanentAddress && { permanentAddress }),
          },
        });
      }

      // Update staff record
      const updatedStaff = await tx.staff.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
          ...(gender && { gender }),
          ...(contactNumber && { contactNumber }),
          ...(designation && { designation }),
          ...(department && { department }),
          ...(qualification && { qualification }),
        },
      });

      return updatedStaff;
    });

    // Fetch the complete updated staff data
    const completeStaff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        address: true,
      },
    });

    return createSuccessResponse({ staff: completeStaff });
  } catch (error: any) {
    console.error('[STAFF_PUT_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Email already exists', 400);
    }
    return createErrorResponse('Failed to update staff member');
  }
}

// DELETE - Remove staff member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { id } = await params;

    // Check if staff exists
    const existingStaff = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingStaff) {
      return createErrorResponse('Staff member not found', 404);
    }

    // Perform database transaction to delete all related records
    await prisma.$transaction(async (tx) => {
      // Delete staff record (this will cascade to address, attendances, and leave requests)
      await tx.staff.delete({
        where: { id },
      });

      // Delete user account
      await tx.user.delete({
        where: { id: existingStaff.userId },
      });
    });

    return createSuccessResponse({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('[STAFF_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete staff member');
  }
}
