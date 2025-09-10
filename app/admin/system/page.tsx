'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Server,
  Database,
  Globe,
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Download,
  Settings,
  Monitor,
  Cpu,
  HardDrive,
  Wifi,
  Shield,
  Clock,
  Zap
} from 'lucide-react';

export default function AdminSystemPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [systemMetrics, setSystemMetrics] = useState<any>({});
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (user.user_metadata?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setUser(user);
      await loadSystemData();
    };

    checkAdminAccess();
  }, [router]);

  const loadSystemData = async () => {
    try {
      // Mock system metrics
      setSystemMetrics({
        uptime: '15 days, 4 hours',
        cpuUsage: 23,
        memoryUsage: 67,
        diskUsage: 45,
        networkLatency: 12,
        activeConnections: 1247,
        requestsPerMinute: 3456,
        errorRate: 0.02,
        responseTime: 145
      });

      // Mock system logs
      setSystemLogs([
        {
          id: '1',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          level: 'info',
          message: 'System backup completed successfully',
          component: 'backup-service'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          level: 'warning',
          message: 'High memory usage detected (85%)',
          component: 'monitoring'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          level: 'info',
          message: 'Email service restarted',
          component: 'email-service'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          level: 'error',
          message: 'Failed to connect to external API',
          component: 'aurinko-api'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          level: 'info',
          message: 'Database optimization completed',
          component: 'database'
        }
      ]);
    } catch (error) {
      console.error('Error loading system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-3 w-3" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />;
      case 'info':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Admin</span>
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">System Monitoring</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Monitor system health and performance</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                System Healthy
              </Badge>
              <Button variant="outline" onClick={loadSystemData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                System Uptime
              </CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemMetrics.uptime}
              </div>
              <p className="text-xs text-green-600 mt-1">
                99.9% availability
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                CPU Usage
              </CardTitle>
              <Cpu className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemMetrics.cpuUsage}%
              </div>
              <Progress value={systemMetrics.cpuUsage} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Memory Usage
              </CardTitle>
              <Monitor className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemMetrics.memoryUsage}%
              </div>
              <Progress value={systemMetrics.memoryUsage} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Disk Usage
              </CardTitle>
              <HardDrive className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {systemMetrics.diskUsage}%
              </div>
              <Progress value={systemMetrics.diskUsage} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        {/* System Monitoring Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">System Health</CardTitle>
                  <CardDescription>Current status of all system components</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Web Server</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Database</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Email Service</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Wifi className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">External APIs</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                      Degraded
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Performance Metrics</CardTitle>
                  <CardDescription>Real-time system performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium">Active Connections</span>
                    <span className="text-2xl font-bold text-blue-600">{systemMetrics.activeConnections?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium">Requests/Minute</span>
                    <span className="text-2xl font-bold text-green-600">{systemMetrics.requestsPerMinute?.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium">Error Rate</span>
                    <span className="text-2xl font-bold text-red-600">{systemMetrics.errorRate}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-medium">Avg Response Time</span>
                    <span className="text-2xl font-bold text-purple-600">{systemMetrics.responseTime}ms</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Resource Usage</CardTitle>
                  <CardDescription>Current system resource utilization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">CPU Usage</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{systemMetrics.cpuUsage}%</span>
                    </div>
                    <Progress value={systemMetrics.cpuUsage} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{systemMetrics.memoryUsage}%</span>
                    </div>
                    <Progress value={systemMetrics.memoryUsage} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Disk Usage</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{systemMetrics.diskUsage}%</span>
                    </div>
                    <Progress value={systemMetrics.diskUsage} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Network Latency</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{systemMetrics.networkLatency}ms</span>
                    </div>
                    <Progress value={systemMetrics.networkLatency} max={100} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Performance Alerts</CardTitle>
                  <CardDescription>System performance warnings and recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      System performance is optimal. All metrics within normal ranges.
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Memory usage is approaching 70%. Consider monitoring closely.
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Recent optimization improved response times by 15%.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">System Services</CardTitle>
                <CardDescription>Status and management of all system services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Web Server (Nginx)', status: 'running', uptime: '15d 4h', cpu: '2.3%', memory: '45MB' },
                    { name: 'Application Server', status: 'running', uptime: '15d 4h', cpu: '12.1%', memory: '256MB' },
                    { name: 'Database (PostgreSQL)', status: 'running', uptime: '15d 4h', cpu: '5.7%', memory: '128MB' },
                    { name: 'Email Service', status: 'running', uptime: '2h 15m', cpu: '1.2%', memory: '32MB' },
                    { name: 'Background Jobs', status: 'running', uptime: '15d 4h', cpu: '3.4%', memory: '64MB' },
                    { name: 'Monitoring Agent', status: 'running', uptime: '15d 4h', cpu: '0.8%', memory: '16MB' }
                  ].map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Uptime: {service.uptime}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-300">CPU</p>
                          <p className="font-medium">{service.cpu}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-300">Memory</p>
                          <p className="font-medium">{service.memory}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                          {service.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">System Logs</CardTitle>
                    <CardDescription>Recent system events and error logs</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadSystemData}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemLogs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <Badge className={`${getLogLevelColor(log.level)} border-0`}>
                        <div className="flex items-center space-x-1">
                          {getLogLevelIcon(log.level)}
                          <span className="capitalize">{log.level}</span>
                        </div>
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{log.message}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            Component: {log.component}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}