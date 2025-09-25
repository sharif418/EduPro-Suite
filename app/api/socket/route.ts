import { NextRequest } from 'next/server';
import { getSocketServer } from '../../lib/socket-server';
import { triggerDashboardUpdate } from '../dashboard/real-time/route';

export async function GET(request: NextRequest) {
  const socketServer = getSocketServer();
  
  // Regular HTTP request - return connection info
  return Response.json({
    status: 'Socket.IO server ready',
    path: '/api/socket',
    timestamp: new Date().toISOString(),
    activeConnections: socketServer?.getConnectedUsersCount() || 0,
    connectedUsers: socketServer?.getConnectedUsers() || [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const socketServer = getSocketServer();
    
    if (!socketServer) {
      return Response.json({ error: 'Socket server not initialized' }, { status: 503 });
    }
    
    // Handle Socket.IO server management requests
    if (body.action === 'status') {
      return Response.json({
        status: 'Socket.IO server ready',
        path: '/api/socket',
        timestamp: new Date().toISOString(),
        activeConnections: socketServer.getConnectedUsersCount(),
        connectedUsers: socketServer.getConnectedUsers(),
      });
    }

    if (body.action === 'broadcast') {
      // Broadcast message to connected clients via Socket.IO
      const { type, data, targetRole, targetUserId } = body;
      
      // Store the update in the dashboard real-time system
      await triggerDashboardUpdate(type, data, targetRole, targetUserId);
      
      // Create the dashboard update message
      const dashboardUpdate = {
        type: 'dashboard_update',
        data: {
          type,
          data,
          timestamp: new Date().toISOString(),
        },
      };

      // Broadcast via Socket.IO with proper filtering using new dashboard methods
      if (targetUserId) {
        // Send to specific user
        await socketServer.sendDashboardToUser(targetUserId, dashboardUpdate);
      } else if (targetRole) {
        // Send to all users with specific role
        await socketServer.sendDashboardToRole(targetRole, dashboardUpdate);
      } else {
        // Broadcast to all connected users
        await socketServer.sendDashboardToAll(dashboardUpdate);
      }

      return Response.json({ 
        success: true, 
        message: 'Dashboard update broadcast sent',
        recipients: targetUserId ? 1 : socketServer.getConnectedUsersCount(),
        targetRole,
        targetUserId,
      });
    }

    if (body.action === 'subscribe_dashboard') {
      // Handle dashboard subscription (this is now handled in the Socket.IO connection)
      const { role, userId } = body;
      
      return Response.json({
        success: true,
        message: 'Dashboard subscription handled via Socket.IO connection',
        role,
        userId,
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[SOCKET_API_ERROR]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Integration with dashboard real-time updates
export async function notifyDashboardClients(
  type: string,
  data: any,
  targetRole?: string,
  targetUserId?: string
) {
  const socketServer = getSocketServer();
  
  if (!socketServer) {
    console.warn('[SOCKET_NOTIFY] Socket server not initialized, skipping notification');
    return;
  }

  // Trigger dashboard update storage
  await triggerDashboardUpdate(type as 'stats' | 'activity' | 'notification' | 'achievement', data, targetRole, targetUserId);
  
  // Create the dashboard update message
  const dashboardUpdate = {
    type: 'dashboard_update',
    data: {
      type,
      data,
      timestamp: new Date().toISOString(),
    },
  };

  // Broadcast via Socket.IO with proper role/user filtering using new dashboard methods
  try {
    if (targetUserId) {
      // Send to specific user
      await socketServer.sendDashboardToUser(targetUserId, dashboardUpdate);
      console.log(`[SOCKET_NOTIFY] Sent dashboard update to user ${targetUserId}`);
    } else if (targetRole) {
      // Send to all users with specific role
      await socketServer.sendDashboardToRole(targetRole, dashboardUpdate);
      console.log(`[SOCKET_NOTIFY] Sent dashboard update to role ${targetRole}`);
    } else {
      // Broadcast to all connected users
      await socketServer.sendDashboardToAll(dashboardUpdate);
      console.log(`[SOCKET_NOTIFY] Broadcast dashboard update to all users`);
    }
  } catch (error) {
    console.error('[SOCKET_NOTIFY_ERROR]', error);
  }
}
