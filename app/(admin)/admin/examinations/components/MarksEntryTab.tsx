'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../../../components/ui/Button';
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

interface Section {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  subjectCode: string;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

interface Enrollment {
  id: string;
  rollNumber: number;
  student: Student;
}

interface ExamSchedule {
  id: string;
  examId: string;
  classLevelId: string;
  subjectId: string;
  fullMarks: number;
  passMarks: number;
  exam: Exam;
  classLevel: ClassLevel;
  subject: Subject;
}

interface Mark {
  id?: string;
  enrollmentId: string;
  examScheduleId: string;
  marksObtained: number;
  grade?: {
    gradeName: string;
    points: number;
  };
  remarks?: string;
}

interface StudentMarkRow {
  enrollment: Enrollment;
  mark?: Mark;
  marksObtained: number;
  remarks: string;
  isModified: boolean;
}

export default function MarksEntryTab() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [studentRows, setStudentRows] = useState<StudentMarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  // Selection state
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);

  // Keyboard navigation
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: string } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    fetchExams();
    fetchClassLevels();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSections();
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedExam && selectedClass && selectedSubject) {
      fetchExamSchedule();
    }
  }, [selectedExam, selectedClass, selectedSubject]);

  useEffect(() => {
    if (selectedSchedule && selectedSection) {
      fetchStudentsAndMarks();
    }
  }, [selectedSchedule, selectedSection]);

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

  const fetchSections = async () => {
    try {
      const response = await fetch(`/api/admin/sections?classLevelId=${selectedClass}`);
      if (response.ok) {
        const data = await response.json();
        setSections(data.sections);
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch sections',
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

  const fetchExamSchedule = async () => {
    try {
      const params = new URLSearchParams({
        examId: selectedExam,
        classLevelId: selectedClass,
        subjectId: selectedSubject,
      });

      const response = await fetch(`/api/admin/exams/schedules?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.examSchedules.length > 0) {
          setSelectedSchedule(data.examSchedules[0]);
        } else {
          setSelectedSchedule(null);
          addToast({
            title: 'Info',
            description: 'No exam schedule found for this combination. Please create a schedule first.',
            type: 'info'
          });
        }
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch exam schedule',
        type: 'error'
      });
    }
  };

  const fetchStudentsAndMarks = async () => {
    if (!selectedSchedule) return;

    setLoading(true);
    try {
      // Fetch enrollments for the selected class and section
      const enrollmentsResponse = await fetch(
        `/api/admin/students?classLevelId=${selectedClass}&sectionId=${selectedSection}&academicYearId=${selectedSchedule.exam.academicYear.id}`
      );

      if (!enrollmentsResponse.ok) {
        throw new Error('Failed to fetch students');
      }

      const enrollmentsData = await enrollmentsResponse.json();
      const students = enrollmentsData.students;

      // Fetch existing marks for this exam schedule
      const marksResponse = await fetch(
        `/api/admin/exams/marks?examScheduleId=${selectedSchedule.id}`
      );

      let existingMarks: Mark[] = [];
      if (marksResponse.ok) {
        const marksData = await marksResponse.json();
        existingMarks = marksData.marks;
      }

      // Create student rows with existing marks
      const rows: StudentMarkRow[] = students
        .filter((student: any) => student.enrollments && student.enrollments.length > 0)
        .map((student: any) => {
          const enrollment = student.enrollments[0]; // Get the latest enrollment
          const existingMark = existingMarks.find(mark => mark.enrollmentId === enrollment.id);
          
          return {
            enrollment,
            mark: existingMark,
            marksObtained: existingMark?.marksObtained || 0,
            remarks: existingMark?.remarks || '',
            isModified: false,
          };
        })
        .sort((a: any, b: any) => a.enrollment.rollNumber - b.enrollment.rollNumber);

      setStudentRows(rows);
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

  const updateMark = useCallback((rowIndex: number, field: 'marksObtained' | 'remarks', value: number | string) => {
    setStudentRows(prev => prev.map((row, index) => {
      if (index === rowIndex) {
        const updatedRow = {
          ...row,
          [field]: value,
          isModified: true,
        };

        // Validate marks
        if (field === 'marksObtained' && selectedSchedule) {
          const marks = value as number;
          if (marks < 0) {
            updatedRow.marksObtained = 0;
          } else if (marks > selectedSchedule.fullMarks) {
            updatedRow.marksObtained = selectedSchedule.fullMarks;
          }
        }

        return updatedRow;
      }
      return row;
    }));
  }, [selectedSchedule]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, field: string) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setFocusedCell({ row: rowIndex - 1, col: field });
          const input = document.querySelector(`input[data-row="${rowIndex - 1}"][data-field="${field}"]`) as HTMLInputElement;
          input?.focus();
        }
        break;
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        if (rowIndex < studentRows.length - 1) {
          setFocusedCell({ row: rowIndex + 1, col: field });
          const input = document.querySelector(`input[data-row="${rowIndex + 1}"][data-field="${field}"]`) as HTMLInputElement;
          input?.focus();
        }
        break;
      case 'ArrowLeft':
        if (field === 'remarks') {
          e.preventDefault();
          setFocusedCell({ row: rowIndex, col: 'marksObtained' });
          const input = document.querySelector(`input[data-row="${rowIndex}"][data-field="marksObtained"]`) as HTMLInputElement;
          input?.focus();
        }
        break;
      case 'ArrowRight':
      case 'Tab':
        if (field === 'marksObtained') {
          e.preventDefault();
          setFocusedCell({ row: rowIndex, col: 'remarks' });
          const input = document.querySelector(`input[data-row="${rowIndex}"][data-field="remarks"]`) as HTMLInputElement;
          input?.focus();
        }
        break;
    }
  }, [studentRows.length]);

  const calculateGrade = (marks: number): string => {
    if (!selectedSchedule) return '';
    
    const percentage = (marks / selectedSchedule.fullMarks) * 100;
    
    // Simple grading logic - this would normally use the grading system
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
  };

  const saveAllMarks = async () => {
    if (!selectedSchedule) return;

    const modifiedRows = studentRows.filter(row => row.isModified);
    if (modifiedRows.length === 0) {
      addToast({
        title: 'Info',
        description: 'No changes to save',
        type: 'info'
      });
      return;
    }

    setSaving(true);
    try {
      const marksData = modifiedRows.map(row => ({
        enrollmentId: row.enrollment.id,
        marksObtained: row.marksObtained,
        remarks: row.remarks || null,
      }));

      const response = await fetch('/api/admin/exams/marks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examScheduleId: selectedSchedule.id,
          marks: marksData,
        }),
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: `Successfully saved marks for ${modifiedRows.length} students`,
          type: 'success'
        });

        // Reset modified flags
        setStudentRows(prev => prev.map(row => ({ ...row, isModified: false })));
        
        // Refresh data
        fetchStudentsAndMarks();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save marks');
      }
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = studentRows.some(row => row.isModified);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marks Entry</h2>
          <p className="text-gray-600">Enter marks for students in an Excel-like interface with keyboard navigation.</p>
        </div>
        {hasUnsavedChanges && (
          <Button
            onClick={saveAllMarks}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        )}
      </div>

      {/* Selection Filters */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam *
            </label>
            <select
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setSelectedSchedule(null);
                setStudentRows([]);
              }}
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
              Class *
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setSelectedSchedule(null);
                setStudentRows([]);
              }}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section *
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setStudentRows([]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              disabled={!selectedClass}
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedSchedule(null);
                setStudentRows([]);
              }}
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
        </div>

        {selectedSchedule && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">
                  {selectedSchedule.exam.name} - {selectedSchedule.subject.name}
                </h4>
                <p className="text-sm text-blue-700">
                  Full Marks: {selectedSchedule.fullMarks} | Pass Marks: {selectedSchedule.passMarks}
                </p>
              </div>
              <div className="text-sm text-blue-700">
                {studentRows.length} students
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Marks Entry Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : selectedSchedule && studentRows.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roll No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marks Obtained
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remarks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {studentRows.map((row, index) => {
                  const percentage = selectedSchedule ? (row.marksObtained / selectedSchedule.fullMarks) * 100 : 0;
                  const grade = calculateGrade(row.marksObtained);
                  const isPassing = row.marksObtained >= selectedSchedule!.passMarks;

                  return (
                    <tr 
                      key={row.enrollment.id}
                      className={`hover:bg-gray-50 ${row.isModified ? 'bg-yellow-50' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.enrollment.rollNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.enrollment.student.studentId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.enrollment.student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          value={row.marksObtained}
                          onChange={(e) => updateMark(index, 'marksObtained', parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'marksObtained')}
                          data-row={index}
                          data-field="marksObtained"
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          min="0"
                          max={selectedSchedule?.fullMarks}
                          step="0.5"
                        />
                        <span className="ml-2 text-xs text-gray-500">
                          / {selectedSchedule?.fullMarks}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          isPassing 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {percentage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => updateMark(index, 'remarks', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'remarks')}
                          data-row={index}
                          data-field="remarks"
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Optional"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {row.isModified ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Modified
                          </span>
                        ) : row.mark ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Saved
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            New
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Students: {studentRows.length} | 
                Modified: {studentRows.filter(row => row.isModified).length} |
                Average: {studentRows.length > 0 ? (studentRows.reduce((sum, row) => sum + row.marksObtained, 0) / studentRows.length).toFixed(1) : 0}
              </div>
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-yellow-600 font-medium">
                    You have unsaved changes
                  </span>
                  <Button
                    onClick={saveAllMarks}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? 'Saving...' : 'Save All Changes'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : selectedExam && selectedClass && selectedSection && selectedSubject ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No exam schedule found</h3>
          <p className="text-gray-600">
            Please create an exam schedule for this combination first in the "Schedules" tab.
          </p>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✏️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select exam details</h3>
          <p className="text-gray-600">
            Choose an exam, class, section, and subject to start entering marks.
          </p>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {selectedSchedule && studentRows.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Keyboard Shortcuts</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
            <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded">↑↓</kbd> Navigate up/down</div>
            <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded">←→</kbd> Navigate left/right</div>
            <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded">Enter</kbd> Move to next row</div>
            <div>• <kbd className="px-1 py-0.5 bg-blue-100 rounded">Tab</kbd> Move to next field</div>
          </div>
        </div>
      )}
    </div>
  );
}
