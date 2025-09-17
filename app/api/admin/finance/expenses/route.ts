import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyAdminAuth, createUnauthorizedResponse, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';

const prisma = new PrismaClient();

// GET - Fetch expenses with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const expenseHead = searchParams.get('expenseHead') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const whereClause: any = {};

    // Search by expense head or description
    if (search) {
      whereClause.OR = [
        { expenseHead: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by expense head
    if (expenseHead) {
      whereClause.expenseHead = { contains: expenseHead, mode: 'insensitive' };
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.expenseDate = {};
      if (startDate) {
        whereClause.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.expenseDate.lte = new Date(endDate);
      }
    }

    // Fetch expenses with pagination
    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where: whereClause,
        orderBy: {
          expenseDate: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where: whereClause }),
    ]);

    // Get expense summary
    const expenseSummary = await prisma.expense.groupBy({
      by: ['expenseHead'],
      where: whereClause,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return createSuccessResponse({
      expenses,
      expenseSummary,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
      },
    });
  } catch (error) {
    console.error('[EXPENSES_GET_ERROR]', error);
    return createErrorResponse('Failed to fetch expenses');
  }
}

// POST - Create new expense
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { expenseHead, amount, expenseDate, description } = body;

    // Validate required fields
    if (!expenseHead || !amount) {
      return createErrorResponse('Expense head and amount are required', 400);
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return createErrorResponse('Amount must be positive', 400);
    }

    const expense = await prisma.expense.create({
      data: {
        expenseHead,
        amount: parseFloat(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        description: description || null,
      },
    });

    return createSuccessResponse({ expense }, 201);
  } catch (error) {
    console.error('[EXPENSES_POST_ERROR]', error);
    return createErrorResponse('Failed to create expense');
  }
}

// PUT - Update expense
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const { id, expenseHead, amount, expenseDate, description } = body;

    // Validate required fields
    if (!id || !expenseHead || !amount) {
      return createErrorResponse('Expense ID, expense head, and amount are required', 400);
    }

    // Validate amount is positive
    if (parseFloat(amount) <= 0) {
      return createErrorResponse('Amount must be positive', 400);
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return createErrorResponse('Expense not found', 404);
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        expenseHead,
        amount: parseFloat(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : existingExpense.expenseDate,
        description: description || null,
      },
    });

    return createSuccessResponse({ expense });
  } catch (error) {
    console.error('[EXPENSES_PUT_ERROR]', error);
    return createErrorResponse('Failed to update expense');
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdminAuth(request);
    if (!user) {
      return createUnauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return createErrorResponse('Expense ID is required', 400);
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existingExpense) {
      return createErrorResponse('Expense not found', 404);
    }

    await prisma.expense.delete({
      where: { id },
    });

    return createSuccessResponse({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('[EXPENSES_DELETE_ERROR]', error);
    return createErrorResponse('Failed to delete expense');
  }
}
