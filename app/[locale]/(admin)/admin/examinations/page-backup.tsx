'use client';

import { useState } from 'react';
import { useSession } from '../../../hooks/useSession';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/Tabs';
import { ToastProvider } from '../../../components/ui/Toast';
import GradingSystemsTab from './components/GradingSystemsTab';
import ExamsTab from './components/ExamsTab';
import ExamScheduleTab from './components/ExamScheduleTab';
import MarksEntryTab from './components/MarksEntryTab';
import ProcessResultsTab from './components/ProcessResultsTab';

export default function ExaminationsPage() {
  const { user } = useSession();

  return (
    <ToastProvider>
      <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-8 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <span className="text-3xl">📋</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Examination & Result Management
            </h1>
            <p className="text-purple-100 text-lg">
              The comprehensive examination engine - Create exams, manage schedules, enter marks, and process results with ease.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">⚖️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Grading Systems</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Exams</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Scheduled Exams</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Results Processed</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Tabs defaultValue="grading-systems" className="w-full">
          <div className="border-b border-gray-200 px-6 py-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="grading-systems" className="flex items-center space-x-2">
                <span>⚖️</span>
                <span>Grading Systems</span>
              </TabsTrigger>
              <TabsTrigger value="exams" className="flex items-center space-x-2">
                <span>📝</span>
                <span>Exams</span>
              </TabsTrigger>
              <TabsTrigger value="schedules" className="flex items-center space-x-2">
                <span>📅</span>
                <span>Schedules</span>
              </TabsTrigger>
              <TabsTrigger value="marks-entry" className="flex items-center space-x-2">
                <span>✏️</span>
                <span>Marks Entry</span>
              </TabsTrigger>
              <TabsTrigger value="process-results" className="flex items-center space-x-2">
                <span>📊</span>
                <span>Process Results</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="grading-systems">
              <GradingSystemsTab />
            </TabsContent>

            <TabsContent value="exams">
              <ExamsTab />
            </TabsContent>

            <TabsContent value="schedules">
              <ExamScheduleTab />
            </TabsContent>

            <TabsContent value="marks-entry">
              <MarksEntryTab />
            </TabsContent>

            <TabsContent value="process-results">
              <ProcessResultsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Islamic Pattern Footer */}
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 text-gray-400">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-current rounded-full opacity-30"></div>
            <div className="w-2 h-2 bg-current rounded-full opacity-60"></div>
            <div className="w-2 h-2 bg-current rounded-full opacity-30"></div>
          </div>
          <span className="text-sm">Excellence in Education Management</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-current rounded-full opacity-30"></div>
            <div className="w-2 h-2 bg-current rounded-full opacity-60"></div>
            <div className="w-2 h-2 bg-current rounded-full opacity-30"></div>
          </div>
        </div>
      </div>
      </div>
    </ToastProvider>
  );
}
