'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../../components/ui/Dialog';
import { useToast } from '../../../../../components/ui/Toast';

interface AcademicYear {
  id: string;
  year: string;
  isCurrent: boolean;
}

interface Exam {
  id: string;
  name: string;
  academicYearId: string;
  academicYear: AcademicYear;
  examSchedules: any[];
  results: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ExamsTab() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const { addToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    academicYearId: '',
  });

  // Filters
  const [filters, setFilters] = useState({
    academicYearId: '',
    search: '',
  });

  useEffect(() => {
    fetchAcademicYears();
    fetchExams();
  }, []);

  useEffect(() => {
    fetchExams();
  }, [filters]);

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/admin/academic-years');
      if (response.ok) {
        const data = await response.json();
        setAcademicYears(data.academicYears);
        
        // Set current academic year as default
        const currentYear = data.academicYears.find((year: AcademicYear) => year.isCurrent);
        if (currentYear && !formData.academicYearId) {
          setFormData(prev => ({ ...prev, academicYearId: currentYear.id }));
        }
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch academic years',
        type: 'error'
      });
    }
  };

  const fetchExams = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.academicYearId) params.append('academicYearId', filters.academicYearId);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/admin/exams/exams?${params}`);
      if (response.ok) {
        const data = await response.json();
        setExams(data.exams);
      } else {
        throw new Error('Failed to fetch exams');
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to fetch exams',
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
      const url = '/api/admin/exams/exams';
      const method = editingExam ? 'PUT' : 'POST';
      const body = editingExam 
        ? { ...formData, id: editingExam.id }
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
          description: `Exam ${editingExam ? 'updated' : 'created'} successfully`,
          type: 'success'
        });
        setShowCreateDialog(false);
        setEditingExam(null);
        resetForm();
        fetchExams();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save exam');
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
    if (!confirm('Are you sure you want to delete this exam? This will also delete all associated schedules.')) return;

    try {
      const response = await fetch(`/api/admin/exams/exams?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Exam deleted successfully',
          type: 'success'
        });
        fetchExams();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete exam');
      }
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message,
        type: 'error'
      });
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      academicYearId: exam.academicYearId,
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    const currentYear = academicYears.find(year => year.isCurrent);
    setFormData({
      name: '',
      academicYearId: currentYear?.id || '',
    });
  };

  if (loading && exams.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900">Examinations</h2>
          <p className="text-gray-600">Create and manage examination events for different academic years.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingExam(null);
            setShowCreateDialog(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <span className="mr-2">+</span>
          Create Exam
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={filters.academicYearId}
              onChange={(e) => setFilters({ ...filters, academicYearId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year} {year.isCurrent && '(Current)'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Exams
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search by exam name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({ academicYearId: '', search: '' })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Exams List */}
      <div className="grid gap-4">
        {exams.map((exam) => (
          <div key={exam.id} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{exam.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Academic Year:</span> {exam.academicYear.year}
                    {exam.academicYear.isCurrent && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Scheduled Subjects:</span> {exam.examSchedules.length}
                  </div>
                  <div>
                    <span className="font-medium">Results Processed:</span> {exam.results.length}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Created: {new Date(exam.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(exam)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(exam.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={exam.examSchedules.length > 0 || exam.results.length > 0}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Progress Indicators */}
            {exam.examSchedules.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Exam Progress</span>
                  <span className="text-gray-900 font-medium">
                    {exam.results.length > 0 ? 'Results Available' : 'Scheduled'}
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      exam.results.length > 0 ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ 
                      width: exam.results.length > 0 ? '100%' : '60%' 
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}

        {exams.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exams found</h3>
            <p className="text-gray-600 mb-4">
              {filters.academicYearId || filters.search 
                ? 'No exams match your current filters.' 
                : 'Create your first exam to get started.'
              }
            </p>
            {!filters.academicYearId && !filters.search && (
              <Button
                onClick={() => {
                  resetForm();
                  setEditingExam(null);
                  setShowCreateDialog(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Create Exam
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExam ? 'Edit Exam' : 'Create New Exam'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Annual Examination 2025, Mid-Term Exam"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <select
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year} {year.isCurrent && '(Current)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingExam(null);
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
                {loading ? 'Saving...' : editingExam ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
