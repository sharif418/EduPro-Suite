'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  studentId: string;
  dateOfBirth: string;
  gender: string;
}

interface Enrollment {
  rollNumber: number;
  student: Student;
  classLevel: {
    name: string;
  };
  section: {
    name: string;
  };
  academicYear: {
    year: string;
  };
}

interface Exam {
  name: string;
  academicYear: {
    year: string;
  };
}

interface Grade {
  gradeName: string;
  points: number;
}

interface GradingSystem {
  name: string;
  grades: Grade[];
}

interface SubjectMark {
  subject: {
    name: string;
    subjectCode: string;
  };
  marksObtained: number;
  fullMarks: number;
  percentage: number;
  grade: Grade;
  passMarks: number;
}

interface Result {
  id: string;
  totalMarks: number;
  totalFullMarks: number;
  percentage: number;
  gpa: number;
  rank: number;
  enrollment: Enrollment;
  exam: Exam;
  finalGrade: Grade;
  gradingSystem: GradingSystem;
  subjectMarks: SubjectMark[];
}

export default function ReportCardPage() {
  const params = useParams();
  const resultId = params.resultId as string;
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resultId) {
      fetchResult();
    }
  }, [resultId]);

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/results/${resultId}`);
      if (response.ok) {
        const data = await response.json();
        setResult(data.result);
      } else if (response.status === 404) {
        setError('Result not found');
      } else {
        setError('Failed to load result');
      }
    } catch (error) {
      setError('Failed to load result');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getGradeColor = (gradeName: string) => {
    switch (gradeName) {
      case 'A+': return 'text-green-700';
      case 'A': return 'text-green-600';
      case 'B+': return 'text-blue-600';
      case 'B': return 'text-blue-500';
      case 'C+': return 'text-yellow-600';
      case 'C': return 'text-yellow-500';
      default: return 'text-red-600';
    }
  };

  const getPerformanceMessage = (percentage: number) => {
    if (percentage >= 90) return 'Outstanding Performance';
    if (percentage >= 80) return 'Excellent Performance';
    if (percentage >= 70) return 'Very Good Performance';
    if (percentage >= 60) return 'Good Performance';
    if (percentage >= 50) return 'Satisfactory Performance';
    if (percentage >= 40) return 'Needs Improvement';
    return 'Requires Attention';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">📄</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Result Not Found'}
          </h1>
          <p className="text-gray-600">
            The requested report card could not be found or accessed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Print Button - Hidden in print */}
      <div className="max-w-4xl mx-auto px-4 mb-6 print:hidden">
        <div className="flex justify-end">
          <button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <span>🖨️</span>
            <span>Print Report Card</span>
          </button>
        </div>
      </div>

      {/* Report Card */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none print:max-w-none">
        {/* Header with Islamic Pattern */}
        <div className="relative bg-gradient-to-r from-indigo-800 to-purple-800 text-white p-8 print:bg-gray-800">
          {/* Islamic Geometric Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M30 30l15-15v30l-15-15zm0 0l-15 15h30l-15-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">EduPro Suite</h1>
                <p className="text-indigo-200">Academic Excellence Report</p>
              </div>
              <div className="text-right">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-2xl">🎓</span>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Student Information</h2>
                <div className="space-y-2 text-indigo-100">
                  <p><span className="font-medium">Name:</span> {result.enrollment.student.name}</p>
                  <p><span className="font-medium">Student ID:</span> {result.enrollment.student.studentId}</p>
                  <p><span className="font-medium">Roll Number:</span> {result.enrollment.rollNumber}</p>
                  <p><span className="font-medium">Class:</span> {result.enrollment.classLevel.name} - {result.enrollment.section.name}</p>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-4">Examination Details</h2>
                <div className="space-y-2 text-indigo-100">
                  <p><span className="font-medium">Examination:</span> {result.exam.name}</p>
                  <p><span className="font-medium">Academic Year:</span> {result.exam.academicYear.year}</p>
                  <p><span className="font-medium">Report Date:</span> {formatDate(new Date().toISOString())}</p>
                  <p><span className="font-medium">Grading System:</span> {result.gradingSystem.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subject-wise Performance */}
        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-2">📊</span>
            Subject-wise Performance
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">Subject</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Full Marks</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Marks Obtained</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Percentage</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Grade</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Grade Points</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.subjectMarks?.map((mark, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{mark.subject.name}</div>
                        <div className="text-sm text-gray-500">{mark.subject.subjectCode}</div>
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{mark.fullMarks}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center font-medium">{mark.marksObtained}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{mark.percentage.toFixed(1)}%</td>
                    <td className={`border border-gray-300 px-4 py-3 text-center font-bold ${getGradeColor(mark.grade.gradeName)}`}>
                      {mark.grade.gradeName}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-center">{mark.grade.points}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mark.marksObtained >= mark.passMarks 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {mark.marksObtained >= mark.passMarks ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Overall Performance Summary */}
        <div className="px-8 pb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="mr-2">🏆</span>
              Overall Performance Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{result.totalMarks}</div>
                <div className="text-sm text-gray-600">Total Marks</div>
                <div className="text-xs text-gray-500">out of {result.totalFullMarks}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{result.percentage.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Percentage</div>
                <div className="text-xs text-gray-500">{getPerformanceMessage(result.percentage)}</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getGradeColor(result.finalGrade.gradeName)}`}>
                  {result.finalGrade.gradeName}
                </div>
                <div className="text-sm text-gray-600">Overall Grade</div>
                <div className="text-xs text-gray-500">{result.finalGrade.points} points</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{result.gpa.toFixed(2)}</div>
                <div className="text-sm text-gray-600">GPA</div>
                <div className="text-xs text-gray-500">Grade Point Average</div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Class Position</h4>
                  <p className="text-sm text-gray-600">Rank in class based on overall performance</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    {result.rank <= 3 && (
                      <span className="text-2xl">
                        {result.rank === 1 ? '🥇' : result.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    )}
                    <div className="text-2xl font-bold text-gray-900">#{result.rank}</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {result.rank === 1 ? 'First Position' : 
                     result.rank === 2 ? 'Second Position' : 
                     result.rank === 3 ? 'Third Position' : 
                     `${result.rank}${result.rank % 10 === 1 ? 'st' : result.rank % 10 === 2 ? 'nd' : result.rank % 10 === 3 ? 'rd' : 'th'} Position`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grading Scale Reference */}
        <div className="px-8 pb-8">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Grading Scale Reference</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {result.gradingSystem.grades.map((grade, index) => (
                <div key={index} className="text-center p-3 bg-white rounded border">
                  <div className={`text-lg font-bold ${getGradeColor(grade.gradeName)}`}>
                    {grade.gradeName}
                  </div>
                  <div className="text-xs text-gray-600">{grade.points} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Islamic Pattern */}
        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 text-white p-6 relative">
          {/* Islamic Geometric Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="h-full w-full" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Cpath d='M20 20l10-10v20l-10-10zm0 0l-10 10h20l-10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>

          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
              </div>
              <span className="text-indigo-200 text-sm">Excellence in Education</span>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
              </div>
            </div>
            <p className="text-indigo-200 text-sm">
              This is an official academic transcript generated by EduPro Suite
            </p>
            <p className="text-indigo-300 text-xs mt-2">
              Generated on {formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:max-w-none {
            max-width: none !important;
          }
          .print\\:bg-gray-800 {
            background-color: #1f2937 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          * {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
