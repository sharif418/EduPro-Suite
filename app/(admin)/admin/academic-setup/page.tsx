'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/Tabs';
import { Button } from '@/app/components/ui/Button';
import { DataTable } from '@/app/components/ui/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/app/components/ui/Dialog';
import { useToast } from '@/app/components/ui/Toast';
import { formatDate, formatDateForInput } from '@/app/lib/utils';
import { Plus, Edit, Trash2, Calendar, BookOpen, Users, Settings } from 'lucide-react';

// Types
interface AcademicYear {
  id: string;
  year: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClassLevel {
  id: string;
  name: string;
  sections: Section[];
  classSubjects: any[];
  createdAt: string;
  updatedAt: string;
}

interface Section {
  id: string;
  name: string;
  classLevelId: string;
  classLevel?: ClassLevel;
  createdAt: string;
  updatedAt: string;
}

interface Subject {
  id: string;
  name: string;
  subjectCode: string;
  classSubjects: any[];
  createdAt: string;
  updatedAt: string;
}

export default function AcademicSetupPage() {
  const { addToast } = useToast();
  
  // State
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassLevel | null>(null);
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);

  // Form states
  const [yearForm, setYearForm] = useState({
    id: '',
    year: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
  });

  const [classForm, setClassForm] = useState({
    id: '',
    name: '',
  });

  const [sectionForm, setSectionForm] = useState({
    id: '',
    name: '',
    classLevelId: '',
  });

  const [subjectForm, setSubjectForm] = useState({
    id: '',
    name: '',
    subjectCode: '',
  });

