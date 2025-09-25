'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, BookOpen, Target, Activity, CheckSquare, FileText, Save, X } from 'lucide-react';
import LessonResourceManager from './LessonResourceManager';

interface LessonPlanData {
  id?: string;
  title: string;
  description: string;
  objectives: string[];
  activities: string[];
  duration: number;
  lessonDate: string;
  assessmentMethods: string[];
  notes: string;
  classLevelId: string;
  sectionId: string;
  subjectId: string;
  templateId?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

interface LessonTemplate {
  id: string;
  title: string;
  description?: string;
  objectives: string[];
  activities: string[];
  duration: number;
  assessmentMethods: string[];
  category?: string;
  subject: {
    id: string;
    name: string;
  };
}

interface MetadataOption {
  id: string;
  name: string;
  code?: string;
}

interface LessonPlanFormProps {
  initialData?: Partial<LessonPlanData>;
  onSubmit: (data: LessonPlanData) => Promise<void>;
  mode: 'create' | 'edit';
  loading?: boolean;
  lessonPlanId?: string;
}

export default function LessonPlanForm({
  initialData,
  onSubmit,
  mode,
  loading = false,
  lessonPlanId
}: LessonPlanFormProps) {
  const t = useTranslations();
  
  const [formData, setFormData] = useState<LessonPlanData>({
    title: '',
    description: '',
    objectives: [''],
    activities: [''],
    duration: 60,
    lessonDate: '',
    assessmentMethods: [''],
    notes: '',
    classLevelId: '',
    sectionId: '',
    subjectId: '',
    status: 'DRAFT',
    ...initialData
  });

  const [metadata, setMetadata] = useState<{
    classLevels: MetadataOption[];
    sectionsByClass: Record<string, MetadataOption[]>;
    subjects: MetadataOption[];
  }>({
    classLevels: [],
    sectionsByClass: {},
    subjects: []
  });

  const [templates, setTemplates] = useState<LessonTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showResourceManager, setShowResourceManager] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (formData.subjectId) {
      fetchTemplates(formData.subjectId);
    }
  }, [formData.subjectId]);

  const fetchMetadata = async () => {
    try {
      const response = await fetch('/api/teacher/metadata');
      if (response.ok) {
        const data = await response.json();
        setMetadata(data);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
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

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        title: template.title,
        description: template.description || '',
        objectives: template.objectives.length > 0 ? template.objectives : [''],
        activities: template.activities.length > 0 ? template.activities : [''],
        duration: template.duration,
        assessmentMethods: template.assessmentMethods.length > 0 ? template.assessmentMethods : [''],
        templateId: template.id
      }));
    }
    setSelectedTemplate(templateId);
  };

  const handleArrayFieldChange = (
    field: 'objectives' | 'activities' | 'assessmentMethods',
    index: number,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field: 'objectives' | 'activities' | 'assessmentMethods') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field: 'objectives' | 'activities' | 'assessmentMethods', index: number) => {
    if (formData[field].length > 1) {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty strings from arrays
    const cleanedData = {
      ...formData,
      objectives: formData.objectives.filter(obj => obj.trim() !== ''),
      activities: formData.activities.filter(act => act.trim() !== ''),
      assessmentMethods: formData.assessmentMethods.filter(method => method.trim() !== '')
    };

    await onSubmit(cleanedData);
  };

  const availableSections = formData.classLevelId 
    ? metadata.sectionsByClass[formData.classLevelId] || []
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              {mode === 'create' ? t('lessonPlan.createLesson') : t('lessonPlan.editLesson')}
            </h2>
            <div className="flex items-center space-x-2">
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="DRAFT">{t('lessonPlan.status.draft')}</option>
                <option value="PUBLISHED">{t('lessonPlan.status.published')}</option>
                <option value="ARCHIVED">{t('lessonPlan.status.archived')}</option>
              </select>
            </div>
          </div>

          {/* Template Selection */}
          {mode === 'create' && templates.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.useTemplate')}
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('lessonPlan.selectTemplate')}</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.title} ({template.category || t('lessonPlan.general')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.title')} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('lessonPlan.titlePlaceholder')}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-1" />
                  {t('lessonPlan.duration')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  {t('lessonPlan.lessonDate')} *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.lessonDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, lessonDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Class/Section/Subject Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.classLevel')} *
              </label>
              <select
                required
                value={formData.classLevelId}
                onChange={(e) => setFormData(prev => ({ ...prev, classLevelId: e.target.value, sectionId: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('lessonPlan.selectClass')}</option>
                {metadata.classLevels.map(classLevel => (
                  <option key={classLevel.id} value={classLevel.id}>
                    {classLevel.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.section')} *
              </label>
              <select
                required
                value={formData.sectionId}
                onChange={(e) => setFormData(prev => ({ ...prev, sectionId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.classLevelId}
              >
                <option value="">{t('lessonPlan.selectSection')}</option>
                {availableSections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('lessonPlan.subject')} *
              </label>
              <select
                required
                value={formData.subjectId}
                onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('lessonPlan.selectSubject')}</option>
                {metadata.subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('lessonPlan.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('lessonPlan.descriptionPlaceholder')}
            />
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2" />
            {t('lessonPlan.learningObjectives')}
          </h3>
          {formData.objectives.map((objective, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={objective}
                onChange={(e) => handleArrayFieldChange('objectives', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`${t('lessonPlan.objective')} ${index + 1}`}
              />
              {formData.objectives.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayField('objectives', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField('objectives')}
            className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + {t('lessonPlan.addObjective')}
          </button>
        </div>

        {/* Learning Activities */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            {t('lessonPlan.learningActivities')}
          </h3>
          {formData.activities.map((activity, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={activity}
                onChange={(e) => handleArrayFieldChange('activities', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`${t('lessonPlan.activity')} ${index + 1}`}
              />
              {formData.activities.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayField('activities', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField('activities')}
            className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + {t('lessonPlan.addActivity')}
          </button>
        </div>

        {/* Assessment Methods */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CheckSquare className="h-5 w-5 mr-2" />
            {t('lessonPlan.assessmentMethods')}
          </h3>
          {formData.assessmentMethods.map((method, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={method}
                onChange={(e) => handleArrayFieldChange('assessmentMethods', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`${t('lessonPlan.assessmentMethod')} ${index + 1}`}
              />
              {formData.assessmentMethods.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeArrayField('assessmentMethods', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField('assessmentMethods')}
            className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
          >
            + {t('lessonPlan.addAssessmentMethod')}
          </button>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {t('lessonPlan.notes')}
          </h3>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('lessonPlan.notesPlaceholder')}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-between items-center">
          <div>
            {lessonPlanId && (
              <button
                type="button"
                onClick={() => setShowResourceManager(!showResourceManager)}
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md"
              >
                {showResourceManager ? t('lessonPlan.hideResources') : t('lessonPlan.manageResources')}
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? t('common.saving') : (mode === 'create' ? t('lessonPlan.createLesson') : t('lessonPlan.updateLesson'))}
          </button>
        </div>
      </form>

      {/* Resource Manager */}
      {showResourceManager && lessonPlanId && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('lessonPlan.resources')}
          </h3>
          <LessonResourceManager lessonPlanId={lessonPlanId} />
        </div>
      )}
    </div>
  );
}
