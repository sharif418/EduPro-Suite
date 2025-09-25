'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface ScheduleItem {
  id: string;
  time: string;
  endTime: string;
  subject: string;
  class: string;
  section: string;
  room: string;
  studentCount: number;
  type: 'class' | 'break' | 'meeting' | 'free';
  status: 'upcoming' | 'current' | 'completed';
}

export default function TeacherScheduleTimeline() {
  const t = useTranslations('teacher');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for development
  useEffect(() => {
    const mockSchedule: ScheduleItem[] = [
      {
        id: '1',
        time: '08:00',
        endTime: '08:45',
        subject: 'Mathematics',
        class: 'Class 8',
        section: 'A',
        room: 'Room 201',
        studentCount: 35,
        type: 'class',
        status: 'completed'
      },
      {
        id: '2',
        time: '08:45',
        endTime: '09:00',
        subject: 'Break',
        class: '',
        section: '',
        room: '',
        studentCount: 0,
        type: 'break',
        status: 'completed'
      },
      {
        id: '3',
        time: '09:00',
        endTime: '09:45',
        subject: 'Physics',
        class: 'Class 9',
        section: 'B',
        room: 'Lab 1',
        studentCount: 30,
        type: 'class',
        status: 'current'
      },
      {
        id: '4',
        time: '09:45',
        endTime: '10:30',
        subject: 'Free Period',
        class: '',
        section: '',
        room: '',
        studentCount: 0,
        type: 'free',
        status: 'upcoming'
      },
      {
        id: '5',
        time: '10:30',
        endTime: '11:15',
        subject: 'Chemistry',
        class: 'Class 10',
        section: 'A',
        room: 'Lab 2',
        studentCount: 28,
        type: 'class',
        status: 'upcoming'
      },
      {
        id: '6',
        time: '11:15',
        endTime: '12:00',
        subject: 'Mathematics',
        class: 'Class 7',
        section: 'C',
        room: 'Room 105',
        studentCount: 32,
        type: 'class',
        status: 'upcoming'
      },
      {
        id: '7',
        time: '12:00',
        endTime: '13:00',
        subject: 'Lunch Break',
        class: '',
        section: '',
        room: '',
        studentCount: 0,
        type: 'break',
        status: 'upcoming'
      },
      {
        id: '8',
        time: '13:00',
        endTime: '13:45',
        subject: 'Parent Meeting',
        class: 'Class 8',
        section: 'A',
        room: 'Conference Room',
        studentCount: 0,
        type: 'meeting',
        status: 'upcoming'
      }
    ];

    setSchedule(mockSchedule);
    setLoading(false);
  }, [selectedDate]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'current':
        return 'bg-blue-500 animate-pulse';
      case 'upcoming':
        return 'bg-gray-300 dark:bg-gray-600';
      default:
        return 'bg-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class':
        return '📚';
      case 'break':
        return '☕';
      case 'meeting':
        return '👥';
      case 'free':
        return '🕐';
      default:
        return '📅';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

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
            {t('todaySchedule')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(selectedDate)}
          </p>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors duration-200"
          >
            {t('today')}
          </button>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading schedule...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedule.map((item, index) => (
              <div key={item.id} className="relative flex items-start">
                {/* Timeline Line */}
                <div className="flex flex-col items-center mr-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                  {index < schedule.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200 dark:bg-gray-700 mt-2"></div>
                  )}
                </div>

                {/* Schedule Item */}
                <div className="flex-1 min-w-0">
                  <div 
                    className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${
                      item.status === 'current' 
                        ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    style={{
                      backgroundColor: item.status === 'current' 
                        ? undefined 
                        : 'var(--card)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{getTypeIcon(item.type)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {item.subject}
                          </h4>
                          {item.class && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.class} - {item.section} • {item.room}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.time} - {item.endTime}
                        </p>
                        {item.studentCount > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.studentCount} students
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions for Classes */}
                    {item.type === 'class' && item.status !== 'completed' && (
                      <div className="mt-3 flex space-x-2">
                        <button className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors duration-200">
                          {t('takeAttendance')}
                        </button>
                        <button className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors duration-200">
                          {t('viewDetails')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {schedule.filter(item => item.status === 'completed' && item.type === 'class').length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('completed')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {schedule.filter(item => item.status === 'current' && item.type === 'class').length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('current')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {schedule.filter(item => item.status === 'upcoming' && item.type === 'class').length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('upcoming')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
