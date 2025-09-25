'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Calendar, Clock, BookOpen, Users, Plus } from 'lucide-react';

interface LessonEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  date: string;
  duration: number;
  classLevel: {
    name: string;
  };
  section: {
    name: string;
  };
  subject: {
    name: string;
  };
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

interface LessonPlanCalendarProps {
  onEventClick?: (event: LessonEvent) => void;
  onDateClick?: (date: string) => void;
  onEventReschedule?: (eventId: string, newDate: string, newTime: string) => Promise<void>;
}

type ViewMode = 'month' | 'week' | 'day';

export default function LessonPlanCalendar({
  onEventClick,
  onDateClick,
  onEventReschedule
}: LessonPlanCalendarProps) {
  const t = useTranslations();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<LessonEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState<LessonEvent | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const response = await fetch(
        `/api/teacher/lessons/calendar?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        start.setDate(1);
        start.setDate(start.getDate() - start.getDay()); // Start from Sunday
        end.setMonth(end.getMonth() + 1, 0);
        end.setDate(end.getDate() + (6 - end.getDay())); // End on Saturday
        break;
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        end.setDate(start.getDate() + 6);
        break;
      case 'day':
        end.setDate(start.getDate());
        break;
    }

    return { startDate: start, endDate: end };
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const handleEventDragStart = (e: React.DragEvent, event: LessonEvent) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDateDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    
    if (draggedEvent && onEventReschedule) {
      try {
        const newDateTime = new Date(date);
        const originalDateTime = new Date(draggedEvent.start);
        
        // Keep the same time, just change the date
        newDateTime.setHours(originalDateTime.getHours());
        newDateTime.setMinutes(originalDateTime.getMinutes());
        
        await onEventReschedule(
          draggedEvent.id,
          newDateTime.toISOString().split('T')[0],
          newDateTime.toTimeString().slice(0, 5)
        );
        
        await fetchEvents(); // Refresh events
      } catch (error) {
        console.error('Error rescheduling event:', error);
      }
    }
    
    setDraggedEvent(null);
  };

  const handleDateDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      ...(viewMode === 'day' && { day: 'numeric' })
    };
    
    return currentDate.toLocaleDateString(undefined, options);
  };

  const renderMonthView = () => {
    const { startDate } = getDateRange();
    const days = [];
    const currentDateObj = new Date(startDate);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const dateStr = currentDateObj.toISOString().split('T')[0];
      const dayEvents = getEventsForDate(dateStr);
      const isCurrentMonth = currentDateObj.getMonth() === currentDate.getMonth();
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <div
          key={dateStr}
          className={`min-h-[120px] border border-gray-200 p-2 ${
            isCurrentMonth ? 'bg-white' : 'bg-gray-50'
          } ${isToday ? 'bg-blue-50' : ''}`}
          onDrop={(e) => handleDateDrop(e, dateStr)}
          onDragOver={handleDateDragOver}
          onClick={() => onDateClick?.(dateStr)}
        >
          <div className={`text-sm font-medium mb-1 ${
            isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
          } ${isToday ? 'text-blue-600' : ''}`}>
            {currentDateObj.getDate()}
          </div>
          
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map(event => (
              <div
                key={event.id}
                draggable
                onDragStart={(e) => handleEventDragStart(e, event)}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                className={`text-xs p-1 rounded cursor-pointer truncate ${
                  event.status === 'PUBLISHED' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : event.status === 'DRAFT'
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                title={`${event.title} - ${event.subject.name}`}
              >
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="truncate">{event.title}</div>
              </div>
            ))}
            
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );

      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 p-3 text-center text-sm font-medium text-gray-700 border border-gray-200">
            {t(`calendar.${day.toLowerCase()}`)}
          </div>
        ))}
        
        {/* Calendar days */}
        {days}
      </div>
    );
  };

  const renderWeekView = () => {
    const { startDate } = getDateRange();
    const days = [];
    const currentDateObj = new Date(startDate);

    for (let i = 0; i < 7; i++) {
      const dateStr = currentDateObj.toISOString().split('T')[0];
      const dayEvents = getEventsForDate(dateStr);
      const isToday = dateStr === new Date().toISOString().split('T')[0];

      days.push(
        <div key={dateStr} className="flex-1 border-r border-gray-200 last:border-r-0">
          <div className={`p-3 text-center border-b border-gray-200 ${
            isToday ? 'bg-blue-50 text-blue-600' : 'bg-gray-50'
          }`}>
            <div className="text-sm font-medium">
              {currentDateObj.toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
            <div className="text-lg font-bold">
              {currentDateObj.getDate()}
            </div>
          </div>
          
          <div
            className="p-2 min-h-[400px] space-y-2"
            onDrop={(e) => handleDateDrop(e, dateStr)}
            onDragOver={handleDateDragOver}
            onClick={() => onDateClick?.(dateStr)}
          >
            {dayEvents.map(event => (
              <div
                key={event.id}
                draggable
                onDragStart={(e) => handleEventDragStart(e, event)}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                className={`p-2 rounded cursor-pointer ${
                  event.status === 'PUBLISHED' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : event.status === 'DRAFT'
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <div className="text-sm font-medium truncate">{event.title}</div>
                <div className="text-xs text-gray-600 flex items-center mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-gray-600 flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {event.classLevel.name} - {event.section.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }

    return <div className="flex border border-gray-200 rounded-lg overflow-hidden">{days}</div>;
  };

  const renderDayView = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayEvents = getEventsForDate(dateStr).sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {currentDate.toLocaleDateString(undefined, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
        </div>
        
        <div className="p-4 space-y-3">
          {dayEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>{t('lessonPlan.noLessonsScheduled')}</p>
              <button
                onClick={() => onDateClick?.(dateStr)}
                className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <Plus className="h-4 w-4 inline mr-1" />
                {t('lessonPlan.addLesson')}
              </button>
            </div>
          ) : (
            dayEvents.map(event => (
              <div
                key={event.id}
                draggable
                onDragStart={(e) => handleEventDragStart(e, event)}
                onClick={() => onEventClick?.(event)}
                className={`p-4 rounded-lg cursor-pointer border-l-4 ${
                  event.status === 'PUBLISHED' 
                    ? 'bg-green-50 border-green-400 hover:bg-green-100'
                    : event.status === 'DRAFT'
                    ? 'bg-yellow-50 border-yellow-400 hover:bg-yellow-100'
                    : 'bg-gray-50 border-gray-400 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">{event.title}</h4>
                    <div className="mt-1 flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="mx-2">•</span>
                      {event.duration} {t('common.minutes')}
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-600">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {event.subject.name}
                      <span className="mx-2">•</span>
                      <Users className="h-4 w-4 mr-1" />
                      {event.classLevel.name} - {event.section.name}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    event.status === 'PUBLISHED' 
                      ? 'bg-green-100 text-green-800'
                      : event.status === 'DRAFT'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {t(`lessonPlan.status.${event.status.toLowerCase()}`)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            {formatDateHeader()}
          </h2>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {t('calendar.today')}
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t(`calendar.${mode}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Calendar Views */}
      {!loading && (
        <>
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 border border-green-400 rounded mr-2"></div>
          {t('lessonPlan.status.published')}
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-400 rounded mr-2"></div>
          {t('lessonPlan.status.draft')}
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-100 border border-gray-400 rounded mr-2"></div>
          {t('lessonPlan.status.archived')}
        </div>
      </div>
    </div>
  );
}
