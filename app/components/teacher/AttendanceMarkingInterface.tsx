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

interface AttendanceMarkingInterfaceProps {
  classId: string;
  students: Student[];
  onClose: () => void;
  onAttendanceUpdate: (updatedStudents: Student[]) => void;
}

export default function AttendanceMarkingInterface({
  classId,
  students,
  onClose,
  onAttendanceUpdate
}: AttendanceMarkingInterfaceProps) {
  const t = useTranslations('teacher');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'>>({});
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize attendance data with current status
    const initialData: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = {};
    students.forEach(student => {
      if (student.todayAttendance?.status) {
        initialData[student.id] = student.todayAttendance.status;
      }
    });
    setAttendanceData(initialData);
  }, [students]);

  const handleAttendanceChange = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleBulkMark = (status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    const bulkData: Record<string, 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'> = {};
    students.forEach(student => {
      bulkData[student.id] = status;
    });
    setAttendanceData(bulkData);
  };

  const handleSaveAttendance = async () => {
    try {
      setLoading(true);
      
      const attendanceEntries = Object.entries(attendanceData).map(([studentId, status]) => ({
        studentId,
        status,
        date: selectedDate,
        notes: notes[studentId] || ''
      }));

      const response = await fetch('/api/teacher/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          date: selectedDate,
          attendance: attendanceEntries
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance');
      }

      // Update students with new attendance data
      const updatedStudents = students.map(student => ({
        ...student,
        todayAttendance: {
          status: attendanceData[student.id] || null,
          markedAt: new Date().toISOString()
        }
      }));

      onAttendanceUpdate(updatedStudents);
    } catch (error) {
      console.error('Error saving attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800 border-green-300';
      case 'ABSENT': return 'bg-red-100 text-red-800 border-red-300';
      case 'LATE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'EXCUSED': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {t('classManagement.attendanceMarking')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {students.length} {t('teacher.students')}
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            ✕ {t('common.close')}
          </Button>
        </div>

        {/* Date Selection and Bulk Actions */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('classManagement.selectDate')}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleBulkMark('PRESENT')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                ✅ {t('classManagement.markAllPresent')}
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkMark('ABSENT')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                ❌ {t('classManagement.markAllAbsent')}
              </Button>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {students.map((student) => (
              <div
                key={student.id}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative">
                    {student.photoUrl ? (
                      <img
                        src={student.photoUrl}
                        alt={student.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">
                          {getInitials(student.name)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {student.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('teacher.roll')}: {student.rollNumber}
                    </p>
                  </div>
                </div>

                {/* Attendance Status Buttons */}
                <div className="flex gap-2">
                  {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleAttendanceChange(student.id, status)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                        attendanceData[student.id] === status
                          ? getStatusColor(status)
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {t(`attendance.${status.toLowerCase()}`)}
                    </button>
                  ))}
                </div>

                {/* Notes Input */}
                <div className="w-32">
                  <input
                    type="text"
                    placeholder={t('classManagement.notes')}
                    value={notes[student.id] || ''}
                    onChange={(e) => setNotes(prev => ({ ...prev, [student.id]: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {Object.keys(attendanceData).length} / {students.length} {t('classManagement.studentsMarked')}
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={loading || Object.keys(attendanceData).length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? t('common.saving') : t('classManagement.saveAttendance')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
