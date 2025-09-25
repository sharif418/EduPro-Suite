'use client';

import { useMemo } from 'react';

interface AnalyticsData {
  attendance: {
    totalStudents: number;
    averageAttendance: number;
    attendanceDistribution: {
      excellent: number; // 90%+
      good: number;      // 75-89%
      average: number;   // 60-74%
      poor: number;      // less than 60%
    };
  };
  performance: {
    totalExams: number;
    averageScore: number;
    gradeDistribution: { [key: string]: number };
    examTrends: Array<{
      examName: string;
      averageScore: number;
      totalStudents: number;
    }>;
  };
  subjectPerformance: Array<{
    subject: string;
    averageScore: number;
    totalExams: number;
  }>;
  classInfo: {
    totalStudents: number;
    className: string;
  };
}

interface ClassAnalyticsChartsProps {
  data: AnalyticsData;
  type: 'overview' | 'attendance' | 'performance';
  className?: string;
}

export function ClassAnalyticsCharts({ data, type, className }: ClassAnalyticsChartsProps) {
  const gradeDistributionArray = useMemo(() => {
    return Object.entries(data.performance.gradeDistribution || {}).map(([grade, count]) => ({
      grade,
      count
    }));
  }, [data.performance.gradeDistribution]);

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Attendance Overview */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Attendance Overview
        </h3>
        <div className="space-y-4">
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {data.attendance.averageAttendance}%
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Average Attendance</p>
          </div>
          
          {/* Attendance Distribution */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Excellent (90%+)</span>
              <span className="font-medium text-green-600">{data.attendance.attendanceDistribution.excellent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Good (75-89%)</span>
              <span className="font-medium text-blue-600">{data.attendance.attendanceDistribution.good}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average (60-74%)</span>
              <span className="font-medium text-yellow-600">{data.attendance.attendanceDistribution.average}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Poor ({'<60%'})</span>
              <span className="font-medium text-red-600">{data.attendance.attendanceDistribution.poor}</span>
            </div>
          </div>

          {/* Visual representation */}
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 flex overflow-hidden">
            <div 
              className="bg-green-500 h-4 transition-all duration-300"
              style={{ 
                width: `${(data.attendance.attendanceDistribution.excellent / data.attendance.totalStudents) * 100}%` 
              }}
            ></div>
            <div 
              className="bg-blue-500 h-4 transition-all duration-300"
              style={{ 
                width: `${(data.attendance.attendanceDistribution.good / data.attendance.totalStudents) * 100}%` 
              }}
            ></div>
            <div 
              className="bg-yellow-500 h-4 transition-all duration-300"
              style={{ 
                width: `${(data.attendance.attendanceDistribution.average / data.attendance.totalStudents) * 100}%` 
              }}
            ></div>
            <div 
              className="bg-red-500 h-4 transition-all duration-300"
              style={{ 
                width: `${(data.attendance.attendanceDistribution.poor / data.attendance.totalStudents) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Performance Overview
        </h3>
        <div className="space-y-4">
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {data.performance.averageScore}%
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total Exams</span>
            <span className="font-medium text-blue-600">{data.performance.totalExams}</span>
          </div>
          
          {/* Grade Distribution */}
          {gradeDistributionArray.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grade Distribution</h4>
              <div className="space-y-2">
                {gradeDistributionArray.map((grade) => (
                  <div key={grade.grade} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Grade {grade.grade}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ 
                            width: `${(grade.count / Math.max(...gradeDistributionArray.map(g => g.count))) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-6">
                        {grade.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6">
      {/* Attendance Distribution Chart */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Attendance Distribution
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.attendance.attendanceDistribution.excellent}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">Excellent</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">90%+</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.attendance.attendanceDistribution.good}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Good</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">75-89%</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {data.attendance.attendanceDistribution.average}
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">Average</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">60-74%</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.attendance.attendanceDistribution.poor}
            </div>
            <div className="text-sm text-red-700 dark:text-red-300">Poor</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">{'<60%'}</div>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Class Attendance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">
              {data.attendance.averageAttendance}%
            </div>
            <div className="text-gray-600 dark:text-gray-400">Average Attendance Rate</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {data.attendance.totalStudents}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Total Students</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      {/* Subject-wise Performance */}
      {data.subjectPerformance && data.subjectPerformance.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Subject-wise Performance
          </h3>
          <div className="space-y-4">
            {data.subjectPerformance.map((subject) => (
              <div key={subject.subject} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {subject.subject}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {subject.averageScore.toFixed(1)}% avg ({subject.totalExams} exams)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${subject.averageScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam Trends */}
      {data.performance.examTrends && data.performance.examTrends.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Exam Performance Trends
          </h3>
          <div className="space-y-4">
            {data.performance.examTrends.map((exam, index) => (
              <div key={exam.examName} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{exam.examName}</h4>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {exam.totalStudents} students
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Average Score:</span>
                    <span className="font-medium text-blue-600">{exam.averageScore}%</span>
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${exam.averageScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade Distribution */}
      {gradeDistributionArray.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Overall Grade Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gradeDistributionArray.map((grade) => (
              <div key={grade.grade} className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {grade.count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Grade {grade.grade}
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(grade.count / Math.max(...gradeDistributionArray.map(g => g.count))) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (type) {
      case 'overview':
        return renderOverview();
      case 'attendance':
        return renderAttendance();
      case 'performance':
        return renderPerformance();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="space-y-6">
      {className && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Analytics for {className}
          </h2>
        </div>
      )}
      {renderContent()}
    </div>
  );
}
