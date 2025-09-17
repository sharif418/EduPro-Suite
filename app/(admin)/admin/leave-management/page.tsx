'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/app/components/ui/DataTable';
import { Button } from '@/app/components/ui/Button';
import { useToast } from '@/app/components/ui/Toast';

interface LeaveRequest {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  createdAt: string;
  staff: {
    id: string;
    staffId: string;
    name: string;
    designation: string;
    department: string;
  };
}

interface LeaveRequestsResponse {
  leaveRequests: LeaveRequest[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
  };
  filters: {
    leaveTypes: string[];
  };
}

export default function LeaveManagementPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    leaveTypes: [] as string[],
  });
  const [selectedStatus, setSelectedStatus] = useState('PENDING');
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const { addToast } = useToast();

  // Fetch leave requests
  const fetchLeaveRequests = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(selectedStatus && { status: selectedStatus }),
        ...(selectedLeaveType && { leaveType: selectedLeaveType }),
      });

      const response = await fetch(`/api/admin/staff/leave-requests?${params}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: LeaveRequestsResponse = await response.json();
        setLeaveRequests(data.leaveRequests);
        setPagination(data.pagination);
        setFilters(data.filters);
      } else {
        throw new Error('Failed to fetch leave requests');
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      addToast({
        title: 'Error',
        description: 'Failed to fetch leave requests',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [selectedStatus, selectedLeaveType]);

  // Handle leave request approval/rejection
  const handleLeaveAction = async (leaveRequestId: string, action: 'APPROVED' | 'REJECTED', remarks?: string) => {
    try {
      setProcessingRequests(prev => new Set(prev).add(leaveRequestId));

      const response = await fetch('/api/admin/staff/leave-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          leaveRequestId,
          status: action,
          remarks,
        }),
      });

      if (response.ok) {
        addToast({
          title: 'Success',
          description: `Leave request ${action.toLowerCase()} successfully!`,
          type: 'success',
        });
        fetchLeaveRequests(); // Refresh the list
      } else {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${action.toLowerCase()} leave request`);
      }
    } catch (error: any) {
      console.error(`Error ${action.toLowerCase()} leave request:`, error);
      addToast({
        title: 'Error',
        description: error.message || `Failed to ${action.toLowerCase()} leave request`,
        type: 'error',
      });
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(leaveRequestId);
        return newSet;
      });
    }
  };

  // Calculate leave duration
  const calculateLeaveDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Define table columns
  const columns = [
    {
      key: 'staff.name',
      header: 'Staff Member',
      render: (row: LeaveRequest) => (
        <div>
          <p className="font-medium text-gray-900">{row.staff.name}</p>
          <p className="text-sm text-gray-500">{row.staff.staffId} • {row.staff.designation}</p>
        </div>
      ),
    },
    {
      key: 'leaveType',
      header: 'Leave Type',
      render: (row: LeaveRequest) => (
        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          {row.leaveType}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (row: LeaveRequest) => (
        <div>
          <p className="text-sm font-medium text-gray-900">
            {calculateLeaveDuration(row.startDate, row.endDate)} day(s)
          </p>
          <p className="text-xs text-gray-500">
            {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: LeaveRequest) => (
        <p className="text-sm text-gray-900 max-w-xs truncate" title={row.reason}>
          {row.reason}
        </p>
      ),
    },
    {
      key: 'createdAt',
      header: 'Applied On',
      render: (row: LeaveRequest) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: LeaveRequest) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          row.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
          row.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: LeaveRequest) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDING' && (
            <>
              <Button
                size="sm"
                onClick={() => handleLeaveAction(row.id, 'APPROVED')}
                disabled={processingRequests.has(row.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
              >
                {processingRequests.has(row.id) ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleLeaveAction(row.id, 'REJECTED')}
                disabled={processingRequests.has(row.id)}
                className="border-red-300 text-red-600 hover:bg-red-50 px-3 py-1 text-xs"
              >
                {processingRequests.has(row.id) ? 'Processing...' : 'Reject'}
              </Button>
            </>
          )}
          {row.status !== 'PENDING' && (
            <span className="text-xs text-gray-500">No actions available</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-2">Review and manage staff leave requests</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leaveRequests.filter(l => l.status === 'PENDING').length}
                </p>
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
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leaveRequests.filter(l => l.status === 'APPROVED').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {leaveRequests.filter(l => l.status === 'REJECTED').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{pagination.totalCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Leave Type</label>
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Leave Types</option>
              {filters.leaveTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          data={leaveRequests}
          columns={columns}
          loading={loading}
          emptyMessage="No leave requests found."
        />
      </div>

      {/* Quick Actions for Pending Requests */}
      {selectedStatus === 'PENDING' && leaveRequests.filter(l => l.status === 'PENDING').length > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-yellow-800">Pending Requests</h3>
              <p className="text-sm text-yellow-700">
                You have {leaveRequests.filter(l => l.status === 'PENDING').length} pending leave requests that need your attention.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  const pendingRequests = leaveRequests.filter(l => l.status === 'PENDING');
                  pendingRequests.forEach(request => {
                    handleLeaveAction(request.id, 'APPROVED');
                  });
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={processingRequests.size > 0}
              >
                Approve All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
