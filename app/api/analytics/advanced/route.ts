import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';
import { integrationService } from '@/app/lib/integration-service';

interface AnalyticsRequest {
  type: 'performance' | 'attendance' | 'financial' | 'resource' | 'predictive';
  timeRange: {
    startDate: string;
    endDate: string;
  };
  filters?: {
    classLevelId?: string;
    sectionId?: string;
    subjectId?: string;
    teacherId?: string;
    studentId?: string;
  };
  granularity?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  includeComparisons?: boolean;
  includePredictions?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const body: AnalyticsRequest = await request.json();

    switch (body.type) {
      case 'performance':
        return await getPerformanceAnalytics(body, user.userId);
      
      case 'attendance':
        return await getAttendanceAnalytics(body, user.userId);
      
      case 'financial':
        return await getFinancialAnalytics(body, user.userId);
      
      case 'resource':
        return await getResourceAnalytics(body, user.userId);
      
      case 'predictive':
        return await getPredictiveAnalytics(body, user.userId);
      
      default:
        return createErrorResponse('Invalid analytics type', 400);
    }
  } catch (error) {
    console.error('Advanced analytics error:', error);
    return createErrorResponse('Failed to generate analytics', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'dashboard':
        return await getDashboardAnalytics(user.userId);
      
      case 'insights':
        return await getInsights(user.userId);
      
      case 'trends':
        const period = searchParams.get('period') || '30d';
        return await getTrends(period, user.userId);
      
      case 'export':
        const format = searchParams.get('format') || 'json';
        const type = searchParams.get('type') || 'performance';
        return await exportAnalytics(type, format, user.userId);
      
      default:
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    console.error('Analytics GET error:', error);
    return createErrorResponse('Failed to process analytics request', 500);
  }
}

async function getPerformanceAnalytics(request: AnalyticsRequest, userId: string) {
  try {
    const { timeRange, filters, granularity = 'monthly' } = request;
    
    // Get student performance data
    const whereClause: any = {
      createdAt: {
        gte: new Date(timeRange.startDate),
        lte: new Date(timeRange.endDate),
      }
    };

    if (filters?.classLevelId) {
      whereClause.enrollment = {
        classLevelId: filters.classLevelId
      };
    }

    if (filters?.subjectId) {
      whereClause.examSchedule = {
        subjectId: filters.subjectId
      };
    }

    // Get marks data
    const marks = await prisma.marks.findMany({
      where: whereClause,
      include: {
        enrollment: {
          include: {
            student: true,
            classLevel: true,
            section: true,
          }
        },
        examSchedule: {
          include: {
            subject: true,
            exam: true,
          }
        },
        grade: true,
      }
    });

    // Process performance analytics
    const analytics = {
      totalAssessments: marks.length,
      averageScore: marks.length > 0 ? marks.reduce((sum, mark) => sum + mark.marksObtained, 0) / marks.length : 0,
      passRate: marks.length > 0 ? (marks.filter(mark => mark.marksObtained >= (mark.examSchedule.passMarks || 40)).length / marks.length) * 100 : 0,
      subjectPerformance: await getSubjectPerformance(marks),
      classPerformance: await getClassPerformance(marks),
      trends: await getPerformanceTrends(marks, granularity),
      topPerformers: await getTopPerformers(marks),
      improvementAreas: await getImprovementAreas(marks),
    };

    // Add predictions if requested
    if (request.includePredictions) {
      (analytics as any).predictions = await generatePerformancePredictions(marks);
    }

    return createSuccessResponse({ analytics });
  } catch (error) {
    console.error('Performance analytics error:', error);
    return createErrorResponse('Failed to generate performance analytics', 500);
  }
}

