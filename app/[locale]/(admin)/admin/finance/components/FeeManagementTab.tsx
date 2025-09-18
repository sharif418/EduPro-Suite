'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';
import { useToast } from '@/app/components/ui/Toast';

interface FeeHead {
  id: string;
  name: string;
  description?: string;
  _count: {
    feeStructures: number;
    invoiceItems: number;
  };
}

interface FeeStructure {
  id: string;
  feeHeadId: string;
  classLevelId: string;
  amount: number;
  feeHead: {
    name: string;
  };
  classLevel: {
    name: string;
  };
}

interface ClassLevel {
  id: string;
  name: string;
}

export default function FeeManagementTab() {
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'fee-heads' | 'fee-structures'>('fee-heads');

  // Fee Head Form States
  const [showFeeHeadForm, setShowFeeHeadForm] = useState(false);
  const [editingFeeHead, setEditingFeeHead] = useState<FeeHead | null>(null);
  const [feeHeadForm, setFeeHeadForm] = useState({
    name: '',
    description: '',
  });

  // Fee Structure Form States
  const [showFeeStructureForm, setShowFeeStructureForm] = useState(false);
  const [editingFeeStructure, setEditingFeeStructure] = useState<FeeStructure | null>(null);
  const [feeStructureForm, setFeeStructureForm] = useState({
    feeHeadId: '',
    classLevelId: '',
    amount: '',
  });

  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [feeHeadsRes, feeStructuresRes, classLevelsRes] = await Promise.all([
        fetch('/api/admin/finance/fee-heads'),
        fetch('/api/admin/finance/fee-structures'),
        fetch('/api/admin/class-levels'),
      ]);

      if (feeHeadsRes.ok) {
        const feeHeadsData = await feeHeadsRes.json();
        setFeeHeads(feeHeadsData.feeHeads || []);
      }

      if (feeStructuresRes.ok) {
        const feeStructuresData = await feeStructuresRes.json();
        setFeeStructures(feeStructuresData.feeStructures || []);
      }

      if (classLevelsRes.ok) {
        const classLevelsData = await classLevelsRes.json();
        setClassLevels(classLevelsData.classLevels || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast({
        title: 'Error',
        description: 'Failed to fetch data',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFeeHead = () => {
    setEditingFeeHead(null);
    setFeeHeadForm({ name: '', description: '' });
    setShowFeeHeadForm(true);
  };

  const handleEditFeeHead = (feeHead: FeeHead) => {
    setEditingFeeHead(feeHead);
    setFeeHeadForm({
      name: feeHead.name,
      description: feeHead.description || '',
    });
    setShowFeeHeadForm(true);
  };

  const handleSaveFeeHead = async () => {
    try {
      const method = editingFeeHead ? 'PUT' : 'POST';
      const body = editingFeeHead
        ? { id: editingFeeHead.id, ...feeHeadForm }
        : feeHeadForm;

      const response = await fetch('/api/admin/finance/fee-heads', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: `Fee head ${editingFeeHead ? 'updated' : 'created'} successfully`,
          type: 'success',
        });
        setShowFeeHeadForm(false);
        fetchData();
      } else {
        const error = await response.json();
        addToast({
          title: 'Error',
          description: error.error || 'Failed to save fee head',
          type: 'error',
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to save fee head',
        type: 'error',
      });
    }
  };

  const handleDeleteFeeHead = async (feeHead: FeeHead) => {
    if (!confirm(`Are you sure you want to delete "${feeHead.name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/finance/fee-heads?id=${feeHead.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Fee head deleted successfully',
          type: 'success',
        });
        fetchData();
      } else {
        const error = await response.json();
        addToast({
          title: 'Error',
          description: error.error || 'Failed to delete fee head',
          type: 'error',
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to delete fee head',
        type: 'error',
      });
    }
  };

  const handleSaveFeeStructure = async () => {
    try {
      const method = editingFeeStructure ? 'PUT' : 'POST';
      const body = editingFeeStructure
        ? { id: editingFeeStructure.id, amount: feeStructureForm.amount }
        : feeStructureForm;

      const response = await fetch('/api/admin/finance/fee-structures', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: `Fee structure ${editingFeeStructure ? 'updated' : 'created'} successfully`,
          type: 'success',
        });
        setShowFeeStructureForm(false);
        fetchData();
      } else {
        const error = await response.json();
        addToast({
          title: 'Error',
          description: error.error || 'Failed to save fee structure',
          type: 'error',
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to save fee structure',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveSection('fee-heads')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeSection === 'fee-heads'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Fee Heads
        </button>
        <button
          onClick={() => setActiveSection('fee-structures')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeSection === 'fee-structures'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Fee Structures
        </button>
      </div>

      {/* Fee Heads Section */}
      {activeSection === 'fee-heads' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Fee Heads</h3>
            <Button onClick={handleCreateFeeHead}>
              Add Fee Head
            </Button>
          </div>

          {/* Fee Head Form */}
          {showFeeHeadForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                {editingFeeHead ? 'Edit Fee Head' : 'Create Fee Head'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={feeHeadForm.name}
                    onChange={(e) => setFeeHeadForm({ ...feeHeadForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Monthly Tuition Fee"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={feeHeadForm.description}
                    onChange={(e) => setFeeHeadForm({ ...feeHeadForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowFeeHeadForm(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveFeeHead}>
                  {editingFeeHead ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Classes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feeHeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No fee heads found. Create your first fee head to get started.
                      </td>
                    </tr>
                  ) : (
                    feeHeads.map((feeHead) => (
                      <tr key={feeHead.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{feeHead.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {feeHead.description || 'No description'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {feeHead._count.feeStructures} classes
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {feeHead._count.invoiceItems} invoices
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditFeeHead(feeHead)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFeeHead(feeHead)}
                            className="text-red-600 hover:text-red-900"
                            disabled={feeHead._count.invoiceItems > 0}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Fee Structures Section */}
      {activeSection === 'fee-structures' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Fee Structures</h3>
            <Button onClick={() => {
              setEditingFeeStructure(null);
              setFeeStructureForm({ feeHeadId: '', classLevelId: '', amount: '' });
              setShowFeeStructureForm(true);
            }}>
              Add Fee Structure
            </Button>
          </div>

          {/* Fee Structure Form */}
          {showFeeStructureForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                {editingFeeStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fee Head *
                  </label>
                  <select
                    value={feeStructureForm.feeHeadId}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, feeHeadId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={!!editingFeeStructure}
                  >
                    <option value="">Select Fee Head</option>
                    {feeHeads.map((feeHead) => (
                      <option key={feeHead.id} value={feeHead.id}>
                        {feeHead.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Level *
                  </label>
                  <select
                    value={feeStructureForm.classLevelId}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, classLevelId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={!!editingFeeStructure}
                  >
                    <option value="">Select Class Level</option>
                    {classLevels.map((classLevel) => (
                      <option key={classLevel.id} value={classLevel.id}>
                        {classLevel.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (৳) *
                  </label>
                  <input
                    type="number"
                    value={feeStructureForm.amount}
                    onChange={(e) => setFeeStructureForm({ ...feeStructureForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowFeeStructureForm(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveFeeStructure}>
                  {editingFeeStructure ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fee Head
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feeStructures.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No fee structures found. Create fee heads first, then add fee structures.
                      </td>
                    </tr>
                  ) : (
                    feeStructures.map((feeStructure) => (
                      <tr key={feeStructure.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {feeStructure.feeHead.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {feeStructure.classLevel.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            ৳ {feeStructure.amount.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setEditingFeeStructure(feeStructure);
                              setFeeStructureForm({
                                feeHeadId: feeStructure.feeHeadId,
                                classLevelId: feeStructure.classLevelId,
                                amount: feeStructure.amount.toString(),
                              });
                              setShowFeeStructureForm(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this fee structure?')) {
                                // Handle delete fee structure
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
