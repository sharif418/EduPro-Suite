import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper function to generate unique staff ID
async function generateStaffId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `EMP-${currentYear}-`;
  
  // Find the last staff ID for this year
  const lastStaff = await prisma.staff.findFirst({
    where: {
      staffId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      staffId: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastStaff) {
    const lastNumber = parseInt(lastStaff.staffId.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
}

// GET - Fetch staff with advanced filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const designation = searchParams.get('designation') || '';
    const gender = searchParams.get('gender') || '';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: Record<string, unknown> = {};

    // Search by name, staff ID, or email
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { staffId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by department
    if (department) {
      whereClause.department = { contains: department, mode: 'insensitive' };
    }

    // Filter by designation
    if (designation) {
      whereClause.designation = { contains: designation, mode: 'insensitive' };
    }

    // Filter by gender
    if (gender) {
      whereClause.gender = gender;
    }

    // Fetch staff with pagination
    const [staff, totalCount] = await Promise.all([
      prisma.staff.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
          address: true,
          _count: {
            select: {
              attendances: true,
              leaveRequests: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.staff.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Get unique departments and designations for filtering
    const [departments, designations] = await Promise.all([
      prisma.staff.findMany({
        select: { department: true },
        distinct: ['department'],
        orderBy: { department: 'asc' },
      }),
      prisma.staff.findMany({
        select: { designation: true },
        distinct: ['designation'],
        orderBy: { designation: 'asc' },
      }),
    ]);

    return createSuccessResponse({
      staff,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
      filters: {
        departments: departments.map(d => d.department),
        designations: designations.map(d => d.designation),
      },
    });
  } catch (error) {
    console.error('[STAFF_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch staff');
  }
}

// POST - Create new staff (hiring process)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

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
      joiningDate,
      // Address information
      presentAddress,
      permanentAddress,
      // User account information
      password = 'staff123', // Default password
    } = body;

    // Validate required fields
    if (!name || !email || !dateOfBirth || !gender || !contactNumber || !designation || !department || !qualification || !joiningDate || !presentAddress || !permanentAddress) {
      return createErrorResponse('Missing required fields', 400);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createErrorResponse('Email already exists', 400);
    }

    // Generate unique staff ID
    const staffId = await generateStaffId();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Perform database transaction to create all related records
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user account
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'TEACHER', // Default role for staff
        },
      });

      // 2. Create staff address
      const address = await tx.staffAddress.create({
        data: {
          presentAddress,
          permanentAddress,
        },
      });

      // 3. Create staff record
      const staff = await tx.staff.create({
        data: {
          staffId,
          name,
          email,
          designation,
          department,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          contactNumber,
          joiningDate: new Date(joiningDate),
          qualification,
          userId: newUser.id,
          addressId: address.id,
        },
      });

      return { staff, user: newUser, address };
    });

    // Fetch the complete staff data to return
    const completeStaff = await prisma.staff.findUnique({
      where: { id: result.staff.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        address: true,
      },
    });

    return createSuccessResponse({ staff: completeStaff }, 201);
  } catch (error: unknown) {
    console.error('[STAFF_POST_ERROR]', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return createErrorResponse('Staff with this email or staff ID already exists', 400);
    }
    return createErrorResponse('Failed to create staff member');
  }
}
