import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      console.error('[AUTH_ERROR] JWT_SECRET environment variable is not defined');
      return null;
    }

    // Get the auth token from cookies
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    // Fetch user details from database
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
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };
  } catch (error) {
    console.error('[AUTH_ERROR]', error);
    return null;
  }
}

export async function verifyAdminAuth(request: NextRequest): Promise<AuthUser | null> {
  const user = await verifyAuth(request);
  
  if (!user) {
    return null;
  }

  // Check if user has admin privileges
  if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
    return null;
  }

  return user;
}

export function createUnauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: 'Unauthorized. Admin access required.' },
    { status: 401 }
  );
}

export function createErrorResponse(message: string, status: number = 500) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

export function createSuccessResponse(data: any, status: number = 200) {
  return NextResponse.json(
    { success: true, ...data },
    { status }
  );
}
