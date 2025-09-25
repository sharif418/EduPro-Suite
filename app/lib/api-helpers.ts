import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// =============================================================================
// API Response Types
// =============================================================================
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
    field?: string;
  };
  timestamp: string;
  path?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// =============================================================================
// Success Response Helper
// =============================================================================
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  message?: string,
  meta?: ApiSuccessResponse<T>['meta']
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };

  return NextResponse.json(response, { status });
}

// =============================================================================
// Error Response Helper
// =============================================================================
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: any,
  field?: string,
  path?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      message,
      ...(code && { code }),
      ...(details && { details }),
      ...(field && { field }),
    },
    timestamp: new Date().toISOString(),
    ...(path && { path }),
  };

  // Log error for monitoring
  logApiError(new Error(message), { status, code, details, field, path });

  return NextResponse.json(response, { status });
}

// =============================================================================
// Input Validation Helper
// =============================================================================
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[]; invalidFields: string[] } {
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    
    if (value === undefined || value === null) {
      missingFields.push(field);
    } else if (typeof value === 'string' && value.trim() === '') {
      invalidFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0 && invalidFields.length === 0,
    missingFields,
    invalidFields,
  };
}

// =============================================================================
// Email Validation Helper
// =============================================================================
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// =============================================================================
// Phone Number Validation Helper
// =============================================================================
export function validatePhoneNumber(phone: string): boolean {
  // Support international formats including Bangladesh (+880)
  const phoneRegex = /^(\+?880|0)?[1-9]\d{8,10}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
}

// =============================================================================
// Prisma Error Handler
// =============================================================================
export function handlePrismaError(error: any): NextResponse<ApiErrorResponse> {
  console.error('Prisma Error:', error);

  // Handle known Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target as string[] | undefined;
        return createErrorResponse(
          `A record with this ${field?.join(', ') || 'value'} already exists`,
          409,
          'DUPLICATE_ENTRY',
          error.meta,
          field?.join(', ')
        );

      case 'P2025':
        // Record not found
        return createErrorResponse(
          'The requested record was not found',
          404,
          'NOT_FOUND',
          error.meta
        );

      case 'P2003':
        // Foreign key constraint violation
        return createErrorResponse(
          'Cannot perform this operation due to related records',
          400,
          'FOREIGN_KEY_CONSTRAINT',
          error.meta
        );

      case 'P2014':
        // Required relation violation
        return createErrorResponse(
          'The change you are trying to make would violate the required relation',
          400,
          'REQUIRED_RELATION_VIOLATION',
          error.meta
        );

      default:
        return createErrorResponse(
          'A database error occurred',
          500,
          error.code,
          error.meta
        );
    }
  }

  // Handle validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return createErrorResponse(
      'Invalid data provided',
      400,
      'VALIDATION_ERROR',
      error.message
    );
  }

  // Handle connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return createErrorResponse(
      'Database connection failed',
      503,
      'DATABASE_CONNECTION_ERROR',
      error.message
    );
  }

  // Handle timeout errors
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return createErrorResponse(
      'Database operation timed out',
      504,
      'DATABASE_TIMEOUT',
      error.message
    );
  }

  // Generic database error
  return createErrorResponse(
    'An unexpected database error occurred',
    500,
    'DATABASE_ERROR',
    error.message
  );
}

// =============================================================================
// Structured Error Logging
// =============================================================================
export function logApiError(
  error: Error,
  context: {
    status?: number;
    code?: string;
    details?: any;
    field?: string;
    path?: string;
    userId?: string;
    userRole?: string;
    ip?: string;
    userAgent?: string;
  } = {}
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    stack: error.stack,
    context,
  };

  // In production, you might want to send this to a logging service
  console.error('API Error:', JSON.stringify(logEntry, null, 2));

  // TODO: Integrate with external logging service (e.g., Sentry, LogRocket)
  // if (process.env.NODE_ENV === 'production') {
  //   sendToLoggingService(logEntry);
  // }
}

// =============================================================================
// Request Validation Helpers
// =============================================================================
export async function validateJsonBody(request: Request): Promise<any> {
  try {
    const body = await request.json();
    return body;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

export function validateContentType(request: Request, expectedType: string = 'application/json'): boolean {
  const contentType = request.headers.get('content-type');
  return contentType?.includes(expectedType) ?? false;
}

// =============================================================================
// Pagination Helpers
// =============================================================================
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): ApiSuccessResponse['meta'] {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    total,
    page,
    limit,
    hasMore,
  };
}

// =============================================================================
// Data Sanitization Helpers
// =============================================================================
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (value !== null && value !== undefined) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// =============================================================================
// Rate Limiting Helper
// =============================================================================
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: Request) => string;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = config.keyGenerator ? config.keyGenerator(request) : getClientIP(request);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Clean up old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < now) {
      rateLimitStore.delete(k);
    }
  }

  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime < now) {
    // New window
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (current.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  return { allowed: true, remaining: config.maxRequests - current.count, resetTime: current.resetTime };
}

// =============================================================================
// Utility Functions
// =============================================================================
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

// =============================================================================
// Authentication Helpers
// =============================================================================
export function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  
  return authorization.substring(7);
}

// =============================================================================
// File Upload Helpers
// =============================================================================
export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

export function generateSecureFilename(originalName: string): string {
  const extension = originalName.split('.').pop();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `${timestamp}_${random}.${extension}`;
}

// =============================================================================
// Response Headers Helpers
// =============================================================================
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export function addCorsHeaders(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  return response;
}
