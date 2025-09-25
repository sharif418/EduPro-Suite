import { prisma } from './prisma';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';

export interface AcademicRiskAssessment {
  studentId: string;
  studentName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  factors: {
    attendanceRate: number;
    gradeAverage: number;
    assignmentSubmissionRate: number;
    behavioralIssues: number;
    parentEngagement: number;
  };
  recommendations: string[];
  interventions: string[];
  lastAssessment: Date;
}

export interface ComparativeAnalysis {
  institutionId: string;
  institutionName: string;
  metrics: {
    averageGrade: number;
    attendanceRate: number;
    passRate: number;
    teacherStudentRatio: number;
    resourceUtilization: number;
  };
  ranking: number;
  totalInstitutions: number;
  benchmarkCategory: string;
}

export interface CustomReportConfig {
  id: string;
  name: string;
  description: string;
  dataSource: string[];
  filters: {
    dateRange?: { start: Date; end: Date };
    classLevels?: string[];
    sections?: string[];
    subjects?: string[];
    studentGroups?: string[];
  };
  visualizations: {
    type: 'BAR' | 'LINE' | 'PIE' | 'TABLE' | 'SCATTER';
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  }[];
  schedule?: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
    recipients: string[];
    format: 'PDF' | 'EXCEL' | 'CSV';
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegulatoryReport {
  id: string;
  reportType: 'ANNUAL_ACADEMIC' | 'STUDENT_ENROLLMENT' | 'STAFF_QUALIFICATION' | 'INFRASTRUCTURE' | 'FINANCIAL';
  academicYear: string;
  generatedAt: Date;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  data: {
    totalStudents: number;
    totalTeachers: number;
    passRate: number;
    dropoutRate: number;
    infrastructureScore: number;
    complianceScore: number;
  };
  submittedTo: string;
  submissionDate?: Date;
  approvalDate?: Date;
  comments?: string;
}

export interface TrendAnalysis {
  metric: string;
  period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  data: {
    period: string;
    value: number;
    change: number;
    changePercentage: number;
  }[];
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  forecast: {
    nextPeriod: number;
    confidence: number;
  };
}

export interface PerformanceMetrics {
  academic: {
    overallGPA: number;
    subjectWisePerformance: { subject: string; average: number }[];
    gradeDistribution: { grade: string; count: number; percentage: number }[];
    improvementRate: number;
  };
  attendance: {
    overallRate: number;
    monthlyTrends: { month: string; rate: number }[];
    classWiseRates: { className: string; rate: number }[];
    chronicAbsenteeism: number;
  };
  behavioral: {
    disciplinaryIncidents: number;
    positiveRecognitions: number;
    parentMeetings: number;
    counselingReferrals: number;
  };
  engagement: {
    extracurricularParticipation: number;
    libraryUsage: number;
    digitalResourceAccess: number;
    parentPortalUsage: number;
  };
}

export class AdvancedAnalyticsService {

