'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';
import { DataTable } from '@/app/components/ui/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/Dialog';
import { useToast } from '@/app/components/ui/Toast';
import { MultiStepForm, FormStep, FormSection } from '@/app/components/ui/MultiStepForm';
import { PhotoUpload } from '@/app/components/ui/PhotoUpload';
import { formatDate } from '@/app/lib/utils';
import { Plus, Search, Filter, Edit, Trash2, Eye, Users, GraduationCap } from 'lucide-react';

// Types
interface Student {
  id: string;
  studentId: string;
  name: string;
  email?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  religion?: string;
  nationality?: string;
  studentPhotoUrl?: string;
  admissionDate: string;
  guardian: {
    id: string;
    name: string;
    relationToStudent: string;
    contactNumber: string;
    email?: string;
    occupation?: string;
  };
  address: {
    id: string;
    presentAddress: string;
    permanentAddress: string;
  };
  enrollments: Array<{
    id: string;
    rollNumber: number;
    academicYear: {
      id: string;
      year: string;
    };
    classLevel: {
      id: string;
      name: string;
    };
    section: {
      id: string;
      name: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface AcademicYear {
  id: string;
  year: string;
  isCurrent: boolean;
}

interface ClassLevel {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  classLevelId: string;
}

export default function StudentManagementPage() {
  const { addToast } = useToast();

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    academicYearId: '',
    classLevelId: '',
    sectionId: '',
    gender: '',
  });

  // Dialog states
  const [admissionDialogOpen, setAdmissionDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admission form state
  const [admissionForm, setAdmissionForm] = useState({
    // Student Information
    name: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    religion: '',
    nationality: '',
    studentPhotoUrl: '',
    admissionDate: new Date().toISOString().split('T')[0],
    // Guardian Information
    guardianName: '',
    relationToStudent: '',
    guardianContactNumber: '',
    guardianEmail: '',
    guardianOccupation: '',
    // Address Information
    presentAddress: '',
    permanentAddress: '',
    // Academic Information
    academicYearId: '',
    classLevelId: '',
    sectionId: '',
    rollNumber: '',
  });

  // Fetch functions
  const fetchStudents = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      });

      const response = await fetch(`/api/admin/students?${params}`);
      const data = await response.json();

