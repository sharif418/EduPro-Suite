import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'bn', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
  localeDetection: true
});

// Helper function to decode JWT payload (Edge-safe, without verification for middleware)
function decodeJWTPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = parts[1];
    // Edge-safe base64url decoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // If it's an API route, allow access (API routes handle their own auth)
  if (pathname.startsWith('/api')) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('origin');
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || 
        (process.env.NODE_ENV === 'production' 
          ? ['https://abrar.ailearnersbd.com', 'https://www.abrar.ailearnersbd.com'] 
          : ['http://localhost:3000']);
      
      const response = new NextResponse(null, { status: 204 });
      
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      
      response.headers.set('Vary', 'Origin');
      return response;
    }
    
    const response = NextResponse.next();
    
    // Apply security headers to API routes
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Apply CORS headers for API routes
    const origin = request.headers.get('origin');
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || 
      (process.env.NODE_ENV === 'production' 
        ? ['https://abrar.ailearnersbd.com', 'https://www.abrar.ailearnersbd.com'] 
        : ['http://localhost:3000']);
    
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    // Add CSP for production
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://abrar.ailearnersbd.com'];
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'strict-dynamic' https:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' https://fonts.gstatic.com",
        `connect-src 'self' ${allowedOrigins.join(' ')} wss: data: blob:`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ].join('; ');
      response.headers.set('Content-Security-Policy', csp);
    }
    
    return response;
  }
  
  // Handle root path redirection
  if (pathname === '/') {
    // Check for saved locale preference in cookie
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    
    // If user has a saved locale preference, use it
    if (cookieLocale && ['en', 'bn', 'ar'].includes(cookieLocale)) {
      return NextResponse.redirect(new URL(`/${cookieLocale}`, request.url));
    }
    
    // Otherwise, try to detect browser language
    const acceptLanguage = request.headers.get('accept-language');
    let detectedLocale = 'en'; // default fallback
    
    if (acceptLanguage) {
      // Check for Bengali
      if (acceptLanguage.includes('bn') || acceptLanguage.includes('bn-BD')) {
        detectedLocale = 'bn';
      }
      // Check for Arabic
      else if (acceptLanguage.includes('ar')) {
        detectedLocale = 'ar';
      }
      // Default to English for all other cases
      else {
        detectedLocale = 'en';
      }
    }
    
    return NextResponse.redirect(new URL(`/${detectedLocale}`, request.url));
  }
  
  // Check for NEXT_LOCALE cookie and redirect if needed for other paths
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const localeMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  const currentLocale = localeMatch ? localeMatch[1] : null;
  
  // If we have a cookie locale and it's different from URL locale, redirect
  if (cookieLocale && ['en', 'bn', 'ar'].includes(cookieLocale) && currentLocale !== cookieLocale) {
    const pathWithoutLocale = localeMatch ? (localeMatch[2] || '/') : pathname;
    const newPath = `/${cookieLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
    return NextResponse.redirect(new URL(newPath, request.url));
  }
  
  // Handle internationalization
  const intlResponse = intlMiddleware(request);
  
  // Apply security headers to all responses
  if (intlResponse) {
    intlResponse.headers.set('X-Content-Type-Options', 'nosniff');
    intlResponse.headers.set('X-Frame-Options', 'DENY');
    intlResponse.headers.set('X-XSS-Protection', '1; mode=block');
    intlResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add HSTS for production
    if (process.env.NODE_ENV === 'production') {
      intlResponse.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }
  
  // Get the auth token from cookies
  const token = request.cookies.get('auth-token')?.value;
  
  // Use the already extracted locale information
  const locale = currentLocale || 'en';
  const pathWithoutLocale = localeMatch ? (localeMatch[2] || '/') : pathname;
  
  // Handle login page access
  if (pathWithoutLocale === '/login') {
    if (token) {
      // User has a token, redirect to home (let the client-side handle validation)
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
    // User doesn't have a token, allow access to login page
    return intlResponse;
  }

  // Handle unauthorized page access (allow access without token check)
  if (pathWithoutLocale === '/unauthorized') {
    return intlResponse;
  }
  
  // Handle admin routes - require SUPERADMIN or ADMIN role
  if (pathWithoutLocale.startsWith('/admin')) {
    if (!token) {
      // No token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    try {
      // Decode the JWT token to get the role (basic validation)
      // Note: Full JWT verification happens in API routes
      const decoded = decodeJWTPayload(token);
      
      // Check if user has admin privileges
      if (decoded.role !== 'SUPERADMIN' && decoded.role !== 'ADMIN') {
        // User doesn't have admin role, redirect to unauthorized page
        return NextResponse.redirect(new URL(`/${locale}/unauthorized`, request.url));
      }

      // User has admin role, allow access
      return intlResponse;

    } catch (error) {
      console.error('[MIDDLEWARE_ERROR] Invalid JWT token:', error);
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  // Handle teacher routes - require TEACHER, ADMIN, or SUPERADMIN role
  if (pathWithoutLocale.startsWith('/teacher')) {
    if (!token) {
      // No token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    try {
      // Decode the JWT token to get the role (basic validation)
      // Note: Full JWT verification happens in API routes
      const decoded = decodeJWTPayload(token);
      
      // Check if user has teacher privileges
      if (decoded.role !== 'TEACHER' && decoded.role !== 'ADMIN' && decoded.role !== 'SUPERADMIN') {
        // User doesn't have teacher role, redirect to unauthorized page
        return NextResponse.redirect(new URL(`/${locale}/unauthorized`, request.url));
      }

      // User has teacher role, allow access
      return intlResponse;

    } catch (error) {
      console.error('[MIDDLEWARE_ERROR] Invalid JWT token:', error);
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  // Handle guardian routes - require GUARDIAN role
  if (pathWithoutLocale.startsWith('/guardian')) {
    if (!token) {
      // No token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    try {
      // Decode the JWT token to get the role (basic validation)
      // Note: Full JWT verification happens in API routes
      const decoded = decodeJWTPayload(token);
      
      // Check if user has guardian privileges
      if (decoded.role !== 'GUARDIAN') {
        // User doesn't have guardian role, redirect to unauthorized page
        return NextResponse.redirect(new URL(`/${locale}/unauthorized`, request.url));
      }

      // User has guardian role, allow access
      return intlResponse;

    } catch (error) {
      console.error('[MIDDLEWARE_ERROR] Invalid JWT token:', error);
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  // Handle accountant routes - require ACCOUNTANT role
  if (pathWithoutLocale.startsWith('/accountant')) {
    if (!token) {
      // No token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    try {
      // Decode the JWT token to get the role (basic validation)
      // Note: Full JWT verification happens in API routes
      const decoded = decodeJWTPayload(token);
      
      // Check if user has accountant privileges
      if (decoded.role !== 'ACCOUNTANT') {
        // User doesn't have accountant role, redirect to unauthorized page
        return NextResponse.redirect(new URL(`/${locale}/unauthorized`, request.url));
      }

      // User has accountant role, allow access
      return intlResponse;

    } catch (error) {
      console.error('[MIDDLEWARE_ERROR] Invalid JWT token:', error);
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  // Handle librarian routes - require LIBRARIAN role
  if (pathWithoutLocale.startsWith('/librarian')) {
    if (!token) {
      // No token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    try {
      // Decode the JWT token to get the role (basic validation)
      // Note: Full JWT verification happens in API routes
      const decoded = decodeJWTPayload(token);
      
      // Check if user has librarian privileges
      if (decoded.role !== 'LIBRARIAN') {
        // User doesn't have librarian role, redirect to unauthorized page
        return NextResponse.redirect(new URL(`/${locale}/unauthorized`, request.url));
      }

      // User has librarian role, allow access
      return intlResponse;

    } catch (error) {
      console.error('[MIDDLEWARE_ERROR] Invalid JWT token:', error);
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }
  
  // Handle other protected routes
  if (!token) {
    // User doesn't have a token, redirect to login
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }
  
  // User has a token, allow access to protected route
  // The SessionProvider will handle JWT validation on the client side
  return intlResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
