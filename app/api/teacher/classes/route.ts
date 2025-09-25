import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyTeacherAuth, createErrorResponse, createSuccessResponse } from '../../../lib/auth-helpers';


export async function GET(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized. Teacher access required.', 401);
    }

    // Get teacher's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: user.userId },
      include: {
        teacherClassAssignments: {
          include: {
            classLevel: true,
            section: true,
            subject: true,
          }
        }
      }
    });

    if (!staff) {
      console.log(`[TEACHER_CLASSES] Staff record not found for user: ${user.userId}`);
      return createErrorResponse('Staff record not found. Please contact administrator.', 404);
    }

    console.log(`[TEACHER_CLASSES] Found staff record for ${user.email} with ${staff.teacherClassAssignments.length} assignments`);

    // If no class assignments, return empty array with helpful message
    if (staff.teacherClassAssignments.length === 0) {
      console.log(`[TEACHER_CLASSES] No class assignments found for teacher: ${user.email}`);
      return createSuccessResponse({
        classes: [],
        message: 'No classes assigned yet. Please contact your administrator to assign classes.'
      });
    }

    // Get unique classes (group by class and section)
    const classesMap = new Map();
    
    staff.teacherClassAssignments.forEach((assignment: any) => {
      const key = `${assignment.classLevelId}-${assignment.sectionId}`;
      if (!classesMap.has(key)) {
        classesMap.set(key, {
          id: key,
          classLevel: assignment.classLevel,
          section: assignment.section,
          subjects: [],
          isClassTeacher: assignment.isClassTeacher
        });
      }
      
      const classData = classesMap.get(key);
      classData.subjects.push(assignment.subject);
      if (assignment.isClassTeacher) {
        classData.isClassTeacher = true;
      }
    });

    const classes = Array.from(classesMap.values());

    // Get student counts for each class
    for (const classData of classes) {
      const studentCount = await prisma.enrollment.count({
        where: {
          classLevelId: classData.classLevel.id,
          sectionId: classData.section.id,
          academicYear: {
            isCurrent: true
          }
        }
      });
      classData.studentCount = studentCount;
    }

    console.log(`[TEACHER_CLASSES] Returning ${classes.length} classes for teacher: ${user.email}`);
    return createSuccessResponse({ classes });

  } catch (error) {
    console.error('[TEACHER_CLASSES_ERROR]', error);
    return createErrorResponse('Internal server error while fetching classes', 500);
  } finally {
    await prisma.$disconnect();
  }
}
