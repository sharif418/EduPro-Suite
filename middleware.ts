import { NextRequest, NextResponse } from 'next/server';

// Helper function to decode JWT payload (without verification for middleware)
function decodeJWTPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = parts[1];
    // Use Buffer.from instead of atob for Node.js compatibility
    const decoded = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return decoded;
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get the auth token from cookies
  const token = request.cookies.get('auth-token')?.value;
  
  // If it's an API route, allow access (API routes handle their own auth)
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Handle login page access
  if (pathname === '/login') {
    if (token) {
      // User has a token, redirect to home (let the client-side handle validation)
      return NextResponse.redirect(new URL('/', request.url));
    }
    // User doesn't have a token, allow access to login page
    return NextResponse.next();
  }

  // Handle unauthorized page access (allow access without token check)
  if (pathname === '/unauthorized') {
    return NextResponse.next();
  }
  
  // Handle admin routes - require SUPERADMIN or ADMIN role
  if (pathname.startsWith('/admin')) {
    if (!token) {
      // No token, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Decode the JWT token to get the role (basic validation)
      // Note: Full JWT verification happens in API routes
      const decoded = decodeJWTPayload(token);
      
      // Check if user has admin privileges
      if (decoded.role !== 'SUPERADMIN' && decoded.role !== 'ADMIN') {
        // User doesn't have admin role, redirect to unauthorized page
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }

      // User has admin role, allow access
      return NextResponse.next();

    } catch (error) {
      console.error('[MIDDLEWARE_ERROR] Invalid JWT token:', error);
      // Invalid token, redirect to login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Handle other protected routes
  if (!token) {
    // User doesn't have a token, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // User has a token, allow access to protected route
  // The SessionProvider will handle JWT validation on the client side
  return NextResponse.next();
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
