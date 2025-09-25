'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Alert, AlertDescription } from '@/app/components/ui/Alert';
import EducationalCharts from '@/app/components/charts/EducationalCharts';
import StatCard from '@/app/components/ui/StatCard';
import { useDashboardData } from '@/app/hooks/useDashboardData';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Globe, 
  HardDrive, 
  Mail, 
  MessageSquare, 
  Monitor, 
  RefreshCw, 
  Server, 
  Shield, 
  Users, 
  Wifi,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface HealthCheckData {
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

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export function SystemMonitoring() {
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: dashboardData } = useDashboardData({ role: 'admin' });

  // Fetch health data
  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health/detailed');
      const data = await response.json();
      setHealthData(data);
      setLastRefresh(new Date());
      
      // Generate alerts based on health data
      generateAlerts(data);
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      setAlerts(prev => [...prev, {
        id: Date.now().toString(),
        type: 'error',
        title: 'Health Check Failed',
        message: 'Unable to fetch system health data',
        timestamp: new Date().toISOString(),
        acknowledged: false,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh health data
  useEffect(() => {
    fetchHealthData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchHealthData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const generateAlerts = (data: HealthCheckData) => {
    const newAlerts: SystemAlert[] = [];
    
    // Check each health check for issues
    Object.entries(data.checks).forEach(([checkName, check]) => {
      if (check.status === 'unhealthy') {
        newAlerts.push({
          id: `${checkName}_${Date.now()}`,
          type: 'error',
          title: `${checkName.charAt(0).toUpperCase() + checkName.slice(1)} Unhealthy`,
          message: check.message,
          timestamp: check.lastChecked,
          acknowledged: false,
        });
      } else if (check.status === 'degraded') {
        newAlerts.push({
          id: `${checkName}_${Date.now()}`,
          type: 'warning',
          title: `${checkName.charAt(0).toUpperCase() + checkName.slice(1)} Degraded`,
          message: check.message,
          timestamp: check.lastChecked,
          acknowledged: false,
        });
      }
    });

    // Check system metrics
    if (data.metrics.cpuUsage > 80) {
      newAlerts.push({
        id: `cpu_${Date.now()}`,
        type: 'warning',
        title: 'High CPU Usage',
        message: `CPU usage is at ${data.metrics.cpuUsage.toFixed(1)}%`,
        timestamp: data.timestamp,
        acknowledged: false,
      });
    }

    const memoryUsagePercent = (data.metrics.memoryUsage.heapUsed / data.metrics.memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 85) {
      newAlerts.push({
        id: `memory_${Date.now()}`,
        type: 'error',
        title: 'Critical Memory Usage',
        message: `Memory usage is at ${memoryUsagePercent.toFixed(1)}%`,
        timestamp: data.timestamp,
        acknowledged: false,
      });
    }

    setAlerts(prev => {
      // Remove old alerts and add new ones
      const filtered = prev.filter(alert => 
        Date.now() - new Date(alert.timestamp).getTime() < 24 * 60 * 60 * 1000 // Keep alerts for 24 hours
      );
      return [...filtered, ...newAlerts];
    });
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTrendIcon = (value: number, threshold: number) => {
    if (value > threshold * 1.1) {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    } else if (value < threshold * 0.9) {
      return <TrendingDown className="w-4 h-4 text-green-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-2 text-gray-600">Loading system monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button onClick={fetchHealthData} size="sm" variant="outline">
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall System Status */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Overall Status"
                value={healthData.status}
                icon={getStatusIcon(healthData.status)}
                trend={{ direction: healthData.status === 'healthy' ? 'up' : 'down', percentage: 0 }}
              />
              <StatCard
                title="Uptime"
                value={formatUptime(healthData.uptime)}
                icon={<Clock className="w-5 h-5 text-blue-500" />}
                trend={{ direction: 'up', percentage: 0 }}
              />
              <StatCard
                title="Response Time"
                value={`${healthData.metrics.responseTime}ms`}
                icon={<Activity className="w-5 h-5 text-purple-500" />}
                trend={{ direction: healthData.metrics.responseTime < 500 ? 'up' : 'down', percentage: 0 }}
              />
              <StatCard
                title="Active Users"
                value={dashboardData?.totalUsers || 0}
                icon={<Users className="w-5 h-5 text-green-500" />}
                trend={{ direction: 'up', percentage: 0 }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts.filter(alert => !alert.acknowledged).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Active Alerts ({alerts.filter(alert => !alert.acknowledged).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts
                .filter(alert => !alert.acknowledged)
                .slice(0, 5)
                .map(alert => (
                  <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'warning'}>
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <strong>{alert.title}</strong>
                          <p className="text-sm mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Checks Grid */}
      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Database className="w-4 h-4 mr-2" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(healthData.checks.database.status)}
                <span className="text-xs text-gray-500">
                  {healthData.checks.database.responseTime}ms
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {healthData.checks.database.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Globe className="w-4 h-4 mr-2" />
                External Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(healthData.checks.externalServices.status)}
                <span className="text-xs text-gray-500">
                  {healthData.checks.externalServices.responseTime}ms
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {healthData.checks.externalServices.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Server className="w-4 h-4 mr-2" />
                Memory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(healthData.checks.memory.status)}
                <span className="text-xs text-gray-500">
                  {formatBytes(healthData.metrics.memoryUsage.heapUsed)}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {healthData.checks.memory.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Wifi className="w-4 h-4 mr-2" />
                WebSocket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(healthData.checks.websocket.status)}
                <span className="text-xs text-gray-500">
                  {healthData.metrics.activeConnections} active
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {healthData.checks.websocket.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <HardDrive className="w-4 h-4 mr-2" />
                File System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(healthData.checks.fileSystem.status)}
                <span className="text-xs text-gray-500">
                  {healthData.checks.fileSystem.responseTime}ms
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {healthData.checks.fileSystem.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Activity className="w-4 h-4 mr-2" />
                Background Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(healthData.checks.backgroundJobs.status)}
                <span className="text-xs text-gray-500">
                  {healthData.checks.backgroundJobs.details?.pendingNotifications || 0} pending
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {healthData.checks.backgroundJobs.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Shield className="w-4 h-4 mr-2" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(healthData.checks.security.status)}
                <span className="text-xs text-gray-500">
                  {healthData.checks.security.details?.failedChecks?.length || 0} issues
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {healthData.checks.security.message}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm">
                <Activity className="w-4 h-4 mr-2" />
                Cache
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                {getStatusBadge(healthData.checks.cache.status)}
                <span className="text-xs text-gray-500">
                  {healthData.checks.cache.responseTime}ms
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {healthData.checks.cache.message}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics */}
      {healthData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">CPU Usage</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{healthData.metrics.cpuUsage.toFixed(1)}%</span>
                    {getTrendIcon(healthData.metrics.cpuUsage, 50)}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      healthData.metrics.cpuUsage > 80 ? 'bg-red-500' :
                      healthData.metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(healthData.metrics.cpuUsage, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      {formatBytes(healthData.metrics.memoryUsage.heapUsed)} / {formatBytes(healthData.metrics.memoryUsage.heapTotal)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (healthData.metrics.memoryUsage.heapUsed / healthData.metrics.memoryUsage.heapTotal) > 0.85 ? 'bg-red-500' :
                      (healthData.metrics.memoryUsage.heapUsed / healthData.metrics.memoryUsage.heapTotal) > 0.70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${(healthData.metrics.memoryUsage.heapUsed / healthData.metrics.memoryUsage.heapTotal) * 100}%` 
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Requests/Min</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{healthData.metrics.requestsPerMinute}</span>
                    {getTrendIcon(healthData.metrics.requestsPerMinute, 500)}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active Connections</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{healthData.metrics.activeConnections}</span>
                    {getTrendIcon(healthData.metrics.activeConnections, 25)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Version</span>
                  <span className="text-sm">{healthData.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Environment</span>
                  <Badge variant={healthData.environment === 'production' ? 'default' : 'secondary'}>
                    {healthData.environment}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Node.js Version</span>
                  <span className="text-sm">{process.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Platform</span>
                  <span className="text-sm">{process.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Architecture</span>
                  <span className="text-sm">{process.arch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">PID</span>
                  <span className="text-sm">{process.pid}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Charts */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Response Time Trend</h4>
                <div className="flex items-end space-x-2 h-20">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-indigo-500 rounded-t"
                      style={{
                        height: `${Math.random() * 80 + 20}%`,
                        width: '12px',
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Last 7 days</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Memory Usage</h4>
                <div className="flex items-center justify-center h-20">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
                    <div 
                      className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent"
                      style={{
                        transform: `rotate(${(healthData.metrics.memoryUsage.heapUsed / healthData.metrics.memoryUsage.heapTotal) * 360}deg)`
                      }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {Math.round((healthData.metrics.memoryUsage.heapUsed / healthData.metrics.memoryUsage.heapTotal) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">Memory utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent System Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 10).map(alert => (
              <div key={alert.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  {alert.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-blue-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-gray-500">{alert.message}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                  {alert.acknowledged && (
                    <Badge variant="secondary" size="sm">Acknowledged</Badge>
                  )}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>No recent alerts. System is running smoothly.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SystemMonitoring;
