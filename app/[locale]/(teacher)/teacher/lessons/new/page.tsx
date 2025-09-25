'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Upload, Plus, Trash2 } from 'lucide-react';
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
  status: 'DRAFT' | 'PUBLISHED';
}

interface Template {
  id: string;
  title: string;
  description?: string;
  objectives: string[];
  activities: string[];
  duration: number;
  assessmentMethods: string[];
  subject: { name: string };
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
}

export default function NewLessonPage() {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sectionsByClass, setSectionsByClass] = useState<Record<string, Section[]>>({});
  
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
  }, []);

  useEffect(() => {
    if (formData.classLevelId) {
      fetchSections(formData.classLevelId);
    }
  }, [formData.classLevelId]);

  useEffect(() => {
    if (formData.subjectId) {
      fetchTemplates(formData.subjectId);
    }
  }, [formData.subjectId]);

  const fetchInitialData = async () => {
    try {
      // Fetch teacher-specific metadata
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

  const fetchSections = async (classLevelId: string) => {
    try {
      // Use the sections data from the initial metadata fetch
      setSections(sectionsByClass[classLevelId] || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchTemplates = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/teacher/lessons/templates?subjectId=${subjectId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleInputChange = (field: keyof LessonFormData, value: string | number) => {
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
        title: template.title,
        description: template.description || '',
        objectives: template.objectives.length > 0 ? template.objectives : [''],
        activities: template.activities.length > 0 ? template.activities : [''],
        duration: template.duration,
        assessmentMethods: template.assessmentMethods.length > 0 ? template.assessmentMethods : [''],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Combine date and time
      const lessonDateTime = new Date(`${formData.lessonDate}T${formData.lessonTime}`);
      
      const submitData = {
        ...formData,
        lessonDate: lessonDateTime.toISOString(),
        objectives: formData.objectives.filter(obj => obj.trim() !== ''),
        activities: formData.activities.filter(act => act.trim() !== ''),
        assessmentMethods: formData.assessmentMethods.filter(method => method.trim() !== ''),
      };

      const response = await fetch('/api/teacher/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const data = await response.json();
        router.push('/teacher/lessons');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create lesson plan');
      }
    } catch (error) {
      console.error('Error creating lesson plan:', error);
      alert('Failed to create lesson plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/teacher/lessons"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('common.back')}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('lessonPlan.create')}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t('lessonPlan.basicInfo')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.template')}
              </label>
              <select
                value={formData.templateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('lessonPlan.selectTemplate')}</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title} ({template.subject.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.title')} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.description')}
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.class')} *
              </label>
              <select
                required
                value={formData.classLevelId}
                onChange={(e) => handleInputChange('classLevelId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('common.selectClass')}</option>
                {classLevels.map((classLevel) => (
                  <option key={classLevel.id} value={classLevel.id}>
                    {classLevel.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.section')} *
              </label>
              <select
                required
                value={formData.sectionId}
                onChange={(e) => handleInputChange('sectionId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!formData.classLevelId}
              >
                <option value="">{t('common.selectSection')}</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('common.subject')} *
              </label>
              <select
                required
                value={formData.subjectId}
                onChange={(e) => handleInputChange('subjectId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('common.selectSubject')}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.duration')} ({t('common.minutes')}) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.date')} *
              </label>
              <input
                type="date"
                required
                value={formData.lessonDate}
                onChange={(e) => handleInputChange('lessonDate', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.time')} *
              </label>
              <input
                type="time"
                required
                value={formData.lessonTime}
                onChange={(e) => handleInputChange('lessonTime', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {t('lessonPlan.objectives')}
            </h2>
            <button
              type="button"
              onClick={() => addArrayItem('objectives')}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.objectives.map((objective, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => handleArrayChange('objectives', index, e.target.value)}
                  placeholder={`${t('lessonPlan.objective')} ${index + 1}`}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('objectives', index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {t('lessonPlan.activities')}
            </h2>
            <button
              type="button"
              onClick={() => addArrayItem('activities')}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.activities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-2">
                <textarea
                  rows={2}
                  value={activity}
                  onChange={(e) => handleArrayChange('activities', index, e.target.value)}
                  placeholder={`${t('lessonPlan.activity')} ${index + 1}`}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.activities.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('activities', index)}
                    className="p-2 text-red-600 hover:text-red-800 mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Assessment Methods */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {t('lessonPlan.assessmentMethods')}
            </h2>
            <button
              type="button"
              onClick={() => addArrayItem('assessmentMethods')}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('common.add')}
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.assessmentMethods.map((method, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={method}
                  onChange={(e) => handleArrayChange('assessmentMethods', index, e.target.value)}
                  placeholder={`${t('lessonPlan.assessmentMethod')} ${index + 1}`}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {formData.assessmentMethods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayItem('assessmentMethods', index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {t('lessonPlan.notes')}
          </h2>
          <textarea
            rows={4}
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder={t('lessonPlan.notesPlaceholder')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 bg-white shadow rounded-lg p-6">
          <Link
            href="/teacher/lessons"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {t('common.cancel')}
          </Link>
          <button
            type="button"
            onClick={(e) => {
              setFormData(prev => ({ ...prev, status: 'DRAFT' }));
              handleSubmit(e as any);
            }}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {t('lessonPlan.saveDraft')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              setFormData(prev => ({ ...prev, status: 'PUBLISHED' }));
              handleSubmit(e as any);
            }}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? t('common.saving') : t('lessonPlan.publish')}
          </button>
        </div>
      </form>
    </div>
  );
}
