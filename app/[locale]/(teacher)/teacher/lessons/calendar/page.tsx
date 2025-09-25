'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';

interface LessonPlan {
  id: string;
  title: string;
  description?: string;
  lessonDate: string;
  duration: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  classLevel: { name: string };
  section: { name: string };
  subject: { name: string };
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  classLevel: string;
  section: string;
  subject: string;
}

export default function LessonCalendarPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    fetchLessonPlans();
  }, [currentDate, view]);

  const fetchLessonPlans = async () => {
    try {
      setLoading(true);
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      
      const response = await fetch(
        `/api/teacher/lessons/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setLessonPlans(data.lessonPlans || []);
      }
    } catch (error) {
      console.error('Error fetching lesson plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getViewStartDate = () => {
    const date = new Date(currentDate);
    if (view === 'month') {
      date.setDate(1);
      date.setDate(date.getDate() - date.getDay());
    } else if (view === 'week') {
      date.setDate(date.getDate() - date.getDay());
    }
    return date;
  };

  const getViewEndDate = () => {
    const date = new Date(currentDate);
    if (view === 'month') {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setDate(date.getDate() + (6 - date.getDay()));
    } else if (view === 'week') {
      date.setDate(date.getDate() + 6);
    }
    return date;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const start = getViewStartDate();
      const end = getViewEndDate();
      return `${start.toLocaleDateString(locale, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const getLessonsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return lessonPlans.filter(lesson => 
      lesson.lessonDate.split('T')[0] === dateStr
    );
  };

  const handleReschedule = async (lessonId: string, newDate: Date) => {
    try {
      const response = await fetch('/api/teacher/lessons', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: lessonId,
          lessonDate: newDate.toISOString(),
        }),
      });

      if (response.ok) {
        fetchLessonPlans(); // Refresh the calendar
      }
    } catch (error) {
      console.error('Error rescheduling lesson:', error);
    }
  };

  const renderMonthView = () => {
    const startDate = getViewStartDate();
    const days = [];
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const lessons = getLessonsForDate(date);
      const isToday = date.toDateString() === today.toDateString();
      const isCurrentMonth = date.getMonth() === currentDate.getMonth();

      days.push(
        <div
          key={i}
          className={`min-h-[120px] border border-gray-200 p-2 ${
            isCurrentMonth ? 'bg-white' : 'bg-gray-50'
          } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
        >
          <div className={`text-sm font-medium mb-1 ${
            isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          }`}>
            {date.getDate()}
          </div>
          <div className="space-y-1">
            {lessons.map(lesson => (
              <div
                key={lesson.id}
                className={`text-xs p-1 rounded cursor-pointer truncate ${
                  lesson.status === 'PUBLISHED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}
                title={`${lesson.title} - ${lesson.classLevel.name} ${lesson.section.name}`}
              >
                {lesson.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('lessonPlan.calendar')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your lesson schedule
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href={`/${locale}/teacher/lessons/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('lessonPlan.create')}
          </Link>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {formatDateHeader()}
          </h2>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        <div className="mt-4 sm:mt-0 flex space-x-2">
          {(['month', 'week', 'day'] as const).map(viewType => (
            <button
              key={viewType}
              onClick={() => setView(viewType)}
              className={`px-3 py-1 text-sm rounded-md ${
                view === viewType
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading calendar...</div>
          </div>
        ) : (
          renderMonthView()
        )}
      </div>

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Legend</h3>
        <div className="flex space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Published</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-100 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Draft</span>
          </div>
        </div>
      </div>
    </div>
  );
}
