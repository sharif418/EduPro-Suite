import { NextRequest } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAdminAuth } from '@/app/lib/auth-helpers';
import { emailService } from '@/app/lib/email-service';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handlePrismaError,
  logApiError,
  addSecurityHeaders,
  checkRateLimit,
  getClientIP
} from '@/app/lib/api-helpers';


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
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED');
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
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      return handlePrismaError(error);
    }

    // Log the error for monitoring
    logApiError(error as Error, {
      path: '/api/admin/staff',
      userRole: 'ADMIN'
    });

    return createErrorResponse(
      'Failed to fetch staff',
      500,
      'STAFF_FETCH_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}

// POST - Create new staff (hiring process)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED');
    }

    // Rate limiting check
    const rateLimitResult = checkRateLimit(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 staff creation attempts per IP per 15 minutes
      keyGenerator: (req) => `staff-create:${getClientIP(req)}`
    });

    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many staff creation attempts. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        { resetTime: rateLimitResult.resetTime }
      );
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
      role = 'TEACHER', // Default role for staff
    } = body;

    // Validate required fields
    if (!name || !email || !dateOfBirth || !gender || !contactNumber || !designation || !department || !qualification || !joiningDate || !presentAddress || !permanentAddress) {
      return createErrorResponse('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    // Validate role against allowed roles
    const allowedRoles = ['TEACHER', 'ACCOUNTANT', 'LIBRARIAN', 'ADMIN'];
    if (!allowedRoles.includes(role)) {
      return createErrorResponse(
        `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`,
        400,
        'INVALID_ROLE'
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return createErrorResponse('Email already exists', 400, 'EMAIL_EXISTS');
    }

    // Generate unique staff ID
    const staffId = await generateStaffId();

    // Generate secure temporary password and invitation token
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Perform database transaction to create all related records
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user account
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: role as any,
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
          email: email.toLowerCase().trim(),
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

      return { staff, user: newUser, address, tempPassword, invitationToken };
    });

    // Send email invitation
    let emailSent = false;
    let emailError = null;

    try {
      // Create a mock notification object for the email service
      const mockNotification = {
        id: `staff-welcome-${Date.now()}`,
        userId: result.user.id,
        type: 'SYSTEM',
        priority: 'HIGH',
        title: 'Welcome to EduPro Suite - Staff Account Created',
        content: `Dear ${name},\n\nWelcome to EduPro Suite! Your staff account has been created successfully.\n\nHere are your login credentials:\n\nStaff ID: ${staffId}\nEmail: ${email}\nTemporary Password: ${result.tempPassword}\nRole: ${role}\nDepartment: ${department}\nDesignation: ${designation}\n\nImportant: Please change your password after your first login for security.\n\nYou can access your ${role.toLowerCase()} portal at: ${process.env.NEXT_PUBLIC_APP_URL}/en/${role.toLowerCase()}\n\nIf you have any questions, please contact the system administrator.\n\nBest regards,\nEduPro Suite Team`,
        createdAt: new Date().toISOString(),
        user: {
          id: result.user.id,
          email: email,
          name: name,
        },
        data: {
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/en/${role.toLowerCase()}`,
          staffId,
          tempPassword: result.tempPassword,
          role,
          department,
          designation,
        }
      };

      const emailResult = await emailService.sendNotification(mockNotification);
      
      if (emailResult.success) {
        emailSent = true;
        console.log(`[STAFF_CREATION] Email invitation sent to ${email}`);
      } else {
        emailError = emailResult.error || 'Failed to send email';
      }

    } catch (error) {
      console.error('[STAFF_EMAIL_ERROR]', error);
      emailError = error instanceof Error ? error.message : 'Failed to send email';
      // Don't fail the entire operation if email fails
    }

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

    const responseData = {
      staff: completeStaff,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
      },
      invitation: {
        emailSent,
        emailError,
        tempPassword: result.tempPassword,
        invitationToken: result.invitationToken,
      },
    };

    const response = createSuccessResponse(responseData, 201, 'Staff member created successfully');
    return addSecurityHeaders(response);
  } catch (error: unknown) {
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      return handlePrismaError(error);
    }

    // Log the error for monitoring
    logApiError(error as Error, {
      path: '/api/admin/staff',
      userRole: 'ADMIN'
    });

    return createErrorResponse(
      'Failed to create staff member',
      500,
      'STAFF_CREATE_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = createSuccessResponse(null, 200);
  return addSecurityHeaders(response);
}
