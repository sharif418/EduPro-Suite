import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// GET - Fetch staff attendance records with filtering
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
    const date = searchParams.get('date') || '';
    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {};

    if (staffId) {
      whereClause.staffId = staffId;
    }

    if (date) {
      whereClause.date = new Date(date);
    } else if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    if (status) {
      whereClause.status = status;
    }

    // Fetch attendance records with pagination
    const [attendances, totalCount] = await Promise.all([
      prisma.staffAttendance.findMany({
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
          { date: 'desc' },
          { staff: { name: 'asc' } },
        ],
        skip,
        take: limit,
      }),
      prisma.staffAttendance.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return createSuccessResponse({
      attendances,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('[STAFF_ATTENDANCE_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch attendance records');
  }
}

// POST - Mark attendance for staff
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { staffId, date, status, remarks } = body;

    // Validate required fields
    if (!staffId || !date || !status) {
      return createErrorResponse('Missing required fields: staffId, date, status', 400);
    }

    // Validate status
    const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'ON_LEAVE'];
    if (!validStatuses.includes(status)) {
      return createErrorResponse('Invalid status. Must be one of: ' + validStatuses.join(', '), 400);
    }

    // Check if staff exists
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return createErrorResponse('Staff member not found', 404);
    }

    // Check if attendance already exists for this date
    const existingAttendance = await prisma.staffAttendance.findUnique({
      where: {
        staffId_date: {
          staffId,
          date: new Date(date),
        },
      },
    });

    if (existingAttendance) {
      // Update existing attendance
      const updatedAttendance = await prisma.staffAttendance.update({
        where: {
          staffId_date: {
            staffId,
            date: new Date(date),
          },
        },
        data: {
          status,
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

      return createSuccessResponse({ attendance: updatedAttendance });
    } else {
      // Create new attendance record
      const attendance = await prisma.staffAttendance.create({
        data: {
          staffId,
          date: new Date(date),
          status,
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

      return createSuccessResponse({ attendance }, 201);
    }
  } catch (error: unknown) {
    console.error('[STAFF_ATTENDANCE_POST_ERROR]', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return createErrorResponse('Attendance already marked for this date', 400);
    }
    return createErrorResponse('Failed to mark attendance');
  }
}

// PUT - Bulk mark attendance for multiple staff
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { date, attendanceRecords } = body;

    // Validate required fields
    if (!date || !attendanceRecords || !Array.isArray(attendanceRecords)) {
      return createErrorResponse('Missing required fields: date, attendanceRecords (array)', 400);
    }

    // Validate each attendance record
    for (const record of attendanceRecords) {
      if (!record.staffId || !record.status) {
        return createErrorResponse('Each attendance record must have staffId and status', 400);
      }
    }

    // Perform bulk upsert in transaction
    const results = await prisma.$transaction(async (tx) => {
      const attendances = [];

      for (const record of attendanceRecords) {
        const attendance = await tx.staffAttendance.upsert({
          where: {
            staffId_date: {
              staffId: record.staffId,
              date: new Date(date),
            },
          },
          update: {
            status: record.status,
            remarks: record.remarks || null,
          },
          create: {
            staffId: record.staffId,
            date: new Date(date),
            status: record.status,
            remarks: record.remarks || null,
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

        attendances.push(attendance);
      }

      return attendances;
    });

    return createSuccessResponse({ attendances: results });
  } catch (error) {
    console.error('[STAFF_ATTENDANCE_BULK_ERROR]', error);
    return createErrorResponse('Failed to mark bulk attendance');
  }
}
