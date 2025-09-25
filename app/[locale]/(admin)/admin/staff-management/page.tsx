'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/app/components/ui/DataTable';
import { Button } from '@/app/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/Dialog';
import { MultiStepForm, FormStep, FormSection } from '@/app/components/ui/MultiStepForm';
import { useToast } from '@/app/components/ui/Toast';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

interface Staff {
  id: string;
  staffId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  gender: string;
  contactNumber: string;
  joiningDate: string;
  user: {
    role: string;
    createdAt: string;
  };
  address: {
    presentAddress: string;
    permanentAddress: string;
  };
  _count: {
    attendances: number;
    leaveRequests: number;
  };
}

interface StaffResponse {
  staff: Staff[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
  filters: {
    departments: string[];
    designations: string[];
  };
}

export default function StaffManagementPage() {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    departments: [] as string[],
    designations: [] as string[],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [isHiringModalOpen, setIsHiringModalOpen] = useState(false);
  const { addToast } = useToast();

  // Fetch staff data
  const fetchStaff = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedDepartment && { department: selectedDepartment }),
        ...(selectedDesignation && { designation: selectedDesignation }),
      });

      const response = await fetch(`/api/admin/staff?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: StaffResponse = await response.json();
        setStaff(data.staff);
        setPagination(data.pagination);
        setFilters(data.filters);
      } else {
        throw new Error('Failed to fetch staff');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      addToast({
        title: 'Error',
        description: 'Failed to fetch staff data',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [searchTerm, selectedDepartment, selectedDesignation]);

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle filter changes
  const handleDepartmentFilter = (department: string) => {
    setSelectedDepartment(department);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleDesignationFilter = (designation: string) => {
    setSelectedDesignation(designation);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    fetchStaff(page);
  };

  // Handle staff hiring
  const handleHireStaff = async (formData: Record<string, unknown>) => {
    try {
      // Validate required fields
      const requiredFields = [
        'name', 'email', 'dateOfBirth', 'gender', 'contactNumber',
        'designation', 'department', 'qualification', 'joiningDate',
        'presentAddress', 'permanentAddress'
      ];

      const missingFields = requiredFields.filter(field => !formData[field]);
      if (missingFields.length > 0) {
        addToast({
          title: 'Validation Error',
          description: `Please fill in all required fields: ${missingFields.join(', ')}`,
          type: 'error',
        });
        return;
      }

      // Format the data to match API expectations
      const staffData = {
        name: String(formData.name).trim(),
        email: String(formData.email).trim().toLowerCase(),
        dateOfBirth: formData.dateOfBirth, // Keep as string, API will convert
        gender: formData.gender,
        contactNumber: String(formData.contactNumber).trim(),
        designation: String(formData.designation).trim(),
        department: String(formData.department).trim(),
        qualification: String(formData.qualification).trim(),
        joiningDate: formData.joiningDate, // Keep as string, API will convert
        presentAddress: String(formData.presentAddress).trim(),
        permanentAddress: String(formData.permanentAddress).trim(),
      };

      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(staffData),
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: 'Staff member hired successfully!',
          type: 'success',
        });
        setIsHiringModalOpen(false);
        // Reset form data
        setFormData({
          name: '',
          email: '',
          dateOfBirth: '',
          gender: '',
          contactNumber: '',
          designation: '',
          department: '',
          qualification: '',
          joiningDate: '',
          presentAddress: '',
          permanentAddress: '',
        });
        fetchStaff(); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to hire staff member');
      }
    } catch (error: unknown) {
      console.error('Error hiring staff:', error);
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to hire staff member',
        type: 'error',
      });
    }
  };

  // Form state for hiring
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    contactNumber: '',
    designation: '',
    department: '',
    qualification: '',
    joiningDate: '',
    presentAddress: '',
    permanentAddress: '',
  });

  // Define hiring form steps
  const hiringFormSteps = [
    {
      id: 'personal',
      title: t('personalInfo'),
      component: (
        <FormStep>
          <FormSection title={t('basicInfo')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailAddress')} *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dateOfBirth')} *</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('gender')} *</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">{t('selectGender')}</option>
                  <option value="MALE">{t('male')}</option>
                  <option value="FEMALE">{t('female')}</option>
                  <option value="OTHER">{t('other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('contactNumber')} *</label>
                <input
                  type="tel"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </FormSection>
        </FormStep>
      ),
    },
    {
      id: 'professional',
      title: t('professionalInfo'),
      component: (
        <FormStep>
          <FormSection title={t('jobDetails')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('designation')} *</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., Assistant Teacher, Principal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('department')} *</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Science, Mathematics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('qualification')} *</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="e.g., M.Sc in Physics"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('joiningDate')} *</label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </FormSection>
        </FormStep>
      ),
    },
    {
      id: 'contact',
      title: t('contactInfo'),
      component: (
        <FormStep>
          <FormSection title={t('addressDetails')}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('presentAddress')} *</label>
                <textarea
                  value={formData.presentAddress}
                  onChange={(e) => setFormData({ ...formData, presentAddress: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('permanentAddress')} *</label>
                <textarea
                  value={formData.permanentAddress}
                  onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </FormSection>
        </FormStep>
      ),
    },
  ];

  // Define table columns
  const columns = [
    {
      key: 'staffId',
      header: t('staffId'),
      render: (row: Staff) => (
        <Link 
          href={`/${locale}/admin/staff-management/${row.staffId}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {row.staffId}
        </Link>
      ),
    },
    { key: 'name', header: tCommon('name') || 'Name' },
    { key: 'designation', header: t('designation') },
    { key: 'department', header: t('department') },
    { key: 'contactNumber', header: t('contactNumber') },
    {
      key: 'joiningDate',
      header: t('joiningDate'),
      render: (row: Staff) => new Date(row.joiningDate).toLocaleDateString(),
    },
    {
      key: '_count.attendances',
      header: t('attendanceRecords'),
      render: (row: Staff) => row._count.attendances,
    },
    {
      key: '_count.leaveRequests',
      header: t('leaveRequests'),
      render: (row: Staff) => row._count.leaveRequests,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600 mt-2">Manage your institution&apos;s staff members and their information</p>
          </div>
          <Button
            onClick={() => setIsHiringModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('addStaff')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('totalStaff')}</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.totalCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('departments')}</p>
                <p className="text-2xl font-bold text-gray-900">{filters.departments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('designations')}</p>
                <p className="text-2xl font-bold text-gray-900">{filters.designations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0v-1a4 4 0 014-4h4a4 4 0 014 4v1a4 4 0 11-8 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t('activeToday')}</p>
                <p className="text-2xl font-bold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('searchStaff')}</label>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('department')}</label>
            <select
              value={selectedDepartment}
              onChange={(e) => handleDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('allDepartments')}</option>
              {filters.departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('designation')}</label>
            <select
              value={selectedDesignation}
              onChange={(e) => handleDesignationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('allDesignations')}</option>
              {filters.designations.map((designation) => (
                <option key={designation} value={designation}>{designation}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          data={staff}
          columns={columns}
          loading={loading}
          emptyMessage={t('noStaffFound')}
        />
      </div>

      {/* Hiring Modal */}
      <Dialog open={isHiringModalOpen} onOpenChange={setIsHiringModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('hireNewStaff')}</DialogTitle>
          </DialogHeader>
          <MultiStepForm
            steps={hiringFormSteps}
            onComplete={() => handleHireStaff(formData)}
            onCancel={() => setIsHiringModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
