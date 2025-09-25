'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/Button';

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

interface StudentProfileModalProps {
  student: Student;
  onClose: () => void;
  classId: string;
}

export default function StudentProfileModal({
  student,
  onClose,
  classId
}: StudentProfileModalProps) {
  const t = useTranslations('teacher');
  const [loading, setLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [academicData, setAcademicData] = useState<any>(null);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      try {
        setLoading(true);
        const [attendanceRes, academicRes] = await Promise.all([
          fetch(`/api/teacher/students/${student.id}/attendance?classId=${classId}`),
          fetch(`/api/teacher/students/${student.id}/academic?classId=${classId}`)
        ]);

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          setAttendanceHistory(attendanceData.history || []);
        }

        if (academicRes.ok) {
          const academicData = await academicRes.json();
          setAcademicData(academicData);
        }
      } catch (error) {
        console.error('Error fetching student details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentDetails();
  }, [student.id, classId]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 60) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getPerformanceColor = (indicator?: string) => {
    switch (indicator) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'average': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="relative">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold text-lg">
                    {getInitials(student.name)}
                  </span>
                </div>
              )}
              
              {student.todayAttendance?.status && (
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 ${
                  student.todayAttendance.status === 'PRESENT' ? 'bg-green-500' :
                  student.todayAttendance.status === 'LATE' ? 'bg-yellow-500' :
                  student.todayAttendance.status === 'EXCUSED' ? 'bg-blue-500' :
                  'bg-red-500'
                }`}>
                </div>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {student.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {t('teacher.roll')}: {student.rollNumber} • ID: {student.studentId}
              </p>
              {student.performanceIndicator && (
                <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(student.performanceIndicator)}`}>
                  {t(`teacher.${student.performanceIndicator}`)}
                </span>
              )}
            </div>
          </div>
          
          <Button variant="outline" onClick={onClose}>
            ✕ {t('common.close')}
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('teacher.basicInformation')}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('teacher.studentId')}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{student.studentId}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('teacher.rollNumber')}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{student.rollNumber}</p>
                    </div>
                    {student.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {t('teacher.email')}
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">{student.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Guardian Information */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('teacher.guardianInformation')}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('teacher.guardianName')}
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 dark:text-gray-100">{student.guardian.name}</p>
                        {student.guardian.verified ? (
                          <span className="text-green-500 text-sm" title={t('classManagement.verifiedGuardian')}>✓</span>
                        ) : (
                          <span className="text-red-500 text-sm" title={t('classManagement.unverifiedGuardian')}>⚠</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('teacher.relation')}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{student.guardian.relation}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('teacher.contactNumber')}
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{student.guardian.contactNumber}</p>
                    </div>
                    {student.guardian.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {t('teacher.guardianEmail')}
                        </label>
                        <p className="text-gray-900 dark:text-gray-100">{student.guardian.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance & Academic Information */}
              <div className="space-y-6">
                {/* Attendance Summary */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('teacher.attendanceSummary')}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">{t('teacher.overallAttendance')}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getAttendanceColor(student.attendancePercentage)}`}>
                        {student.attendancePercentage}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          student.attendancePercentage >= 90 ? 'bg-green-500' :
                          student.attendancePercentage >= 75 ? 'bg-yellow-500' :
                          student.attendancePercentage >= 60 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${student.attendancePercentage}%` }}
                      ></div>
                    </div>

                    {student.lastAttendance && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('classManagement.lastSeen')}: {new Date(student.lastAttendance.date).toLocaleDateString()}
                          <span className={`ml-2 ${
                            student.lastAttendance.status === 'PRESENT' ? 'text-green-600' :
                            student.lastAttendance.status === 'LATE' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            ({t(`attendance.${student.lastAttendance.status.toLowerCase()}`)})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Attendance History */}
                {attendanceHistory.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {t('teacher.recentAttendance')}
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {attendanceHistory.slice(0, 10).map((record, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(record.date).toLocaleDateString()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            record.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                            record.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                            record.status === 'EXCUSED' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {t(`attendance.${record.status.toLowerCase()}`)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Academic Performance */}
                {academicData && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      {t('teacher.academicPerformance')}
                    </h3>
                    <div className="space-y-3">
                      {academicData.subjects?.map((subject: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{subject.name}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {subject.grade || 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={() => {
              // Send notification to guardian
              fetch('/api/teacher/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: student.id,
                  type: 'general',
                  message: 'Teacher wants to discuss your child\'s progress'
                })
              });
            }}
          >
            📧 {t('teacher.contactGuardian')}
          </Button>
          <Button onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
