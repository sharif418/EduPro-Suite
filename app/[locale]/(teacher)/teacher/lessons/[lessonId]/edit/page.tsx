'use client';

import { useState, useEffect, use } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface LessonFormData {
  title: string;
  description: string;
  objectives: string[];
  activities: string[];
  duration: number;
  lessonDate: string;
  lessonTime: string;
  assessmentMethods: string[];
  notes: string;
  classLevelId: string;
  sectionId: string;
  subjectId: string;
  templateId: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

interface ClassLevel {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Template {
  id: string;
  title: string;
  description?: string;
  objectives: string[];
  activities: string[];
  duration: number;
  assessmentMethods: string[];
}

interface LessonPlan {
  id: string;
  title: string;
  description?: string;
  objectives: string[];
  activities: string[];
  duration: number;
  lessonDate: string;
  assessmentMethods: string[];
  notes?: string;
  classLevelId: string;
  sectionId: string;
  subjectId: string;
  templateId?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  classLevel: { id: string; name: string };
  section: { id: string; name: string };
  subject: { id: string; name: string; code: string };
  template?: { id: string; title: string };
}

export default function EditLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const resolvedParams = use(params);
  const { lessonId } = resolvedParams;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sectionsByClass, setSectionsByClass] = useState<Record<string, Section[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  
  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    description: '',
    objectives: [''],
    activities: [''],
    duration: 60,
    lessonDate: '',
    lessonTime: '',
    assessmentMethods: [''],
    notes: '',
    classLevelId: '',
    sectionId: '',
    subjectId: '',
    templateId: '',
    status: 'DRAFT',
  });

  useEffect(() => {
    fetchInitialData();
    fetchLessonPlan();
  }, [lessonId]);

  useEffect(() => {
    if (formData.classLevelId) {
      fetchSections(formData.classLevelId);
    }
  }, [formData.classLevelId]);

  useEffect(() => {
    if (formData.subjectId) {
      fetchTemplates();
    }
  }, [formData.subjectId]);

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/teacher/metadata');
      if (response.ok) {
        const data = await response.json();
        setClassLevels(data.classLevels || []);
        setSubjects(data.subjects || []);
        setSectionsByClass(data.sectionsByClass || {});
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchLessonPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teacher/lessons?id=${lessonId}`);
      if (response.ok) {
        const data = await response.json();
        const lesson = data.lessonPlans?.[0];
        if (lesson) {
          setLessonPlan(lesson);
          
          // Parse the lesson date
          const lessonDateTime = new Date(lesson.lessonDate);
          const dateStr = lessonDateTime.toISOString().split('T')[0];
          const timeStr = lessonDateTime.toTimeString().slice(0, 5);
          
          setFormData({
            title: lesson.title,
            description: lesson.description || '',
            objectives: lesson.objectives.length > 0 ? lesson.objectives : [''],
            activities: lesson.activities.length > 0 ? lesson.activities : [''],
            duration: lesson.duration,
            lessonDate: dateStr,
            lessonTime: timeStr,
            assessmentMethods: lesson.assessmentMethods.length > 0 ? lesson.assessmentMethods : [''],
            notes: lesson.notes || '',
            classLevelId: lesson.classLevelId,
            sectionId: lesson.sectionId,
            subjectId: lesson.subjectId,
            templateId: lesson.templateId || '',
            status: lesson.status,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching lesson plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async (classLevelId: string) => {
    try {
      setSections(sectionsByClass[classLevelId] || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/teacher/lessons/templates?subjectId=${formData.subjectId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleInputChange = (field: keyof LessonFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: 'objectives' | 'activities' | 'assessmentMethods', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'objectives' | 'activities' | 'assessmentMethods') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'objectives' | 'activities' | 'assessmentMethods', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        templateId,
        objectives: template.objectives.length > 0 ? template.objectives : [''],
        activities: template.activities.length > 0 ? template.activities : [''],
        duration: template.duration,
        assessmentMethods: template.assessmentMethods.length > 0 ? template.assessmentMethods : [''],
      }));
    }
  };

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    try {
      setSaving(true);
      
      // Combine date and time
      const lessonDateTime = new Date(`${formData.lessonDate}T${formData.lessonTime}`);
      
      const response = await fetch('/api/teacher/lessons', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: lessonId,
          title: formData.title,
          description: formData.description,
          objectives: formData.objectives.filter(obj => obj.trim()),
          activities: formData.activities.filter(act => act.trim()),
          duration: formData.duration,
          lessonDate: lessonDateTime.toISOString(),
          assessmentMethods: formData.assessmentMethods.filter(method => method.trim()),
          notes: formData.notes,
          status,
        }),
      });

      if (response.ok) {
        router.push(`/${locale}/teacher/lessons`);
      } else {
        console.error('Failed to update lesson plan');
      }
    } catch (error) {
      console.error('Error updating lesson plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this lesson plan?')) {
      try {
        const response = await fetch(`/api/teacher/lessons?id=${lessonId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          router.push(`/${locale}/teacher/lessons`);
        }
      } catch (error) {
        console.error('Error deleting lesson plan:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading lesson plan...</div>
      </div>
    );
  }

  if (!lessonPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Lesson plan not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href={`/${locale}/teacher/lessons`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('common.back')}
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('lessonPlan.edit')}
            </h1>
            <p className="text-sm text-gray-500">
              {lessonPlan.classLevel.name} - {lessonPlan.section.name} - {lessonPlan.subject.name}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {t('lessonPlan.basicInfo')}
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('lessonPlan.lesson')} {t('common.name')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('lessonPlan.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.template')}
              </label>
              <select
                value={formData.templateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('lessonPlan.selectTemplate')}</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.date')} *
              </label>
              <input
                type="date"
                value={formData.lessonDate}
                onChange={(e) => handleInputChange('lessonDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.time')} *
              </label>
              <input
                type="time"
                value={formData.lessonTime}
                onChange={(e) => handleInputChange('lessonTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.duration')} ({t('common.minutes')})
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                min="1"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Learning Objectives */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('lessonPlan.objectives')}
            </label>
            {formData.objectives.map((objective, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => handleArrayChange('objectives', index, e.target.value)}
                  placeholder={`${t('lessonPlan.objective')} ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('objectives', index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('objectives')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Objective
            </button>
          </div>

          {/* Activities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('lessonPlan.activities')}
            </label>
            {formData.activities.map((activity, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={activity}
                  onChange={(e) => handleArrayChange('activities', index, e.target.value)}
                  placeholder={`${t('lessonPlan.activity')} ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.activities.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('activities', index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('activities')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Activity
            </button>
          </div>

          {/* Assessment Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('lessonPlan.assessmentMethods')}
            </label>
            {formData.assessmentMethods.map((method, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={method}
                  onChange={(e) => handleArrayChange('assessmentMethods', index, e.target.value)}
                  placeholder={`${t('lessonPlan.assessmentMethod')} ${index + 1}`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formData.assessmentMethods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('assessmentMethods', index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem('assessmentMethods')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add Assessment Method
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('lessonPlan.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={4}
              placeholder={t('lessonPlan.notesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => handleSubmit('DRAFT')}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('common.saving') : t('lessonPlan.saveDraft')}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('PUBLISHED')}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('common.saving') : t('lessonPlan.publish')}
          </button>
        </div>
      </div>
    </div>
  );
}
