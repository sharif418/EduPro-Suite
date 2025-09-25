'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  type: 'grading' | 'attendance' | 'planning' | 'meeting' | 'report';
  dueDate: string;
  completed: boolean;
  class?: string;
  subject?: string;
}

export default function PendingTasksList() {
  const t = useTranslations('teacher');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');

  // Mock data for development
  useEffect(() => {
    const mockTasks: Task[] = [
      {
        id: '1',
        title: 'Grade Mathematics Test Papers',
        description: 'Grade test papers for Class 8A Mathematics',
        priority: 'high',
        type: 'grading',
        dueDate: '2024-12-20',
        completed: false,
        class: 'Class 8A',
        subject: 'Mathematics'
      },
      {
        id: '2',
        title: 'Prepare Physics Lesson Plan',
        description: 'Create lesson plan for next week\'s physics classes',
        priority: 'medium',
        type: 'planning',
        dueDate: '2024-12-22',
        completed: false,
        class: 'Class 9B',
        subject: 'Physics'
      },
      {
        id: '3',
        title: 'Parent Meeting - Ahmed Family',
        description: 'Discuss student progress with Ahmed\'s parents',
        priority: 'high',
        type: 'meeting',
        dueDate: '2024-12-21',
        completed: false,
        class: 'Class 8A'
      },
      {
        id: '4',
        title: 'Submit Monthly Report',
        description: 'Submit monthly academic progress report',
        priority: 'medium',
        type: 'report',
        dueDate: '2024-12-25',
        completed: false
      },
      {
        id: '5',
        title: 'Update Attendance Records',
        description: 'Update missing attendance records for last week',
        priority: 'low',
        type: 'attendance',
        dueDate: '2024-12-23',
        completed: false,
        class: 'Class 7C'
      },
      {
        id: '6',
        title: 'Review Chemistry Assignments',
        description: 'Review and provide feedback on chemistry assignments',
        priority: 'medium',
        type: 'grading',
        dueDate: '2024-12-24',
        completed: false,
        class: 'Class 10A',
        subject: 'Chemistry'
      }
    ];

    setTasks(mockTasks);
    setLoading(false);
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'grading':
        return '📝';
      case 'attendance':
        return '✅';
      case 'planning':
        return '📋';
      case 'meeting':
        return '👥';
      case 'report':
        return '📊';
      default:
        return '📌';
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('tomorrow');
    if (diffDays === -1) return t('yesterday');
    if (diffDays < 0) return `${Math.abs(diffDays)} ${t('daysOverdue')}`;
    return `${diffDays} ${t('daysLeft')}`;
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return !task.completed;
    return !task.completed && task.priority === filter;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    } else {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
  });

  return (
    <div 
      className="rounded-lg p-6 shadow-sm border transition-colors duration-200"
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        color: 'var(--card-foreground)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('pendingTasks')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredTasks.length} {t('tasksRemaining')}
          </p>
        </div>

        {/* Add Task Button */}
        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm font-medium">
          + {t('addTask')}
        </button>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Priority Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('filter')}:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">{t('allTasks')}</option>
            <option value="high">{t('highPriority')}</option>
            <option value="medium">{t('mediumPriority')}</option>
            <option value="low">{t('lowPriority')}</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">{t('sortBy')}:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="dueDate">{t('dueDate')}</option>
            <option value="priority">{t('priority')}</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading tasks...</p>
          </div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🎉</span>
            <p className="text-gray-500 dark:text-gray-400">{t('noTasksRemaining')}</p>
          </div>
        ) : (
          sortedTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: 'var(--card)' }}
            >
              <div className="flex items-start space-x-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleTaskCompletion(task.id)}
                  className="mt-1 w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded flex items-center justify-center hover:border-indigo-500 transition-colors duration-200"
                >
                  {task.completed && (
                    <svg className="w-3 h-3 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{getTypeIcon(task.type)}</span>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {task.title}
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityIcon(task.priority)} {task.priority.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {task.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-3">
                      {task.class && (
                        <span>📚 {task.class}</span>
                      )}
                      {task.subject && (
                        <span>📖 {task.subject}</span>
                      )}
                    </div>
                    <span className={`font-medium ${
                      new Date(task.dueDate) < new Date() ? 'text-red-600 dark:text-red-400' : ''
                    }`}>
                      📅 {formatDueDate(task.dueDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary */}
      {!loading && tasks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {tasks.filter(task => !task.completed && task.priority === 'high').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('highPriority')}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {tasks.filter(task => !task.completed && task.priority === 'medium').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('mediumPriority')}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {tasks.filter(task => task.completed).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('completed')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