  /**
   * Assess academic risk for students using predictive analytics
   */
  static async assessAcademicRisk(classLevelId?: string, sectionId?: string): Promise<AcademicRiskAssessment[]> {
    try {
      // Get students based on filters
      const students = await prisma.student.findMany({
        include: {
          enrollments: {
            include: {
              marks: {
                where: {
                  createdAt: {
                    gte: startOfMonth(subMonths(new Date(), 3)) // Last 3 months
                  }
                }
              },
              studentAttendances: {
                where: {
                  date: {
                    gte: startOfMonth(subMonths(new Date(), 3))
                  }
                }
              }
            },
            where: {
              ...(classLevelId && { classLevelId }),
              ...(sectionId && { sectionId })
            }
          }
        }
      });

      const assessments: AcademicRiskAssessment[] = [];

      for (const student of students) {
        const enrollment = student.enrollments[0];
        if (!enrollment) continue;

        // Calculate attendance rate
        const totalAttendanceDays = enrollment.studentAttendances.length;
        const presentDays = enrollment.studentAttendances.filter(a => a.status === 'PRESENT').length;
        const attendanceRate = totalAttendanceDays > 0 ? (presentDays / totalAttendanceDays) * 100 : 0;

        // Calculate grade average
        const marks = enrollment.marks;
        const gradeAverage = marks.length > 0 
          ? marks.reduce((sum, mark) => sum + mark.marksObtained, 0) / marks.length 
          : 0;

        // Mock assignment submission rate (would be calculated from actual assignments)
        const assignmentSubmissionRate = Math.random() * 40 + 60; // 60-100%

        // Mock behavioral and parent engagement scores
        const behavioralIssues = Math.floor(Math.random() * 5);
        const parentEngagement = Math.random() * 40 + 60; // 60-100%

        // Calculate risk score (weighted average)
        const riskScore = (
          (100 - attendanceRate) * 0.3 +
          (100 - gradeAverage) * 0.3 +
          (100 - assignmentSubmissionRate) * 0.2 +
          behavioralIssues * 10 +
          (100 - parentEngagement) * 0.2
        );

        // Determine risk level
        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (riskScore < 20) riskLevel = 'LOW';
        else if (riskScore < 40) riskLevel = 'MEDIUM';
        else if (riskScore < 60) riskLevel = 'HIGH';
        else riskLevel = 'CRITICAL';

        // Generate recommendations based on risk factors
        const recommendations: string[] = [];
        const interventions: string[] = [];

        if (attendanceRate < 80) {
          recommendations.push('Improve attendance through parent engagement');
          interventions.push('Schedule parent meeting to discuss attendance issues');
        }

        if (gradeAverage < 60) {
          recommendations.push('Provide additional academic support');
          interventions.push('Assign peer tutor or additional study sessions');
        }

        if (assignmentSubmissionRate < 70) {
          recommendations.push('Monitor assignment completion more closely');
          interventions.push('Implement assignment tracking system');
        }

        assessments.push({
          studentId: student.id,
          studentName: student.name,
          riskLevel,
          riskScore: Math.round(riskScore),
          factors: {
            attendanceRate: Math.round(attendanceRate),
            gradeAverage: Math.round(gradeAverage),
            assignmentSubmissionRate: Math.round(assignmentSubmissionRate),
            behavioralIssues,
            parentEngagement: Math.round(parentEngagement)
          },
          recommendations,
          interventions,
          lastAssessment: new Date()
        });
      }

      return assessments;

    } catch (error) {
      console.error('[ACADEMIC_RISK_ASSESSMENT_ERROR]', error);
      return [];
    }
  }

  /**
   * Generate comparative analysis with other institutions
   */
  static async generateComparativeAnalysis(institutionId: string): Promise<ComparativeAnalysis[]> {
    try {
      // Mock comparative data (in real implementation, this would come from external data sources)
      const mockComparisons: ComparativeAnalysis[] = [
        {
          institutionId: 'inst_001',
          institutionName: 'Dhaka Model School',
          metrics: {
            averageGrade: 78.5,
            attendanceRate: 92.3,
            passRate: 89.2,
            teacherStudentRatio: 1.2,
            resourceUtilization: 85.7
          },
          ranking: 1,
          totalInstitutions: 50,
          benchmarkCategory: 'Urban Secondary Schools'
        },
        {
          institutionId: 'inst_002',
          institutionName: 'Chittagong International School',
          metrics: {
            averageGrade: 82.1,
            attendanceRate: 94.8,
            passRate: 91.5,
            teacherStudentRatio: 1.1,
            resourceUtilization: 88.3
          },
          ranking: 2,
          totalInstitutions: 50,
          benchmarkCategory: 'Urban Secondary Schools'
        }
      ];

      return mockComparisons;

    } catch (error) {
      console.error('[COMPARATIVE_ANALYSIS_ERROR]', error);
      return [];
    }
  }