async function getAttendanceAnalytics(request: AnalyticsRequest, userId: string) {
  try {
    const { timeRange, filters } = request;
    
    const whereClause: any = {
      date: {
        gte: new Date(timeRange.startDate),
        lte: new Date(timeRange.endDate),
      }
    };

    if (filters?.classLevelId) {
      whereClause.enrollment = {
        classLevelId: filters.classLevelId
      };
    }

    // Get attendance data
    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: whereClause,
      include: {
        enrollment: {
          include: {
            student: true,
            classLevel: true,
            section: true,
          }
        }
      }
    });

    // Process attendance analytics
    const totalRecords = attendanceRecords.length;
    const presentRecords = attendanceRecords.filter(record => record.status === 'PRESENT').length;
    const absentRecords = attendanceRecords.filter(record => record.status === 'ABSENT').length;
    const lateRecords = attendanceRecords.filter(record => record.status === 'LATE').length;

    const analytics = {
      totalRecords,
      attendanceRate: totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0,
      absenteeismRate: totalRecords > 0 ? (absentRecords / totalRecords) * 100 : 0,
      lateRate: totalRecords > 0 ? (lateRecords / totalRecords) * 100 : 0,
      dailyTrends: await getDailyAttendanceTrends(attendanceRecords),
      classWiseAttendance: await getClassWiseAttendance(attendanceRecords),
      chronicAbsentees: await getChronicAbsentees(attendanceRecords),
      attendancePatterns: await getAttendancePatterns(attendanceRecords),
      earlyWarnings: await generateAttendanceWarnings(attendanceRecords),
    };

    return createSuccessResponse({ analytics });
  } catch (error) {
    console.error('Attendance analytics error:', error);
    return createErrorResponse('Failed to generate attendance analytics', 500);
  }
}

async function getFinancialAnalytics(request: AnalyticsRequest, userId: string) {
  try {
    const { timeRange } = request;
    
    // Get financial data
    const [invoices, payments, expenses] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          issueDate: {
            gte: new Date(timeRange.startDate),
            lte: new Date(timeRange.endDate),
          }
        },
        include: {
          invoiceItems: {
            include: {
              feeHead: true
            }
          },
          payments: true,
          student: true,
        }
      }),
      prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: new Date(timeRange.startDate),
            lte: new Date(timeRange.endDate),
          }
        },
        include: {
          invoice: {
            include: {
              student: true
            }
          }
        }
      }),
      prisma.expense.findMany({
        where: {
          expenseDate: {
            gte: new Date(timeRange.startDate),
            lte: new Date(timeRange.endDate),
          }
        }
      })
    ]);

    // Calculate financial metrics
    const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const totalOutstanding = invoices.reduce((sum, invoice) => {
      const paidAmount = invoice.payments.reduce((pSum, payment) => pSum + Number(payment.amountPaid), 0);
      return sum + (Number(invoice.totalAmount) - paidAmount);
    }, 0);

    const analytics = {
      revenue: {
        total: totalRevenue,
        monthly: await getMonthlyRevenue(payments),
        byFeeType: await getRevenueByFeeType(payments),
        trends: await getRevenueTrends(payments),
      },
      expenses: {
        total: totalExpenses,
        monthly: await getMonthlyExpenses(expenses),
        byCategory: await getExpensesByCategory(expenses),
        trends: await getExpenseTrends(expenses),
      },
      outstanding: {
        total: totalOutstanding,
        aged: await getAgedOutstanding(invoices),
        byClass: await getOutstandingByClass(invoices),
      },
      profitability: {
        netIncome: totalRevenue - totalExpenses,
        margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
        forecast: await generateFinancialForecast(payments, expenses),
      },
      collectionEfficiency: await getCollectionEfficiency(invoices),
    };

    return createSuccessResponse({ analytics });
  } catch (error) {
    console.error('Financial analytics error:', error);
    return createErrorResponse('Failed to generate financial analytics', 500);
  }
}

