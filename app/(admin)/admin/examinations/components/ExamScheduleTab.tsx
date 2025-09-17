'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/Dialog';
import { useToast } from '../../../../components/ui/Toast';

interface AcademicYear {
  id: string;
  year: string;
  isCurrent: boolean;
}

interface Exam {
  id: string;
  name: string;
  academicYear: AcademicYear;
}

interface ClassLevel {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  subjectCode: string;
}

interface ExamSchedule {
  id: string;
  examId: string;
  classLevelId: string;
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  fullMarks: number;
  passMarks: number;
  exam: Exam;
  classLevel: ClassLevel;
  subject: Subject;
  marks: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ExamScheduleTab() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const { addToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    examId: '',
    classLevelId: '',
    subjectId: '',
    examDate: '',
    startTime: '09:00',
    endTime: '12:00',
    fullMarks: 100,
    passMarks: 40,
  });

  // Filters
  const [filters, setFilters] = useState({
    examId: '',
    classLevelId: '',
    subjectId: '',
  });

  useEffect(() => {
    fetchExams();
    fetchClassLevels();
    fetchSubjects();
    fetchSchedules();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [filters]);

  const fetchExams = async () => {
    try {
      const response = await fetch('/api/admin/exams/exams');
      if (response.ok) {
        const data = await response.json();
        setExams(data.exams);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch exams',
        type: 'error'
      });
    }
  };

  const fetchClassLevels = async () => {
    try {
      const response = await fetch('/api/admin/class-levels');
      if (response.ok) {
        const data = await response.json();
        setClassLevels(data.classLevels);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch class levels',
        type: 'error'
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/admin/subjects');
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch subjects',
        type: 'error'
      });
    }
  };

  const fetchSchedules = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.examId) params.append('examId', filters.examId);
      if (filters.classLevelId) params.append('classLevelId', filters.classLevelId);
      if (filters.subjectId) params.append('subjectId', filters.subjectId);

      const response = await fetch(`/api/admin/exams/schedules?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.examSchedules);
      } else {
        throw new Error('Failed to fetch exam schedules');
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch exam schedules',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = '/api/admin/exams/schedules';
      const method = editingSchedule ? 'PUT' : 'POST';
      const body = editingSchedule 
        ? { ...formData, id: editingSchedule.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: `Exam schedule ${editingSchedule ? 'updated' : 'created'} successfully`,
          type: 'success'
        });
        setShowCreateDialog(false);
        setEditingSchedule(null);
        resetForm();
        fetchSchedules();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save exam schedule');
      }
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam schedule?')) return;

    try {
      const response = await fetch(`/api/admin/exams/schedules?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Exam schedule deleted successfully',
          type: 'success'
        });
        fetchSchedules();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete exam schedule');
      }
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    }
  };

  const handleEdit = (schedule: ExamSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      examId: schedule.examId,
      classLevelId: schedule.classLevelId,
      subjectId: schedule.subjectId,
      examDate: schedule.examDate.split('T')[0], // Convert to YYYY-MM-DD format
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      fullMarks: schedule.fullMarks,
      passMarks: schedule.passMarks,
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      examId: '',
      classLevelId: '',
      subjectId: '',
      examDate: '',
      startTime: '09:00',
      endTime: '12:00',
      fullMarks: 100,
      passMarks: 40,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading && schedules.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exam Schedules</h2>
          <p className="text-gray-600">Schedule exams for different subjects and classes with specific dates and times.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingSchedule(null);
            setShowCreateDialog(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <span className="mr-2">+</span>
          Schedule Exam
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam
            </label>
            <select
              value={filters.examId}
              onChange={(e) => setFilters({ ...filters, examId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} ({exam.academicYear.year})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class
            </label>
            <select
              value={filters.classLevelId}
              onChange={(e) => setFilters({ ...filters, classLevelId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Classes</option>
              {classLevels.map((classLevel) => (
                <option key={classLevel.id} value={classLevel.id}>
                  {classLevel.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={filters.subjectId}
              onChange={(e) => setFilters({ ...filters, subjectId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.subjectCode})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({ examId: '', classLevelId: '', subjectId: '' })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="grid gap-4">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {schedule.subject.name}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {schedule.subject.subjectCode}
                  </span>
                  {schedule.marks.length > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                      Marks Entered
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Exam:</span> {schedule.exam.name}
                  </div>
                  <div>
                    <span className="font-medium">Class:</span> {schedule.classLevel.name}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {formatDate(schedule.examDate)}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Full Marks:</span> {schedule.fullMarks}
                  </div>
                  <div>
                    <span className="font-medium">Pass Marks:</span> {schedule.passMarks}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(schedule)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(schedule.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={schedule.marks.length > 0}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Duration and Status */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">
                    Duration: {(() => {
                      const start = schedule.startTime.split(':').map(Number);
                      const end = schedule.endTime.split(':').map(Number);
                      const startMinutes = start[0] * 60 + start[1];
                      const endMinutes = end[0] * 60 + end[1];
                      const durationMinutes = endMinutes - startMinutes;
                      const hours = Math.floor(durationMinutes / 60);
                      const minutes = durationMinutes % 60;
                      return `${hours}h ${minutes}m`;
                    })()}
                  </span>
                  <span className="text-gray-600">
                    Academic Year: {schedule.exam.academicYear.year}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Created: {new Date(schedule.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}

        {schedules.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exam schedules found</h3>
            <p className="text-gray-600 mb-4">
              {filters.examId || filters.classLevelId || filters.subjectId
                ? 'No schedules match your current filters.' 
                : 'Create your first exam schedule to get started.'
              }
            </p>
            {!filters.examId && !filters.classLevelId && !filters.subjectId && (
              <Button
                onClick={() => {
                  resetForm();
                  setEditingSchedule(null);
                  setShowCreateDialog(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Schedule Exam
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Exam Schedule' : 'Create Exam Schedule'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam
                </label>
                <select
                  value={formData.examId}
                  onChange={(e) => setFormData({ ...formData, examId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Exam</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name} ({exam.academicYear.year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Level
                </label>
                <select
                  value={formData.classLevelId}
                  onChange={(e) => setFormData({ ...formData, classLevelId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Class</option>
                  {classLevels.map((classLevel) => (
                    <option key={classLevel.id} value={classLevel.id}>
                      {classLevel.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.subjectCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Marks
                </label>
                <input
                  type="number"
                  value={formData.fullMarks}
                  onChange={(e) => setFormData({ ...formData, fullMarks: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="1"
                  step="0.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pass Marks
                </label>
                <input
                  type="number"
                  value={formData.passMarks}
                  onChange={(e) => setFormData({ ...formData, passMarks: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  max={formData.fullMarks}
                  step="0.5"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingSchedule(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? 'Saving...' : editingSchedule ? 'Update' : 'Schedule'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
