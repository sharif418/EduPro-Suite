import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import jwt from 'jsonwebtoken';
import { 
  createSuccessResponse, 
  createErrorResponse,
  checkRateLimit,
  getClientIP,
  addSecurityHeaders
} from '@/app/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check for token validation
    const rateLimitResult = checkRateLimit(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 50, // 50 token validation attempts per IP per 15 minutes
      keyGenerator: (req) => `auth-me:${getClientIP(req)}`
    });

    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many authentication requests. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        { resetTime: rateLimitResult.resetTime }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      console.error('[ME_API_ERROR] JWT_SECRET environment variable is not defined');
      return createErrorResponse('Authentication service unavailable', 503, 'AUTH_SERVICE_ERROR');
    }

    // Get the auth token from cookies
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return createErrorResponse('No authentication token found', 401, 'NO_TOKEN');
    }

    // Verify and decode the JWT token
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };

      // Fetch user details from database to get the name
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
      }

      // Return the same structure as login endpoint
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      const response = createSuccessResponse(
        { user: userData },
        200,
        'User authenticated successfully'
      );

      return addSecurityHeaders(response);

    } catch (jwtError) {
      return createErrorResponse('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

  } catch (error) {
    console.error('[ME_API_ERROR]', error);
    return createErrorResponse(
      'Authentication service error',
      500,
      'AUTH_SERVICE_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}
