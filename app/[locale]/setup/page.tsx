'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MultiStepForm, FormStep, FormSection } from '@/app/components/ui/MultiStepForm';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Textarea } from '@/app/components/ui/Textarea';
import { Select } from '@/app/components/ui/Select';
import { Checkbox } from '@/app/components/ui/Checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Alert, AlertDescription } from '@/app/components/ui/Alert';
import { Badge } from '@/app/components/ui/Badge';
import { Loader2, School, User, Calendar, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/app/contexts/ToastContext';

interface SetupData {
  adminUser: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
  };
  academicYear: {
    name: string;
    startDate: string;
    endDate: string;
  };
  settings: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };
  termsAccepted: boolean;
}

const TIMEZONES = [
  { value: 'Asia/Dhaka', label: 'Asia/Dhaka (GMT+6)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (GMT+5)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GMT+4)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
  { value: 'America/New_York', label: 'America/New_York (GMT-5)' },
];

const CURRENCIES = [
  { value: 'BDT', label: 'Bangladeshi Taka (৳)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'SAR', label: 'Saudi Riyal (﷼)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
  { value: 'ar', label: 'العربية (Arabic)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (31-12-2024)' },
];

export default function SetupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [setupData, setSetupData] = useState<SetupData>({
    adminUser: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    schoolInfo: {
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      logo: '',
    },
    academicYear: {
      name: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      startDate: '',
      endDate: '',
    },
    settings: {
      timezone: 'Asia/Dhaka',
      currency: 'BDT',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
    },
    termsAccepted: false,
  });

  // Check if system is already initialized
  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const response = await fetch('/api/auth/setup');
        const data = await response.json();
        
        if (data.isInitialized) {
          setIsInitialized(true);
          showToast({ 
            type: 'info', 
            title: 'System Already Initialized', 
            message: 'Redirecting to login...' 
          });
          setTimeout(() => router.push('/login'), 2000);
        }
      } catch (error) {
        console.error('Failed to check initialization:', error);
        showToast({ 
          type: 'error', 
          title: 'Error', 
          message: 'Failed to check system status' 
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkInitialization();
  }, [router, showToast]);

  const updateSetupData = (section: keyof SetupData | string, field: string, value: any) => {
    if (section === 'termsAccepted') {
      setSetupData(prev => ({
        ...prev,
        termsAccepted: value,
      }));
    } else {
      setSetupData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof SetupData] as any),
          [field]: value,
        },
      }));
    }
    
    // Clear error when user starts typing
    const errorKey = section === 'termsAccepted' ? 'termsAccepted' : `${section}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Admin User
        if (!setupData.adminUser.name.trim()) {
          newErrors['adminUser.name'] = 'Name is required';
        }
        if (!setupData.adminUser.email.trim()) {
          newErrors['adminUser.email'] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupData.adminUser.email)) {
          newErrors['adminUser.email'] = 'Invalid email format';
        }
        if (!setupData.adminUser.password) {
          newErrors['adminUser.password'] = 'Password is required';
        } else if (setupData.adminUser.password.length < 8) {
          newErrors['adminUser.password'] = 'Password must be at least 8 characters';
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(setupData.adminUser.password)) {
          newErrors['adminUser.password'] = 'Password must contain uppercase, lowercase, number, and special character';
        }
        if (setupData.adminUser.password !== setupData.adminUser.confirmPassword) {
          newErrors['adminUser.confirmPassword'] = 'Passwords do not match';
        }
        break;

      case 1: // School Info
        if (!setupData.schoolInfo.name.trim()) {
          newErrors['schoolInfo.name'] = 'School name is required';
        }
        if (!setupData.schoolInfo.address.trim()) {
          newErrors['schoolInfo.address'] = 'Address is required';
        }
        if (!setupData.schoolInfo.phone.trim()) {
          newErrors['schoolInfo.phone'] = 'Phone number is required';
        }
        if (!setupData.schoolInfo.email.trim()) {
          newErrors['schoolInfo.email'] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupData.schoolInfo.email)) {
          newErrors['schoolInfo.email'] = 'Invalid email format';
        }
        break;

      case 2: // Academic Year
        if (!setupData.academicYear.name.trim()) {
          newErrors['academicYear.name'] = 'Academic year name is required';
        }
        if (!setupData.academicYear.startDate) {
          newErrors['academicYear.startDate'] = 'Start date is required';
        }
        if (!setupData.academicYear.endDate) {
          newErrors['academicYear.endDate'] = 'End date is required';
        }
        if (setupData.academicYear.startDate && setupData.academicYear.endDate) {
          if (new Date(setupData.academicYear.startDate) >= new Date(setupData.academicYear.endDate)) {
            newErrors['academicYear.endDate'] = 'End date must be after start date';
          }
        }
        break;

      case 4: // Terms
        if (!setupData.termsAccepted) {
          newErrors['termsAccepted'] = 'You must accept the terms and conditions';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupData),
      });

      const data = await response.json();

      if (data.success) {
        showToast({ 
          type: 'success', 
          title: 'Setup Complete', 
          message: 'System setup completed successfully!' 
        });
        router.push(data.data.redirectUrl || '/admin');
      } else {
        showToast({ 
          type: 'error', 
          title: 'Setup Failed', 
          message: data.error || 'Setup failed' 
        });
      }
    } catch (error) {
      console.error('Setup error:', error);
      showToast({ 
        type: 'error', 
        title: 'Setup Error', 
        message: 'Setup failed. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Checking system status...</p>
        </div>
      </div>
    );
  }

  if (isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle>System Already Initialized</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              The EduPro Suite system has already been set up. You will be redirected to the login page.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps = [
    {
      id: 'admin-user',
      title: 'Administrator Account',
      description: 'Create the first admin user account',
      component: (
        <FormStep title="Administrator Information">
          <FormSection title="Personal Details" description="Enter the administrator's personal information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <Input
                  value={setupData.adminUser.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('adminUser', 'name', e.target.value)}
                  placeholder="Enter full name"
                  error={errors['adminUser.name']}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={setupData.adminUser.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('adminUser', 'email', e.target.value)}
                  placeholder="admin@school.edu"
                  error={errors['adminUser.email']}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Security" description="Set up a secure password for the admin account">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <Input
                  type="password"
                  value={setupData.adminUser.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('adminUser', 'password', e.target.value)}
                  placeholder="Enter secure password"
                  error={errors['adminUser.password']}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must contain uppercase, lowercase, number, and special character
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <Input
                  type="password"
                  value={setupData.adminUser.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('adminUser', 'confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  error={errors['adminUser.confirmPassword']}
                />
              </div>
            </div>
          </FormSection>
        </FormStep>
      ),
      isValid: validateStep(0),
    },
    {
      id: 'school-info',
      title: 'School Information',
      description: 'Enter your educational institution details',
      component: (
        <FormStep title="Institution Details">
          <FormSection title="Basic Information" description="Enter your school's basic information">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name *
                </label>
                <Input
                  value={setupData.schoolInfo.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('schoolInfo', 'name', e.target.value)}
                  placeholder="Enter school name"
                  error={errors['schoolInfo.name']}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <Textarea
                  value={setupData.schoolInfo.address}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateSetupData('schoolInfo', 'address', e.target.value)}
                  placeholder="Enter complete address"
                  rows={3}
                  error={errors['schoolInfo.address']}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <Input
                    value={setupData.schoolInfo.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('schoolInfo', 'phone', e.target.value)}
                    placeholder="+880 1234 567890"
                    error={errors['schoolInfo.phone']}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={setupData.schoolInfo.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('schoolInfo', 'email', e.target.value)}
                    placeholder="info@school.edu"
                    error={errors['schoolInfo.email']}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website (Optional)
                </label>
                <Input
                  value={setupData.schoolInfo.website}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('schoolInfo', 'website', e.target.value)}
                  placeholder="https://www.school.edu"
                />
              </div>
            </div>
          </FormSection>
        </FormStep>
      ),
      isValid: validateStep(1),
    },
    {
      id: 'academic-year',
      title: 'Academic Year',
      description: 'Set up the current academic year',
      component: (
        <FormStep title="Academic Year Configuration">
          <FormSection title="Academic Year Details" description="Define the current academic year period">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Academic Year Name *
                </label>
                <Input
                  value={setupData.academicYear.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('academicYear', 'name', e.target.value)}
                  placeholder="2024-2025"
                  error={errors['academicYear.name']}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <Input
                    type="date"
                    value={setupData.academicYear.startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('academicYear', 'startDate', e.target.value)}
                    error={errors['academicYear.startDate']}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <Input
                    type="date"
                    value={setupData.academicYear.endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetupData('academicYear', 'endDate', e.target.value)}
                    error={errors['academicYear.endDate']}
                  />
                </div>
              </div>
            </div>
          </FormSection>
        </FormStep>
      ),
      isValid: validateStep(2),
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure basic system preferences',
      component: (
        <FormStep title="System Configuration">
          <FormSection title="Regional Settings" description="Configure timezone, currency, and language preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <Select
                  value={setupData.settings.timezone}
                  onValueChange={(value: string) => updateSetupData('settings', 'timezone', value)}
                  options={TIMEZONES}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <Select
                  value={setupData.settings.currency}
                  onValueChange={(value: string) => updateSetupData('settings', 'currency', value)}
                  options={CURRENCIES}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Language
                </label>
                <Select
                  value={setupData.settings.language}
                  onValueChange={(value: string) => updateSetupData('settings', 'language', value)}
                  options={LANGUAGES}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Format
                </label>
                <Select
                  value={setupData.settings.dateFormat}
                  onValueChange={(value: string) => updateSetupData('settings', 'dateFormat', value)}
                  options={DATE_FORMATS}
                />
              </div>
            </div>
          </FormSection>
        </FormStep>
      ),
      isValid: true,
    },
    {
      id: 'review',
      title: 'Review & Complete',
      description: 'Review your settings and complete the setup',
      component: (
        <FormStep title="Setup Review">
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please review all information carefully. Once setup is complete, some settings may require administrator privileges to change.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <User className="w-4 h-4 mr-2" />
                    Administrator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {setupData.adminUser.name}</div>
                  <div><strong>Email:</strong> {setupData.adminUser.email}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <School className="w-4 h-4 mr-2" />
                    School Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Name:</strong> {setupData.schoolInfo.name}</div>
                  <div><strong>Email:</strong> {setupData.schoolInfo.email}</div>
                  <div><strong>Phone:</strong> {setupData.schoolInfo.phone}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Academic Year
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Year:</strong> {setupData.academicYear.name}</div>
                  <div><strong>Start:</strong> {setupData.academicYear.startDate}</div>
                  <div><strong>End:</strong> {setupData.academicYear.endDate}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sm">
                    <Settings className="w-4 h-4 mr-2" />
                    System Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Timezone:</strong> {setupData.settings.timezone}</div>
                  <div><strong>Currency:</strong> {setupData.settings.currency}</div>
                  <div><strong>Language:</strong> {setupData.settings.language}</div>
                  <div><strong>Date Format:</strong> {setupData.settings.dateFormat}</div>
                </CardContent>
              </Card>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={setupData.termsAccepted}
                  onCheckedChange={(checked: boolean) => updateSetupData('termsAccepted', '', checked)}
                />
                <div className="flex-1">
                  <label htmlFor="terms" className="text-sm font-medium text-gray-700 cursor-pointer">
                    I accept the terms and conditions *
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    By checking this box, you agree to the EduPro Suite terms of service and privacy policy.
                  </p>
                  {errors['termsAccepted'] && (
                    <p className="text-xs text-red-600 mt-1">{errors['termsAccepted']}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </FormStep>
      ),
      isValid: validateStep(4),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <School className="w-12 h-12 text-indigo-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">EduPro Suite</h1>
          </div>
          <h2 className="text-xl text-gray-600 mb-2">System Setup Wizard</h2>
          <p className="text-gray-500">
            Welcome! Let's set up your educational management system in just a few steps.
          </p>
        </div>

        {/* Multi-step Form */}
        <MultiStepForm
          steps={steps}
          onComplete={handleComplete}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          className="bg-white rounded-lg shadow-lg p-8"
        />
      </div>
    </div>
  );
}
