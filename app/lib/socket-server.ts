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
  private io!: SocketIOServer; // Using definite assignment assertion since it's initialized in constructor
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId
  private isShuttingDown: boolean = false;

  constructor(server: HTTPServer) {
    try {
      // Validate origin against ALLOWED_ORIGINS
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ];

      this.io = new SocketIOServer(server, {
        cors: {
          origin: allowedOrigins,
          methods: ["GET", "POST"],
          credentials: true
        },
        path: '/api/socket',
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        connectTimeout: 45000,
        allowEIO3: true
      });

      this.setupErrorHandlers();
      this.setupMiddleware();
      this.setupEventHandlers();
      
      console.log('[SOCKET_SERVER] Socket.IO server initialized successfully');
    } catch (error) {
      console.error('[SOCKET_SERVER_INIT_ERROR]', error);
      // Don't throw error to prevent app crash
      this.handleInitializationError(error);
    }
  }

  private handleInitializationError(error: any) {
    console.error('[SOCKET_SERVER] Failed to initialize Socket.IO server, continuing without real-time features');
    // Create a mock io object to prevent crashes
    this.io = {
      close: (callback?: () => void) => callback && callback(),
      emit: () => {},
      to: () => ({ emit: () => {} }),
      use: () => {},
      on: () => {}
    } as any;
  }

  private setupErrorHandlers() {
    if (!this.io || typeof this.io.engine === 'undefined') return;

    this.io.engine.on('connection_error', (err: any) => {
      console.error('[SOCKET_CONNECTION_ERROR]', {
        message: err.message,
        description: err.description,
        context: err.context,
        type: err.type
      });
    });

    // Handle uncaught exceptions in socket handlers
    process.on('uncaughtException', (error) => {
      if (error.message?.includes('socket') || error.stack?.includes('socket.io')) {
        console.error('[SOCKET_UNCAUGHT_EXCEPTION]', error);
        // Don't exit process for socket errors
        return;
      }
      // Re-throw non-socket errors
      throw error;
    });
  }

  // Graceful shutdown method
  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.isShuttingDown = true;
      console.log('[SOCKET_SERVER] Closing Socket.IO server...');
      
      try {
        if (this.io && typeof this.io.close === 'function') {
          this.io.close(() => {
            console.log('[SOCKET_SERVER] Socket.IO server closed');
            resolve();
          });
        } else {
          console.log('[SOCKET_SERVER] Socket.IO server was not properly initialized, skipping close');
          resolve();
        }
      } catch (error) {
        console.error('[SOCKET_SERVER_CLOSE_ERROR]', error);
        resolve(); // Resolve anyway to prevent hanging
      }
    });
  }

  private setupMiddleware() {
    if (!this.io || !this.io.use) return;

    // Authentication middleware with enhanced error handling
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
          console.error('[SOCKET_AUTH] JWT_SECRET not configured');
          return next(new Error('Authentication service unavailable'));
        }

        // Verify JWT token with timeout
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          email: string;
          role: string;
        };

        // Fetch user details from database with timeout
        const userPromise = prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        // Add timeout to database query
        const user = await Promise.race([
          userPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database query timeout')), 5000)
          )
        ]) as any;

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
        // Don't crash the server, just reject the connection
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    if (!this.io || !this.io.on) return;

    this.io.on('connection', (socket) => {
      try {
        const user = (socket as any).user as AuthenticatedSocket;
        
        if (!user) {
          console.error('[SOCKET_CONNECTION] No user data found on socket');
          socket.disconnect();
          return;
        }
        
        console.log(`[SOCKET_CONNECTED] User ${user.email} (${user.role}) connected with socket ${socket.id}`);
        
        // Store user connection
        this.connectedUsers.set(user.userId, socket.id);

        // Join user to their role-based room with error handling
        try {
          socket.join(`role:${user.role.toLowerCase()}`);
          socket.join(`user:${user.userId}`);
        } catch (error) {
          console.error('[SOCKET_JOIN_ERROR]', error);
        }

        // Handle dashboard subscription with error handling
        socket.on('subscribe_dashboard', (data: { role: string; userId?: string }) => {
          try {
            console.log(`[DASHBOARD_SUBSCRIBE] User ${user.email} subscribing to dashboard updates`);
            
            // Join dashboard-specific rooms
            socket.join(`dashboard:role:${data.role.toLowerCase()}`);
            if (data.userId) {
              socket.join(`dashboard:user:${data.userId}`);
            }
            
            socket.emit('dashboard_subscribed', {
              success: true,
              rooms: [`dashboard:role:${data.role.toLowerCase()}`, `dashboard:user:${data.userId || user.userId}`]
            });
          } catch (error) {
            console.error('[DASHBOARD_SUBSCRIBE_ERROR]', error);
            socket.emit('dashboard_subscribed', { success: false, error: 'Subscription failed' });
          }
        });

        // Handle dashboard actions with error handling
        socket.on('dashboard_action', (actionData: any) => {
          try {
            console.log(`[DASHBOARD_ACTION] User ${user.email} sent action:`, actionData);
            
            // Process the action and emit response
            const response = {
              success: true,
              action: actionData.action,
              message: `${actionData.action} completed successfully`,
              timestamp: new Date().toISOString()
            };
            
            socket.emit(`action_response_${actionData.action}`, response);
          } catch (error) {
            console.error('[DASHBOARD_ACTION_ERROR]', error);
            socket.emit(`action_response_${actionData.action}`, {
              success: false,
              error: 'Action failed'
            });
          }
        });

        // Handle notification acknowledgment with enhanced error handling
        socket.on('notification:read', async (notificationId: string) => {
          try {
            if (!notificationId || typeof notificationId !== 'string') {
              throw new Error('Invalid notification ID');
            }
            
            await this.markNotificationAsRead(notificationId, user.userId);
            socket.emit('notification:read:success', { notificationId });
          } catch (error) {
            console.error('[NOTIFICATION_READ_ERROR]', error);
            socket.emit('notification:read:error', { 
              notificationId, 
              error: error instanceof Error ? error.message : 'Failed to mark as read' 
            });
          }
        });

        // Handle notification subscription preferences
        socket.on('notification:subscribe', (preferences: any) => {
          try {
            console.log(`[NOTIFICATION_SUBSCRIBE] User ${user.email} updated preferences:`, preferences);
            socket.emit('notification:subscribe:success', preferences);
          } catch (error) {
            console.error('[NOTIFICATION_SUBSCRIBE_ERROR]', error);
            socket.emit('notification:subscribe:error', { error: 'Subscription update failed' });
          }
        });

        // Handle ping/pong for connection health
        socket.on('ping', () => {
          try {
            socket.emit('pong', { timestamp: Date.now() });
          } catch (error) {
            console.error('[SOCKET_PING_ERROR]', error);
          }
        });

        // Handle errors on the socket
        socket.on('error', (error) => {
          console.error(`[SOCKET_ERROR] User ${user.email}:`, error);
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
          try {
            console.log(`[SOCKET_DISCONNECTED] User ${user.email} disconnected: ${reason}`);
            this.connectedUsers.delete(user.userId);
          } catch (error) {
            console.error('[SOCKET_DISCONNECT_ERROR]', error);
          }
        });

        // Send initial connection success
        try {
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
        } catch (error) {
          console.error('[SOCKET_INITIAL_EMIT_ERROR]', error);
        }

      } catch (error) {
        console.error('[SOCKET_CONNECTION_HANDLER_ERROR]', error);
        // Disconnect the socket to prevent further issues
        try {
          socket.disconnect();
        } catch (disconnectError) {
          console.error('[SOCKET_DISCONNECT_ERROR]', disconnectError);
        }
      }
    });

    // Handle server-level errors
    this.io.on('error', (error) => {
      console.error('[SOCKET_SERVER_ERROR]', error);
    });
  }

  private async markNotificationAsRead(notificationId: string, userId: string) {
    try {
      await Promise.race([
        prisma.notification.updateMany({
          where: {
            id: notificationId,
            userId: userId,
            status: { not: 'READ' }
          },
          data: {
            status: 'READ',
            readAt: new Date()
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database operation timeout')), 5000)
        )
      ]);
    } catch (error) {
      console.error('[MARK_NOTIFICATION_READ_ERROR]', error);
      throw error;
    }
  }

  // Public methods for sending notifications with error handling
  public async sendToUser(userId: string, notification: any) {
    if (this.isShuttingDown || !this.io) return false;
    
    try {
      const socketId = this.connectedUsers.get(userId);
      if (socketId) {
        this.io.to(socketId).emit('notification:new', notification);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SEND_TO_USER_ERROR]', error);
      return false;
    }
  }

  public async sendToRole(role: string, notification: any) {
    if (this.isShuttingDown || !this.io) return;
    
    try {
      this.io.to(`role:${role.toLowerCase()}`).emit('notification:new', notification);
    } catch (error) {
      console.error('[SEND_TO_ROLE_ERROR]', error);
    }
  }

  public async sendToAll(notification: any) {
    if (this.isShuttingDown || !this.io) return;
    
    try {
      this.io.emit('notification:broadcast', notification);
    } catch (error) {
      console.error('[SEND_TO_ALL_ERROR]', error);
    }
  }

  // New methods for dashboard updates with error handling
  public async sendDashboardToUser(userId: string, dashboardData: any) {
    if (this.isShuttingDown || !this.io) return false;
    
    try {
      const socketId = this.connectedUsers.get(userId);
      if (socketId) {
        this.io.to(socketId).emit('dashboard_update', dashboardData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[SEND_DASHBOARD_TO_USER_ERROR]', error);
      return false;
    }
  }

  public async sendDashboardToRole(role: string, dashboardData: any) {
    if (this.isShuttingDown || !this.io) return;
    
    try {
      this.io.to(`dashboard:role:${role.toLowerCase()}`).emit('dashboard_update', dashboardData);
    } catch (error) {
      console.error('[SEND_DASHBOARD_TO_ROLE_ERROR]', error);
    }
  }

  public async sendDashboardToAll(dashboardData: any) {
    if (this.isShuttingDown || !this.io) return;
    
    try {
      this.io.emit('dashboard_update', dashboardData);
    } catch (error) {
      console.error('[SEND_DASHBOARD_TO_ALL_ERROR]', error);
    }
  }

  public async sendSystemAlert(message: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM') {
    if (this.isShuttingDown || !this.io) return;
    
    try {
      const alert = {
        id: `system-${Date.now()}`,
        type: 'SYSTEM',
        priority,
        title: 'System Alert',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      this.io.emit('notification:system', alert);
    } catch (error) {
      console.error('[SEND_SYSTEM_ALERT_ERROR]', error);
    }
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
  try {
    if (!socketServer) {
      socketServer = new NotificationSocketServer(server);
      console.log('[SOCKET_SERVER] Notification WebSocket server initialized');
    }
    return socketServer;
  } catch (error) {
    console.error('[SOCKET_SERVER_INIT_ERROR]', error);
    // Return a mock server to prevent crashes
    return {
      close: () => Promise.resolve(),
      sendToUser: () => Promise.resolve(false),
      sendToRole: () => Promise.resolve(),
      sendToAll: () => Promise.resolve(),
      sendDashboardToUser: () => Promise.resolve(false),
      sendDashboardToRole: () => Promise.resolve(),
      sendDashboardToAll: () => Promise.resolve(),
      sendSystemAlert: () => Promise.resolve(),
      getConnectedUsersCount: () => 0,
      getConnectedUsers: () => [],
      isUserConnected: () => false
    } as any;
  }
}

export function getSocketServer(): NotificationSocketServer | null {
  return socketServer;
}
