'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/Tabs';
import { useToast } from '@/app/components/ui/Toast';
import { formatDate } from '@/app/lib/utils';
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  GraduationCap, 
  CreditCard, 
  FileText,
  Users,
  BookOpen
} from 'lucide-react';

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
    createdAt: string;
    academicYear: {
      id: string;
      year: string;
      isCurrent: boolean;
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

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch student data
  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/students/${studentId}`);
      const data = await response.json();

      if (data.success) {
        setStudent(data.student);
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          description: data.error || 'Failed to fetch student details',
        });
        router.push('/admin/student-management');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to fetch student details',
      });
      router.push('/admin/student-management');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <span className="text-gray-600">Loading student details...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-gray-600 mb-4">The requested student could not be found.</p>
          <Button onClick={() => router.push('/admin/student-management')}>
            Back to Student Management
          </Button>
        </div>
      </div>
    );
  }

  const currentEnrollment = student.enrollments.find(e => e.academicYear.isCurrent) || student.enrollments[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/student-management')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-gray-600 mt-1">
              Student ID: {student.studentId}
            </p>
          </div>
        </div>
        <Button className="flex items-center">
          <Edit className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Student Overview Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start space-x-6">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
              {student.studentPhotoUrl ? (
                <img
                  src={student.studentPhotoUrl}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-gray-400" />
              )}
            </div>
          </div>

          {/* Basic Info */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Personal Information</h3>
              <div className="space-y-1">
                <p className="text-sm"><strong>Gender:</strong> {student.gender}</p>
                <p className="text-sm"><strong>Date of Birth:</strong> {formatDate(student.dateOfBirth)}</p>
                {student.bloodGroup && (
                  <p className="text-sm"><strong>Blood Group:</strong> {student.bloodGroup}</p>
                )}
                {student.religion && (
                  <p className="text-sm"><strong>Religion:</strong> {student.religion}</p>
                )}
                {student.nationality && (
                  <p className="text-sm"><strong>Nationality:</strong> {student.nationality}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Current Academic Status</h3>
              <div className="space-y-1">
                {currentEnrollment ? (
                  <>
                    <p className="text-sm"><strong>Class:</strong> {currentEnrollment.classLevel.name}</p>
                    <p className="text-sm"><strong>Section:</strong> {currentEnrollment.section.name}</p>
                    <p className="text-sm"><strong>Roll Number:</strong> {currentEnrollment.rollNumber}</p>
                    <p className="text-sm"><strong>Academic Year:</strong> {currentEnrollment.academicYear.year}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Not currently enrolled</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
              <div className="space-y-1">
                {student.email && (
                  <p className="text-sm flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {student.email}
                  </p>
                )}
                <p className="text-sm flex items-center">
                  <Phone className="h-3 w-3 mr-1" />
                  {student.guardian.contactNumber}
                </p>
                <p className="text-sm"><strong>Admission Date:</strong> {formatDate(student.admissionDate)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center space-x-2">
            <GraduationCap className="h-4 w-4" />
            <span>Academic History</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Fees</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Results</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Guardian Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-900">Guardian Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm text-gray-900">{student.guardian.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Relation to Student</label>
                  <p className="text-sm text-gray-900">{student.guardian.relationToStudent}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Contact Number</label>
                  <p className="text-sm text-gray-900 flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {student.guardian.contactNumber}
                  </p>
                </div>
                {student.guardian.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      {student.guardian.email}
                    </p>
                  </div>
                )}
                {student.guardian.occupation && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Occupation</label>
                    <p className="text-sm text-gray-900">{student.guardian.occupation}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MapPin className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Present Address</label>
                  <p className="text-sm text-gray-900">{student.address.presentAddress}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Permanent Address</label>
                  <p className="text-sm text-gray-900">{student.address.permanentAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Academic History Tab */}
        <TabsContent value="academic">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-semibold text-gray-900">Enrollment History</h3>
              </div>
            </div>
            <div className="p-6">
              {student.enrollments.length > 0 ? (
                <div className="space-y-4">
                  {student.enrollments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className={`p-4 rounded-lg border ${
                          enrollment.academicYear.isCurrent
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {enrollment.classLevel.name} - {enrollment.section.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Academic Year: {enrollment.academicYear.year}
                            </p>
                            <p className="text-sm text-gray-600">
                              Roll Number: {enrollment.rollNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            {enrollment.academicYear.isCurrent && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Current
                              </span>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Enrolled: {formatDate(enrollment.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No enrollment history found</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center py-12">
              <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fees Management</h3>
              <p className="text-gray-600 mb-4">
                The fees management module will be available soon. This section will include:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
                <li>• Fee structure and payment history</li>
                <li>• Outstanding dues and payment reminders</li>
                <li>• Receipt generation and management</li>
                <li>• Scholarship and discount tracking</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Examination Results</h3>
              <p className="text-gray-600 mb-4">
                The examination and results module will be available soon. This section will include:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
                <li>• Exam schedules and results</li>
                <li>• Grade reports and transcripts</li>
                <li>• Progress tracking and analytics</li>
                <li>• Parent-teacher communication</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
