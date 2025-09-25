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
  validateRequiredFields,
  sanitizeObject,
  parsePaginationParams,
  createPaginationMeta
} from '@/app/lib/api-helpers';


// Helper function to generate unique student ID
async function generateStudentId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `STU-${currentYear}-`;
  
  // Find the last student ID for this year
  const lastStudent = await prisma.student.findFirst({
    where: {
      studentId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      studentId: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastStudent) {
    const lastNumber = parseInt(lastStudent.studentId.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

// GET - Fetch students with advanced filtering and pagination
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
    const academicYearId = searchParams.get('academicYearId') || '';
    const classLevelId = searchParams.get('classLevelId') || '';
    const sectionId = searchParams.get('sectionId') || '';
    const gender = searchParams.get('gender') || '';

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: any = {};

    // Search by name or student ID
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { studentId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by gender
    if (gender) {
      whereClause.gender = gender;
    }

    // Filter by enrollment (academic year, class, section)
    if (academicYearId || classLevelId || sectionId) {
      whereClause.enrollments = {
        some: {
          ...(academicYearId && { academicYearId }),
          ...(classLevelId && { classLevelId }),
          ...(sectionId && { sectionId }),
        },
      };
    }

    // Fetch students with pagination
    const [students, totalCount] = await Promise.all([
      prisma.student.findMany({
        where: whereClause,
        include: {
          guardian: true,
          address: true,
          enrollments: {
            include: {
              academicYear: true,
              classLevel: true,
              section: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1, // Get latest enrollment
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.student.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return createSuccessResponse({
      students,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      return handlePrismaError(error);
    }

    // Log the error for monitoring
    logApiError(error as Error, {
      path: '/api/admin/students',
      userId: 'admin-user',
      userRole: 'ADMIN'
    });

    return createErrorResponse(
      'Failed to fetch students',
      500,
      'STUDENTS_FETCH_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}

// POST - Create new student (admission process)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED');
    }

    const body = await request.json();
    const {
      // Student information
      name,
      email,
      dateOfBirth,
      gender,
      bloodGroup,
      religion,
      nationality,
      studentPhotoUrl,
      admissionDate,
      // Guardian information
      guardianName,
      relationToStudent,
      guardianContactNumber,
      guardianEmail,
      guardianOccupation,
      // Address information
      presentAddress,
      permanentAddress,
      // Academic information
      academicYearId,
      classLevelId,
      sectionId,
      rollNumber,
    } = body;

    // Validate required fields
    if (!name || !dateOfBirth || !gender || !admissionDate || !guardianName || !relationToStudent || !guardianContactNumber || !presentAddress || !permanentAddress || !academicYearId || !classLevelId || !sectionId) {
      return createErrorResponse('Missing required fields', 400);
    }

    // Check if roll number is already taken in the section for the academic year
    if (rollNumber) {
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          sectionId_academicYearId_rollNumber: {
            sectionId,
            academicYearId,
            rollNumber: parseInt(rollNumber),
          },
        },
      });

      if (existingEnrollment) {
        return createErrorResponse('Roll number already exists in this section for the academic year', 400);
      }
    }

    // Generate unique student ID
    const studentId = await generateStudentId();

    // Generate temporary password and invitation token
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Perform database transaction to create all related records
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or find guardian
      let guardian;
      if (guardianEmail) {
        guardian = await tx.guardian.findFirst({
          where: { email: guardianEmail },
        });
      }

      if (!guardian) {
        guardian = await tx.guardian.create({
          data: {
            name: guardianName,
            relationToStudent,
            contactNumber: guardianContactNumber,
            email: guardianEmail || null,
            occupation: guardianOccupation || null,
          },
        });
      }

      // 2. Create student address
      const address = await tx.studentAddress.create({
        data: {
          presentAddress,
          permanentAddress,
        },
      });

      // 3. Create User account if email is provided
      let userAccount = null;
      if (email) {
        // Check if user with this email already exists
        const existingUser = await tx.user.findUnique({
          where: { email: email.toLowerCase().trim() },
        });

        if (existingUser) {
          throw new Error('User with this email already exists');
        }

        userAccount = await tx.user.create({
          data: {
            name,
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role: 'STUDENT',
          },
        });
      }

      // 4. Create student
      const student = await tx.student.create({
        data: {
          studentId,
          name,
          email: email || null,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          bloodGroup: bloodGroup || null,
          religion: religion || null,
          nationality: nationality || null,
          studentPhotoUrl: studentPhotoUrl || null,
          admissionDate: new Date(admissionDate),
          guardianId: guardian.id,
          addressId: address.id,
        },
      });

      // 5. Create enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          studentId: student.id,
          classLevelId,
          sectionId,
          academicYearId,
          rollNumber: rollNumber ? parseInt(rollNumber) : await getNextRollNumber(tx, sectionId, academicYearId),
        },
      });

      return { student, guardian, address, enrollment, userAccount, tempPassword, invitationToken };
    });

    // Send email invitation if email is provided
    let emailSent = false;
    let emailError = null;

    if (email && result.userAccount) {
      try {
        const classLevel = await prisma.classLevel.findUnique({
          where: { id: classLevelId },
        });

        const section = await prisma.section.findUnique({
          where: { id: sectionId },
        });

        // Create a mock notification object for the email service
        const mockNotification = {
          id: `student-welcome-${Date.now()}`,
          userId: result.userAccount.id,
          type: 'ACADEMIC',
          priority: 'MEDIUM',
          title: 'Welcome to EduPro Suite - Student Account Created',
          content: `Dear ${name},\n\nYour student account has been created successfully. Here are your login credentials:\n\nStudent ID: ${studentId}\nEmail: ${email}\nTemporary Password: ${result.tempPassword}\nClass: ${classLevel?.name} - ${section?.name}\n\nImportant: Please change your password after your first login for security.\n\nYou can access your student portal at: ${process.env.NEXT_PUBLIC_APP_URL}/en/student\n\nIf you have any questions, please contact your school administration.\n\nBest regards,\nEduPro Suite Team`,
          createdAt: new Date().toISOString(),
          user: {
            id: result.userAccount.id,
            email: email,
            name: name,
          },
          data: {
            actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/en/student`,
            studentId,
            tempPassword: result.tempPassword,
            className: `${classLevel?.name} - ${section?.name}`,
          }
        };

        const emailResult = await emailService.sendNotification(mockNotification);
        
        if (emailResult.success) {
          emailSent = true;
          console.log(`[STUDENT_CREATION] Email invitation sent to ${email}`);
        } else {
          emailError = emailResult.error || 'Failed to send email';
        }
      } catch (error) {
        console.error('[STUDENT_EMAIL_ERROR]', error);
        emailError = error instanceof Error ? error.message : 'Failed to send email';
        // Don't fail the entire operation if email fails
      }
    }

    // Fetch the complete student data to return
    const completeStudent = await prisma.student.findUnique({
      where: { id: result.student.id },
      include: {
        guardian: true,
        address: true,
        enrollments: {
          include: {
            academicYear: true,
            classLevel: true,
            section: true,
          },
        },
      },
    });

    const responseData = {
      student: completeStudent,
      userAccount: result.userAccount ? {
        id: result.userAccount.id,
        email: result.userAccount.email,
        role: result.userAccount.role,
      } : null,
      invitation: {
        emailSent,
        emailError,
        tempPassword: result.userAccount ? result.tempPassword : null,
        invitationToken: result.userAccount ? result.invitationToken : null,
      },
    };

    const response = createSuccessResponse(responseData, 201, 'Student created successfully');
    return addSecurityHeaders(response);
  } catch (error: any) {
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      return handlePrismaError(error);
    }

    // Log the error for monitoring
    logApiError(error as Error, {
      path: '/api/admin/students',
      userId: 'admin-user',
      userRole: 'ADMIN'
    });

    return createErrorResponse(
      'Failed to create student',
      500,
      'STUDENT_CREATION_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}

// OPTIONS - Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const response = createSuccessResponse(null, 200);
  return addSecurityHeaders(response);
}

// Helper function to get next available roll number
async function getNextRollNumber(tx: any, sectionId: string, academicYearId: string): Promise<number> {
  const lastEnrollment = await tx.enrollment.findFirst({
    where: {
      sectionId,
      academicYearId,
    },
    orderBy: {
      rollNumber: 'desc',
    },
  });

  return lastEnrollment ? lastEnrollment.rollNumber + 1 : 1;
}
