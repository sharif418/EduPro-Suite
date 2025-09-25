import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth-helpers';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    // Verify the user's authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create a short-lived token specifically for Socket.IO authentication
    const socketToken = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        role: user.role,
        type: 'socket', // Mark this as a socket-specific token
      },
      JWT_SECRET,
      { 
        expiresIn: '1h', // Short-lived for security
        issuer: 'edupro-suite',
        audience: 'socket-client'
      }
    );

    return NextResponse.json({
      success: true,
      token: socketToken,
      expiresIn: 3600, // 1 hour in seconds
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Socket token generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate socket token',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // GET method for convenience (same functionality as POST)
  return POST(request);
}
