'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import StudentProfileModal from './StudentProfileModal';
import AttendanceMarkingInterface from './AttendanceMarkingInterface';
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

interface Subject {
  id: string;
  name: string;
  subjectCode: string;
}

interface ClassRosterGridProps {
  classId: string;
  className: string;
  subjects: Subject[];
  isClassTeacher: boolean;
}

export default function ClassRosterGrid({ 
  classId, 
  className, 
  subjects, 
  isClassTeacher 
}: ClassRosterGridProps) {
  const t = useTranslations('teacher');
  const router = useRouter();
  const pathname = usePathname();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'roll' | 'attendance' | 'performance'>('roll');
  const [filterBy, setFilterBy] = useState<'all' | 'excellent' | 'good' | 'average' | 'poor' | 'low-attendance' | 'unverified-guardian'>('all');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showAttendanceInterface, setShowAttendanceInterface] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Extract locale from pathname
  const getLocale = () => {
    const segments = pathname.split('/');
    return segments[1] || 'en';
  };

  const navigateToPage = (page: string) => {
    const locale = getLocale();
    router.push(`/${locale}/teacher/${page}?classId=${classId}`);
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teacher/classes/${classId}/students`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch students');
        }
        
        const data = await response.json();
        setStudents(data.students || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchStudents();
    }
  }, [classId]);

  // Enhanced filtering and sorting
  const filteredAndSortedStudents = students
    .filter(student => {
      // Text search filter
      const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.rollNumber.toString().includes(searchTerm) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.guardian.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Advanced filters
      switch (filterBy) {
        case 'excellent':
        case 'good':
        case 'average':
        case 'poor':
          return student.performanceIndicator === filterBy;
        case 'low-attendance':
          return student.attendancePercentage < 75;
        case 'unverified-guardian':
          return !student.guardian.verified;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'roll':
          return a.rollNumber - b.rollNumber;
        case 'attendance':
          return b.attendancePercentage - a.attendancePercentage;
        case 'performance':
          const performanceOrder = { excellent: 4, good: 3, average: 2, poor: 1 };
          return (performanceOrder[b.performanceIndicator || 'average'] || 0) - 
                 (performanceOrder[a.performanceIndicator || 'average'] || 0);
        default:
          return 0;
      }
    });

  const handleStudentSelection = (studentId: string, selected: boolean) => {
    const newSelection = new Set(selectedStudents);
    if (selected) {
      newSelection.add(studentId);
    } else {
      newSelection.delete(studentId);
    }
    setSelectedStudents(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredAndSortedStudents.length) {
      setSelectedStudents(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedStudents(new Set(filteredAndSortedStudents.map(s => s.id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAttendance = async (status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED') => {
    try {
      setBulkActionLoading(true);
      const response = await fetch('/api/teacher/attendance/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          studentIds: Array.from(selectedStudents),
          status,
          date: new Date().toISOString().split('T')[0]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark bulk attendance');
      }

      // Refresh student data
      const updatedStudents = students.map(student => {
        if (selectedStudents.has(student.id)) {
          return {
            ...student,
            todayAttendance: {
              status,
              markedAt: new Date().toISOString()
            }
          };
        }
        return student;
      });
      setStudents(updatedStudents);
      setSelectedStudents(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error marking bulk attendance:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkNotification = async () => {
    try {
      setBulkActionLoading(true);
      const response = await fetch('/api/teacher/notifications/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          studentIds: Array.from(selectedStudents),
          type: 'general'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send bulk notifications');
      }

      setSelectedStudents(new Set());
      setShowBulkActions(false);
    } catch (err) {
      console.error('Error sending bulk notifications:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (percentage >= 60) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
  };

  const getPerformanceColor = (indicator?: string) => {
    switch (indicator) {
      case 'excellent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'good': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'average': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'poor': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('classManagement.errorLoadingStudents')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Bulk Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {className} - {t('teacher.classRoster')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {students.length} {t('teacher.students')} • {subjects.map(s => s.name).join(', ')}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAttendanceInterface(true)}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              ✅ {t('classManagement.quickAttendance')}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigateToPage('seating')}
            >
              🪑 {t('teacher.seatingArrangement')}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigateToPage('analytics')}
            >
              📊 {t('teacher.analytics')}
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {selectedStudents.size} {t('classManagement.studentsSelected')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStudents(new Set());
                    setShowBulkActions(false);
                  }}
                  className="text-xs"
                >
                  {t('common.cancel')}
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkAttendance('PRESENT')}
                  disabled={bulkActionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ✅ {t('classManagement.markPresent')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkAttendance('ABSENT')}
                  disabled={bulkActionLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  ❌ {t('classManagement.markAbsent')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkNotification}
                  disabled={bulkActionLoading}
                >
                  📧 {t('classManagement.notifyGuardians')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Search and Filter */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder={t('classManagement.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">{t('classManagement.allStudents')}</option>
            <option value="excellent">{t('teacher.excellent')}</option>
            <option value="good">{t('teacher.good')}</option>
            <option value="average">{t('teacher.average')}</option>
            <option value="poor">{t('classManagement.needsImprovement')}</option>
            <option value="low-attendance">{t('classManagement.lowAttendance')}</option>
            <option value="unverified-guardian">{t('classManagement.unverifiedGuardian')}</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="roll">{t('teacher.sortByRoll')}</option>
            <option value="name">{t('teacher.sortByName')}</option>
            <option value="attendance">{t('teacher.sortByAttendance')}</option>
            <option value="performance">{t('classManagement.sortByPerformance')}</option>
          </select>
        </div>
      </div>

      {/* Select All Checkbox */}
      {filteredAndSortedStudents.length > 0 && (
        <div className="flex items-center gap-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedStudents.size === filteredAndSortedStudents.length && filteredAndSortedStudents.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('classManagement.selectAll')} ({filteredAndSortedStudents.length})
            </span>
          </label>
        </div>
      )}

      {/* Enhanced Student Grid */}
      {filteredAndSortedStudents.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {searchTerm || filterBy !== 'all' ? t('classManagement.noStudentsFound') : t('classManagement.noStudentsInClass')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || filterBy !== 'all' 
              ? t('classManagement.tryDifferentFilter')
              : t('classManagement.addStudentsToClass')
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow duration-200"
            >
              {/* Selection Checkbox */}
              <div className="flex items-start justify-between mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={(e) => handleStudentSelection(student.id, e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                </label>
                
                {/* Performance Indicator */}
                {student.performanceIndicator && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPerformanceColor(student.performanceIndicator)}`}>
                    {t(`teacher.${student.performanceIndicator}`)}
                  </span>
                )}
              </div>

              {/* Student Info */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  {student.photoUrl ? (
                    <img
                      src={student.photoUrl}
                      alt={student.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-400 font-semibold text-sm">
                        {getInitials(student.name)}
                      </span>
                    </div>
                  )}
                  
                  {/* Today's Attendance Status */}
                  {student.todayAttendance?.status && (
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                      student.todayAttendance.status === 'PRESENT' ? 'bg-green-500' :
                      student.todayAttendance.status === 'LATE' ? 'bg-yellow-500' :
                      student.todayAttendance.status === 'EXCUSED' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`} title={t(`attendance.${student.todayAttendance.status.toLowerCase()}`)}>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {student.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('teacher.roll')}: {student.rollNumber} • ID: {student.studentId}
                  </p>
                </div>
              </div>

              {/* Attendance Percentage */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {t('teacher.attendance')}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getAttendanceColor(student.attendancePercentage)}`}>
                    {student.attendancePercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      student.attendancePercentage >= 90 ? 'bg-green-500' :
                      student.attendancePercentage >= 75 ? 'bg-yellow-500' :
                      student.attendancePercentage >= 60 ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${student.attendancePercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Guardian Info */}
              <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {student.guardian.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {student.guardian.contactNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {student.guardian.verified ? (
                      <span className="text-green-500 text-xs" title={t('classManagement.verifiedGuardian')}>✓</span>
                    ) : (
                      <span className="text-red-500 text-xs" title={t('classManagement.unverifiedGuardian')}>⚠</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStudent(student)}
                  className="flex-1 text-xs"
                >
                  👤 {t('teacher.profile')}
                </Button>
                
                {!student.todayAttendance?.status && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleBulkAttendance('PRESENT')}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 text-xs"
                      title={t('classManagement.markPresent')}
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleBulkAttendance('ABSENT')}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 text-xs"
                      title={t('classManagement.markAbsent')}
                    >
                      ✗
                    </Button>
                  </div>
                )}
              </div>

              {/* Last Attendance */}
              {student.lastAttendance && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('classManagement.lastSeen')}: {new Date(student.lastAttendance.date).toLocaleDateString()} 
                    <span className={`ml-1 ${
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
          ))}
        </div>
      )}

      {/* Export Options */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const exportData = {
              classId,
              className,
              students: filteredAndSortedStudents,
              exportType: 'roster'
            };
            // Trigger export
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${className}-roster-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          📊 {t('classManagement.exportRoster')}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const attendanceData = {
              classId,
              className,
              students: filteredAndSortedStudents.map(s => ({
                name: s.name,
                rollNumber: s.rollNumber,
                attendancePercentage: s.attendancePercentage,
                lastAttendance: s.lastAttendance,
                todayAttendance: s.todayAttendance
              })),
              exportType: 'attendance'
            };
            // Trigger export
            const blob = new Blob([JSON.stringify(attendanceData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${className}-attendance-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          📈 {t('classManagement.exportAttendance')}
        </Button>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          classId={classId}
        />
      )}

      {/* Attendance Marking Interface */}
      {showAttendanceInterface && (
        <AttendanceMarkingInterface
          classId={classId}
          students={students}
          onClose={() => setShowAttendanceInterface(false)}
          onAttendanceUpdate={(updatedStudents: Student[]) => {
            setStudents(updatedStudents);
            setShowAttendanceInterface(false);
          }}
        />
      )}
    </div>
  );
}
