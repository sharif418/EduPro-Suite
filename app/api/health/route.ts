import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Quick database ping
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}

// Lightweight health check for load balancers
export async function HEAD(request: NextRequest) {
  try {
    // Quick database ping
    await prisma.$queryRaw`SELECT 1`;
    
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
  } catch (error) {
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
  }
}