async function getResourceAnalytics(request: AnalyticsRequest, userId: string) {
  try {
    const { timeRange } = request;
    
    // Get resource utilization data
    const [teachers, classLevels, subjects] = await Promise.all([
      prisma.staff.findMany({
        include: {
          teacherClassAssignments: {
            include: {
              classLevel: true,
              section: true,
              subject: true,
            }
          }
        }
      }),
      prisma.classLevel.findMany({
        include: {
          enrollments: true,
          sections: true,
        }
      }),
      prisma.subject.findMany({
        include: {
          teacherClassAssignments: true,
        }
      })
    ]);

    const analytics = {
      teacherUtilization: await getTeacherUtilization(teachers),
      classroomUtilization: await getClassroomUtilization(classLevels),
      subjectCoverage: await getSubjectCoverage(subjects),
      resourceOptimization: await getResourceOptimizationSuggestions(teachers, classLevels),
      workloadDistribution: await getWorkloadDistribution(teachers),
      capacityAnalysis: await getCapacityAnalysis(classLevels),
    };

    return createSuccessResponse({ analytics });
  } catch (error) {
    console.error('Resource analytics error:', error);
    return createErrorResponse('Failed to generate resource analytics', 500);
  }
}

async function getPredictiveAnalytics(request: AnalyticsRequest, userId: string) {
  try {
    // Get historical data for predictions
    const [historicalMarks, historicalAttendance] = await Promise.all([
      prisma.marks.findMany({
        include: {
          enrollment: {
            include: {
              student: true,
              classLevel: true,
            }
          },
          examSchedule: {
            include: {
              subject: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.studentAttendance.findMany({
        include: {
          enrollment: {
            include: {
              student: true,
            }
          }
        },
        orderBy: { date: 'desc' }
      })
    ]);

    // Generate predictive insights
    const predictions = {
      studentPerformance: await predictStudentPerformance(historicalMarks),
      attendanceRisk: await predictAttendanceRisk(historicalAttendance),
      resourceNeeds: await predictResourceNeeds(historicalMarks),
      financialForecasts: await predictFinancialTrends(),
    };

    return createSuccessResponse({ predictions });
  } catch (error) {
    console.error('Predictive analytics error:', error);
    return createErrorResponse('Failed to generate predictive analytics', 500);
  }
}

// Helper functions for analytics processing
async function getSubjectPerformance(marks: any[]) {
  const subjectMap = new Map();
  
  marks.forEach(mark => {
    const subjectName = mark.examSchedule.subject.name;
    if (!subjectMap.has(subjectName)) {
      subjectMap.set(subjectName, { total: 0, count: 0, scores: [] });
    }
    const subject = subjectMap.get(subjectName);
    subject.total += mark.marksObtained;
    subject.count += 1;
    subject.scores.push(mark.marksObtained);
  });

  return Array.from(subjectMap.entries()).map(([name, data]) => ({
    subject: name,
    averageScore: data.count > 0 ? data.total / data.count : 0,
    totalAssessments: data.count,
    highestScore: Math.max(...data.scores),
    lowestScore: Math.min(...data.scores),
  }));
}

async function getClassPerformance(marks: any[]) {
  const classMap = new Map();
  
  marks.forEach(mark => {
    const className = mark.enrollment.classLevel.name;
    if (!classMap.has(className)) {
      classMap.set(className, { total: 0, count: 0, students: new Set() });
    }
    const classData = classMap.get(className);
    classData.total += mark.marksObtained;
    classData.count += 1;
    classData.students.add(mark.enrollment.studentId);
  });

  return Array.from(classMap.entries()).map(([name, data]) => ({
    class: name,
    averageScore: data.count > 0 ? data.total / data.count : 0,
    totalAssessments: data.count,
    totalStudents: data.students.size,
  }));
}

async function getPerformanceTrends(marks: any[], granularity: string) {
  // Mock implementation - in production, this would calculate actual trends
  return {
    trend: 'improving',
    changePercent: 5.2,
    dataPoints: [
      { period: '2024-01', average: 75.5 },
      { period: '2024-02', average: 77.2 },
      { period: '2024-03', average: 78.8 },
    ]
  };
}

async function getTopPerformers(marks: any[]) {
  const studentMap = new Map();
  
  marks.forEach(mark => {
    const studentId = mark.enrollment.studentId;
    const studentName = mark.enrollment.student.name;
    
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, { name: studentName, total: 0, count: 0 });
    }
    const student = studentMap.get(studentId);
    student.total += mark.marksObtained;
    student.count += 1;
  });

  return Array.from(studentMap.entries())
    .map(([id, data]) => ({
      studentId: id,
      name: data.name,
      averageScore: data.count > 0 ? data.total / data.count : 0,
      totalAssessments: data.count,
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 10);
}

async function getImprovementAreas(marks: any[]) {
  // Mock implementation
  return [
    { area: 'Mathematics', averageScore: 65.5, improvementNeeded: 'High' },
    { area: 'Science', averageScore: 72.3, improvementNeeded: 'Medium' },
    { area: 'English', averageScore: 78.9, improvementNeeded: 'Low' },
  ];
}

async function generatePerformancePredictions(marks: any[]) {
  // Mock ML predictions
  return {
    nextTermPrediction: 'Slight improvement expected',
    riskStudents: 5,
    recommendedInterventions: [
      'Additional math tutoring sessions',
      'Peer learning groups for science',
      'Reading comprehension workshops'
    ]
  };
}

async function getDashboardAnalytics(userId: string) {
  try {
    // Get quick analytics for dashboard
    const analytics = {
      totalStudents: await prisma.student.count(),
      totalTeachers: await prisma.staff.count(),
      totalClasses: await prisma.classLevel.count(),
      recentActivity: await getRecentActivity(),
      performanceSummary: await getPerformanceSummary(),
      attendanceSummary: await getAttendanceSummary(),
    };

    return createSuccessResponse({ analytics });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return createErrorResponse('Failed to get dashboard analytics', 500);
  }
}

async function getInsights(userId: string) {
  // Mock insights generation
  const insights = [
    {
      type: 'performance',
      title: 'Math Scores Improving',
      description: 'Mathematics performance has improved by 8% this month',
      impact: 'positive',
      confidence: 85,
    },
    {
      type: 'attendance',
      title: 'Attendance Concern in Class 5',
      description: 'Class 5 attendance has dropped below 85%',
      impact: 'negative',
      confidence: 92,
    },
    {
      type: 'financial',
      title: 'Fee Collection on Track',
      description: 'Monthly fee collection is 95% complete',
      impact: 'positive',
      confidence: 98,
    },
  ];

  return createSuccessResponse({ insights });
}

async function getTrends(period: string, userId: string) {
  // Mock trends data
  const trends = {
    performance: { direction: 'up', percentage: 5.2 },
    attendance: { direction: 'down', percentage: 2.1 },
    enrollment: { direction: 'up', percentage: 12.5 },
    revenue: { direction: 'up', percentage: 8.7 },
  };

  return createSuccessResponse({ trends, period });
}

async function exportAnalytics(type: string, format: string, userId: string) {
  // Mock export functionality
  const exportData = {
    type,
    format,
    generatedAt: new Date().toISOString(),
    downloadUrl: `/api/analytics/download/${type}_${Date.now()}.${format}`,
  };

  return createSuccessResponse({ export: exportData });
}

// Helper functions for specific analytics
async function getRecentActivity() {
  return [
    { type: 'grade', description: 'New grades posted for Math exam', timestamp: new Date() },
    { type: 'attendance', description: 'Attendance marked for Class 5', timestamp: new Date() },
  ];
}

async function getPerformanceSummary() {
  return {
    averageGrade: 76.5,
    passRate: 92.3,
    improvementRate: 5.2,
  };
}

async function getAttendanceSummary() {
  return {
    overallRate: 87.5,
    chronicAbsentees: 12,
    perfectAttendance: 45,
  };
}

// Mock prediction functions
async function predictStudentPerformance(marks: any[]) {
  return {
    atRiskStudents: 8,
    expectedImprovement: 3.5,
    recommendedActions: ['Additional tutoring', 'Parent meetings'],
  };
}

async function predictAttendanceRisk(attendance: any[]) {
  return {
    highRiskStudents: 5,
    patterns: ['Monday absences', 'Post-holiday drops'],
    interventions: ['Early warning system', 'Parent notifications'],
  };
}

async function predictResourceNeeds(marks: any[]) {
  return {
    additionalTeachers: 2,
    subjectsNeedingSupport: ['Mathematics', 'Science'],
    recommendedResources: ['Math lab equipment', 'Science kits'],
  };
}

async function predictFinancialTrends() {
  return {
    expectedRevenue: 125000,
    collectionRate: 94.5,
    outstandingTrend: 'decreasing',
  };
}

// Additional helper functions for attendance analytics
async function getDailyAttendanceTrends(attendanceRecords: any[]) {
  const dailyMap = new Map();
  
  attendanceRecords.forEach(record => {
    const date = record.date.toISOString().split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { present: 0, absent: 0, late: 0, total: 0 });
    }
    const day = dailyMap.get(date);
    day[record.status.toLowerCase()]++;
    day.total++;
  });

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
    ...data,
  }));
}

