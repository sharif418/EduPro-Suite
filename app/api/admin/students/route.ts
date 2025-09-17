import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

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
      return createUnauthorizedResponse();
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
    console.error('[STUDENTS_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch students');
  }
}

// POST - Create new student (admission process)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
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

      // 3. Create student
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

      // 4. Create enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          studentId: student.id,
          classLevelId,
          sectionId,
          academicYearId,
          rollNumber: rollNumber ? parseInt(rollNumber) : await getNextRollNumber(tx, sectionId, academicYearId),
        },
      });

      return { student, guardian, address, enrollment };
    });

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

    return createSuccessResponse({ student: completeStudent }, 201);
  } catch (error: any) {
    console.error('[STUDENTS_POST_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Student with this email or student ID already exists', 400);
    }
    return createErrorResponse('Failed to create student');
  }
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
