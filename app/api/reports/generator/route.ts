import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has appropriate permissions
    if (!['ADMIN', 'TEACHER', 'PRINCIPAL'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'general';
    const period = searchParams.get('period') || 'current-month';
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');

    // Generate report based on type
    let reportData;
    switch (reportType) {
      case 'attendance':
        reportData = await generateAttendanceReport(period, classId);
        break;
      case 'performance':
        reportData = await generatePerformanceReport(period, classId, subjectId);
        break;
      case 'financial':
        reportData = await generateFinancialReport(period);
        break;
      case 'academic':
        reportData = await generateAcademicReport(period, classId);
        break;
      default:
        reportData = await generateGeneralReport(period);
    }

    return NextResponse.json({
      success: true,
      reportType,
      period,
      generatedAt: new Date().toISOString(),
      data: reportData,
      downloadUrl: `/api/reports/download/${reportData.id}`,
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate report',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'TEACHER', 'PRINCIPAL'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { reportType, parameters, format = 'json' } = body;

    // Generate custom report with parameters
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock report generation
    const reportData = {
      id: reportId,
      type: reportType,
      parameters,
      format,
      status: 'generated',
      summary: {
        totalRecords: Math.floor(Math.random() * 1000) + 100,
        averageScore: Math.floor(Math.random() * 30) + 70,
        trends: 'positive',
      },
      generatedBy: user.userId,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      reportId,
      status: 'generated',
      downloadUrl: `/api/reports/download/${reportId}`,
      data: reportData,
    });

  } catch (error) {
    console.error('Custom report generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate custom report',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// Helper functions for different report types
async function generateAttendanceReport(period: string, classId?: string | null) {
  // Mock attendance report data
  return {
    id: `attendance_${Date.now()}`,
    type: 'attendance',
    period,
    classId,
    summary: {
      totalStudents: 150,
      averageAttendance: 92,
      perfectAttendance: 45,
      lowAttendance: 8,
    },
    details: [
      { date: '2024-01-15', present: 142, absent: 8, late: 0 },
      { date: '2024-01-16', present: 145, absent: 5, late: 0 },
      { date: '2024-01-17', present: 138, absent: 12, late: 0 },
    ],
  };
}

async function generatePerformanceReport(period: string, classId?: string | null, subjectId?: string | null) {
  // Mock performance report data
  return {
    id: `performance_${Date.now()}`,
    type: 'performance',
    period,
    classId,
    subjectId,
    summary: {
      averageGrade: 78,
      highPerformers: 25,
      needsAttention: 12,
      improvement: '+5%',
    },
    subjectBreakdown: [
      { subject: 'Mathematics', average: 82, students: 150 },
      { subject: 'Science', average: 79, students: 150 },
      { subject: 'English', average: 85, students: 150 },
    ],
  };
}

async function generateFinancialReport(period: string) {
  // Mock financial report data
  return {
    id: `financial_${Date.now()}`,
    type: 'financial',
    period,
    summary: {
      totalRevenue: 250000,
      totalExpenses: 180000,
      netIncome: 70000,
      outstandingFees: 45000,
    },
    breakdown: {
      tuitionFees: 200000,
      examFees: 30000,
      libraryFees: 20000,
      salaries: 120000,
      utilities: 25000,
      maintenance: 35000,
    },
  };
}

async function generateAcademicReport(period: string, classId?: string | null) {
  // Mock academic report data
  return {
    id: `academic_${Date.now()}`,
    type: 'academic',
    period,
    classId,
    summary: {
      totalStudents: 150,
      passRate: 94,
      averageGPA: 3.2,
      honorsStudents: 28,
    },
    gradeDistribution: {
      'A+': 15,
      'A': 25,
      'A-': 30,
      'B+': 35,
      'B': 25,
      'B-': 15,
      'C+': 5,
    },
  };
}

async function generateGeneralReport(period: string) {
  // Mock general report data
  return {
    id: `general_${Date.now()}`,
    type: 'general',
    period,
    summary: {
      totalStudents: 150,
      totalTeachers: 25,
      totalClasses: 12,
      averageAttendance: 92,
      averagePerformance: 78,
    },
    highlights: [
      'Attendance improved by 5% this month',
      'Mathematics scores increased significantly',
      'New teacher training program launched',
      'Parent engagement activities successful',
    ],
  };
}
