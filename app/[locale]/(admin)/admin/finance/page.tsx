'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/Tabs';
import { BarChart3, Wallet, Users, Receipt } from 'lucide-react';
import DashboardTab from './components/DashboardTab';
import FeeManagementTab from './components/FeeManagementTab';
import StudentFeesTab from './components/StudentFeesTab';
import ExpensesTab from './components/ExpensesTab';

export default function FinancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-white/20 mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Finance & Accounting</h1>
              <p className="text-gray-600 mt-1">Manage fees, payments, and institutional expenses</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg">
                <div className="text-sm font-medium">Total Revenue</div>
                <div className="text-lg font-bold">৳ 0</div>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg">
                <div className="text-sm font-medium">Pending Dues</div>
                <div className="text-lg font-bold">৳ 0</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20">
          <Tabs defaultValue="dashboard" className="w-full">
            {/* Tabs */}
            <div className="border-b border-gray-200 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="fee-management" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Fee Management
                </TabsTrigger>
                <TabsTrigger value="student-fees" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Student Fees
                </TabsTrigger>
                <TabsTrigger value="expenses" className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Expenses
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              <TabsContent value="dashboard">
                <DashboardTab />
              </TabsContent>
              
              <TabsContent value="fee-management">
                <FeeManagementTab />
              </TabsContent>
              
              <TabsContent value="student-fees">
                <StudentFeesTab />
              </TabsContent>
              
              <TabsContent value="expenses">
                <ExpensesTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
