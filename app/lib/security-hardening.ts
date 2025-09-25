// =============================================================================
// Security Hardening Utilities and Middleware
// =============================================================================
// This module provides comprehensive security utilities to protect against
// common vulnerabilities including XSS, CSRF, injection attacks, and more
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// =============================================================================
// Input Sanitization and Validation
// =============================================================================

/**
 * Sanitize HTML input to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/style=/gi, '') // Remove inline styles
    .trim();
}

/**
 * Sanitize SQL input to prevent SQL injection
 */
export function sanitizeSql(input: string): string {
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments start
    .replace(/\*\//g, '') // Remove SQL block comments end
    .trim();
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function sanitizeFilePath(input: string): string {
  return input
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/\/+/g, '/') // Normalize multiple slashes
    .trim();
}

/**
 * Comprehensive input sanitization for objects
 */
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeHtml(item) : item
      );
    } else if (value !== null && value !== undefined) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// =============================================================================
// CSRF Protection
// =============================================================================

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) {
    return false;
  }
  
  // Use crypto.timingSafeEqual to prevent timing attacks
  const tokenBuffer = Buffer.from(token, 'hex');
  const expectedBuffer = Buffer.from(expectedToken, 'hex');
  
  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(request: NextRequest): { isValid: boolean; token?: string } {
  const method = request.method;
  
  // Skip CSRF check for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { isValid: true };
  }
  
  const csrfToken = request.headers.get('x-csrf-token');
  const csrfCookie = request.cookies.get('csrf-token')?.value;
  
  if (!csrfToken || !csrfCookie) {
    return { isValid: false };
  }
  
  const isValid = validateCsrfToken(csrfToken, csrfCookie);
  return { isValid, token: csrfToken };
}

// =============================================================================
// Security Headers Management
// =============================================================================

/**
 * Apply comprehensive security headers
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-* should be removed in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' ws: wss:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  return response;
}

/**
 * Apply CORS headers with origin validation
 */
export function applyCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  
  return response;
}

// =============================================================================
// Rate Limiting
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Advanced rate limiting with progressive penalties
 */
