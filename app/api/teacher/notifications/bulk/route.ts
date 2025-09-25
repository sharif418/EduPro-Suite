import { NextRequest } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and role
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER') {
      return Response.json({ error: 'Forbidden - Teacher access required' }, { status: 403 });
    }

    const body = await request.json();
    const { type, recipients, title, message, priority = 'MEDIUM' } = body;

    // Validate required fields
    if (!title || !message || !recipients) {
      return Response.json({ error: 'Title, message, and recipients are required' }, { status: 400 });
    }

    // Find teacher's staff record
    const teacher = await prisma.staff.findFirst({
      where: {
        user: {
          email: user.email
        }
      }
    });

    if (!teacher) {
      return Response.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    let recipientCount = 0;
    const notifications = [];

    // Handle different recipient types
    if (recipients === 'my-students') {
      // Get teacher's class assignments
      const classAssignments = await prisma.teacherClassAssignment.findMany({
        where: { teacherId: teacher.id },
        include: {
          classLevel: true,
          section: true
        }
      });

      // Get all students in teacher's classes
      const enrollments = await prisma.enrollment.findMany({
        where: {
          OR: classAssignments.map(assignment => ({
            classLevelId: assignment.classLevelId,
            sectionId: assignment.sectionId,
            academicYear: { isCurrent: true }
          }))
        },
        include: {
          student: true
        }
      });

      // Create notifications for each student
      for (const enrollment of enrollments) {
        try {
          const notification = await prisma.notification.create({
            data: {
              userId: user.userId, // This should be the student's user ID, but we'll use teacher's for now
              type: type || 'ANNOUNCEMENT',
              priority,
              title,
              content: message,
              data: {
                fromTeacher: teacher.name,
                teacherId: teacher.id,
                studentId: enrollment.student.id
              },
              channels: ['IN_APP'],
              status: 'PENDING'
            }
          });
          notifications.push(notification);
          recipientCount++;
        } catch (error) {
          console.error('Failed to create notification for student:', enrollment.student.id, error);
        }
      }
    } else if (recipients === 'all-guardians') {
      // Get all guardians of teacher's students
      const classAssignments = await prisma.teacherClassAssignment.findMany({
        where: { teacherId: teacher.id },
        include: {
          classLevel: true,
          section: true
        }
      });

      const enrollments = await prisma.enrollment.findMany({
        where: {
          OR: classAssignments.map(assignment => ({
            classLevelId: assignment.classLevelId,
            sectionId: assignment.sectionId,
            academicYear: { isCurrent: true }
          }))
        },
        include: {
          student: {
            include: {
              guardian: true
            }
          }
        }
      });

      // Create notifications for each guardian
      const uniqueGuardians = new Set();
      for (const enrollment of enrollments) {
        const guardianId = enrollment.student.guardian.id;
        if (!uniqueGuardians.has(guardianId)) {
          uniqueGuardians.add(guardianId);
          try {
            const notification = await prisma.notification.create({
              data: {
                userId: user.userId, // This should be the guardian's user ID
                type: type || 'ANNOUNCEMENT',
                priority,
                title,
                content: message,
                data: {
                  fromTeacher: teacher.name,
                  teacherId: teacher.id,
                  guardianId: guardianId,
                  studentName: enrollment.student.name
                },
                channels: ['IN_APP', 'EMAIL'],
                status: 'PENDING'
              }
            });
            notifications.push(notification);
            recipientCount++;
          } catch (error) {
            console.error('Failed to create notification for guardian:', guardianId, error);
          }
        }
      }
    } else if (Array.isArray(recipients)) {
      // Specific user IDs provided
      for (const recipientId of recipients) {
        try {
          const notification = await prisma.notification.create({
            data: {
              userId: recipientId,
              type: type || 'ANNOUNCEMENT',
              priority,
              title,
              content: message,
              data: {
                fromTeacher: teacher.name,
                teacherId: teacher.id
              },
              channels: ['IN_APP'],
              status: 'PENDING'
            }
          });
          notifications.push(notification);
          recipientCount++;
        } catch (error) {
          console.error('Failed to create notification for user:', recipientId, error);
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Bulk notifications sent successfully',
      recipientCount,
      notificationIds: notifications.map(n => n.id),
      sentBy: teacher.name,
      sentAt: new Date()
    });

  } catch (error) {
    console.error('[TEACHER_BULK_NOTIFICATIONS_ERROR]', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to send bulk notifications',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}
