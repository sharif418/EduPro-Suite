'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSession } from '../../../../hooks/useSession';
import AttendanceMarkingInterface from '../../../../components/teacher/AttendanceMarkingInterface';
import { Button } from '../../../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/Tabs';

interface Student {
  id: string;
  studentId: string;
  name: string;
  rollNumber: number;
  email?: string;
  photoUrl?: string;
  guardian: {
    name: string;
    contactNumber: string;
    relation: string;
    email?: string;
    verified?: boolean;
  };
  attendancePercentage: number;
  lastAttendance: {
    date: string;
    status: string;
  } | null;
  performanceIndicator?: 'excellent' | 'good' | 'average' | 'poor';
  todayAttendance?: {
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null;
    markedAt?: string;
  };
}

interface ClassData {
  id: string;
  classLevel: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  };
  students: Student[];
}

interface AttendanceRecord {
  id: string;
  date: string;
  student: {
    id: string;
    name: string;
    rollNumber: number;
  };
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  markedAt: string;
  notes?: string;
}

interface AttendanceStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  excusedToday: number;
  averageAttendance: number;
  attendanceTrend: Array<{
    date: string;
    percentage: number;
  }>;
}

export default function TeacherAttendancePage() {
  const { user } = useSession();
  const t = useTranslations('teacher');
  const searchParams = useSearchParams();
  const preselectedClassId = searchParams.get('classId');

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(preselectedClassId);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMarkingInterface, setShowMarkingInterface] = useState(false);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/teacher/classes');
        
        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }
        
        const data = await response.json();
        setClasses(data.classes || []);
        
        // Auto-select first class if no preselected class
        if (!preselectedClassId && data.classes && data.classes.length > 0) {
          setSelectedClass(data.classes[0].id);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [preselectedClassId]);

  useEffect(() => {
    if (selectedClass) {
      fetchAttendanceData();
    }
  }, [selectedClass, selectedDate]);

  const fetchAttendanceData = async () => {
    if (!selectedClass) return;

    try {
      const [recordsResponse, statsResponse] = await Promise.all([
        fetch(`/api/teacher/attendance/records?classId=${selectedClass}&date=${selectedDate}`),
        fetch(`/api/teacher/attendance/stats?classId=${selectedClass}`)
      ]);

      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setAttendanceRecords(recordsData.records || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setAttendanceStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    }
  };

  const handleBulkAttendance = async (status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    if (!selectedClass) return;

    try {
      const selectedClassData = classes.find(c => c.id === selectedClass);
      if (!selectedClassData) return;

      const response = await fetch('/api/teacher/attendance/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: selectedClass,
          studentIds: selectedClassData.students.map(s => s.id),
          status,
          date: selectedDate
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark bulk attendance');
      }

      // Refresh attendance data
      fetchAttendanceData();
    } catch (error) {
      console.error('Error marking bulk attendance:', error);
    }
  };

  const generateAttendanceReport = async (format: 'pdf' | 'excel') => {
    if (!selectedClass) return;

    try {
      const response = await fetch(`/api/teacher/attendance/report?classId=${selectedClass}&format=${format}&startDate=${getMonthStart()}&endDate=${selectedDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${selectedDate}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const getMonthStart = () => {
    const date = new Date(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  };

  const getWeekStart = () => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff)).toISOString().split('T')[0];
  };

  const getAttendanceStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800 border-green-300';
      case 'ABSENT': return 'bg-red-100 text-red-800 border-red-300';
      case 'LATE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'EXCUSED': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const selectedClassData = classes.find(c => c.id === selectedClass);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('classManagement.errorLoadingData')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {t('teacher.attendanceManagement')} ✅
            </h1>
            <p className="text-green-100 text-base sm:text-lg">
              {t('classManagement.attendanceDescription')}
            </p>
          </div>
          
          {attendanceStats && (
            <div className="flex gap-4">
              <div className="text-center bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">{attendanceStats.presentToday}</div>
                <div className="text-sm text-green-200">{t('attendance.present')}</div>
              </div>
              <div className="text-center bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">{attendanceStats.absentToday}</div>
                <div className="text-sm text-green-200">{t('attendance.absent')}</div>
              </div>
              <div className="text-center bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">{attendanceStats.averageAttendance}%</div>
                <div className="text-sm text-green-200">{t('classManagement.avgAttendance')}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Class and Date Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('teacher.selectClass')}
              </label>
              <select
                value={selectedClass || ''}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('teacher.selectClass')}</option>
                {classes.map(classData => (
                  <option key={classData.id} value={classData.id}>
                    {classData.classLevel.name} - {classData.section.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('classManagement.selectDate')}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setShowMarkingInterface(true)}
              disabled={!selectedClass}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              ✅ {t('classManagement.markAttendance')}
            </Button>
            <Button
              variant="outline"
              onClick={() => generateAttendanceReport('pdf')}
              disabled={!selectedClass}
            >
              📄 {t('classManagement.generateReport')}
            </Button>
          </div>
        </div>
      </div>

      {selectedClass && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <Tabs defaultValue={activeTab}>
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-6">
              <TabsList>
                <TabsTrigger value="daily">{t('classManagement.dailyView')}</TabsTrigger>
                <TabsTrigger value="weekly">{t('classManagement.weeklyView')}</TabsTrigger>
                <TabsTrigger value="monthly">{t('classManagement.monthlyView')}</TabsTrigger>
                <TabsTrigger value="student">{t('classManagement.studentView')}</TabsTrigger>
              </TabsList>
            </div>

            {/* Daily View */}
            <TabsContent value="daily" className="p-6">
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleBulkAttendance('PRESENT')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    ✅ {t('classManagement.markAllPresent')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAttendance('ABSENT')}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    ❌ {t('classManagement.markAllAbsent')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  >
                    📅 {t('classManagement.today')}
                  </Button>
                </div>

                {/* Attendance Records */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attendanceRecords.map(record => (
                    <div
                      key={record.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {record.student.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getAttendanceStatusColor(record.status)}`}>
                          {t(`attendance.${record.status.toLowerCase()}`)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('teacher.roll')}: {record.student.rollNumber}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {t('classManagement.markedAt')}: {new Date(record.markedAt).toLocaleTimeString()}
                      </p>
                      {record.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                          {t('classManagement.notes')}: {record.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {attendanceRecords.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📋</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {t('classManagement.noAttendanceRecords')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('classManagement.noAttendanceDescription')}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Weekly View */}
            <TabsContent value="weekly" className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('classManagement.weeklyAttendance')}
                </h3>
                {/* Weekly attendance grid would go here */}
                <div className="text-center py-12 text-gray-500">
                  {t('classManagement.weeklyViewComingSoon')}
                </div>
              </div>
            </TabsContent>

            {/* Monthly View */}
            <TabsContent value="monthly" className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('classManagement.monthlyAttendance')}
                </h3>
                {/* Monthly attendance calendar would go here */}
                <div className="text-center py-12 text-gray-500">
                  {t('classManagement.monthlyViewComingSoon')}
                </div>
              </div>
            </TabsContent>

            {/* Student View */}
            <TabsContent value="student" className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('classManagement.studentAttendance')}
                </h3>
                {selectedClassData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedClassData.students.map(student => (
                      <div
                        key={student.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">
                              {student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {student.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {t('teacher.roll')}: {student.rollNumber}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {t('teacher.attendance')}
                            </span>
                            <span className="text-sm font-medium">
                              {student.attendancePercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                student.attendancePercentage >= 90 ? 'bg-green-500' :
                                student.attendancePercentage >= 75 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${student.attendancePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Attendance Marking Interface Modal */}
      {showMarkingInterface && selectedClassData && (
        <AttendanceMarkingInterface
          classId={selectedClass!}
          students={selectedClassData.students}
          onClose={() => setShowMarkingInterface(false)}
          onAttendanceUpdate={(updatedStudents: Student[]) => {
            // Update the class data with new attendance
            setClasses(prev => prev.map(cls => 
              cls.id === selectedClass 
                ? { ...cls, students: updatedStudents }
                : cls
            ));
            setShowMarkingInterface(false);
            fetchAttendanceData();
          }}
        />
      )}
    </div>
  );
}
