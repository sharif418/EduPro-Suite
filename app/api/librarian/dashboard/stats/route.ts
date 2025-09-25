import { NextRequest } from 'next/server';
import { verifyLibrarianAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  handlePrismaError,
  logApiError 
} from '@/app/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyLibrarianAuth(request);
    if (!authResult) {
      return createErrorResponse('Unauthorized access', 401, 'AUTH_REQUIRED');
    }

    // Fetch library statistics in parallel for better performance
    const [
      totalBooks,
      totalCopies,
      availableCopies,
      issuedBooks,
      overdueBooks,
      totalFines,
      pendingFines,
      recentIssues,
      recentReturns,
      popularBooks,
      bookCategories
    ] = await Promise.all([
      // Total unique books in library
      prisma.book.count(),

      // Total copies of all books
      prisma.book.aggregate({
        _sum: {
          totalCopies: true
        }
      }),

      // Available copies
      prisma.book.aggregate({
        _sum: {
          availableCopies: true
        }
      }),

      // Currently issued books
      prisma.bookIssue.count({
        where: {
          status: 'ISSUED'
        }
      }),

      // Overdue books (due date passed and not returned)
      prisma.bookIssue.count({
        where: {
          status: 'OVERDUE'
        }
      }),

      // Total fines amount
      prisma.libraryFine.aggregate({
        _sum: {
          amount: true
        }
      }),

      // Pending fines (unpaid)
      prisma.libraryFine.aggregate({
        _sum: {
          amount: true
        },
        where: {
          status: 'PENDING'
        }
      }),

      // Recent book issues (last 5)
      prisma.bookIssue.findMany({
        take: 5,
        orderBy: {
          issueDate: 'desc'
        },
        select: {
          id: true,
          issueDate: true,
          dueDate: true,
          book: {
            select: {
              title: true,
              author: true
            }
          },
          student: {
            select: {
              name: true,
              studentId: true
            }
          }
        }
      }),

      // Recent book returns (last 5)
      prisma.bookReturn.findMany({
        take: 5,
        orderBy: {
          returnDate: 'desc'
        },
        select: {
          id: true,
          returnDate: true,
          condition: true,
          book: {
            select: {
              title: true,
              author: true
            }
          },
          bookIssue: {
            select: {
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

      // Most popular books (most issued)
      prisma.book.findMany({
        take: 5,
        select: {
          id: true,
          title: true,
          author: true,
          issues: {
            select: {
              id: true
            }
          }
        },
        orderBy: {
          issues: {
            _count: 'desc'
          }
        }
      }),

      // Book categories with counts
      prisma.bookCategory.findMany({
        select: {
          id: true,
          name: true,
          books: {
            select: {
              id: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      })
    ]);

    // Format recent activities
    interface ActivityItem {
      id: string;
      type: string;
      message: string;
      date: string;
      timeAgo: string;
      metadata: Record<string, any>;
    }

    const recentActivities: ActivityItem[] = [];

    // Add recent issues
    recentIssues.forEach(issue => {
      const timeAgo = getTimeAgo(issue.issueDate);
      recentActivities.push({
        id: `issue-${issue.id}`,
        type: 'issue',
        message: `"${issue.book.title}" by ${issue.book.author} issued to ${issue.student.name} (${issue.student.studentId})`,
        date: issue.issueDate.toISOString().split('T')[0],
        timeAgo,
        metadata: {
          bookTitle: issue.book.title,
          studentName: issue.student.name,
          dueDate: issue.dueDate
        }
      });
    });

    // Add recent returns
    recentReturns.forEach(returnRecord => {
      const timeAgo = getTimeAgo(returnRecord.returnDate);
      recentActivities.push({
        id: `return-${returnRecord.id}`,
        type: 'return',
        message: `"${returnRecord.book.title}" returned by ${returnRecord.bookIssue.student.name} (${returnRecord.bookIssue.student.studentId}) - Condition: ${returnRecord.condition}`,
        date: returnRecord.returnDate.toISOString().split('T')[0],
        timeAgo,
        metadata: {
          bookTitle: returnRecord.book.title,
          studentName: returnRecord.bookIssue.student.name,
          condition: returnRecord.condition
        }
      });
    });

    // Sort activities by date and take most recent 10
    const sortedActivities = recentActivities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    // Calculate additional metrics
    const totalCopiesCount = totalCopies._sum.totalCopies || 0;
    const availableCopiesCount = availableCopies._sum.availableCopies || 0;
    const utilizationRate = totalCopiesCount > 0 ? ((totalCopiesCount - availableCopiesCount) / totalCopiesCount) * 100 : 0;
    const overdueRate = issuedBooks > 0 ? (overdueBooks / issuedBooks) * 100 : 0;

    // Format popular books with issue counts
    const formattedPopularBooks = popularBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      issueCount: book.issues.length
    }));

    // Format categories with book counts
    const formattedCategories = bookCategories.map(category => ({
      id: category.id,
      name: category.name,
      bookCount: category.books.length
    }));

    // Prepare comprehensive library statistics
    const libraryStats = {
      // Core Statistics
      totalBooks,
      totalCopies: totalCopiesCount,
      availableBooks: availableCopiesCount,
      issuedBooks,
      overdueBooks,
      
      // Financial Statistics
      totalFines: Number(totalFines._sum.amount || 0),
      pendingFines: Number(pendingFines._sum.amount || 0),
      
      // Performance Metrics
      metrics: {
        utilizationRate: Math.round(utilizationRate * 100) / 100,
        overdueRate: Math.round(overdueRate * 100) / 100,
        averageBooksPerCategory: bookCategories.length > 0 ? Math.round(totalBooks / bookCategories.length) : 0,
        collectionHealth: availableCopiesCount > 0 ? 'Good' : 'Needs Attention'
      },

      // Popular Content
      popularBooks: formattedPopularBooks,
      
      // Categories Overview
      categories: formattedCategories,
      
      // Recent Activities
      recentActivities: sortedActivities,
      
      // Summary Insights
      insights: {
        mostActiveCategory: formattedCategories.length > 0 ? formattedCategories.reduce((prev, current) => 
          prev.bookCount > current.bookCount ? prev : current
        ).name : 'N/A',
        collectionSize: totalCopiesCount > 1000 ? 'Large' : totalCopiesCount > 500 ? 'Medium' : 'Small',
        needsAttention: overdueBooks > 10 || Number(pendingFines._sum.amount || 0) > 1000
      },
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      dataFreshness: 'real-time'
    };

    return createSuccessResponse(libraryStats, 200, 'Library statistics retrieved successfully');

  } catch (error) {
    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      return handlePrismaError(error);
    }

    // Log the error for monitoring
    logApiError(error as Error, {
      path: '/api/librarian/dashboard/stats',
      userId: 'librarian-user',
      userRole: 'LIBRARIAN'
    });

    return createErrorResponse(
      'Failed to fetch library statistics',
      500,
      'LIBRARY_STATS_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${Math.max(1, diffInMinutes)} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
}