async function getClassWiseAttendance(attendanceRecords: any[]) {
  const classMap = new Map();
  
  attendanceRecords.forEach(record => {
    const className = record.enrollment.classLevel.name;
    if (!classMap.has(className)) {
      classMap.set(className, { present: 0, total: 0 });
    }
    const classData = classMap.get(className);
    if (record.status === 'PRESENT') classData.present++;
    classData.total++;
  });

  return Array.from(classMap.entries()).map(([name, data]) => ({
    class: name,
    attendanceRate: data.total > 0 ? (data.present / data.total) * 100 : 0,
    totalRecords: data.total,
  }));
}

async function getChronicAbsentees(attendanceRecords: any[]) {
  const studentMap = new Map();
  
  attendanceRecords.forEach(record => {
    const studentId = record.enrollment.studentId;
    const studentName = record.enrollment.student.name;
    
    if (!studentMap.has(studentId)) {
      studentMap.set(studentId, { name: studentName, absent: 0, total: 0 });
    }
    const student = studentMap.get(studentId);
    if (record.status === 'ABSENT') student.absent++;
    student.total++;
  });

  return Array.from(studentMap.entries())
    .map(([id, data]) => ({
      studentId: id,
      name: data.name,
      absenteeRate: data.total > 0 ? (data.absent / data.total) * 100 : 0,
      totalDays: data.total,
      absentDays: data.absent,
    }))
    .filter(student => student.absenteeRate > 20) // Students with >20% absence
    .sort((a, b) => b.absenteeRate - a.absenteeRate);
}