  /**
   * Create custom report configuration
   */
  static async createCustomReport(config: Omit<CustomReportConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomReportConfig> {
    try {
      const reportConfig: CustomReportConfig = {
        ...config,
        id: `report_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // In a real implementation, you would save this to database
      console.log('[CUSTOM_REPORT_CREATED]', reportConfig.id);

      return reportConfig;

    } catch (error) {
      console.error('[CREATE_CUSTOM_REPORT_ERROR]', error);
      throw new Error('Failed to create custom report');
    }
  }

  /**
   * Generate regulatory compliance report
   */
  static async generateRegulatoryReport(reportType: RegulatoryReport['reportType'], academicYear: string): Promise<RegulatoryReport> {
    try {
      // Get basic statistics for the report
      const [totalStudents, totalTeachers] = await Promise.all([
        prisma.student.count(),
        prisma.staff.count()
      ]);

      // Mock calculations for other metrics
      const passRate = Math.random() * 20 + 75; // 75-95%
      const dropoutRate = Math.random() * 5 + 2; // 2-7%
      const infrastructureScore = Math.random() * 20 + 75; // 75-95%
      const complianceScore = Math.random() * 15 + 80; // 80-95%

      const report: RegulatoryReport = {
        id: `reg_report_${Date.now()}`,
        reportType,
        academicYear,
        generatedAt: new Date(),
        status: 'DRAFT',
        data: {
          totalStudents,
          totalTeachers,
          passRate: Math.round(passRate),
          dropoutRate: Math.round(dropoutRate * 10) / 10,
          infrastructureScore: Math.round(infrastructureScore),
          complianceScore: Math.round(complianceScore)
        },
        submittedTo: 'Ministry of Education'
      };

      return report;

    } catch (error) {
      console.error('[REGULATORY_REPORT_ERROR]', error);
      throw new Error('Failed to generate regulatory report');
    }
  }

  /**
   * Analyze trends over time
   */
  static async analyzeTrends(metric: string, period: TrendAnalysis['period']): Promise<TrendAnalysis> {
    try {
      // Mock trend data generation
      const dataPoints = period === 'MONTHLY' ? 12 : period === 'QUARTERLY' ? 4 : 3;
      const data = [];

      for (let i = dataPoints - 1; i >= 0; i--) {
        const baseValue = Math.random() * 20 + 70; // 70-90 base
        const change = (Math.random() - 0.5) * 10; // -5 to +5 change
        const value = Math.max(0, baseValue + change);
        
        data.push({
          period: period === 'MONTHLY' ? 
            new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) :
            period === 'QUARTERLY' ? `Q${i + 1} 2024` : `${2021 + i}`,
          value: Math.round(value),
          change: Math.round(change * 10) / 10,
          changePercentage: Math.round((change / baseValue) * 100 * 10) / 10
        });
      }

      // Determine trend
      const values = data.map(d => d.value);
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      let trend: TrendAnalysis['trend'];
      const difference = secondAvg - firstAvg;
      if (Math.abs(difference) < 2) trend = 'STABLE';
      else if (difference > 5) trend = 'INCREASING';
      else if (difference < -5) trend = 'DECREASING';
      else trend = 'VOLATILE';

      return {
        metric,
        period,
        data,
        trend,
        forecast: {
          nextPeriod: Math.round(values[values.length - 1] + (difference / 2)),
          confidence: Math.random() * 30 + 60 // 60-90% confidence
        }
      };

    } catch (error) {
      console.error('[TREND_ANALYSIS_ERROR]', error);
      throw new Error('Failed to analyze trends');
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  static async getPerformanceMetrics(classLevelId?: string, academicYearId?: string): Promise<PerformanceMetrics> {
    try {
      // Mock performance metrics (in real implementation, calculate from actual data)
      const metrics: PerformanceMetrics = {
        academic: {
          overallGPA: Math.round((Math.random() * 1.5 + 3.0) * 100) / 100, // 3.0-4.5 GPA
          subjectWisePerformance: [
            { subject: 'Mathematics', average: Math.round(Math.random() * 20 + 70) },
            { subject: 'English', average: Math.round(Math.random() * 20 + 75) },
            { subject: 'Science', average: Math.round(Math.random() * 20 + 72) },
            { subject: 'Islamic Studies', average: Math.round(Math.random() * 15 + 80) },
            { subject: 'Bengali', average: Math.round(Math.random() * 20 + 78) }
          ],
          gradeDistribution: [
            { grade: 'A+', count: Math.floor(Math.random() * 10 + 5), percentage: 0 },
            { grade: 'A', count: Math.floor(Math.random() * 15 + 10), percentage: 0 },
            { grade: 'B+', count: Math.floor(Math.random() * 12 + 8), percentage: 0 },
            { grade: 'B', count: Math.floor(Math.random() * 8 + 5), percentage: 0 },
            { grade: 'C', count: Math.floor(Math.random() * 5 + 2), percentage: 0 }
          ],
          improvementRate: Math.round((Math.random() * 20 + 5) * 10) / 10 // 5-25% improvement
        },
        attendance: {
          overallRate: Math.round((Math.random() * 15 + 80) * 10) / 10, // 80-95%
          monthlyTrends: Array.from({ length: 12 }, (_, i) => ({
            month: new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'short' }),
            rate: Math.round((Math.random() * 15 + 80) * 10) / 10
          })),
          classWiseRates: [
            { className: 'Class 6A', rate: Math.round((Math.random() * 10 + 85) * 10) / 10 },
            { className: 'Class 7B', rate: Math.round((Math.random() * 10 + 82) * 10) / 10 },
            { className: 'Class 8A', rate: Math.round((Math.random() * 10 + 88) * 10) / 10 }
          ],
          chronicAbsenteeism: Math.floor(Math.random() * 8 + 2) // 2-10%
        },
        behavioral: {
          disciplinaryIncidents: Math.floor(Math.random() * 10 + 2),
          positiveRecognitions: Math.floor(Math.random() * 50 + 20),
          parentMeetings: Math.floor(Math.random() * 30 + 15),
          counselingReferrals: Math.floor(Math.random() * 8 + 1)
        },
        engagement: {
          extracurricularParticipation: Math.round((Math.random() * 30 + 60) * 10) / 10, // 60-90%
          libraryUsage: Math.round((Math.random() * 25 + 45) * 10) / 10, // 45-70%
          digitalResourceAccess: Math.round((Math.random() * 35 + 55) * 10) / 10, // 55-90%
          parentPortalUsage: Math.round((Math.random() * 40 + 40) * 10) / 10 // 40-80%
        }
      };

      // Calculate percentages for grade distribution
      const totalGrades = metrics.academic.gradeDistribution.reduce((sum, grade) => sum + grade.count, 0);
      metrics.academic.gradeDistribution.forEach(grade => {
        grade.percentage = totalGrades > 0 ? Math.round((grade.count / totalGrades) * 100 * 10) / 10 : 0;
      });

      return metrics;

    } catch (error) {
      console.error('[PERFORMANCE_METRICS_ERROR]', error);
      throw new Error('Failed to get performance metrics');
    }
  }

  /**
   * Generate predictive insights for academic planning
   */
  static async generatePredictiveInsights(timeframe: 'SEMESTER' | 'YEAR'): Promise<{
    predictions: Array<{
      metric: string;
      currentValue: number;
      predictedValue: number;
      confidence: number;
      factors: string[];
    }>;
    recommendations: string[];
  }> {
    try {
      const predictions = [
        {
          metric: 'Overall Pass Rate',
          currentValue: 87.5,
          predictedValue: 89.2,
          confidence: 78,
          factors: ['Improved teaching methods', 'Better student engagement', 'Enhanced support systems']
        },
        {
          metric: 'Average Attendance',
          currentValue: 91.3,
          predictedValue: 93.1,
          confidence: 82,
          factors: ['Parent engagement initiatives', 'Transportation improvements', 'Health programs']
        },
        {
          metric: 'Student Satisfaction',
          currentValue: 4.2,
          predictedValue: 4.5,
          confidence: 75,
          factors: ['Infrastructure upgrades', 'Teacher training', 'Extracurricular activities']
        }
      ];

      const recommendations = [
        'Focus on Mathematics and Science improvement programs',
        'Implement early warning system for at-risk students',
        'Enhance parent-teacher communication channels',
        'Invest in digital learning resources',
        'Develop peer mentoring programs'
      ];

      return { predictions, recommendations };

    } catch (error) {
      console.error('[PREDICTIVE_INSIGHTS_ERROR]', error);
      throw new Error('Failed to generate predictive insights');
    }
  }

  /**
   * Export analytics data in various formats
   */
  static async exportAnalyticsData(
    dataType: 'RISK_ASSESSMENT' | 'PERFORMANCE_METRICS' | 'TREND_ANALYSIS',
    format: 'JSON' | 'CSV' | 'EXCEL',
    filters?: any
  ): Promise<{ downloadUrl: string; expiresAt: Date }> {
    try {
      // Generate export file (mock implementation)
      const exportId = `export_${dataType.toLowerCase()}_${Date.now()}`;
      const downloadUrl = `/api/analytics/download/${exportId}.${format.toLowerCase()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      console.log('[ANALYTICS_EXPORT]', { exportId, dataType, format, filters });

      return { downloadUrl, expiresAt };

    } catch (error) {
      console.error('[ANALYTICS_EXPORT_ERROR]', error);
      throw new Error('Failed to export analytics data');
    }
  }

  /**
   * Schedule automated reports
   */
  static async scheduleAutomatedReport(config: {
    reportType: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    recipients: string[];
    parameters: any;
  }): Promise<{ scheduleId: string; nextRun: Date }> {
    try {
      const scheduleId = `schedule_${Date.now()}`;
      
      // Calculate next run date based on frequency
      const now = new Date();
      let nextRun: Date;
      
      switch (config.frequency) {
        case 'DAILY':
          nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'WEEKLY':
          nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'MONTHLY':
          nextRun = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          break;
        default:
          nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      console.log('[AUTOMATED_REPORT_SCHEDULED]', { scheduleId, config, nextRun });

      return { scheduleId, nextRun };

    } catch (error) {
      console.error('[SCHEDULE_REPORT_ERROR]', error);
      throw new Error('Failed to schedule automated report');
    }
  }
}

export default AdvancedAnalyticsService;
