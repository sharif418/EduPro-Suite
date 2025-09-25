import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';

// Real-time dashboard data structure
interface DashboardUpdate {
  type: 'stats' | 'activity' | 'notification' | 'achievement';
  data: any;
  timestamp: string;
  userId?: string;
  role?: string;
}

// In-memory store for real-time updates (in production, use Redis or similar)
const realtimeUpdates = new Map<string, DashboardUpdate[]>();
const connections = new Map<string, Set<string>>();

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = user.role;
    const userId = user.userId;

    // Get role-based real-time updates
    const updates = getRealtimeUpdates(role, userId);

    return NextResponse.json({
      success: true,
      updates,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Real-time dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data, targetRole, targetUserId } = body;

    // Create real-time update
    const update: DashboardUpdate = {
      type,
      data,
      timestamp: new Date().toISOString(),
      userId: user.userId,
      role: user.role,
    };

    // Store update for real-time distribution
    await storeRealtimeUpdate(update, targetRole, targetUserId);

    // In a real implementation, you would broadcast this via WebSocket
    // For now, we'll store it for the next GET request
    broadcastUpdate(update, targetRole, targetUserId);

    return NextResponse.json({
      success: true,
      message: 'Update broadcasted successfully',
    });
  } catch (error) {
    console.error('Real-time update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function getRealtimeUpdates(role: string, userId: string): DashboardUpdate[] {
  const roleUpdates = realtimeUpdates.get(role) || [];
  const userUpdates = realtimeUpdates.get(`user:${userId}`) || [];
  
  // Combine and sort by timestamp
  const allUpdates = [...roleUpdates, ...userUpdates];
  return allUpdates
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50); // Limit to last 50 updates
}

async function storeRealtimeUpdate(
  update: DashboardUpdate, 
  targetRole?: string, 
  targetUserId?: string
) {
  if (targetUserId) {
    // Store for specific user
    const userKey = `user:${targetUserId}`;
    const userUpdates = realtimeUpdates.get(userKey) || [];
    userUpdates.unshift(update);
    realtimeUpdates.set(userKey, userUpdates.slice(0, 100)); // Keep last 100
  } else if (targetRole) {
    // Store for role
    const roleUpdates = realtimeUpdates.get(targetRole) || [];
    roleUpdates.unshift(update);
    realtimeUpdates.set(targetRole, roleUpdates.slice(0, 100)); // Keep last 100
  } else {
    // Store for all roles
    const roles = ['admin', 'teacher', 'student', 'guardian', 'librarian', 'accountant'];
    roles.forEach(role => {
      const roleUpdates = realtimeUpdates.get(role) || [];
      roleUpdates.unshift(update);
      realtimeUpdates.set(role, roleUpdates.slice(0, 100));
    });
  }
}

function broadcastUpdate(
  update: DashboardUpdate, 
  targetRole?: string, 
  targetUserId?: string
) {
  // In a real implementation, this would use WebSocket or Server-Sent Events
  // For now, we'll just log the broadcast
  console.log('Broadcasting update:', {
    type: update.type,
    targetRole,
    targetUserId,
    timestamp: update.timestamp,
  });

  // Simulate WebSocket broadcast
  if (typeof global !== 'undefined' && (global as any).io) {
    const io = (global as any).io;
    
    if (targetUserId) {
      io.to(`user:${targetUserId}`).emit('dashboard_update', update);
    } else if (targetRole) {
      io.to(`role:${targetRole}`).emit('dashboard_update', update);
    } else {
      io.emit('dashboard_update', update);
    }
  }
}

// Generate sample real-time updates for demonstration
export function generateSampleUpdates() {
  const sampleUpdates: DashboardUpdate[] = [
    {
      type: 'activity',
      data: {
        title: 'New Assignment Submitted',
        description: 'John Doe submitted Math Assignment #5',
        icon: 'FileText',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    },
    {
      type: 'stats',
      data: {
        metric: 'attendance',
        value: 95,
        change: +2,
        label: 'Today\'s Attendance',
      },
      timestamp: new Date().toISOString(),
    },
    {
      type: 'notification',
      data: {
        title: 'Parent-Teacher Meeting',
        message: 'Scheduled for tomorrow at 3:00 PM',
        type: 'info',
        actionUrl: '/meetings',
      },
      timestamp: new Date().toISOString(),
    },
    {
      type: 'achievement',
      data: {
        title: 'Perfect Attendance Badge',
        description: 'Sarah Ahmed earned perfect attendance for the month',
        badgeType: 'attendance',
        level: 'gold',
      },
      timestamp: new Date().toISOString(),
    },
  ];

  // Store sample updates for all roles
  const roles = ['admin', 'teacher', 'student', 'guardian'];
  roles.forEach(role => {
    const existingUpdates = realtimeUpdates.get(role) || [];
    realtimeUpdates.set(role, [...sampleUpdates, ...existingUpdates].slice(0, 100));
  });
}

// Initialize with sample data
if (realtimeUpdates.size === 0) {
  generateSampleUpdates();
}

// WebSocket integration helper
export function setupWebSocketIntegration(io: any) {
  if (typeof global !== 'undefined') {
    (global as any).io = io;
  }

  io.on('connection', (socket: any) => {
    console.log('Dashboard WebSocket client connected:', socket.id);

    // Handle subscription to dashboard updates
    socket.on('subscribe_dashboard', (data: { role: string; userId: string }) => {
      const { role, userId } = data;
      
      // Join role-based room
      socket.join(`role:${role}`);
      
      // Join user-specific room
      if (userId) {
        socket.join(`user:${userId}`);
      }

      // Track connection
      if (!connections.has(role)) {
        connections.set(role, new Set());
      }
      connections.get(role)?.add(socket.id);

      console.log(`Client ${socket.id} subscribed to dashboard updates for role: ${role}`);

      // Send initial updates
      const updates = getRealtimeUpdates(role, userId);
      socket.emit('dashboard_initial', { updates });
    });

    // Handle dashboard action
    socket.on('dashboard_action', (data: any) => {
      console.log('Dashboard action received:', data);
      
      // Process the action and potentially broadcast updates
      const update: DashboardUpdate = {
        type: 'activity',
        data: {
          title: 'User Action',
          description: `Action: ${data.action}`,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };

      // Broadcast to relevant users
      broadcastUpdate(update, data.targetRole, data.targetUserId);
    });

    socket.on('disconnect', () => {
      console.log('Dashboard WebSocket client disconnected:', socket.id);
      
      // Clean up connections
      connections.forEach((socketSet, role) => {
        socketSet.delete(socket.id);
      });
    });
  });
}

// Utility function to trigger real-time updates from other parts of the application
export async function triggerDashboardUpdate(
  type: DashboardUpdate['type'],
  data: any,
  targetRole?: string,
  targetUserId?: string
) {
  const update: DashboardUpdate = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  await storeRealtimeUpdate(update, targetRole, targetUserId);
  broadcastUpdate(update, targetRole, targetUserId);
}

// Export for use in other parts of the application
export { triggerDashboardUpdate as notifyDashboard };