async function getAttendancePatterns(attendanceRecords: any[]) {
  // Mock implementation
  return {
    weeklyPatterns: {
      monday: 85.2,
      tuesday: 92.1,
      wednesday: 89.7,
      thursday: 91.3,
      friday: 87.8,
    },
    monthlyTrends: 'Declining in winter months',
    seasonalEffects: 'Lower attendance during exam periods',
  };
}

async function generateAttendanceWarnings(attendanceRecords: any[]) {
  // Mock implementation
  return [
    { studentId: '1', name: 'John Doe', riskLevel: 'High', reason: 'Consecutive absences' },
    { studentId: '2', name: 'Jane Smith', riskLevel: 'Medium', reason: 'Irregular attendance' },
  ];
}

// Financial analytics helper functions
async function getMonthlyRevenue(payments: any[]) {
  const monthlyMap = new Map();
  
  payments.forEach(payment => {
    const month = payment.paymentDate.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, 0);
    }
    monthlyMap.set(month, monthlyMap.get(month) + Number(payment.amountPaid));
  });

  return Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }));
}

async function getRevenueByFeeType(payments: any[]) {
  const feeTypeMap = new Map();
  
  payments.forEach(payment => {
    payment.invoice.invoiceItems.forEach((item: any) => {
      const feeType = item.feeHead.name;
      if (!feeTypeMap.has(feeType)) {
        feeTypeMap.set(feeType, 0);
      }
      feeTypeMap.set(feeType, feeTypeMap.get(feeType) + Number(item.amount));
    });
  });

  return Array.from(feeTypeMap.entries()).map(([type, amount]) => ({
    feeType: type,
    amount,
  }));
}

async function getRevenueTrends(payments: any[]) {
  // Mock implementation
  return {
    trend: 'increasing',
    growthRate: 12.5,
    seasonality: 'Higher in admission months',
  };
}

