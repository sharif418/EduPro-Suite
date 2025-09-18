'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../../../components/ui/Button';
import { useToast } from '../../../../../components/ui/Toast';

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

interface GradingSystem {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ProcessingSummary {
  totalStudents: number;
  examName: string;
  className: string;
  academicYear: string;
  gradingSystem: string;
  averagePercentage: number;
  averageGPA: number;
  highestPercentage: number;
  lowestPercentage: number;
}

interface Result {
  id: string;
  totalMarks: number;
  totalFullMarks: number;
  percentage: number;
  gpa: number;
  rank: number;
  enrollment: {
    student: {
      name: string;
      studentId: string;
    };
    rollNumber: number;
  };
  finalGrade: {
    gradeName: string;
    points: number;
  };
}

export default function ProcessResultsTab() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const { addToast } = useToast();

  // Selection state
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedGradingSystem, setSelectedGradingSystem] = useState('');

  // Processing summary
  const [summary, setSummary] = useState<ProcessingSummary | null>(null);

  useEffect(() => {
    fetchExams();
    fetchClassLevels();
    fetchGradingSystems();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSections();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedExam && selectedClass) {
      fetchExistingResults();
    }
  }, [selectedExam, selectedClass, selectedSection]);

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

  const fetchGradingSystems = async () => {
    try {
      const response = await fetch('/api/admin/exams/grading-systems');
      if (response.ok) {
        const data = await response.json();
        setGradingSystems(data.gradingSystems);
        
        // Set default grading system
        const defaultSystem = data.gradingSystems.find((system: GradingSystem) => system.isDefault);
        if (defaultSystem) {
          setSelectedGradingSystem(defaultSystem.id);
        }
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch grading systems',
        type: 'error'
      });
    }
  };

  const fetchExistingResults = async () => {
    if (!selectedExam || !selectedClass) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        examId: selectedExam,
        classLevelId: selectedClass,
      });

      if (selectedSection) {
        params.append('sectionId', selectedSection);
      }

      const response = await fetch(`/api/admin/exams/results/process?${params}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const processResults = async () => {
    if (!selectedExam || !selectedClass) {
      addToast({
        title: 'Error',
        description: 'Please select an exam and class',
        type: 'error'
      });
      return;
    }

    setProcessing(true);
    setProcessingStatus('Initializing result processing...');

    try {
      const body: any = {
        examId: selectedExam,
        classLevelId: selectedClass,
      };

      if (selectedSection) {
        body.sectionId = selectedSection;
      }

      if (selectedGradingSystem) {
        body.gradingSystemId = selectedGradingSystem;
      }

      setProcessingStatus('Validating marks and calculating results...');

      const response = await fetch('/api/admin/exams/results/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setSummary(data.summary);
        setProcessingStatus('');

        addToast({
          title: 'Success',
          description: data.message,
          type: 'success'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process results');
      }
    } catch (error: any) {
      setProcessingStatus('');
      addToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  const canProcess = selectedExam && selectedClass && selectedGradingSystem && !processing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Process Results</h2>
          <p className="text-gray-600">Calculate final results, GPA, and rankings for students after marks entry.</p>
        </div>
        {canProcess && (
          <Button
            onClick={processResults}
            disabled={processing}
            className="bg-green-600 hover:bg-green-700"
          >
            {processing ? 'Processing...' : 'Process Results'}
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
                setResults([]);
                setSummary(null);
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
                setResults([]);
                setSummary(null);
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
              Section (Optional)
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setResults([]);
                setSummary(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!selectedClass}
            >
              <option value="">All Sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grading System *
            </label>
            <select
              value={selectedGradingSystem}
              onChange={(e) => setSelectedGradingSystem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select Grading System</option>
              {gradingSystems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name} {system.isDefault && '(Default)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Process Button */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedExam && selectedClass ? (
              results.length > 0 ? (
                <span className="text-green-600 font-medium">
                  ✓ Results already processed for this selection
                </span>
              ) : (
                <span className="text-yellow-600 font-medium">
                  Ready to process results
                </span>
              )
            ) : (
              'Select exam and class to continue'
            )}
          </div>
          
          {canProcess && (
            <Button
              onClick={processResults}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Processing...' : results.length > 0 ? 'Reprocess Results' : 'Process Results'}
            </Button>
          )}
        </div>
      </div>

      {/* Processing Status */}
      {processing && (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div>
              <h4 className="font-medium text-blue-900">Processing Results</h4>
              <p className="text-sm text-blue-700">{processingStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-4">Processing Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-green-700">Total Students</p>
              <p className="text-2xl font-bold text-green-900">{summary.totalStudents}</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Average Percentage</p>
              <p className="text-2xl font-bold text-green-900">{summary.averagePercentage.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Average GPA</p>
              <p className="text-2xl font-bold text-green-900">{summary.averageGPA.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-green-700">Highest Score</p>
              <p className="text-2xl font-bold text-green-900">{summary.highestPercentage.toFixed(1)}%</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-green-700">
            <p><strong>Exam:</strong> {summary.examName}</p>
            <p><strong>Class:</strong> {summary.className}</p>
            <p><strong>Academic Year:</strong> {summary.academicYear}</p>
            <p><strong>Grading System:</strong> {summary.gradingSystem}</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Processed Results</h3>
            <p className="text-sm text-gray-600">Final results with rankings and GPA calculations</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
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
                    Total Marks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GPA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={result.id} className={index < 3 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {result.rank <= 3 && (
                          <span className="mr-2 text-lg">
                            {result.rank === 1 ? '🥇' : result.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {result.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.enrollment.rollNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.enrollment.student.studentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.enrollment.student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.totalMarks} / {result.totalFullMarks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        result.finalGrade.gradeName === 'A+' ? 'bg-green-100 text-green-800' :
                        result.finalGrade.gradeName.startsWith('A') ? 'bg-blue-100 text-blue-800' :
                        result.finalGrade.gradeName.startsWith('B') ? 'bg-yellow-100 text-yellow-800' :
                        result.finalGrade.gradeName.startsWith('C') ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.finalGrade.gradeName}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.gpa.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Navigate to report card
                          addToast({
                            title: 'Info',
                            description: 'Report card feature coming soon',
                            type: 'info'
                          });
                        }}
                      >
                        View Report
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Results Summary */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {results.length} results
              </div>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Export to PDF
                    addToast({
                      title: 'Info',
                      description: 'Export feature coming soon',
                      type: 'info'
                    });
                  }}
                >
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Export to Excel
                    addToast({
                      title: 'Info',
                      description: 'Export feature coming soon',
                      type: 'info'
                    });
                  }}
                >
                  Export Excel
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : selectedExam && selectedClass ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600 mb-4">
            Results haven't been processed yet for this selection. Make sure all marks are entered and then process the results.
          </p>
          {canProcess && (
            <Button
              onClick={processResults}
              disabled={processing}
              className="bg-green-600 hover:bg-green-700"
            >
              Process Results
            </Button>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select exam and class</h3>
          <p className="text-gray-600">
            Choose an exam and class to view or process results.
          </p>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-3">How Result Processing Works</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h5 className="font-medium mb-2">Prerequisites:</h5>
            <ul className="space-y-1">
              <li>• All exam schedules must be created</li>
              <li>• All student marks must be entered</li>
              <li>• A grading system must be selected</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Processing includes:</h5>
            <ul className="space-y-1">
              <li>• Total marks calculation</li>
              <li>• Percentage and GPA calculation</li>
              <li>• Grade assignment based on grading system</li>
              <li>• Class ranking determination</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
