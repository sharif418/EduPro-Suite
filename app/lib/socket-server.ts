import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedSocket {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

export class NotificationSocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/api/socket'
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
          return next(new Error('JWT secret not configured'));
        }

        // Verify JWT token
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
          return next(new Error('User not found'));
        }

        // Attach user info to socket
        (socket as any).user = {
          userId: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        } as AuthenticatedSocket;

        next();
      } catch (error) {
        console.error('[SOCKET_AUTH_ERROR]', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const user = (socket as any).user as AuthenticatedSocket;
      
      console.log(`[SOCKET_CONNECTED] User ${user.email} (${user.role}) connected with socket ${socket.id}`);
      
      // Store user connection
      this.connectedUsers.set(user.userId, socket.id);

      // Join user to their role-based room
      socket.join(`role:${user.role.toLowerCase()}`);
      socket.join(`user:${user.userId}`);

      // Handle notification acknowledgment
      socket.on('notification:read', async (notificationId: string) => {
        try {
          await this.markNotificationAsRead(notificationId, user.userId);
          socket.emit('notification:read:success', { notificationId });
        } catch (error) {
          console.error('[NOTIFICATION_READ_ERROR]', error);
          socket.emit('notification:read:error', { notificationId, error: 'Failed to mark as read' });
        }
      });

      // Handle notification subscription preferences
      socket.on('notification:subscribe', (preferences: any) => {
        console.log(`[NOTIFICATION_SUBSCRIBE] User ${user.email} updated preferences:`, preferences);
        // This will be handled by the notification preference API
        socket.emit('notification:subscribe:success', preferences);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[SOCKET_DISCONNECTED] User ${user.email} disconnected: ${reason}`);
        this.connectedUsers.delete(user.userId);
      });

      // Send initial connection success
      socket.emit('connected', {
        message: 'Successfully connected to notification service',
        user: {
          id: user.userId,
          email: user.email,
          role: user.role,
          name: user.name
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  private async markNotificationAsRead(notificationId: string, userId: string) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId,
        status: { not: 'READ' }
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    });
  }

  // Public methods for sending notifications
  public async sendToUser(userId: string, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification:new', notification);
      return true;
    }
    return false;
  }

  public async sendToRole(role: string, notification: any) {
    this.io.to(`role:${role.toLowerCase()}`).emit('notification:new', notification);
  }

  public async sendToAll(notification: any) {
    this.io.emit('notification:broadcast', notification);
  }

  public async sendSystemAlert(message: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM') {
    const alert = {
      id: `system-${Date.now()}`,
      type: 'SYSTEM',
      priority,
      title: 'System Alert',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    this.io.emit('notification:system', alert);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}

// Global instance
let socketServer: NotificationSocketServer | null = null;

export function initializeSocketServer(server: HTTPServer): NotificationSocketServer {
  if (!socketServer) {
    socketServer = new NotificationSocketServer(server);
    console.log('[SOCKET_SERVER] Notification WebSocket server initialized');
  }
  return socketServer;
}

export function getSocketServer(): NotificationSocketServer | null {
  return socketServer;
}