async function getMonthlyExpenses(expenses: any[]) {
  const monthlyMap = new Map();
  
  expenses.forEach(expense => {
    const month = expense.expenseDate.toISOString().substring(0, 7);
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, 0);
    }
    monthlyMap.set(month, monthlyMap.get(month) + Number(expense.amount));
  });

  return Array.from(monthlyMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }));
}

async function getExpensesByCategory(expenses: any[]) {
  const categoryMap = new Map();
  
  expenses.forEach(expense => {
    const category = expense.expenseHead;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, 0);
    }
    categoryMap.set(category, categoryMap.get(category) + Number(expense.amount));
  });

  return Array.from(categoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
  }));
}

async function getExpenseTrends(expenses: any[]) {
  // Mock implementation
  return {
    trend: 'stable',
    growthRate: 2.1,
    majorCategories: ['Salaries', 'Utilities', 'Maintenance'],
  };
}

async function getAgedOutstanding(invoices: any[]) {
  // Mock implementation
  return {
    current: 15000,
    thirtyDays: 8000,
    sixtyDays: 3000,
    ninetyDaysPlus: 1500,
  };
}

async function getOutstandingByClass(invoices: any[]) {
  // Mock implementation
  return [
    { class: 'Class 1', outstanding: 5000 },
    { class: 'Class 2', outstanding: 7500 },
    { class: 'Class 3', outstanding: 3200 },
  ];
}

async function generateFinancialForecast(payments: any[], expenses: any[]) {
  // Mock implementation
  return {
    nextMonthRevenue: 45000,
    nextMonthExpenses: 38000,
    projectedProfit: 7000,
    confidence: 78,
  };
}

async function getCollectionEfficiency(invoices: any[]) {
  // Mock implementation
  return {
    onTimeCollection: 85.5,
    averageCollectionDays: 12,
    collectionTrend: 'improving',
  };
}

// Resource analytics helper functions
async function getTeacherUtilization(teachers: any[]) {
  return teachers.map(teacher => ({
    teacherId: teacher.id,
    name: teacher.name,
    assignedClasses: teacher.teacherClassAssignments.length,
    utilization: Math.min((teacher.teacherClassAssignments.length / 6) * 100, 100), // Assuming 6 is optimal
    subjects: teacher.teacherClassAssignments.map((assignment: any) => assignment.subject.name),
  }));
}

async function getClassroomUtilization(classLevels: any[]) {
  return classLevels.map(classLevel => ({
    classId: classLevel.id,
    name: classLevel.name,
    enrollment: classLevel.enrollments.length,
    capacity: 40, // Mock capacity
    utilization: (classLevel.enrollments.length / 40) * 100,
    sections: classLevel.sections.length,
  }));
}

async function getSubjectCoverage(subjects: any[]) {
  return subjects.map(subject => ({
    subjectId: subject.id,
    name: subject.name,
    assignedTeachers: subject.teacherClassAssignments.length,
    coverage: subject.teacherClassAssignments.length > 0 ? 'Covered' : 'Not Covered',
  }));
}

async function getResourceOptimizationSuggestions(teachers: any[], classLevels: any[]) {
  return [
    { type: 'teacher', suggestion: 'Redistribute Math teachers for better coverage' },
    { type: 'classroom', suggestion: 'Merge small sections to optimize space' },
    { type: 'schedule', suggestion: 'Adjust timetable to reduce conflicts' },
  ];
}

async function getWorkloadDistribution(teachers: any[]) {
  return {
    overloaded: teachers.filter(t => t.teacherClassAssignments.length > 6).length,
    optimal: teachers.filter(t => t.teacherClassAssignments.length >= 4 && t.teacherClassAssignments.length <= 6).length,
    underutilized: teachers.filter(t => t.teacherClassAssignments.length < 4).length,
  };
}

async function getCapacityAnalysis(classLevels: any[]) {
  return {
    totalCapacity: classLevels.length * 40, // Mock capacity per class
    currentEnrollment: classLevels.reduce((sum, cl) => sum + cl.enrollments.length, 0),
    utilizationRate: 75.5, // Mock utilization
    availableSpots: 150, // Mock available spots
  };
}
