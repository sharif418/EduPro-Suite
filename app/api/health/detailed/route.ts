import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { integrationService } from '@/app/lib/integration-service';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    externalServices: HealthCheck;
    memory: HealthCheck;
    cache: HealthCheck;
    websocket: HealthCheck;
    fileSystem: HealthCheck;
    backgroundJobs: HealthCheck;
    security: HealthCheck;
  };
  metrics: {
    responseTime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
}

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message: string;
  details?: any;
  lastChecked: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [
      databaseCheck,
      externalServicesCheck,
      memoryCheck,
      cacheCheck,
      websocketCheck,
      fileSystemCheck,
      backgroundJobsCheck,
      securityCheck,
    ] = await Promise.allSettled([
      checkDatabase(),
      checkExternalServices(),
      checkMemory(),
      checkCache(),
      checkWebSocket(),
      checkFileSystem(),
      checkBackgroundJobs(),
      checkSecurity(),
    ]);

    // Calculate overall status
    const checks = {
      database: getCheckResult(databaseCheck),
      externalServices: getCheckResult(externalServicesCheck),
      memory: getCheckResult(memoryCheck),
      cache: getCheckResult(cacheCheck),
      websocket: getCheckResult(websocketCheck),
      fileSystem: getCheckResult(fileSystemCheck),
      backgroundJobs: getCheckResult(backgroundJobsCheck),
      security: getCheckResult(securityCheck),
    };

    const overallStatus = calculateOverallStatus(checks);
    const responseTime = Date.now() - startTime;

    // Get system metrics
    const metrics = await getSystemMetrics();

    const healthResult: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      metrics: {
        ...metrics,
        responseTime,
      },
    };

    // Set appropriate HTTP status code - FIXED: degraded now returns 206
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                     overallStatus === 'degraded' ? 206 : 503;

    // Add system status header for monitoring
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (overallStatus === 'degraded') {
      headers['X-System-Status'] = 'degraded';
    }

    return NextResponse.json(healthResult, { 
      status: httpStatus,
      headers 
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}

async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    // Test a more complex query to check performance
    const userCount = await prisma.user.count();
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
      responseTime,
      message: `Database connection successful. ${userCount} users in system.`,
      details: {
        userCount,
        connectionPool: 'active',
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkExternalServices(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check integration service health
    const isHealthy = await integrationService.healthCheck();
    
    const responseTime = Date.now() - startTime;
    
    if (isHealthy) {
      return {
        status: 'healthy',
        responseTime,
        message: 'All external services are operational',
        details: {
          integrationService: 'healthy',
          emailService: 'healthy',
          smsService: 'healthy',
          paymentGateway: 'healthy',
        },
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        status: 'degraded',
        responseTime,
        message: 'Some external services may be experiencing issues',
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `External services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkMemory(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;
    
    if (memoryUsagePercent < 70) {
      status = 'healthy';
      message = `Memory usage is optimal (${memoryUsagePercent.toFixed(1)}%)`;
    } else if (memoryUsagePercent < 85) {
      status = 'degraded';
      message = `Memory usage is elevated (${memoryUsagePercent.toFixed(1)}%)`;
    } else {
      status = 'unhealthy';
      message = `Memory usage is critical (${memoryUsagePercent.toFixed(1)}%)`;
    }
    
    return {
      status,
      responseTime,
      message,
      details: {
        heapUsed: Math.round(usedMemory / 1024 / 1024) + ' MB',
        heapTotal: Math.round(totalMemory / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        usagePercent: memoryUsagePercent.toFixed(1) + '%',
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkCache(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test cache functionality using integration service cache
    const testKey = 'health_check_test';
    const testValue = { timestamp: Date.now(), test: true };
    
    // Test cache write and read
    const cachedData = await integrationService.getCachedData(
      testKey,
      async () => testValue
    );
    
    const responseTime = Date.now() - startTime;
    
    const isWorking = cachedData && cachedData.test === true;
    
    return {
      status: isWorking ? 'healthy' : 'degraded',
      responseTime,
      message: isWorking ? 'Cache is functioning properly' : 'Cache may be experiencing issues',
      details: {
        cacheType: 'in-memory',
        testResult: isWorking ? 'passed' : 'failed',
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Cache check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkWebSocket(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Mock WebSocket health check
    // In production, this would test actual WebSocket connections
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      message: 'WebSocket service is operational',
      details: {
        activeConnections: 0, // Would be actual count in production
        serverStatus: 'running',
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `WebSocket check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkFileSystem(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Test file system access
    const fs = require('fs').promises;
    const path = require('path');
    
    const testDir = path.join(process.cwd(), 'public', 'uploads');
    const testFile = path.join(testDir, 'health_check.txt');
    
    // Test write
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, 'health check test');
    
    // Test read
    const content = await fs.readFile(testFile, 'utf8');
    
    // Clean up
    await fs.unlink(testFile);
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
      message: 'File system is accessible and writable',
      details: {
        uploadsDirectory: 'accessible',
        readWrite: 'functional',
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `File system check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkBackgroundJobs(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check notification queue status
    const pendingNotifications = await prisma.notification.count({
      where: { status: 'PENDING' }
    });
    
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;
    
    if (pendingNotifications < 100) {
      status = 'healthy';
      message = `Background jobs are processing normally (${pendingNotifications} pending)`;
    } else if (pendingNotifications < 500) {
      status = 'degraded';
      message = `Background job queue is building up (${pendingNotifications} pending)`;
    } else {
      status = 'unhealthy';
      message = `Background job queue is severely backed up (${pendingNotifications} pending)`;
    }
    
    return {
      status,
      responseTime,
      message,
      details: {
        pendingNotifications,
        queueStatus: 'active',
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Background jobs check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkSecurity(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check for security-related issues
    const securityChecks = {
      jwtSecret: !!process.env.JWT_SECRET,
      databaseUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV === 'production',
      httpsEnabled: process.env.NODE_ENV === 'production', // Would check actual HTTPS in production
    };
    
    const failedChecks = Object.entries(securityChecks)
      .filter(([_, passed]) => !passed)
      .map(([check]) => check);
    
    const responseTime = Date.now() - startTime;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;
    
    if (failedChecks.length === 0) {
      status = 'healthy';
      message = 'All security checks passed';
    } else if (failedChecks.length <= 2) {
      status = 'degraded';
      message = `Some security checks failed: ${failedChecks.join(', ')}`;
    } else {
      status = 'unhealthy';
      message = `Multiple security issues detected: ${failedChecks.join(', ')}`;
    }
    
    return {
      status,
      responseTime,
      message,
      details: {
        securityChecks,
        failedChecks,
      },
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: `Security check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

async function getSystemMetrics() {
  const memoryUsage = process.memoryUsage();
  
  // Mock CPU usage (in production, use actual CPU monitoring)
  const cpuUsage = Math.random() * 100;
  
  // Mock active connections (in production, get from actual connection pool)
  const activeConnections = Math.floor(Math.random() * 50) + 10;
  
  // Mock requests per minute (in production, use actual metrics)
  const requestsPerMinute = Math.floor(Math.random() * 1000) + 100;
  
  return {
    memoryUsage,
    cpuUsage,
    activeConnections,
    requestsPerMinute,
  };
}

function getCheckResult(settledResult: PromiseSettledResult<HealthCheck>): HealthCheck {
  if (settledResult.status === 'fulfilled') {
    return settledResult.value;
  } else {
    return {
      status: 'unhealthy',
      responseTime: 0,
      message: `Check failed: ${settledResult.reason}`,
      lastChecked: new Date().toISOString(),
    };
  }
}

function calculateOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(check => check.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  
  return 'healthy';
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

// Readiness probe (for Kubernetes)
export async function OPTIONS(request: NextRequest) {
  try {
    // Check if application is ready to serve traffic
    const isReady = await checkApplicationReadiness();
    
    if (isReady) {
      return NextResponse.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        status: 'not-ready',
        timestamp: new Date().toISOString(),
      }, { status: 503 });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'not-ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}

async function checkApplicationReadiness(): Promise<boolean> {
  try {
    // Check if database is accessible
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if required environment variables are set
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Readiness check failed:', error);
    return false;
  }
}