export function advancedRateLimit(
  request: NextRequest,
  config: {
    windowMs: number;
    maxRequests: number;
    blockDuration?: number;
    progressivePenalty?: boolean;
  }
): { allowed: boolean; remaining: number; resetTime: number; blocked: boolean } {
  const key = getClientIdentifier(request);
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  // Clean up expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime < now && !v.blocked) {
      rateLimitStore.delete(k);
    }
  }
  
  const current = rateLimitStore.get(key);
  
  // Check if currently blocked
  if (current?.blocked && current.resetTime > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
      blocked: true
    };
  }
  
  if (!current || current.resetTime < now) {
    // New window or unblocked
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime, blocked: false });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
      blocked: false
    };
  }
  
  if (current.count >= config.maxRequests) {
    // Apply progressive penalty if enabled
    const blockDuration = config.progressivePenalty 
      ? Math.min(config.blockDuration || config.windowMs, config.windowMs * Math.pow(2, Math.floor(current.count / config.maxRequests)))
      : config.blockDuration || config.windowMs;
    
    rateLimitStore.set(key, {
      count: current.count + 1,
      resetTime: now + blockDuration,
      blocked: true
    });
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: now + blockDuration,
      blocked: true
    };
  }
  
  current.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime,
    blocked: false
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const userAgent = request.headers.get('user-agent') || '';
  
  let ip = 'unknown';
  if (forwarded) {
    ip = forwarded.split(',')[0].trim();
  } else if (realIP) {
    ip = realIP;
  }
  
  // Create a more sophisticated identifier
  const identifier = crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}`)
    .digest('hex')
    .substring(0, 16);
  
  return identifier;
}

// =============================================================================
// Session Security
// =============================================================================

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate session token format
 */
export function validateSessionToken(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

/**
 * Create secure cookie options
 */
export function getSecureCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: maxAge || 7 * 24 * 60 * 60, // 7 days default
    path: '/',
  };
}

// =============================================================================
// File Upload Security
// =============================================================================

/**
 * Validate file signature (magic bytes)
 */
export function validateFileSignature(buffer: Buffer, expectedType: string): boolean {
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06], [0x50, 0x4B, 0x07, 0x08]],
  };
  
  const typeSignatures = signatures[expectedType];
  if (!typeSignatures) {
    return true; // Allow types without known signatures
  }
  
  return typeSignatures.some(signature => {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Generate secure filename with timestamp and random component
 */
export function generateSecureFileName(originalName: string, userId?: string): string {
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const userPrefix = userId ? crypto.createHash('md5').update(userId).digest('hex').substring(0, 8) : 'anon';
  
  return `${userPrefix}_${timestamp}_${random}.${extension}`;
}

/**
 * Validate file upload context and permissions
 */
export function validateUploadPermissions(
  userRole: string,
  uploadContext: string,
  fileType: string
): { allowed: boolean; reason?: string } {
  const permissions: Record<string, Record<string, string[]>> = {
    'ADMIN': {
      'student_photo': ['image/jpeg', 'image/png'],
      'staff_photo': ['image/jpeg', 'image/png'],
      'document': ['application/pdf', 'application/msword', 'image/jpeg', 'image/png'],
      'general': ['application/pdf', 'application/msword', 'image/jpeg', 'image/png', 'text/plain']
    },
    'TEACHER': {
      'assignment': ['application/pdf', 'application/msword', 'image/jpeg', 'image/png'],
      'document': ['application/pdf', 'application/msword', 'image/jpeg', 'image/png']
    },
    'STUDENT': {
      'assignment': ['application/pdf', 'application/msword', 'image/jpeg', 'image/png', 'text/plain'],
      'profile_photo': ['image/jpeg', 'image/png']
    }
  };
  
  const rolePermissions = permissions[userRole];
  if (!rolePermissions) {
    return { allowed: false, reason: 'Role not authorized for file uploads' };
  }
  
  const contextPermissions = rolePermissions[uploadContext];
  if (!contextPermissions) {
    return { allowed: false, reason: `Upload context '${uploadContext}' not allowed for role '${userRole}'` };
  }
  
  if (!contextPermissions.includes(fileType)) {
    return { allowed: false, reason: `File type '${fileType}' not allowed in context '${uploadContext}'` };
  }
  
  return { allowed: true };
}

// =============================================================================
// API Security Middleware
// =============================================================================

/**
 * Comprehensive API security middleware
 */
export function apiSecurityMiddleware(request: NextRequest): {
  proceed: boolean;
  response?: NextResponse;
  securityContext: {
    clientIP: string;
    userAgent: string;
    timestamp: string;
    requestId: string;
  };
} {
  const requestId = crypto.randomUUID();
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const timestamp = new Date().toISOString();
  
  const securityContext = {
    clientIP,
    userAgent,
    timestamp,
    requestId
  };
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection patterns
    /<script|javascript:|on\w+=/i, // XSS patterns
    /\.\./g, // Directory traversal
    /\x00/g, // Null bytes
  ];
  
  const url = request.url;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));
  
  if (isSuspicious) {
    console.warn(`[SECURITY_ALERT] Suspicious request detected from ${clientIP}: ${url}`);
    
    const response = NextResponse.json(
      { 
        success: false, 
        error: 'Request blocked by security policy',
        requestId 
      },
      { status: 400 }
    );
    
    return { proceed: false, response, securityContext };
  }
  
  return { proceed: true, securityContext };
}

/**
 * Get client IP address with proxy support
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare
  
  if (cfConnectingIP) return cfConnectingIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  
  return 'unknown';
}

// =============================================================================
// Password Security
// =============================================================================

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Password must be at least 8 characters long');
  
  if (password.length >= 12) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password must contain lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password must contain uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Password must contain numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Password must contain special characters');
  
  // Common password checks
  const commonPasswords = ['password', '123456', 'admin', 'user', 'test'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    score -= 2;
    feedback.push('Password contains common words');
  }
  
  const isValid = score >= 4 && feedback.length === 0;
  
  return { isValid, score: Math.max(0, score), feedback };
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

// =============================================================================
// Audit Logging
// =============================================================================

/**
 * Security audit logger
 */
export function logSecurityEvent(
  event: string,
  details: {
    userId?: string;
    userRole?: string;
    clientIP?: string;
    userAgent?: string;
    requestId?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'AUTH' | 'UPLOAD' | 'API' | 'SYSTEM';
    metadata?: Record<string, any>;
  }
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity: details.severity,
    category: details.category,
    userId: details.userId || 'anonymous',
    userRole: details.userRole || 'unknown',
    clientIP: details.clientIP || 'unknown',
    userAgent: details.userAgent || 'unknown',
    requestId: details.requestId || crypto.randomUUID(),
    metadata: details.metadata || {}
  };
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    console.log(`[SECURITY_AUDIT] ${JSON.stringify(logEntry)}`);
    // TODO: Send to external security monitoring service (e.g., Splunk, ELK)
  } else {
    console.log(`[SECURITY_AUDIT] ${event} - ${details.severity}`, logEntry);
  }
}

// =============================================================================
// Data Encryption Helpers
// =============================================================================

/**
 * Encrypt sensitive data
 */
export function encryptSensitiveData(data: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, encryptionKey);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encryptedData: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const algorithm = 'aes-256-gcm';
  
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipher(algorithm, encryptionKey);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// =============================================================================
// Security Validation Helpers
// =============================================================================

/**
 * Validate email format with additional security checks
 */
export function validateSecureEmail(email: string): { isValid: boolean; reason?: string } {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, reason: 'Invalid email format' };
  }
  
  // Check for suspicious patterns
  if (email.includes('..') || email.includes('--')) {
    return { isValid: false, reason: 'Email contains suspicious patterns' };
  }
  
  // Length validation
  if (email.length > 254) {
    return { isValid: false, reason: 'Email too long' };
  }
  
  return { isValid: true };
}

/**
 * Validate phone number with international support
 */
export function validateSecurePhoneNumber(phone: string): { isValid: boolean; reason?: string } {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check for suspicious patterns
  if (cleaned.includes('++') || cleaned.length > 15) {
    return { isValid: false, reason: 'Invalid phone number format' };
  }
  
  // Basic international format validation
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;
  if (!phoneRegex.test(cleaned)) {
    return { isValid: false, reason: 'Invalid phone number format' };
  }
  
  return { isValid: true };
}

// =============================================================================
// Security Middleware Factory
// =============================================================================

/**
 * Create security middleware with custom configuration
 */
export function createSecurityMiddleware(config: {
  enableCsrf?: boolean;
  enableRateLimit?: boolean;
  rateLimitConfig?: {
    windowMs: number;
    maxRequests: number;
  };
  enableSecurityHeaders?: boolean;
  enableCors?: boolean;
}) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    // Apply security checks
    const securityCheck = apiSecurityMiddleware(request);
    if (!securityCheck.proceed) {
      return securityCheck.response!;
    }
    
    // Rate limiting
    if (config.enableRateLimit && config.rateLimitConfig) {
      const rateLimit = advancedRateLimit(request, config.rateLimitConfig);
      if (!rateLimit.allowed) {
        const response = NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded',
            resetTime: rateLimit.resetTime
          },
          { status: 429 }
        );
        
        response.headers.set('X-RateLimit-Limit', config.rateLimitConfig.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
        
        return response;
      }
    }
    
    // CSRF protection
    if (config.enableCsrf) {
      const csrfCheck = csrfProtection(request);
      if (!csrfCheck.isValid) {
        return NextResponse.json(
          { success: false, error: 'CSRF token validation failed' },
          { status: 403 }
        );
      }
    }
    
    return null; // Continue to next middleware/handler
  };
}

// =============================================================================
// Export all utilities
// =============================================================================

export default {
  sanitizeHtml,
  sanitizeSql,
  sanitizeFilePath,
  sanitizeObject,
  generateCsrfToken,
  validateCsrfToken,
  csrfProtection,
  applySecurityHeaders,
  applyCorsHeaders,
  advancedRateLimit,
  validatePasswordStrength,
  generateSecurePassword,
  logSecurityEvent,
  encryptSensitiveData,
  decryptSensitiveData,
  validateSecureEmail,
  validateSecurePhoneNumber,
  validateFileSignature,
  generateSecureFileName,
  validateUploadPermissions,
  createSecurityMiddleware
};
