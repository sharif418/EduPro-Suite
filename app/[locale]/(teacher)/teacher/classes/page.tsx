'use client';

import { useSession } from '../../../../hooks/useSession';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import ClassRosterGrid from '../../../../components/teacher/ClassRosterGrid';
import ClassManagementActions from '../../../../components/teacher/ClassManagementActions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../../components/ui/Tabs';
import { Button } from '../../../../components/ui/Button';

interface ClassData {
  id: string;
  classLevel: {
    id: string;
    name: string;
  };
  section: {
    id: string;
    name: string;
  };
  subjects: Array<{
    id: string;
    name: string;
    subjectCode: string;
  }>;
  studentCount: number;
  isClassTeacher: boolean;
  averageAttendance?: number;
  recentActivity?: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
  performanceStats?: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
}

export default function TeacherClassesPage() {
  const { user } = useSession();
  const t = useTranslations('teacher');
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/teacher/classes');
        
        if (!response.ok) {
          throw new Error('Failed to fetch classes');
        }
        
        const data = await response.json();
        setClasses(data.classes || []);
        
        // Auto-select first class if available
        if (data.classes && data.classes.length > 0) {
          setSelectedClass(data.classes[0].id);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleExportRoster = async (classId: string, format: 'excel' | 'pdf' | 'csv') => {
    try {
      setExportLoading(true);
      const response = await fetch(`/api/teacher/roster/export?classId=${classId}&format=${format}`);
      
      if (!response.ok) {
        throw new Error('Failed to export roster');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `class-roster-${classId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting roster:', err);
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('classManagement.errorLoadingClasses')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t('classManagement.noClassesAssigned')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('classManagement.noClassesDescription')}
          </p>
        </div>
      </div>
    );
  }

  const selectedClassData = classes.find(cls => cls.id === selectedClass);

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Quick Actions */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {t('classManagement.myClasses')} 👥
            </h1>
            <p className="text-purple-100 text-base sm:text-lg">
              {t('classManagement.manageClassesDescription')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="text-center bg-white/10 rounded-lg p-3">
              <div className="text-2xl font-bold">{classes.length}</div>
              <div className="text-sm text-purple-200">
                {classes.length === 1 ? t('common.class') : t('classManagement.classes')}
              </div>
            </div>
            <div className="text-center bg-white/10 rounded-lg p-3">
              <div className="text-2xl font-bold">
                {classes.reduce((sum, cls) => sum + cls.studentCount, 0)}
              </div>
              <div className="text-sm text-purple-200">{t('teacher.students')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Stats with Performance Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <span className="text-xl">📚</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('classManagement.totalClasses')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {classes.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <span className="text-xl">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('classManagement.totalStudents')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {classes.reduce((sum, cls) => sum + cls.studentCount, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <span className="text-xl">📖</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('common.subjects')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {new Set(classes.flatMap(cls => cls.subjects.map(s => s.id))).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <span className="text-xl">👨‍🏫</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('classManagement.classTeacher')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {classes.filter(cls => cls.isClassTeacher).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <span className="text-xl">📊</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('classManagement.avgAttendance')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {Math.round(classes.reduce((sum, cls) => sum + (cls.averageAttendance || 0), 0) / classes.length) || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Class Management Actions */}
      {selectedClassData && (
        <ClassManagementActions 
          classId={selectedClassData.id}
          className={`${selectedClassData.classLevel.name} - ${selectedClassData.section.name}`}
          isClassTeacher={selectedClassData.isClassTeacher}
          onExportRoster={handleExportRoster}
          exportLoading={exportLoading}
        />
      )}

      {/* Enhanced Class Tabs with Activity Feed */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <Tabs defaultValue={selectedClass || classes[0]?.id}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <TabsList>
              {classes.map(classData => (
                <TabsTrigger key={classData.id} value={classData.id}>
                  {classData.classLevel.name} - {classData.section.name}
                  <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs">
                    {classData.studentCount}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {selectedClassData && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExportRoster(selectedClassData.id, 'excel')}
                  disabled={exportLoading}
                >
                  📊 {t('classManagement.exportExcel')}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExportRoster(selectedClassData.id, 'pdf')}
                  disabled={exportLoading}
                >
                  📄 {t('classManagement.exportPDF')}
                </Button>
              </div>
            )}
          </div>
          
          {classes.map(classData => (
            <TabsContent key={classData.id} value={classData.id}>
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Main Roster Grid */}
                <div className="xl:col-span-3">
                  <ClassRosterGrid 
                    classId={classData.id}
                    className={`${classData.classLevel.name} - ${classData.section.name}`}
                    subjects={classData.subjects}
                    isClassTeacher={classData.isClassTeacher}
                  />
                </div>
                
                {/* Class Overview Sidebar */}
                <div className="xl:col-span-1 space-y-6">
                  {/* Performance Overview */}
                  {classData.performanceStats && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        {t('classManagement.performanceOverview')}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-600">{t('teacher.excellent')}</span>
                          <span className="text-sm font-medium">{classData.performanceStats.excellent}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-blue-600">{t('teacher.good')}</span>
                          <span className="text-sm font-medium">{classData.performanceStats.good}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-yellow-600">{t('teacher.average')}</span>
                          <span className="text-sm font-medium">{classData.performanceStats.average}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-red-600">{t('classManagement.needsImprovement')}</span>
                          <span className="text-sm font-medium">{classData.performanceStats.needsImprovement}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Recent Activity */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      {t('teacher.recentActivity')}
                    </h3>
                    {classData.recentActivity && classData.recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {classData.recentActivity.slice(0, 5).map(activity => (
                          <div key={activity.id} className="text-sm">
                            <p className="text-gray-700 dark:text-gray-300">{activity.message}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('classManagement.noRecentActivity')}
                      </p>
                    )}
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      {t('classManagement.quickStats')}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('teacher.attendance')}</span>
                        <span className="text-sm font-medium">{classData.averageAttendance || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('common.subjects')}</span>
                        <span className="text-sm font-medium">{classData.subjects.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('teacher.students')}</span>
                        <span className="text-sm font-medium">{classData.studentCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
