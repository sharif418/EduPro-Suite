import { NextRequest } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  validateRequiredFields,
  validateEmail,
  checkRateLimit,
  getClientIP,
  getUserAgent,
  logApiError,
  addSecurityHeaders
} from '@/app/lib/api-helpers';

// In-memory store for failed login attempts (in production, use Redis)
const failedAttempts = new Map<string, { count: number; lockedUntil?: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 login attempts per IP per 15 minutes
      keyGenerator: (req) => `login:${getClientIP(req)}`
    });

    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many login attempts. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        { resetTime: rateLimitResult.resetTime }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      logApiError(new Error('JWT_SECRET not configured'), {
        path: '/api/auth/login',
        ip: getClientIP(request)
      });
      return createErrorResponse('Authentication service unavailable', 503, 'AUTH_SERVICE_ERROR');
    }

    // Validate and parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse('Invalid request format', 400, 'INVALID_JSON');
    }

    const { email, password, csrfToken } = body;

    // Validate required fields
    const validation = validateRequiredFields(body, ['email', 'password']);
    if (!validation.isValid) {
      return createErrorResponse(
        'Missing required fields',
        400,
        'VALIDATION_ERROR',
        { missingFields: validation.missingFields }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return createErrorResponse('Invalid email format', 400, 'INVALID_EMAIL');
    }

    // CSRF token validation (basic implementation)
    const expectedCsrfToken = request.headers.get('x-csrf-token');
    if (process.env.NODE_ENV === 'production' && (!csrfToken || csrfToken !== expectedCsrfToken)) {
      return createErrorResponse('Invalid CSRF token', 403, 'CSRF_TOKEN_INVALID');
    }

    const clientIP = getClientIP(request);
    const userAgent = getUserAgent(request);
    const normalizedEmail = email.toLowerCase().trim();

    // Check if account is locked
    const attemptKey = `${normalizedEmail}:${clientIP}`;
    const attempts = failedAttempts.get(attemptKey);
    
    if (attempts && attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      const remainingTime = Math.ceil((attempts.lockedUntil - Date.now()) / 1000 / 60);
      
      logApiError(new Error('Login attempt on locked account'), {
        path: '/api/auth/login',
        ip: clientIP,
        userAgent
      });

      return createErrorResponse(
        `Account temporarily locked. Try again in ${remainingTime} minutes.`,
        423,
        'ACCOUNT_LOCKED',
        { remainingTime }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Verify password (always run bcrypt.compare to prevent timing attacks)
    const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isPasswordValid) {
      // Track failed attempt
      const currentAttempts = attempts?.count || 0;
      const newAttemptCount = currentAttempts + 1;
      
      if (newAttemptCount >= MAX_FAILED_ATTEMPTS) {
        failedAttempts.set(attemptKey, {
          count: newAttemptCount,
          lockedUntil: Date.now() + LOCKOUT_DURATION
        });
      } else {
        failedAttempts.set(attemptKey, {
          count: newAttemptCount
        });
      }

      // Log failed attempt
      logApiError(new Error('Failed login attempt'), {
        path: '/api/auth/login',
        ip: clientIP,
        userAgent
      });

      // Generic error message to prevent user enumeration
      return createErrorResponse(
        'Invalid email or password',
        401,
        'INVALID_CREDENTIALS',
        process.env.NODE_ENV === 'development' ? { attemptCount: newAttemptCount } : undefined
      );
    }

    // Clear failed attempts on successful login
    failedAttempts.delete(attemptKey);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful login
    console.log(`[LOGIN_SUCCESS] User ${user.email} (${user.role}) logged in from ${clientIP}`);

    // Create response with user data
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const response = createSuccessResponse(
      { user: userData },
      200,
      'Login successful'
    );

    // Set HTTP-only cookie for security
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Add security headers
    return addSecurityHeaders(response);

  } catch (error) {
    // Log the error with context
    logApiError(error as Error, {
      path: '/api/auth/login',
      ip: getClientIP(request),
      userAgent: getUserAgent(request)
    });

    return createErrorResponse(
      'Authentication service error',
      500,
      'AUTH_SERVICE_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const response = createSuccessResponse(null, 200);
  return addSecurityHeaders(response);
}