  // Fetch data functions
  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/admin/academic-years');
      const data = await response.json();
      if (data.success) {
        setAcademicYears(data.academicYears);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to fetch academic years',
      });
    }
  };

  const fetchClassLevels = async () => {
    try {
      const response = await fetch('/api/admin/class-levels');
      const data = await response.json();
      if (data.success) {
        setClassLevels(data.classLevels);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to fetch class levels',
      });
    }
  };

  const fetchSections = async (classLevelId?: string) => {
    try {
      const url = classLevelId 
        ? `/api/admin/sections?classLevelId=${classLevelId}`
        : '/api/admin/sections';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setSections(data.sections);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to fetch sections',
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/admin/subjects');
      const data = await response.json();
      if (data.success) {
        setSubjects(data.subjects);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to fetch subjects',
      });
    }
  };

  // Load initial data
  useEffect(() => {
    fetchAcademicYears();
    fetchClassLevels();
    fetchSections();
    fetchSubjects();
  }, []);

  // Academic Year CRUD
  const handleYearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = yearForm.id ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/academic-years', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yearForm),
      });

      const data = await response.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: `Academic year ${yearForm.id ? 'updated' : 'created'} successfully`,
        });
        setYearDialogOpen(false);
        setYearForm({ id: '', year: '', startDate: '', endDate: '', isCurrent: false });
        fetchAcademicYears();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to save academic year',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to save academic year',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleYearDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this academic year?')) return;

    try {
      const response = await fetch(`/api/admin/academic-years?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: 'Academic year deleted successfully',
        });
        fetchAcademicYears();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to delete academic year',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete academic year',
      });
    }
  };

  // Class Level CRUD
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = classForm.id ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/class-levels', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classForm),
      });

      const data = await response.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: `Class ${classForm.id ? 'updated' : 'created'} successfully`,
        });
        setClassDialogOpen(false);
        setClassForm({ id: '', name: '' });
        fetchClassLevels();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to save class',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to save class',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClassDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? This will also delete all its sections.')) return;

    try {
      const response = await fetch(`/api/admin/class-levels?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: 'Class deleted successfully',
        });
        fetchClassLevels();
        if (selectedClass?.id === id) {
          setSelectedClass(null);
          setSections([]);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to delete class',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete class',
      });
    }
  };

  // Section CRUD
  const handleSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = sectionForm.id ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/sections', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sectionForm,
          classLevelId: sectionForm.classLevelId || selectedClass?.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: `Section ${sectionForm.id ? 'updated' : 'created'} successfully`,
        });
        setSectionDialogOpen(false);
        setSectionForm({ id: '', name: '', classLevelId: '' });
        if (selectedClass) {
          fetchSections(selectedClass.id);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to save section',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to save section',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSectionDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const response = await fetch(`/api/admin/sections?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: 'Section deleted successfully',
        });
        if (selectedClass) {
          fetchSections(selectedClass.id);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to delete section',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete section',
      });
    }
  };

  // Subject CRUD
  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = subjectForm.id ? 'PUT' : 'POST';
      const response = await fetch('/api/admin/subjects', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjectForm),
      });

      const data = await response.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: `Subject ${subjectForm.id ? 'updated' : 'created'} successfully`,
        });
        setSubjectDialogOpen(false);
        setSubjectForm({ id: '', name: '', subjectCode: '' });
        fetchSubjects();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to save subject',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to save subject',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const response = await fetch(`/api/admin/subjects?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: 'Subject deleted successfully',
        });
        fetchSubjects();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to delete subject',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete subject',
      });
    }
  };

  // Table columns
  const yearColumns = [
    { key: 'year', header: 'Academic Year' },
    { 
      key: 'startDate', 
      header: 'Start Date',
      render: (year: AcademicYear) => formatDate(year.startDate),
    },
    { 
      key: 'endDate', 
      header: 'End Date',
      render: (year: AcademicYear) => formatDate(year.endDate),
    },
    {
      key: 'isCurrent',
      header: 'Status',
      render: (year: AcademicYear) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          year.isCurrent 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {year.isCurrent ? 'Current' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (year: AcademicYear) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setYearForm({
                id: year.id,
                year: year.year,
                startDate: formatDateForInput(year.startDate),
                endDate: formatDateForInput(year.endDate),
                isCurrent: year.isCurrent,
              });
              setYearDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleYearDelete(year.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const classColumns = [
    { key: 'name', header: 'Class Name' },
    {
      key: 'sections',
      header: 'Sections',
      render: (classLevel: ClassLevel) => classLevel.sections?.length || 0,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (classLevel: ClassLevel) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setClassForm({
                id: classLevel.id,
                name: classLevel.name,
              });
              setClassDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleClassDelete(classLevel.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const sectionColumns = [
    { key: 'name', header: 'Section Name' },
    {
      key: 'actions',
      header: 'Actions',
      render: (section: Section) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSectionForm({
                id: section.id,
                name: section.name,
                classLevelId: section.classLevelId,
              });
              setSectionDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleSectionDelete(section.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const subjectColumns = [
    { key: 'name', header: 'Subject Name' },
    { key: 'subjectCode', header: 'Subject Code' },
    {
      key: 'actions',
      header: 'Actions',
      render: (subject: Subject) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSubjectForm({
                id: subject.id,
                name: subject.name,
                subjectCode: subject.subjectCode,
              });
              setSubjectDialogOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleSubjectDelete(subject.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academic Setup</h1>
          <p className="text-gray-600 mt-2">
            Configure your institution's academic structure including years, classes, sections, and subjects.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="academic-years" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="academic-years" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Academic Years</span>
          </TabsTrigger>
          <TabsTrigger value="classes-sections" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Classes & Sections</span>
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Subjects</span>
          </TabsTrigger>
          <TabsTrigger value="assign-subjects" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Assign Subjects</span>
          </TabsTrigger>
        </TabsList>

        {/* Academic Years Tab */}
        <TabsContent value="academic-years">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Academic Years</h2>
              <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Academic Year
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {yearForm.id ? 'Edit Academic Year' : 'Add Academic Year'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleYearSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        value={yearForm.year}
                        onChange={(e) => setYearForm({ ...yearForm, year: e.target.value })}
                        placeholder="e.g., 2025-2026"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={yearForm.startDate}
                          onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={yearForm.endDate}
                          onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isCurrent"
                        checked={yearForm.isCurrent}
                        onChange={(e) => setYearForm({ ...yearForm, isCurrent: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isCurrent" className="ml-2 block text-sm text-gray-900">
                        Set as current academic year
                      </label>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setYearDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : yearForm.id ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable data={academicYears} columns={yearColumns} />
          </div>
        </TabsContent>

        {/* Classes & Sections Tab */}
        <TabsContent value="classes-sections">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Classes Panel */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Classes</h2>
                <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {classForm.id ? 'Edit Class' : 'Add Class'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleClassSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Class Name
                        </label>
                        <input
                          type="text"
                          value={classForm.name}
                          onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                          placeholder="e.g., Class 6, Dakhil 1st Year"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setClassDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : classForm.id ? 'Update' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2">
                {classLevels.map((classLevel) => (
                  <div
                    key={classLevel.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedClass?.id === classLevel.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedClass(classLevel);
                      fetchSections(classLevel.id);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{classLevel.name}</h3>
                        <p className="text-sm text-gray-500">
                          {classLevel.sections?.length || 0} sections
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClassForm({
                              id: classLevel.id,
                              name: classLevel.name,
                            });
                            setClassDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClassDelete(classLevel.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sections Panel */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Sections {selectedClass && `- ${selectedClass.name}`}
                </h2>
                <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedClass}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {sectionForm.id ? 'Edit Section' : 'Add Section'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSectionSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Section Name
                        </label>
                        <input
                          type="text"
                          value={sectionForm.name}
                          onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                          placeholder="e.g., A, Blue, Alpha"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : sectionForm.id ? 'Update' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {selectedClass ? (
                <DataTable 
                  data={sections} 
                  columns={sectionColumns}
                  emptyMessage="No sections found. Add a section to get started."
                />
              ) : (
                <div className="flex items-center justify-center h-32 border border-gray-200 rounded-lg">
                  <p className="text-gray-500">Select a class to view its sections</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Subjects</h2>
              <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {subjectForm.id ? 'Edit Subject' : 'Add Subject'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubjectSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        placeholder="e.g., Mathematics, Hadith Sharif"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject Code
                      </label>
                      <input
                        type="text"
                        value={subjectForm.subjectCode}
                        onChange={(e) => setSubjectForm({ ...subjectForm, subjectCode: e.target.value.toUpperCase() })}
                        placeholder="e.g., MATH, HADITH"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setSubjectDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : subjectForm.id ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable data={subjects} columns={subjectColumns} />
          </div>
        </TabsContent>

        {/* Assign Subjects Tab */}
        <TabsContent value="assign-subjects">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Assign Subjects to Classes</h2>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                <strong>Coming Soon:</strong> The subject assignment interface will be available in the next update. 
                This feature will allow you to assign subjects to specific classes with an intuitive drag-and-drop interface.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
