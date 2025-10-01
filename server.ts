import next from 'next';
import { createServer } from 'http';
import { initializeSocketServer } from './app/lib/socket-server';
import { validateEnvironmentOrThrow } from './app/lib/environment-validator';
import { prisma } from './app/lib/prisma';

// Validate environment variables before starting
try {
  console.log('🔍 Validating environment configuration...');
  validateEnvironmentOrThrow();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '5000', 10);

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Global references for graceful shutdown
let socketServer: any = null;
let httpServer: any = null;
let isShuttingDown = false;

app.prepare().then(() => {
  // Create HTTP server
  httpServer = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err: any) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO server with error handling
  try {
    socketServer = initializeSocketServer(httpServer);
    console.log('🔌 Socket.IO server initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Socket.IO server:', error);
    process.exit(1);
  }

  // Start the server
  httpServer
    .once('error', (err: any) => {
      console.error('Server error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      console.log(`📡 Socket.IO ready on ws://${hostname}:${port}/api/socket`);
      console.log(`🔍 Health check available at http://${hostname}:${port}/api/health`);
    });

  // Graceful shutdown function
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log('⚠️ Shutdown already in progress, forcing exit...');
      process.exit(1);
    }

    isShuttingDown = true;
    console.log(`${signal} received, shutting down gracefully...`);

    // Set a timeout to force exit if graceful shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      console.error('❌ Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    try {
      // Close Socket.IO server
      if (socketServer && typeof socketServer.close === 'function') {
        console.log('🔌 Closing Socket.IO server...');
        await socketServer.close();
      }

      // Close HTTP server
      if (httpServer) {
        console.log('🌐 Closing HTTP server...');
        await new Promise<void>((resolve) => {
          httpServer.close(() => {
            console.log('✅ HTTP server closed');
            resolve();
          });
        });
      }

      // Disconnect Prisma
      console.log('🗄️ Disconnecting from database...');
      await prisma.$disconnect();
      console.log('✅ Database disconnected');

      clearTimeout(forceExitTimeout);
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
}).catch((error) => {
  console.error('❌ Failed to prepare Next.js app:', error);
  process.exit(1);
});
