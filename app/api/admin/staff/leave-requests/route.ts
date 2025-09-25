import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';


// GET - Fetch leave requests with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const staffId = searchParams.get('staffId') || '';
    const status = searchParams.get('status') || '';
    const leaveType = searchParams.get('leaveType') || '';
    const year = searchParams.get('year') || '';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {};

    if (staffId) {
      whereClause.staffId = staffId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (leaveType) {
      whereClause.leaveType = { contains: leaveType, mode: 'insensitive' };
    }

    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      whereClause.startDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Fetch leave requests with pagination
    const [leaveRequests, totalCount] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: whereClause,
        include: {
          staff: {
            select: {
              id: true,
              staffId: true,
              name: true,
              designation: true,
              department: true,
            },
          },
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.leaveRequest.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Get unique leave types for filtering
    const leaveTypes = await prisma.leaveRequest.findMany({
      select: { leaveType: true },
      distinct: ['leaveType'],
      orderBy: { leaveType: 'asc' },
    });

    return createSuccessResponse({
      leaveRequests,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
      filters: {
        leaveTypes: leaveTypes.map(lt => lt.leaveType),
      },
    });
  } catch (error) {
    console.error('[LEAVE_REQUESTS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch leave requests');
  }
}

// POST - Create new leave request (for teachers)
export async function POST(request: NextRequest) {
  try {
    // For leave requests, we need to allow both admin and teacher access
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return createUnauthorizedResponse();
    }

    // We'll implement teacher auth verification later
    // For now, let's use admin auth
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { staffId, leaveType, startDate, endDate, reason } = body;

    // Validate required fields
    if (!staffId || !leaveType || !startDate || !endDate || !reason) {
      return createErrorResponse('Missing required fields: staffId, leaveType, startDate, endDate, reason', 400);
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return createErrorResponse('Start date cannot be after end date', 400);
    }

    if (start < new Date()) {
      return createErrorResponse('Cannot apply for leave in the past', 400);
    }

    // Check if staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return createErrorResponse('Staff member not found', 404);
    }

    // Check for overlapping leave requests
    const overlappingLeave = await prisma.leaveRequest.findFirst({
      where: {
        staffId,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlappingLeave) {
      return createErrorResponse('Leave request overlaps with existing leave', 400);
    }

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        staffId,
        leaveType,
        startDate: start,
        endDate: end,
        reason,
        status: 'PENDING',
      },
      include: {
        staff: {
          select: {
            id: true,
            staffId: true,
            name: true,
            designation: true,
            department: true,
          },
        },
      },
    });

    return createSuccessResponse({ leaveRequest }, 201);
  } catch (error) {
    console.error('[LEAVE_REQUEST_POST_ERROR]', error);
    return createErrorResponse('Failed to create leave request');
  }
}

// PUT - Update leave request status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { leaveRequestId, status, remarks } = body;

    // Validate required fields
    if (!leaveRequestId || !status) {
      return createErrorResponse('Missing required fields: leaveRequestId, status', 400);
    }

    // Validate status
    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return createErrorResponse('Invalid status. Must be APPROVED or REJECTED', 400);
    }

    // Check if leave request exists
    const existingLeaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        staff: {
          select: {
            id: true,
            staffId: true,
            name: true,
            designation: true,
            department: true,
          },
        },
      },
    });

    if (!existingLeaveRequest) {
      return createErrorResponse('Leave request not found', 404);
    }

    if (existingLeaveRequest.status !== 'PENDING') {
      return createErrorResponse('Leave request has already been processed', 400);
    }

    // Update leave request
    const updatedLeaveRequest = await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status,
        approvedBy: user.userId,
        approvedAt: new Date(),
        remarks: remarks || null,
      },
      include: {
        staff: {
          select: {
            id: true,
            staffId: true,
            name: true,
            designation: true,
            department: true,
          },
        },
      },
    });

    return createSuccessResponse({ leaveRequest: updatedLeaveRequest });
  } catch (error) {
    console.error('[LEAVE_REQUEST_PUT_ERROR]', error);
    return createErrorResponse('Failed to update leave request');
  }
}
