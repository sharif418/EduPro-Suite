'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { GradeBookTable } from '@/app/components/teacher/GradeBookTable';

interface GradeBookData {
  students: Array<{
    id: string;
    name: string;
    rollNumber: string;
    grades: Array<{
      examId: string;
      examName: string;
      subjectId: string;
      subjectName: string;
      marksObtained: number;
      fullMarks: number;
      grade: string;
      points: number;
    }>;
    gpa: number;
    overallGrade: string;
  }>;
  exams: Array<{
    id: string;
    name: string;
    date: string;
    subjects: Array<{
      id: string;
      name: string;
      fullMarks: number;
      passMarks: number;
    }>;
  }>;
  gradingSystem: {
    id: string;
    name: string;
    grades: Array<{
      gradeName: string;
      minPercentage: number;
      maxPercentage: number;
      points: number;
    }>;
  };
}

export default function GradeBookPage() {
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  
  const [gradeBookData, setGradeBookData] = useState<GradeBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(classId || '');
  const [selectedExam, setSelectedExam] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchGradeBookData();
    }
  }, [selectedClassId, selectedExam]);

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

  const fetchGradeBookData = async () => {
    try {
      setLoading(true);
      const url = selectedExam 
        ? `/api/teacher/gradebook?classId=${selectedClassId}&examId=${selectedExam}`
        : `/api/teacher/gradebook?classId=${selectedClassId}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch grade book data');
      }
      
      const data = await response.json();
      setGradeBookData(data.gradeBook);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeUpdate = async (studentId: string, examId: string, subjectId: string, newMarks: number) => {
    try {
      const response = await fetch('/api/teacher/gradebook/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          examId,
          subjectId,
          marksObtained: newMarks,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update grade');
      }

      // Refresh the grade book data
      await fetchGradeBookData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update grade');
    }
  };

  const handleExportGrades = async () => {
    try {
      const response = await fetch(`/api/teacher/gradebook/export?classId=${selectedClassId}${selectedExam ? `&examId=${selectedExam}` : ''}`);
      
      if (!response.ok) {
        throw new Error('Failed to export grades');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `gradebook_${selectedClassId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export grades');
    }
  };

  const getSelectedClass = () => {
    return classes.find(cls => cls.id === selectedClassId);
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
            Grade Book
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage student grades with automatic GPA calculations
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? 'View Mode' : 'Edit Mode'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExportGrades}
            disabled={!gradeBookData}
          >
            Export Grades
          </Button>
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
              Filter by Exam (Optional)
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Exams</option>
              {gradeBookData?.exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} - {new Date(exam.date).toLocaleDateString()}
                </option>
              ))}
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
            Select a class to view grades
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a class from the dropdown above to see the grade book.
          </p>
        </div>
      ) : !gradeBookData ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No grade data available
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Grade data will appear here once exams are conducted and marks are entered.
          </p>
        </div>
      ) : (
        <>
          {/* Grade Book Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {gradeBookData.students.length}
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
                    Average GPA
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {gradeBookData.students.length > 0 
                      ? (gradeBookData.students.reduce((sum, student) => sum + student.gpa, 0) / gradeBookData.students.length).toFixed(2)
                      : '0.00'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <span className="text-2xl">📝</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Exams
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {gradeBookData.exams.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <span className="text-2xl">🏆</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Highest GPA
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {gradeBookData.students.length > 0 
                      ? Math.max(...gradeBookData.students.map(s => s.gpa)).toFixed(2)
                      : '0.00'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grading System Info */}
          {gradeBookData.gradingSystem && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Grading System: {gradeBookData.gradingSystem.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {gradeBookData.gradingSystem.grades.map((grade) => (
                  <div key={grade.gradeName} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {grade.gradeName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {grade.minPercentage}% - {grade.maxPercentage}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      {grade.points} points
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade Book Table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <GradeBookTable
              data={gradeBookData}
              editMode={editMode}
              onGradeUpdate={handleGradeUpdate}
              selectedExam={selectedExam}
            />
          </div>
        </>
      )}
    </div>
  );
}