      if (data.success) {
        setStudents(data.students);
        setPagination(data.pagination);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to fetch students',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to fetch students',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch('/api/admin/academic-years');
      const data = await response.json();
      if (data.success) {
        setAcademicYears(data.academicYears);
        // Set current academic year as default
        const currentYear = data.academicYears.find((year: AcademicYear) => year.isCurrent);
        if (currentYear && !admissionForm.academicYearId) {
          setAdmissionForm(prev => ({ ...prev, academicYearId: currentYear.id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch academic years:', error);
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
      console.error('Failed to fetch class levels:', error);
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
      console.error('Failed to fetch sections:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchStudents();
    fetchAcademicYears();
    fetchClassLevels();
    fetchSections();
  }, []);

  // Refetch students when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Fetch sections when class level changes
  useEffect(() => {
    if (admissionForm.classLevelId) {
      fetchSections(admissionForm.classLevelId);
      setAdmissionForm(prev => ({ ...prev, sectionId: '' }));
    }
  }, [admissionForm.classLevelId]);

  // Handle admission form submission
  const handleAdmissionSubmit = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admissionForm),
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: 'Student admitted successfully',
        });
        setAdmissionDialogOpen(false);
        resetAdmissionForm();
        fetchStudents();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to admit student',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to admit student',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAdmissionForm = () => {
    setAdmissionForm({
      name: '',
      email: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      religion: '',
      nationality: '',
      studentPhotoUrl: '',
      admissionDate: new Date().toISOString().split('T')[0],
      guardianName: '',
      relationToStudent: '',
      guardianContactNumber: '',
      guardianEmail: '',
      guardianOccupation: '',
      presentAddress: '',
      permanentAddress: '',
      academicYearId: academicYears.find(year => year.isCurrent)?.id || '',
      classLevelId: '',
      sectionId: '',
      rollNumber: '',
    });
  };

  // Handle student deletion
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        addToast({
          type: 'success',
          title: 'Success',
          description: 'Student deleted successfully',
        });
        fetchStudents();
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to delete student',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete student',
      });
    }
  };

  // Table columns
  const columns = [
    {
      key: 'studentPhotoUrl',
      header: 'Photo',
      render: (student: Student) => (
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          {student.studentPhotoUrl ? (
            <img
              src={student.studentPhotoUrl}
              alt={student.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Users className="w-5 h-5 text-gray-400" />
          )}
        </div>
      ),
    },
    { key: 'studentId', header: 'Student ID' },
    { key: 'name', header: 'Name' },
    {
      key: 'currentClass',
      header: 'Current Class',
      render: (student: Student) => {
        const currentEnrollment = student.enrollments[0];
        return currentEnrollment
          ? `${currentEnrollment.classLevel.name} - ${currentEnrollment.section.name}`
          : 'Not Enrolled';
      },
    },
    {
      key: 'rollNumber',
      header: 'Roll No.',
      render: (student: Student) => student.enrollments[0]?.rollNumber || 'N/A',
    },
    {
      key: 'guardian',
      header: 'Guardian',
      render: (student: Student) => (
        <div>
          <div className="font-medium">{student.guardian.name}</div>
          <div className="text-sm text-gray-500">{student.guardian.contactNumber}</div>
        </div>
      ),
    },
    {
      key: 'admissionDate',
      header: 'Admission Date',
      render: (student: Student) => formatDate(student.admissionDate),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (student: Student) => (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(`/admin/student-management/${student.id}`, '_blank')}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // TODO: Implement edit functionality
              addToast({
                type: 'info',
                title: 'Coming Soon',
                description: 'Edit functionality will be available soon',
              });
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDeleteStudent(student.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Validation for admission form steps
  const isStep1Valid = !!(admissionForm.name && admissionForm.dateOfBirth && admissionForm.gender && admissionForm.admissionDate);
  const isStep2Valid = !!(admissionForm.guardianName && admissionForm.relationToStudent && admissionForm.guardianContactNumber && admissionForm.presentAddress && admissionForm.permanentAddress);
  const isStep3Valid = !!(admissionForm.academicYearId && admissionForm.classLevelId && admissionForm.sectionId);

  // Multi-step form steps
  const admissionSteps = [
    {
      id: 'student-info',
      title: 'Student Information',
      description: 'Basic information about the student',
      isValid: isStep1Valid,
      component: (
        <FormStep>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex justify-center">
              <PhotoUpload
                value={admissionForm.studentPhotoUrl}
                onChange={(url) => setAdmissionForm(prev => ({ ...prev, studentPhotoUrl: url || '' }))}
              />
            </div>

            <FormSection title="Personal Details">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={admissionForm.name}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={admissionForm.email}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={admissionForm.dateOfBirth}
                    onChange={(e) => setAdmissionForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    value={admissionForm.gender}
                    onChange={(e) => setAdmissionForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </FormSection>

            <FormSection title="Additional Information">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Group
                </label>
                <select
                  value={admissionForm.bloodGroup}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, bloodGroup: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Religion
                </label>
                <input
                  type="text"
                  value={admissionForm.religion}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, religion: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  value={admissionForm.nationality}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, nationality: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admission Date *
                </label>
                <input
                  type="date"
                  value={admissionForm.admissionDate}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, admissionDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </FormSection>
          </div>
        </FormStep>
      ),
    },
    {
      id: 'guardian-address',
      title: 'Guardian & Address Information',
      description: 'Parent/Guardian and address details',
      isValid: isStep2Valid,
      component: (
        <FormStep>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormSection title="Guardian Information">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Name *
                </label>
                <input
                  type="text"
                  value={admissionForm.guardianName}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, guardianName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relation to Student *
                </label>
                <select
                  value={admissionForm.relationToStudent}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, relationToStudent: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Grandfather">Grandfather</option>
                  <option value="Grandmother">Grandmother</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  value={admissionForm.guardianContactNumber}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, guardianContactNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guardian Email
                </label>
                <input
                  type="email"
                  value={admissionForm.guardianEmail}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, guardianEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={admissionForm.guardianOccupation}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, guardianOccupation: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </FormSection>

            <FormSection title="Address Information">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Present Address *
                </label>
                <textarea
                  value={admissionForm.presentAddress}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, presentAddress: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permanent Address *
                </label>
                <textarea
                  value={admissionForm.permanentAddress}
                  onChange={(e) => setAdmissionForm(prev => ({ ...prev, permanentAddress: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sameAddress"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setAdmissionForm(prev => ({ 
                        ...prev, 
                        permanentAddress: prev.presentAddress 
                      }));
                    }
                  }}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="sameAddress" className="ml-2 block text-sm text-gray-900">
                  Same as present address
                </label>
              </div>
            </FormSection>
          </div>
        </FormStep>
      ),
    },
    {
      id: 'academic-info',
      title: 'Academic Information',
      description: 'Class, section, and academic year details',
      isValid: isStep3Valid,
      component: (
        <FormStep>
          <div className="max-w-2xl mx-auto">
            <FormSection title="Academic Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Academic Year *
                  </label>
                  <select
                    value={admissionForm.academicYearId}
                    onChange={(e) => setAdmissionForm(prev => ({ ...prev, academicYearId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select Academic Year</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.year} {year.isCurrent && '(Current)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class *
                  </label>
                  <select
                    value={admissionForm.classLevelId}
                    onChange={(e) => setAdmissionForm(prev => ({ ...prev, classLevelId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Select Class</option>
                    {classLevels.map((classLevel) => (
                      <option key={classLevel.id} value={classLevel.id}>
                        {classLevel.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section *
                  </label>
                  <select
                    value={admissionForm.sectionId}
                    onChange={(e) => setAdmissionForm(prev => ({ ...prev, sectionId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    disabled={!admissionForm.classLevelId}
                  >
                    <option value="">Select Section</option>
                    {sections
                      .filter(section => section.classLevelId === admissionForm.classLevelId)
                      .map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Roll Number (Optional)
                  </label>
                  <input
                    type="number"
                    value={admissionForm.rollNumber}
                    onChange={(e) => setAdmissionForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Auto-generated if not provided"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <GraduationCap className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">
                      Admission Summary
                    </h4>
                    <div className="mt-2 text-sm text-blue-700">
                      <p><strong>Student:</strong> {admissionForm.name || 'Not specified'}</p>
                      <p><strong>Academic Year:</strong> {academicYears.find(y => y.id === admissionForm.academicYearId)?.year || 'Not selected'}</p>
                      <p><strong>Class:</strong> {classLevels.find(c => c.id === admissionForm.classLevelId)?.name || 'Not selected'}</p>
                      <p><strong>Section:</strong> {sections.find(s => s.id === admissionForm.sectionId)?.name || 'Not selected'}</p>
                      <p><strong>Guardian:</strong> {admissionForm.guardianName || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
          </div>
        </FormStep>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600 mt-2">
            Manage student admissions, profiles, and academic records.
          </p>
        </div>
        <Button onClick={() => setAdmissionDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Admission
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Academic Year
            </label>
            <select
              value={filters.academicYearId}
              onChange={(e) => setFilters(prev => ({ ...prev, academicYearId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Years</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class
            </label>
            <select
              value={filters.classLevelId}
              onChange={(e) => setFilters(prev => ({ ...prev, classLevelId: e.target.value, sectionId: '' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Classes</option>
              {classLevels.map((classLevel) => (
                <option key={classLevel.id} value={classLevel.id}>
                  {classLevel.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section
            </label>
            <select
              value={filters.sectionId}
              onChange={(e) => setFilters(prev => ({ ...prev, sectionId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!filters.classLevelId}
            >
              <option value="">All Sections</option>
              {sections
                .filter(section => !filters.classLevelId || section.classLevelId === filters.classLevelId)
                .map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={filters.gender}
              onChange={(e) => setFilters(prev => ({ ...prev, gender: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Students ({pagination.totalCount})
            </h2>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
            </div>
          </div>
        </div>

        <DataTable
          data={students}
          columns={columns}
          loading={loading}
          emptyMessage="No students found. Add your first student to get started."
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchStudents(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchStudents(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Admission Dialog */}
      <Dialog open={admissionDialogOpen} onOpenChange={setAdmissionDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Student Admission</DialogTitle>
          </DialogHeader>
          
          <MultiStepForm
            steps={admissionSteps}
            onComplete={handleAdmissionSubmit}
            onCancel={() => {
              setAdmissionDialogOpen(false);
              resetAdmissionForm();
            }}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
