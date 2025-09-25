import { NextRequest } from 'next/server';
import { verifyAccountantAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handlePrismaError,
  logApiError 
} from '@/app/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAccountantAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized access', 401, 'AUTH_REQUIRED');
    }

    // Get current date for calculations
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const startOfYear = new Date(currentYear, 0, 1);
    const startOfMonth = new Date(currentYear, currentMonth, 1);

    // Fetch financial statistics in parallel for better performance
    const [
      totalRevenue,
      monthlyRevenue,
      totalExpenses,
      monthlyExpenses,
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      recentPayments,
      recentExpenses,
      monthlyRevenueData,
      feeHeads,
      expensesByCategory
    ] = await Promise.all([
      // Total revenue (sum of all payments)
      prisma.payment.aggregate({
        _sum: {
          amountPaid: true
        },
        where: {
          paymentDate: {
            gte: startOfYear
          }
        }
      }),

      // Monthly revenue (current month)
      prisma.payment.aggregate({
        _sum: {
          amountPaid: true
        },
        where: {
          paymentDate: {
            gte: startOfMonth
          }
        }
      }),

      // Total expenses (current year)
      prisma.expense.aggregate({
        _sum: {
          amount: true
        },
        where: {
          expenseDate: {
            gte: startOfYear
          }
        }
      }),

      // Monthly expenses (current month)
      prisma.expense.aggregate({
        _sum: {
          amount: true
        },
        where: {
          expenseDate: {
            gte: startOfMonth
          }
        }
      }),

      // Total invoices
      prisma.invoice.count(),

      // Paid invoices
      prisma.invoice.count({
        where: {
          status: 'PAID'
        }
      }),

      // Pending invoices
      prisma.invoice.count({
        where: {
          status: 'PENDING'
        }
      }),

      // Overdue invoices
      prisma.invoice.count({
        where: {
          status: 'OVERDUE'
        }
      }),

      // Recent payments (last 10)
      prisma.payment.findMany({
        take: 10,
        orderBy: {
          paymentDate: 'desc'
        },
        select: {
          id: true,
          amountPaid: true,
          paymentMethod: true,
          paymentDate: true,
          transactionId: true,
          invoice: {
            select: {
              invoiceNumber: true,
              student: {
                select: {
                  name: true,
                  studentId: true
                }
              }
            }
          }
        }
      }),

      // Recent expenses (last 10)
      prisma.expense.findMany({
        take: 10,
        orderBy: {
          expenseDate: 'desc'
        },
        select: {
          id: true,
          expenseHead: true,
          amount: true,
          expenseDate: true,
          description: true
        }
      }),

      // Monthly revenue data for the last 12 months using Prisma groupBy
      prisma.payment.groupBy({
        by: ['paymentDate'],
        _sum: {
          amountPaid: true
        },
        where: {
          paymentDate: {
            gte: new Date(currentYear - 1, currentMonth, 1)
          }
        },
        orderBy: {
          paymentDate: 'asc'
        }
      }).catch(() => []), // Graceful fallback

      // Fee heads with total collections
      prisma.feeHead.findMany({
        select: {
          id: true,
          name: true,
          invoiceItems: {
            select: {
              amount: true,
              invoice: {
                select: {
                  status: true
                }
              }
            }
          }
        }
      }),

      // Expenses by category
      prisma.expense.groupBy({
        by: ['expenseHead'],
        _sum: {
          amount: true
        },
        where: {
          expenseDate: {
            gte: startOfYear
          }
        },
        orderBy: {
          _sum: {
            amount: 'desc'
          }
        }
      })
    ]);

    // Format recent transactions combining payments and expenses
    interface TransactionItem {
      id: string;
      type: 'payment' | 'expense';
      amount: number;
      description: string;
      date: string;
      status?: string;
      category?: string;
      metadata: Record<string, any>;
    }

    const recentTransactions: TransactionItem[] = [];

    // Add recent payments
    recentPayments.forEach(payment => {
      recentTransactions.push({
        id: `payment-${payment.id}`,
        type: 'payment',
        amount: Number(payment.amountPaid),
        description: `Payment from ${payment.invoice.student.name} (${payment.invoice.student.studentId}) - Invoice ${payment.invoice.invoiceNumber}`,
        date: payment.paymentDate.toISOString().split('T')[0],
        status: 'PAID',
        metadata: {
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          studentName: payment.invoice.student.name,
          invoiceNumber: payment.invoice.invoiceNumber
        }
      });
    });

    // Add recent expenses
    recentExpenses.forEach(expense => {
      recentTransactions.push({
        id: `expense-${expense.id}`,
        type: 'expense',
        amount: Number(expense.amount),
        description: expense.description || `${expense.expenseHead} expense`,
        date: expense.expenseDate.toISOString().split('T')[0],
        category: expense.expenseHead,
        metadata: {
          expenseHead: expense.expenseHead,
          description: expense.description
        }
      });
    });

    // Sort transactions by date and take most recent 15
    const sortedTransactions = recentTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);

    // Process monthly revenue data for chart
    const monthlyRevenueChart = Array.from({ length: 12 }, (_, i) => {
      const targetDate = new Date(currentYear, currentMonth - 11 + i, 1);
      const nextMonth = new Date(currentYear, currentMonth - 11 + i + 1, 1);
      
      // Find payments in this month
      const monthTotal = (monthlyRevenueData as any[])
        .filter((item: any) => {
          const itemDate = new Date(item.paymentDate);
          return itemDate >= targetDate && itemDate < nextMonth;
        })
        .reduce((sum: number, item: any) => sum + Number(item._sum.amountPaid || 0), 0);
      
      return monthTotal;
    });

    // Calculate financial metrics
    const totalRevenueAmount = Number(totalRevenue._sum.amountPaid || 0);
    const totalExpensesAmount = Number(totalExpenses._sum.amount || 0);
    const monthlyRevenueAmount = Number(monthlyRevenue._sum.amountPaid || 0);
    const monthlyExpensesAmount = Number(monthlyExpenses._sum.amount || 0);
    const netProfit = totalRevenueAmount - totalExpensesAmount;
    const monthlyNetProfit = monthlyRevenueAmount - monthlyExpensesAmount;
    const profitMargin = totalRevenueAmount > 0 ? (netProfit / totalRevenueAmount) * 100 : 0;

    // Process fee heads data
    const feeHeadsData = feeHeads.map(feeHead => {
      const totalCollected = feeHead.invoiceItems.reduce((sum, item) => {
        if (item.invoice.status === 'PAID') {
          return sum + Number(item.amount);
        }
        return sum;
      }, 0);

      const totalPending = feeHead.invoiceItems.reduce((sum, item) => {
        if (item.invoice.status === 'PENDING' || item.invoice.status === 'OVERDUE') {
          return sum + Number(item.amount);
        }
        return sum;
      }, 0);

      return {
        id: feeHead.id,
        name: feeHead.name,
        totalCollected,
        totalPending,
        totalAmount: totalCollected + totalPending
      };
    });

    // Process expenses by category
    const expenseCategories = expensesByCategory.map(category => ({
      category: category.expenseHead,
      amount: Number(category._sum.amount || 0)
    }));

    // Calculate outstanding amounts
    const outstandingInvoices = await prisma.invoice.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        status: {
          in: ['PENDING', 'OVERDUE']
        }
      }
    });

    // Prepare comprehensive financial statistics
    const financialStats = {
      // Core Financial Metrics
      totalRevenue: totalRevenueAmount,
      totalExpenses: totalExpensesAmount,
      netProfit,
      monthlyRevenue: monthlyRevenueAmount,
      monthlyExpenses: monthlyExpensesAmount,
      monthlyNetProfit,
      
      // Outstanding Amounts
      pendingPayments: Number(outstandingInvoices._sum.totalAmount || 0),
      
      // Invoice Statistics
      invoiceStats: {
        total: totalInvoices,
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices
      },

      // Payment Status Distribution
      paymentStatuses: {
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices
      },

      // Performance Metrics
      metrics: {
        profitMargin: Math.round(profitMargin * 100) / 100,
        collectionRate: totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100 * 100) / 100 : 0,
        expenseRatio: totalRevenueAmount > 0 ? Math.round((totalExpensesAmount / totalRevenueAmount) * 100 * 100) / 100 : 0,
        monthlyGrowth: 0 // This would require historical comparison
      },

      // Chart Data
      monthlyRevenueChart: monthlyRevenueChart,
      
      // Fee Heads Analysis
      feeHeads: feeHeadsData,
      
      // Expense Categories
      expenseCategories,
      
      // Recent Transactions
      recentTransactions: sortedTransactions,
      
      // Financial Health Indicators
      healthIndicators: {
        cashFlow: monthlyNetProfit > 0 ? 'Positive' : 'Negative',
        collectionEfficiency: paidInvoices > pendingInvoices ? 'Good' : 'Needs Improvement',
        expenseControl: profitMargin > 20 ? 'Excellent' : profitMargin > 10 ? 'Good' : 'Needs Attention'
      },
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      dataFreshness: 'real-time',
      reportingPeriod: {
        year: currentYear,
        month: currentMonth + 1
      }
    };

    return createSuccessResponse(financialStats, 200, 'Financial statistics retrieved successfully');

  } catch (error) {
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      return handlePrismaError(error);
    }

    // Log the error for monitoring
    logApiError(error as Error, {
      path: '/api/accountant/dashboard/stats',
      userId: 'accountant-user',
      userRole: 'ACCOUNTANT'
    });

    return createErrorResponse(
      'Failed to fetch financial statistics',
      500,
      'FINANCIAL_STATS_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}
