'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/Tabs';
import { useToast } from '@/app/components/ui/Toast';
import Link from 'next/link';

interface Staff {
  id: string;
  staffId: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  dateOfBirth: string;
  gender: string;
  contactNumber: string;
  joiningDate: string;
  qualification: string;
  user: {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
  address: {
    presentAddress: string;
    permanentAddress: string;
  };
  attendances: Array<{
    id: string;
    date: string;
    status: string;
    remarks?: string;
  }>;
  leaveRequests: Array<{
    id: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
  _count: {
    attendances: number;
    leaveRequests: number;
  };
}

export default function StaffProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  const staffId = params.staffId as string;

  // Fetch staff details
  const fetchStaffDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/staff/${staffId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff);
      } else if (response.status === 404) {
        addToast({
          title: 'Error',
          description: 'Staff member not found',
          type: 'error',
        });
        router.push('/admin/staff-management');
      } else {
        throw new Error('Failed to fetch staff details');
      }
    } catch (error) {
      console.error('Error fetching staff details:', error);
      addToast({
        title: 'Error',
        description: 'Failed to fetch staff details',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      fetchStaffDetails();
    }
  }, [staffId]);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <span className="text-gray-600">Loading staff details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Staff Member Not Found</h2>
          <p className="text-gray-600 mb-6">The staff member you're looking for doesn't exist.</p>
          <Link href="/admin/staff-management">
            <Button>Back to Staff Management</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/staff-management">
              <Button variant="outline" className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{staff.name}</h1>
              <p className="text-gray-600">{staff.designation} • {staff.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">Edit Profile</Button>
            <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
              Remove Staff
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Staff ID</p>
                <p className="text-lg font-bold text-gray-900">{staff.staffId}</p>
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
                <p className="text-sm font-medium text-gray-600">Years of Service</p>
                <p className="text-lg font-bold text-gray-900">
                  {Math.floor((new Date().getTime() - new Date(staff.joiningDate).getTime()) / (1000 * 60 * 60 * 24 * 365))}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a4 4 0 11-8 0v-1a4 4 0 014-4h4a4 4 0 014 4v1a4 4 0 11-8 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-lg font-bold text-gray-900">
                  {staff._count.attendances > 0 
                    ? Math.round((staff.attendances.filter(a => a.status === 'PRESENT').length / staff._count.attendances) * 100)
                    : 0}%
                </p>
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
                <p className="text-sm font-medium text-gray-600">Leave Requests</p>
                <p className="text-lg font-bold text-gray-900">{staff._count.leaveRequests}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave History</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900 font-medium">{staff.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Staff ID</label>
                  <p className="text-gray-900 font-medium">{staff.staffId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{staff.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Contact Number</label>
                  <p className="text-gray-900">{staff.contactNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-gray-900">{new Date(staff.dateOfBirth).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Gender</label>
                  <p className="text-gray-900">{staff.gender}</p>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Designation</label>
                  <p className="text-gray-900 font-medium">{staff.designation}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Department</label>
                  <p className="text-gray-900">{staff.department}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Qualification</label>
                  <p className="text-gray-900">{staff.qualification}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Joining Date</label>
                  <p className="text-gray-900">{new Date(staff.joiningDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">User Role</label>
                  <p className="text-gray-900">{staff.user.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Account Created</label>
                  <p className="text-gray-900">{new Date(staff.user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Present Address</label>
                  <p className="text-gray-900">{staff.address.presentAddress}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Permanent Address</label>
                  <p className="text-gray-900">{staff.address.permanentAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <div className="space-y-6">
            {/* Attendance Summary */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{staff._count.attendances}</div>
                  <div className="text-sm text-blue-600">Total Records</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {staff.attendances.filter(a => a.status === 'PRESENT').length}
                  </div>
                  <div className="text-sm text-green-600">Present</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {staff.attendances.filter(a => a.status === 'ABSENT').length}
                  </div>
                  <div className="text-sm text-red-600">Absent</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {staff.attendances.filter(a => a.status === 'LATE').length}
                  </div>
                  <div className="text-sm text-yellow-600">Late</div>
                </div>
              </div>
            </div>

            {/* Recent Attendance */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h3>
              {staff.attendances.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {staff.attendances.slice(0, 10).map((attendance) => (
                        <tr key={attendance.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(attendance.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              attendance.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                              attendance.status === 'ABSENT' ? 'bg-red-100 text-red-800' :
                              attendance.status === 'LATE' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {attendance.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {attendance.remarks || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No attendance records found</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leave">
          <div className="space-y-6">
            {/* Leave Summary */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{staff._count.leaveRequests}</div>
                  <div className="text-sm text-blue-600">Total Requests</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {staff.leaveRequests.filter(l => l.status === 'APPROVED').length}
                  </div>
                  <div className="text-sm text-green-600">Approved</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {staff.leaveRequests.filter(l => l.status === 'PENDING').length}
                  </div>
                  <div className="text-sm text-yellow-600">Pending</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {staff.leaveRequests.filter(l => l.status === 'REJECTED').length}
                  </div>
                  <div className="text-sm text-red-600">Rejected</div>
                </div>
              </div>
            </div>

            {/* Leave Requests */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Leave Requests</h3>
              {staff.leaveRequests.length > 0 ? (
                <div className="space-y-4">
                  {staff.leaveRequests.map((leave) => (
                    <div key={leave.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900">{leave.leaveType}</h4>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              leave.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              leave.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {leave.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{leave.reason}</p>
                          <div className="text-xs text-gray-500">
                            <span>From: {new Date(leave.startDate).toLocaleDateString()}</span>
                            <span className="mx-2">•</span>
                            <span>To: {new Date(leave.endDate).toLocaleDateString()}</span>
                            <span className="mx-2">•</span>
                            <span>Applied: {new Date(leave.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No leave requests found</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
