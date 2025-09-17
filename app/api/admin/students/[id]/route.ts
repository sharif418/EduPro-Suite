import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// GET - Fetch single student details
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

    const student = await prisma.student.findUnique({
      where: { id },
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
        },
      },
    });

    if (!student) {
      return createErrorResponse('Student not found', 404);
    }

    return createSuccessResponse({ student });
  } catch (error) {
    console.error('[STUDENT_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch student');
  }
}

// PUT - Update student details
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
      // Student information
      name,
      email,
      dateOfBirth,
      gender,
      bloodGroup,
      religion,
      nationality,
      studentPhotoUrl,
      // Guardian information
      guardianName,
      relationToStudent,
      guardianContactNumber,
      guardianEmail,
      guardianOccupation,
      // Address information
      presentAddress,
      permanentAddress,
    } = body;

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: {
        guardian: true,
        address: true,
      },
    });

    if (!existingStudent) {
      return createErrorResponse('Student not found', 404);
    }

    // Perform database transaction to update all related records
    const result = await prisma.$transaction(async (tx) => {
      // Update guardian information
      if (guardianName || relationToStudent || guardianContactNumber || guardianEmail || guardianOccupation) {
        await tx.guardian.update({
          where: { id: existingStudent.guardianId },
          data: {
            ...(guardianName && { name: guardianName }),
            ...(relationToStudent && { relationToStudent }),
            ...(guardianContactNumber && { contactNumber: guardianContactNumber }),
            ...(guardianEmail !== undefined && { email: guardianEmail || null }),
            ...(guardianOccupation !== undefined && { occupation: guardianOccupation || null }),
          },
        });
      }

      // Update address information
      if (presentAddress || permanentAddress) {
        await tx.studentAddress.update({
          where: { id: existingStudent.addressId },
          data: {
            ...(presentAddress && { presentAddress }),
            ...(permanentAddress && { permanentAddress }),
          },
        });
      }

      // Update student information
      const updateData: any = {};
      if (name) updateData.name = name;
      if (email !== undefined) updateData.email = email || null;
      if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
      if (gender) updateData.gender = gender;
      if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup || null;
      if (religion !== undefined) updateData.religion = religion || null;
      if (nationality !== undefined) updateData.nationality = nationality || null;
      if (studentPhotoUrl !== undefined) updateData.studentPhotoUrl = studentPhotoUrl || null;

      if (Object.keys(updateData).length > 0) {
        await tx.student.update({
          where: { id },
          data: updateData,
        });
      }

      return true;
    });

    // Fetch updated student data
    const updatedStudent = await prisma.student.findUnique({
      where: { id },
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
        },
      },
    });

    return createSuccessResponse({ student: updatedStudent });
  } catch (error: any) {
    console.error('[STUDENT_PUT_ERROR]', error);
    if (error.code === 'P2002') {
      return createErrorResponse('Student with this email already exists', 400);
    }
    return createErrorResponse('Failed to update student');
  }
}

// DELETE - Delete student and related records
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

    // Check if student exists
    const existingStudent = await prisma.student.findUnique({
      where: { id },
      include: {
        guardian: {
          include: {
            students: true, // Check if guardian has other students
          },
        },
        address: true,
        enrollments: true,
      },
    });

    if (!existingStudent) {
      return createErrorResponse('Student not found', 404);
    }

    // Perform database transaction to delete all related records
    await prisma.$transaction(async (tx) => {
      // Delete enrollments first (due to foreign key constraints)
      await tx.enrollment.deleteMany({
        where: { studentId: id },
      });

      // Delete student (this will cascade delete the address due to onDelete: Cascade)
      await tx.student.delete({
        where: { id },
      });

      // Delete guardian only if they have no other students
      if (existingStudent.guardian.students.length === 1) {
        await tx.guardian.delete({
          where: { id: existingStudent.guardianId },
        });
      }
    });

    return createSuccessResponse({ message: 'Student deleted successfully' });
  } catch (error: any) {
    console.error('[STUDENT_DELETE_ERROR]', error);
    if (error.code === 'P2025') {
      return createErrorResponse('Student not found', 404);
    }
    return createErrorResponse('Failed to delete student');
  }
}
