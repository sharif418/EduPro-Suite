import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher's staff record
    const teacher = await prisma.staff.findUnique({
      where: { email: user.email }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Get teacher's class assignments with related data
    const teacherAssignments = await prisma.teacherClassAssignment.findMany({
      where: {
        teacherId: teacher.id,
      },
      include: {
        classLevel: true,
        section: true,
        subject: true,
      },
    });

    // Extract unique class levels
    const classLevels = Array.from(
      new Map(
        teacherAssignments.map(assignment => [
          assignment.classLevel.id,
          {
            id: assignment.classLevel.id,
            name: assignment.classLevel.name,
          }
        ])
      ).values()
    );

    // Group sections by class level
    const sectionsByClass: Record<string, Array<{ id: string; name: string }>> = {};
    teacherAssignments.forEach(assignment => {
      const classLevelId = assignment.classLevel.id;
      if (!sectionsByClass[classLevelId]) {
        sectionsByClass[classLevelId] = [];
      }
      
      // Check if section already exists for this class
      const existingSection = sectionsByClass[classLevelId].find(
        section => section.id === assignment.section.id
      );
      
      if (!existingSection) {
        sectionsByClass[classLevelId].push({
          id: assignment.section.id,
          name: assignment.section.name,
        });
      }
    });

    // Extract unique subjects
    const subjects = Array.from(
      new Map(
        teacherAssignments.map(assignment => [
          assignment.subject.id,
          {
            id: assignment.subject.id,
            name: assignment.subject.name,
            code: assignment.subject.subjectCode,
          }
        ])
      ).values()
    );

    return NextResponse.json({
      classLevels,
      sectionsByClass,
      subjects,
    });
  } catch (error) {
    console.error('Error fetching teacher metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher metadata' },
      { status: 500 }
    );
  }
}
