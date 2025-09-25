'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/Tabs';
import { ClassAnalyticsCharts } from '@/app/components/teacher/ClassAnalyticsCharts';

interface AnalyticsData {
  attendance: {
    totalStudents: number;
    averageAttendance: number;
    attendanceDistribution: {
      excellent: number; // 90%+
      good: number;      // 75-89%
      average: number;   // 60-74%
      poor: number;      // <60%
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

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(classId || '');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchAnalytics();
    }
  }, [selectedClassId, selectedPeriod]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/teacher/classes');
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
        if (!selectedClassId && data.classes.length > 0) {
          setSelectedClassId(data.classes[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/teacher/analytics?classId=${selectedClassId}&period=${selectedPeriod}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedClass = () => {
    return classes.find(cls => cls.id === selectedClassId);
  };

  const getClassName = () => {
    const selectedClass = getSelectedClass();
    if (selectedClass) {
      return `${selectedClass.classLevel?.name ?? ''} - ${selectedClass.section?.name ?? ''}`;
    }
    return analyticsData?.classInfo?.className || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Class Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Comprehensive analytics and insights for your classes
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.classLevel?.name} - {cls.section?.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedClassId ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Select a class to view analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a class from the dropdown above to see detailed analytics and insights.
          </p>
        </div>
      ) : !analyticsData ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No analytics data available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Analytics data will appear here once students start attending classes and taking exams.
          </p>
        </div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Average Attendance
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {analyticsData.attendance.averageAttendance}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Average Score
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {analyticsData.performance.averageScore}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <span className="text-2xl">🎓</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {analyticsData.classInfo.totalStudents}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Exams
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {analyticsData.performance.totalExams}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics Tabs */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="p-6">
              <Tabs defaultValue="overview">
                <TabsList className="mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <ClassAnalyticsCharts 
                    data={analyticsData} 
                    type="overview"
                    className={getClassName()}
                  />
                </TabsContent>

                <TabsContent value="attendance">
                  <ClassAnalyticsCharts 
                    data={analyticsData} 
                    type="attendance"
                    className={getClassName()}
                  />
                </TabsContent>

                <TabsContent value="performance">
                  <ClassAnalyticsCharts 
                    data={analyticsData} 
                    type="performance"
                    className={getClassName()}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
