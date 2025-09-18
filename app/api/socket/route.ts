import { NextRequest } from 'next/server';
import { initializeSocketServer } from '../../lib/socket-server';

export async function GET(request: NextRequest) {
  // This endpoint is used by Socket.IO client to establish connection
  // The actual WebSocket server is initialized in the custom server
  return new Response('WebSocket server endpoint', { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle WebSocket server management requests
    if (body.action === 'status') {
      return Response.json({
        status: 'WebSocket server ready',
        path: '/api/socket',
        timestamp: new Date().toISOString()
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[SOCKET_API_ERROR]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
