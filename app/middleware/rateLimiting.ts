import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later.',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (request: NextRequest) => this.getClientIdentifier(request),
      ...config,
    };

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private getClientIdentifier(request: NextRequest): string {
    // Try to get IP from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    const ip = forwarded?.split(',')[0] || realIp || cfConnectingIp || 'unknown';
    
    // Include user agent for additional uniqueness
    const userAgent = request.headers.get('user-agent') || '';
    const userAgentHash = this.simpleHash(userAgent);
    
    return `${ip}:${userAgentHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  public async isAllowed(request: NextRequest): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const key = this.config.keyGenerator!(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Initialize or get existing record
    if (!this.store[key] || this.store[key].resetTime <= now) {
      this.store[key] = {
        count: 0,
        resetTime: now + this.config.windowMs,
      };
    }

    const record = this.store[key];
    
    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      return {
        allowed: false,
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      };
    }

    // Increment counter
    record.count++;

    return {
      allowed: true,
      limit: this.config.maxRequests,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  public createResponse(
    allowed: boolean,
    limit: number,
    remaining: number,
    resetTime: number,
    retryAfter?: number
  ): NextResponse {
    const headers = new Headers({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    });

    if (!allowed) {
      headers.set('Retry-After', retryAfter?.toString() || '60');
      return new NextResponse(
        JSON.stringify({
          error: this.config.message,
          retryAfter: retryAfter || 60,
        }),
        {
          status: 429,
          headers,
        }
      );
    }

    return NextResponse.next({
      headers,
    });
  }
}

// Predefined rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limiting
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
  }),

  // Authentication endpoints (stricter)
  auth: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
  }),

  // File upload (moderate)
  upload: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    message: 'Too many file uploads, please wait before uploading more files.',
  }),

  // Email/SMS sending (conservative)
  messaging: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50, // 50 messages per hour
    message: 'Message sending limit exceeded, please try again later.',
  }),

  // Admin operations (moderate)
  admin: new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 30, // 30 admin operations per 5 minutes
    message: 'Too many admin operations, please slow down.',
  }),

  // Public API (generous)
  public: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Rate limit exceeded for public API.',
  }),

  // Search operations
  search: new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    message: 'Too many search requests, please wait.',
  }),

  // Report generation (very conservative)
  reports: new RateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5, // 5 reports per 10 minutes
    message: 'Report generation limit exceeded, please wait.',
  }),
};

// Role-based rate limiting
export function getRateLimiterForRole(role: string): RateLimiter {
  switch (role) {
    case 'ADMIN':
    case 'SUPERADMIN':
      return rateLimiters.admin;
    case 'TEACHER':
      return rateLimiters.general;
    case 'STUDENT':
    case 'GUARDIAN':
      return rateLimiters.public;
    default:
      return rateLimiters.public;
  }
}

// Endpoint-specific rate limiting
export function getRateLimiterForEndpoint(pathname: string): RateLimiter {
  if (pathname.includes('/auth/')) {
    return rateLimiters.auth;
  }
  
  if (pathname.includes('/upload/')) {
    return rateLimiters.upload;
  }
  
  if (pathname.includes('/email/') || pathname.includes('/sms/')) {
    return rateLimiters.messaging;
  }
  
  if (pathname.includes('/reports/')) {
    return rateLimiters.reports;
  }
  
  if (pathname.includes('/search/')) {
    return rateLimiters.search;
  }
  
  if (pathname.startsWith('/api/admin/')) {
    return rateLimiters.admin;
  }
  
  return rateLimiters.general;
}

// Advanced rate limiting with Redis-like functionality (in-memory for now)
export class AdvancedRateLimiter {
  private slidingWindowStore: Map<string, number[]> = new Map();
  private tokenBucketStore: Map<string, { tokens: number; lastRefill: number }> = new Map();

  // Sliding window rate limiter
  public async slidingWindowLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create window
    let window = this.slidingWindowStore.get(key) || [];
    
    // Remove expired timestamps
    window = window.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (window.length >= maxRequests) {
      this.slidingWindowStore.set(key, window);
      return { allowed: false, remaining: 0 };
    }
    
    // Add current request
    window.push(now);
    this.slidingWindowStore.set(key, window);
    
    return { allowed: true, remaining: maxRequests - window.length };
  }

  // Token bucket rate limiter
  public async tokenBucketLimit(
    key: string,
    capacity: number,
    refillRate: number, // tokens per second
    tokensRequested: number = 1
  ): Promise<{ allowed: boolean; tokensRemaining: number }> {
    const now = Date.now();
    
    // Get or create bucket
    let bucket = this.tokenBucketStore.get(key) || {
      tokens: capacity,
      lastRefill: now,
    };
    
    // Calculate tokens to add based on time elapsed
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(timePassed * refillRate);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
    
    // Check if enough tokens available
    if (bucket.tokens < tokensRequested) {
      this.tokenBucketStore.set(key, bucket);
      return { allowed: false, tokensRemaining: bucket.tokens };
    }
    
    // Consume tokens
    bucket.tokens -= tokensRequested;
    this.tokenBucketStore.set(key, bucket);
    
    return { allowed: true, tokensRemaining: bucket.tokens };
  }

  // Cleanup expired entries
  public cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    // Clean sliding window store
    for (const [key, window] of this.slidingWindowStore.entries()) {
      const validTimestamps = window.filter(timestamp => now - timestamp < maxAge);
      if (validTimestamps.length === 0) {
        this.slidingWindowStore.delete(key);
      } else {
        this.slidingWindowStore.set(key, validTimestamps);
      }
    }
    
    // Clean token bucket store
    for (const [key, bucket] of this.tokenBucketStore.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        this.tokenBucketStore.delete(key);
      }
    }
  }
}

// Global advanced rate limiter instance
export const advancedRateLimiter = new AdvancedRateLimiter();

// Cleanup every hour
setInterval(() => advancedRateLimiter.cleanup(), 60 * 60 * 1000);

// DDoS protection middleware
export async function ddosProtection(request: NextRequest): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';

  // Very aggressive rate limiting for potential DDoS
  const result = await advancedRateLimiter.slidingWindowLimit(
    `ddos:${ip}`,
    60 * 1000, // 1 minute window
    200 // 200 requests per minute max
  );

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Request rate too high. Possible DDoS detected.',
        retryAfter: 60,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  return null; // Allow request to continue
}

// Abuse detection
export async function detectAbuse(request: NextRequest): Promise<{
  isAbusive: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
}> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\b(union|select|insert|delete|drop|create|alter)\b/i, // SQL injection attempts
    /<script|javascript:|vbscript:|onload|onerror/i, // XSS attempts
    /\.\.\//g, // Path traversal attempts
    /\b(admin|root|administrator|test|guest)\b/i, // Common attack usernames
  ];

  const url = request.url;
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

  if (isSuspicious) {
    return {
      isAbusive: true,
      reason: 'Suspicious request pattern detected',
      severity: 'high',
    };
  }

  // Check for rapid-fire requests from same IP
  const rapidFireResult = await advancedRateLimiter.slidingWindowLimit(
    `rapid:${ip}`,
    10 * 1000, // 10 seconds
    50 // 50 requests in 10 seconds is suspicious
  );

  if (!rapidFireResult.allowed) {
    return {
      isAbusive: true,
      reason: 'Rapid-fire requests detected',
      severity: 'medium',
    };
  }

  // Check for bot-like behavior
  const botPatterns = [
    /bot|crawler|spider|scraper/i,
    /curl|wget|python|java|go-http/i,
  ];

  const isBotLike = botPatterns.some(pattern => pattern.test(userAgent));
  
  if (isBotLike && pathname.startsWith('/api/')) {
    return {
      isAbusive: true,
      reason: 'Bot-like behavior on API endpoints',
      severity: 'low',
    };
  }

  return {
    isAbusive: false,
    severity: 'low',
  };
}

// Graceful degradation under high load
export async function gracefulDegradation(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  
  // Check system load (mock implementation)
  const systemLoad = await getSystemLoad();
  
  if (systemLoad > 0.8) { // 80% load threshold
    // Prioritize critical endpoints
    const criticalEndpoints = [
      '/api/auth/',
      '/api/emergency/',
      '/api/health/',
    ];
    
    const isCritical = criticalEndpoints.some(endpoint => pathname.startsWith(endpoint));
    
    if (!isCritical) {
      // Return service unavailable for non-critical endpoints
      return new NextResponse(
        JSON.stringify({
          error: 'Service temporarily unavailable due to high load',
          retryAfter: 30,
          message: 'Please try again in a few moments',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '30',
          },
        }
      );
    }
  }

  return null; // Allow request to continue
}

// Mock system load function
async function getSystemLoad(): Promise<number> {
  // In production, this would check actual system metrics
  // For now, return a random load between 0.1 and 0.9
  return Math.random() * 0.8 + 0.1;
}

// Trusted source bypass
export function isTrustedSource(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  
  // Define trusted IP ranges (example)
  const trustedIPs = [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16',
  ];

  // Define trusted user agents (monitoring services, etc.)
  const trustedUserAgents = [
    /UptimeRobot/i,
    /Pingdom/i,
    /StatusCake/i,
    /Site24x7/i,
  ];

  // Check IP (simplified check for exact matches)
  if (trustedIPs.includes(ip)) {
    return true;
  }

  // Check user agent
  if (trustedUserAgents.some(pattern => pattern.test(userAgent))) {
    return true;
  }

  return false;
}

// Main rate limiting middleware function
export async function applyRateLimit(
  request: NextRequest,
  rateLimiter?: RateLimiter
): Promise<NextResponse | null> {
  try {
    // Skip rate limiting for trusted sources
    if (isTrustedSource(request)) {
      return null;
    }

    // Apply DDoS protection first
    const ddosResponse = await ddosProtection(request);
    if (ddosResponse) {
      return ddosResponse;
    }

    // Check for abuse
    const abuseCheck = await detectAbuse(request);
    if (abuseCheck.isAbusive) {
      console.warn(`Abusive request detected: ${abuseCheck.reason}`, {
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
        url: request.url,
        severity: abuseCheck.severity,
      });

      // Block high severity abuse immediately
      if (abuseCheck.severity === 'high') {
        return new NextResponse(
          JSON.stringify({
            error: 'Request blocked due to suspicious activity',
            reason: abuseCheck.reason,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Apply graceful degradation
    const degradationResponse = await gracefulDegradation(request);
    if (degradationResponse) {
      return degradationResponse;
    }

    // Apply specific rate limiting
    const limiter = rateLimiter || getRateLimiterForEndpoint(request.nextUrl.pathname);
    const result = await limiter.isAllowed(request);

    // Log rate limit violations
    if (!result.allowed) {
      console.warn('Rate limit exceeded', {
        ip: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
        endpoint: request.nextUrl.pathname,
        limit: result.limit,
        retryAfter: result.retryAfter,
      });
    }

    return limiter.createResponse(
      result.allowed,
      result.limit,
      result.remaining,
      result.resetTime,
      result.retryAfter
    );

  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow the request to continue
    return null;
  }
}

// Utility function to create custom rate limiter
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

// Export for use in middleware.ts
export { RateLimiter };
