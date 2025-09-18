'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';
import { useToast } from '@/app/components/ui/Toast';

interface Expense {
  id: string;
  expenseHead: string;
  amount: number;
  expenseDate: string;
  description?: string;
  createdAt: string;
}

export default function ExpensesTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  const [expenseForm, setExpenseForm] = useState({
    expenseHead: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  const { addToast } = useToast();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/finance/expenses');
      
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      addToast({
        title: 'Error',
        description: 'Failed to fetch expenses',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      expenseHead: '',
      amount: '',
      expenseDate: new Date().toISOString().split('T')[0],
      description: '',
    });
    setShowAddForm(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      expenseHead: expense.expenseHead,
      amount: expense.amount.toString(),
      expenseDate: expense.expenseDate.split('T')[0],
      description: expense.description || '',
    });
    setShowAddForm(true);
  };

  const handleSaveExpense = async () => {
    try {
      const method = editingExpense ? 'PUT' : 'POST';
      const body = editingExpense
        ? { id: editingExpense.id, ...expenseForm }
        : expenseForm;

      const response = await fetch('/api/admin/finance/expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: `Expense ${editingExpense ? 'updated' : 'created'} successfully`,
          type: 'success',
        });
        setShowAddForm(false);
        fetchExpenses();
      } else {
        const error = await response.json();
        addToast({
          title: 'Error',
          description: error.error || 'Failed to save expense',
          type: 'error',
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to save expense',
        type: 'error',
      });
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await fetch(`/api/admin/finance/expenses?id=${expense.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Expense deleted successfully',
          type: 'success',
        });
        fetchExpenses();
      } else {
        const error = await response.json();
        addToast({
          title: 'Error',
          description: error.error || 'Failed to delete expense',
          type: 'error',
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to delete expense',
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Institutional Expenses</h3>
        <Button onClick={handleCreateExpense}>
          Add Expense
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Head *
              </label>
              <input
                type="text"
                value={expenseForm.expenseHead}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseHead: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Salaries, Utilities, Maintenance"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (৳) *
              </label>
              <input
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional description"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveExpense}>
              {editingExpense ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expense Head
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No expenses recorded yet. Add your first expense to get started.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{expense.expenseHead}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ৳ {expense.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {expense.description || 'No description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense)}
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
  );
}
