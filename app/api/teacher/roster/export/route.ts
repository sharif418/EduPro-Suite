import { NextRequest, NextResponse } from 'next/server';
import { verifyTeacherAuth } from '../../../../lib/auth-helpers';
import { prisma } from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyTeacherAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const format = searchParams.get('format') || 'json';

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Get teacher's staff record
    const teacherStaff = await prisma.staff.findFirst({
      where: {
        userId: user.userId
      }
    });

    if (!teacherStaff) {
      return NextResponse.json({ error: 'Teacher staff record not found' }, { status: 404 });
    }

    // Parse class ID to get class level and section
    const [classLevelId, sectionId] = classId.split('-');

    // Verify teacher has access to this class
    const teacherClass = await prisma.teacherClassAssignment.findFirst({
      where: {
        teacherId: teacherStaff.id,
        classLevelId: classLevelId,
        sectionId: sectionId
      }
    });

    if (!teacherClass) {
      return NextResponse.json({ error: 'Access denied to this class' }, { status: 403 });
    }

    // Get class information
    const classInfo = await prisma.classLevel.findUnique({
      where: { id: classLevelId },
      include: {
        sections: {
          where: { id: sectionId },
          include: {
            enrollments: {
              include: {
                student: {
                  include: {
                    guardian: true,
                    address: true
                  }
                },
                studentAttendances: {
                  orderBy: { date: 'desc' },
                  take: 30 // Last 30 attendance records
                }
              },
              orderBy: { rollNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!classInfo || !classInfo.sections[0]) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    const section = classInfo.sections[0];
    const students = section.enrollments.map(enrollment => {
      // Calculate attendance percentage
      const totalDays = enrollment.studentAttendances.length;
      const presentDays = enrollment.studentAttendances.filter(
        att => att.status === 'PRESENT'
      ).length;
      const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      // Get last attendance
      const lastAttendance = enrollment.studentAttendances[0];

      return {
        id: enrollment.student.id,
        studentId: enrollment.student.studentId,
        name: enrollment.student.name,
        rollNumber: enrollment.rollNumber,
        email: enrollment.student.email,
        dateOfBirth: enrollment.student.dateOfBirth,
        gender: enrollment.student.gender,
        bloodGroup: enrollment.student.bloodGroup,
        religion: enrollment.student.religion,
        nationality: enrollment.student.nationality,
        admissionDate: enrollment.student.admissionDate,
        attendancePercentage,
        lastAttendance: lastAttendance ? {
          date: lastAttendance.date,
          status: lastAttendance.status
        } : null,
        guardian: {
          name: enrollment.student.guardian.name,
          relation: enrollment.student.guardian.relationToStudent,
          contactNumber: enrollment.student.guardian.contactNumber,
          email: enrollment.student.guardian.email,
          occupation: enrollment.student.guardian.occupation
        },
        address: {
          present: enrollment.student.address.presentAddress,
          permanent: enrollment.student.address.permanentAddress
        }
      };
    });

    const exportData = {
      class: {
        name: `${classInfo.name} - ${section.name}`,
        level: classInfo.name,
        section: section.name,
        totalStudents: students.length
      },
      exportDate: new Date().toISOString(),
      exportedBy: user.name,
      students
    };

    // Handle different export formats
    switch (format.toLowerCase()) {
      case 'json':
        return NextResponse.json({
          success: true,
          data: exportData
        });

      case 'csv':
        const csvHeaders = [
          'Roll Number',
          'Student ID',
          'Name',
          'Email',
          'Date of Birth',
          'Gender',
          'Blood Group',
          'Religion',
          'Nationality',
          'Admission Date',
          'Attendance %',
          'Last Attendance Date',
          'Last Attendance Status',
          'Guardian Name',
          'Guardian Relation',
          'Guardian Contact',
          'Guardian Email',
          'Guardian Occupation',
          'Present Address',
          'Permanent Address'
        ];

        const csvRows = students.map(student => [
          student.rollNumber,
          student.studentId,
          student.name,
          student.email || '',
          student.dateOfBirth.toISOString().split('T')[0],
          student.gender,
          student.bloodGroup || '',
          student.religion || '',
          student.nationality || '',
          student.admissionDate.toISOString().split('T')[0],
          student.attendancePercentage,
          student.lastAttendance?.date.toISOString().split('T')[0] || '',
          student.lastAttendance?.status || '',
          student.guardian.name,
          student.guardian.relation,
          student.guardian.contactNumber,
          student.guardian.email || '',
          student.guardian.occupation || '',
          student.address.present,
          student.address.permanent
        ]);

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${classInfo.name}-${section.name}-roster.csv"`
          }
        });

      case 'excel':
        // For Excel format, we'll return JSON with a special header
        // The frontend can use a library like xlsx to convert this to Excel
        return NextResponse.json({
          success: true,
          data: exportData,
          format: 'excel'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Export-Format': 'excel',
            'X-Filename': `${classInfo.name}-${section.name}-roster.xlsx`
          }
        });

      case 'pdf':
        // For PDF format, we'll return JSON with a special header
        // The frontend can use a library like jsPDF to convert this to PDF
        return NextResponse.json({
          success: true,
          data: exportData,
          format: 'pdf'
        }, {
          headers: {
            'Content-Type': 'application/json',
            'X-Export-Format': 'pdf',
            'X-Filename': `${classInfo.name}-${section.name}-roster.pdf`
          }
        });

      default:
        return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error exporting roster:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
