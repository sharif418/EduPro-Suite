'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../../components/ui/Dialog';
import { useToast } from '../../../../../components/ui/Toast';

interface Grade {
  id?: string;
  gradeName: string;
  minPercentage: number;
  maxPercentage: number;
  points: number;
}

interface GradingSystem {
  id: string;
  name: string;
  isDefault: boolean;
  grades: Grade[];
  createdAt: string;
  updatedAt: string;
}

export default function GradingSystemsTab() {
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSystem, setEditingSystem] = useState<GradingSystem | null>(null);
  const { addToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    isDefault: false,
    grades: [
      { gradeName: 'A+', minPercentage: 90, maxPercentage: 100, points: 5.0 },
      { gradeName: 'A', minPercentage: 80, maxPercentage: 89, points: 4.0 },
      { gradeName: 'B+', minPercentage: 70, maxPercentage: 79, points: 3.5 },
      { gradeName: 'B', minPercentage: 60, maxPercentage: 69, points: 3.0 },
      { gradeName: 'C+', minPercentage: 50, maxPercentage: 59, points: 2.5 },
      { gradeName: 'C', minPercentage: 40, maxPercentage: 49, points: 2.0 },
      { gradeName: 'F', minPercentage: 0, maxPercentage: 39, points: 0.0 },
    ] as Grade[],
  });

  useEffect(() => {
    fetchGradingSystems();
  }, []);

  const fetchGradingSystems = async () => {
    try {
      const response = await fetch('/api/admin/exams/grading-systems');
      if (response.ok) {
        const data = await response.json();
        setGradingSystems(data.gradingSystems);
      } else {
        throw new Error('Failed to fetch grading systems');
      }
    } catch (error) {
      addToast({ 
        title: 'Error',
        description: 'Failed to fetch grading systems',
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
      const url = editingSystem 
        ? '/api/admin/exams/grading-systems'
        : '/api/admin/exams/grading-systems';
      
      const method = editingSystem ? 'PUT' : 'POST';
      const body = editingSystem 
        ? { ...formData, id: editingSystem.id }
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
          description: `Grading system ${editingSystem ? 'updated' : 'created'} successfully`, 
          type: 'success' 
        });
        setShowCreateDialog(false);
        setEditingSystem(null);
        resetForm();
        fetchGradingSystems();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save grading system');
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
    if (!confirm('Are you sure you want to delete this grading system?')) return;

    try {
      const response = await fetch(`/api/admin/exams/grading-systems?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({ 
          title: 'Success',
          description: 'Grading system deleted successfully',
          type: 'success' 
        });
        fetchGradingSystems();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete grading system');
      }
    } catch (error: any) {
      addToast({ 
        title: 'Error',
        description: error.message,
        type: 'error' 
      });
    }
  };

  const handleEdit = (system: GradingSystem) => {
    setEditingSystem(system);
    setFormData({
      name: system.name,
      isDefault: system.isDefault,
      grades: system.grades,
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      isDefault: false,
      grades: [
        { gradeName: 'A+', minPercentage: 90, maxPercentage: 100, points: 5.0 },
        { gradeName: 'A', minPercentage: 80, maxPercentage: 89, points: 4.0 },
        { gradeName: 'B+', minPercentage: 70, maxPercentage: 79, points: 3.5 },
        { gradeName: 'B', minPercentage: 60, maxPercentage: 69, points: 3.0 },
        { gradeName: 'C+', minPercentage: 50, maxPercentage: 59, points: 2.5 },
        { gradeName: 'C', minPercentage: 40, maxPercentage: 49, points: 2.0 },
        { gradeName: 'F', minPercentage: 0, maxPercentage: 39, points: 0.0 },
      ],
    });
  };

  const addGrade = () => {
    setFormData({
      ...formData,
      grades: [...formData.grades, { gradeName: '', minPercentage: 0, maxPercentage: 0, points: 0 }],
    });
  };

  const removeGrade = (index: number) => {
    setFormData({
      ...formData,
      grades: formData.grades.filter((_, i) => i !== index),
    });
  };

  const updateGrade = (index: number, field: keyof Grade, value: string | number) => {
    const updatedGrades = [...formData.grades];
    updatedGrades[index] = { ...updatedGrades[index], [field]: value };
    setFormData({ ...formData, grades: updatedGrades });
  };

  if (loading && gradingSystems.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900">Grading Systems</h2>
          <p className="text-gray-600">Create and manage flexible grading scales for your institution.</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingSystem(null);
            setShowCreateDialog(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <span className="mr-2">+</span>
          Create Grading System
        </Button>
      </div>

      {/* Grading Systems List */}
      <div className="grid gap-6">
        {gradingSystems.map((system) => (
          <div key={system.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  {system.name}
                  {system.isDefault && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600">{system.grades.length} grades defined</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(system)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(system.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* Grades Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Grade</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Range (%)</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {system.grades.map((grade, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{grade.gradeName}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {grade.minPercentage}% - {grade.maxPercentage}%
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{grade.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {gradingSystems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⚖️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No grading systems found</h3>
            <p className="text-gray-600 mb-4">Create your first grading system to get started.</p>
            <Button
              onClick={() => {
                resetForm();
                setEditingSystem(null);
                setShowCreateDialog(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Create Grading System
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingSystem ? 'Edit Grading System' : 'Create Grading System'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Standard GPA 5.0"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
              Set as default grading system
            </label>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Grades
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGrade}
              >
                Add Grade
              </Button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {formData.grades.map((grade, index) => (
                <div key={index} className="grid grid-cols-5 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                  <input
                    type="text"
                    value={grade.gradeName}
                    onChange={(e) => updateGrade(index, 'gradeName', e.target.value)}
                    placeholder="Grade"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    required
                  />
                  <input
                    type="number"
                    value={grade.minPercentage}
                    onChange={(e) => updateGrade(index, 'minPercentage', parseFloat(e.target.value))}
                    placeholder="Min %"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                  <input
                    type="number"
                    value={grade.maxPercentage}
                    onChange={(e) => updateGrade(index, 'maxPercentage', parseFloat(e.target.value))}
                    placeholder="Max %"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                  <input
                    type="number"
                    value={grade.points}
                    onChange={(e) => updateGrade(index, 'points', parseFloat(e.target.value))}
                    placeholder="Points"
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                    min="0"
                    step="0.1"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeGrade(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingSystem(null);
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
                {loading ? 'Saving...' : editingSystem ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
