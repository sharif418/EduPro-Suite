'use client';

import { useState, useCallback } from 'react';

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

interface GradeBookTableProps {
  data: GradeBookData;
  editMode: boolean;
  onGradeUpdate: (studentId: string, examId: string, subjectId: string, newMarks: number) => void;
  selectedExam?: string;
}

export function GradeBookTable({ data, editMode, onGradeUpdate, selectedExam }: GradeBookTableProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Get unique subjects across all exams
  const getAllSubjects = useCallback(() => {
    const subjectMap = new Map();
    data.exams.forEach(exam => {
      exam.subjects.forEach(subject => {
        if (!subjectMap.has(subject.id)) {
          subjectMap.set(subject.id, subject);
        }
      });
    });
    return Array.from(subjectMap.values());
  }, [data.exams]);

  // Get filtered exams based on selectedExam
  const getFilteredExams = useCallback(() => {
    if (selectedExam) {
      return data.exams.filter(exam => exam.id === selectedExam);
    }
    return data.exams;
  }, [data.exams, selectedExam]);

  const subjects = getAllSubjects();
  const filteredExams = getFilteredExams();

  const handleCellClick = (studentId: string, examId: string, subjectId: string, currentMarks: number) => {
    if (!editMode) return;
    
    const cellId = `${studentId}-${examId}-${subjectId}`;
    setEditingCell(cellId);
    setTempValue(currentMarks.toString());
  };

  const handleCellSave = (studentId: string, examId: string, subjectId: string) => {
    const newMarks = parseFloat(tempValue);
    if (!isNaN(newMarks) && newMarks >= 0) {
      onGradeUpdate(studentId, examId, subjectId, newMarks);
    }
    setEditingCell(null);
    setTempValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setTempValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, studentId: string, examId: string, subjectId: string) => {
    if (e.key === 'Enter') {
      handleCellSave(studentId, examId, subjectId);
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const getGradeForMarks = (marksObtained: number, fullMarks: number) => {
    const percentage = (marksObtained / fullMarks) * 100;
    const grade = data.gradingSystem.grades.find(g => 
      percentage >= g.minPercentage && percentage <= g.maxPercentage
    );
    return grade?.gradeName || 'F';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'B+':
      case 'B':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'C+':
      case 'C':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'D':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'F':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const renderGradeCell = (student: any, exam: any, subject: any) => {
    const grade = student.grades.find((g: any) => 
      g.examId === exam.id && g.subjectId === subject.id
    );
    
    const cellId = `${student.id}-${exam.id}-${subject.id}`;
    const isEditing = editingCell === cellId;
    
    if (!grade) {
      return (
        <td 
          key={cellId}
          className={`px-3 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-600 ${
            editMode ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
          }`}
          onClick={() => editMode && handleCellClick(student.id, exam.id, subject.id, 0)}
        >
          <span className="text-gray-400">-</span>
        </td>
      );
    }

    return (
      <td 
        key={cellId}
        className={`px-3 py-2 text-center text-sm border-r border-gray-200 dark:border-gray-600 ${
          editMode ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''
        }`}
        onClick={() => !isEditing && handleCellClick(student.id, exam.id, subject.id, grade.marksObtained)}
      >
        {isEditing ? (
          <input
            type="number"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={() => handleCellSave(student.id, exam.id, subject.id)}
            onKeyDown={(e) => handleKeyDown(e, student.id, exam.id, subject.id)}
            className="w-16 px-1 py-1 text-center text-xs border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            min="0"
            max={subject.fullMarks}
            step="0.5"
          />
        ) : (
          <div className="space-y-1">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {grade.marksObtained}/{subject.fullMarks}
            </div>
            <div className={`inline-block px-1 py-0.5 rounded text-xs font-medium ${getGradeColor(grade.grade)}`}>
              {grade.grade}
            </div>
          </div>
        )}
      </td>
    );
  };

  if (data.students.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No students found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Students will appear here once they are enrolled in the class.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {/* Student Info Headers */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-700 z-10">
              Roll No.
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider sticky left-16 bg-gray-50 dark:bg-gray-700 z-10">
              Student Name
            </th>
            
            {/* Exam-Subject Headers */}
            {filteredExams.map(exam => 
              exam.subjects.map(subject => (
                <th 
                  key={`${exam.id}-${subject.id}`}
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600"
                >
                  <div className="space-y-1">
                    <div className="font-semibold">{exam.name}</div>
                    <div className="text-gray-400">{subject.name}</div>
                    <div className="text-gray-400">({subject.fullMarks})</div>
                  </div>
                </th>
              ))
            )}
            
            {/* Summary Headers */}
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-l-2 border-gray-300 dark:border-gray-600">
              GPA
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Overall Grade
            </th>
          </tr>
        </thead>
        
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {data.students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              {/* Student Info */}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-800 z-10">
                {student.rollNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 sticky left-16 bg-white dark:bg-gray-800 z-10">
                {student.name}
              </td>
              
              {/* Grade Cells */}
              {filteredExams.map(exam => 
                exam.subjects.map(subject => 
                  renderGradeCell(student, exam, subject)
                )
              )}
              
              {/* Summary Cells */}
              <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900 dark:text-gray-100 border-l-2 border-gray-300 dark:border-gray-600">
                {student.gpa.toFixed(2)}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getGradeColor(student.overallGrade)}`}>
                  {student.overallGrade}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Instructions */}
      {editMode && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Edit Mode Instructions</h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <div>• Click on any grade cell to edit the marks</div>
            <div>• Press <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Enter</kbd> to save changes</div>
            <div>• Press <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Escape</kbd> to cancel editing</div>
            <div>• GPA will be automatically recalculated after each change</div>
          </div>
        </div>
      )}
    </div>
  );
}
