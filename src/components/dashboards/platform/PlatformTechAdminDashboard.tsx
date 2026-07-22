import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DashboardShell,
  MetricCard,
  QuickAction,
  ActivityItem,
  TeamMember,
  SectionHeader
} from '../shared/DashboardShell';
import {
  Server,
  Users,
  Shield,
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  UserPlus,
  Terminal,
  Cpu,
  HardDrive,
  Wifi,
  RefreshCw,
  Eye,
  GitBranch,
  Bug
} from 'lucide-react';

interface PlatformTechAdminDashboardProps {
  onNavigate?: (view: string) => void;
  isGodMode?: boolean;
}

const PlatformTechAdminDashboard: React.FC<PlatformTechAdminDashboardProps> = ({ 
  onNavigate,
  isGodMode = false 
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Mock data for system health
  const systemMetrics = {
    uptime: 99.97,
    responseTime: 142,
    activeUsers: 1247,
    errorRate: 0.03,
    cpuUsage: 34,
    memoryUsage: 67,
    diskUsage: 45,
    networkLatency: 23
  };

  const services = [
    { name: 'API Gateway', status: 'healthy', uptime: '99.99%', lastCheck: '2 min ago' },
    { name: 'Database Cluster', status: 'healthy', uptime: '99.98%', lastCheck: '1 min ago' },
    { name: 'Authentication Service', status: 'healthy', uptime: '100%', lastCheck: '30 sec ago' },
    { name: 'File Storage', status: 'warning', uptime: '99.85%', lastCheck: '5 min ago' },
    { name: 'Email Service', status: 'healthy', uptime: '99.95%', lastCheck: '3 min ago' },
    { name: 'Background Jobs', status: 'healthy', uptime: '99.90%', lastCheck: '1 min ago' },
  ];

  const recentDeployments = [
    { version: 'v2.4.1', environment: 'Production', status: 'success', time: '2 hours ago', author: 'John D.' },
    { version: 'v2.4.1-rc2', environment: 'Staging', status: 'success', time: '5 hours ago', author: 'Sarah M.' },
    { version: 'v2.4.0', environment: 'Production', status: 'success', time: '2 days ago', author: 'Mike R.' },
  ];

  const techTeam = [
    { name: 'Sarah Mitchell', role: 'Tech Manager', status: 'online' as const },
    { name: 'David Chen', role: 'Senior Engineer', status: 'online' as const },
    { name: 'Emily Parker', role: 'DevOps Engineer', status: 'away' as const },
    { name: 'James Wilson', role: 'Backend Developer', status: 'online' as const },
    { name: 'Lisa Thompson', role: 'Frontend Developer', status: 'offline' as const },
  ];

  const recentActivities = [
    { title: 'Deployment completed', description: 'v2.4.1 deployed to production', time: '2h ago', status: 'success' as const, icon: <GitBranch className="w-4 h-4" /> },
    { title: 'New user registered', description: 'Tech Manager added to team', time: '4h ago', status: 'info' as const, icon: <UserPlus className="w-4 h-4" /> },
    { title: 'Alert resolved', description: 'High memory usage on DB-02', time: '6h ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'Security scan completed', description: 'No vulnerabilities found', time: '12h ago', status: 'success' as const, icon: <Shield className="w-4 h-4" /> },
    { title: 'Bug report', description: 'Login timeout issue reported', time: '1d ago', status: 'warning' as const, icon: <Bug className="w-4 h-4" /> },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 text-green-400 border border-green-500/30';
      case 'warning': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
      case 'error': return 'bg-red-500/10 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-400 shadow-[0_0_8px_rgba(0,255,0,0.6)]';
      case 'warning': return 'bg-orange-400 shadow-[0_0_8px_rgba(255,153,0,0.6)]';
      case 'error': return 'bg-red-400 shadow-[0_0_8px_rgba(255,0,0,0.6)]';
      default: return 'bg-gray-400';
    }
  };

  return (
    <DashboardShell
      title={isGodMode ? "Platform Owner Dashboard" : "Tech Admin Dashboard"}
      subtitle="System health, infrastructure, and team management"
      roleBadge={isGodMode ? "God Mode" : "Tech Admin"}
      roleColor={isGodMode ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"}
      isGodMode={isGodMode}
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6 bg-black/80 border border-cyan-500/20">
          <TabsTrigger value="overview" className="font-mono data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Overview</TabsTrigger>
          <TabsTrigger value="infrastructure" className="font-mono data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Infrastructure</TabsTrigger>
          <TabsTrigger value="team" className="font-mono data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Team</TabsTrigger>
          <TabsTrigger value="deployments" className="font-mono data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">Deployments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="System Uptime"
              value={`${systemMetrics.uptime}%`}
              change={0.02}
              changeLabel="vs last month"
              icon={<Server className="w-6 h-6" />}
              trend="up"
              glowColor="cyan"
            />
            <MetricCard
              title="Active Users"
              value={systemMetrics.activeUsers.toLocaleString()}
              change={12}
              changeLabel="vs last week"
              icon={<Users className="w-6 h-6" />}
              trend="up"
              glowColor="magenta"
            />
            <MetricCard
              title="Avg Response Time"
              value={`${systemMetrics.responseTime}ms`}
              change={-8}
              changeLabel="vs last week"
              icon={<Activity className="w-6 h-6" />}
              trend="up"
              glowColor="green"
            />
            <MetricCard
              title="Error Rate"
              value={`${systemMetrics.errorRate}%`}
              change={-15}
              changeLabel="vs last week"
              icon={<AlertTriangle className="w-6 h-6" />}
              trend="up"
              glowColor="orange"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions - NuDarkwave Theme */}
            <div className="lg:col-span-1 rounded-xl border border-cyan-500/30 bg-black/80 p-6">
              <h3 className="text-lg font-mono font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
                Quick Actions
              </h3>
              <div className="space-y-3">
                <QuickAction
                  title="Invite Tech Manager"
                  description="Add a new manager to your team"
                  icon={<UserPlus className="w-5 h-5 text-cyan-400" />}
                  onClick={() => onNavigate?.('invite-manager')}
                  variant="primary"
                />
                <QuickAction
                  title="View System Logs"
                  description="Check recent system activity"
                  icon={<Terminal className="w-5 h-5 text-gray-400" />}
                  onClick={() => onNavigate?.('logs')}
                />
                <QuickAction
                  title="Run Health Check"
                  description="Verify all services are running"
                  icon={<RefreshCw className="w-5 h-5 text-green-400" />}
                  onClick={() => {}}
                />
                <QuickAction
                  title="Security Audit"
                  description="Review security configurations"
                  icon={<Shield className="w-5 h-5 text-purple-400" />}
                  onClick={() => onNavigate?.('security')}
                />
              </div>
            </div>

            {/* Service Status - NuDarkwave Theme */}
            <div className="lg:col-span-2 rounded-xl border border-green-500/30 bg-black/80 overflow-hidden">
              <div className="p-6 border-b border-green-500/20 bg-gradient-to-r from-green-950/30 to-transparent">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(0,255,0,0.6)]" />
                    Service Status
                  </h3>
                  <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-mono text-gray-400 hover:text-cyan-400 border border-gray-800 hover:border-cyan-500/30 rounded-lg transition-all">
                    <Eye className="w-4 h-4" />
                    View All
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-950/50 border border-gray-800 rounded-lg hover:border-cyan-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${getStatusDotColor(service.status)}`} />
                        <div>
                          <p className="font-mono font-medium text-white">{service.name}</p>
                          <p className="text-xs font-mono text-gray-500">Last check: {service.lastCheck}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getStatusColor(service.status)} font-mono`}>
                          {service.status.toUpperCase()}
                        </Badge>
                        <p className="text-xs font-mono text-gray-500 mt-1">{service.uptime} uptime</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity - NuDarkwave Theme */}
          <div className="rounded-xl border border-fuchsia-500/30 bg-black/80 overflow-hidden">
            <div className="p-6 border-b border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-950/30 to-transparent">
              <h3 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(255,0,255,0.6)]" />
                Recent Activity
              </h3>
            </div>
            <div className="p-4">
              {recentActivities.map((activity, index) => (
                <ActivityItem
                  key={index}
                  title={activity.title}
                  description={activity.description}
                  time={activity.time}
                  icon={activity.icon}
                  status={activity.status}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-6">
          {/* Resource Usage - NuDarkwave Theme */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-cyan-500/30 bg-black/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-mono font-medium text-gray-400 uppercase tracking-wider">CPU Usage</span>
                <Cpu className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mb-2">{systemMetrics.cpuUsage}%</div>
              <Progress value={systemMetrics.cpuUsage} className="h-2 bg-gray-900" />
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-black/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-mono font-medium text-gray-400 uppercase tracking-wider">Memory Usage</span>
                <Database className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-purple-400 mb-2">{systemMetrics.memoryUsage}%</div>
              <Progress value={systemMetrics.memoryUsage} className="h-2 bg-gray-900" />
            </div>
            <div className="rounded-xl border border-green-500/30 bg-black/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-mono font-medium text-gray-400 uppercase tracking-wider">Disk Usage</span>
                <HardDrive className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-green-400 mb-2">{systemMetrics.diskUsage}%</div>
              <Progress value={systemMetrics.diskUsage} className="h-2 bg-gray-900" />
            </div>
            <div className="rounded-xl border border-orange-500/30 bg-black/80 p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-mono font-medium text-gray-400 uppercase tracking-wider">Network Latency</span>
                <Wifi className="w-5 h-5 text-orange-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-orange-400 mb-2">{systemMetrics.networkLatency}ms</div>
              <Progress value={100 - systemMetrics.networkLatency} className="h-2 bg-gray-900" />
            </div>
          </div>

          {/* Detailed Service Status - NuDarkwave Theme */}
          <div className="rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden">
            <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-transparent">
              <h3 className="text-lg font-mono font-bold text-white">Infrastructure Overview</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service, index) => (
                  <div key={index} className="p-4 border border-gray-800 rounded-lg bg-gray-950/50 hover:border-cyan-500/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-mono font-medium text-white">{service.name}</h3>
                      <Badge className={getStatusColor(service.status)}>{service.status.toUpperCase()}</Badge>
                    </div>
                    <div className="space-y-2 text-sm font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Uptime</span>
                        <span className="text-cyan-400 font-medium">{service.uptime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Check</span>
                        <span className="text-gray-300">{service.lastCheck}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Members - NuDarkwave Theme */}
            <div className="lg:col-span-2 rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden">
              <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-transparent flex items-center justify-between">
                <h3 className="text-lg font-mono font-bold text-white">Tech Team Members</h3>
                <button 
                  onClick={() => onNavigate?.('invite-user')}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-mono bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Member
                </button>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {techTeam.map((member, index) => (
                    <TeamMember
                      key={index}
                      name={member.name}
                      role={member.role}
                      status={member.status}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Team Stats - NuDarkwave Theme */}
            <div className="rounded-xl border border-fuchsia-500/30 bg-black/80 overflow-hidden">
              <div className="p-6 border-b border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-950/30 to-transparent">
                <h3 className="text-lg font-mono font-bold text-white">Team Statistics</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-mono font-medium text-green-400">Online</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-green-400">3</p>
                </div>
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-mono font-medium text-orange-400">Away</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-orange-400">1</p>
                </div>
                <div className="p-4 bg-gray-500/10 border border-gray-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-mono font-medium text-gray-400">Total Members</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-gray-300">5</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="deployments" className="space-y-6">
          <div className="rounded-xl border border-cyan-500/30 bg-black/80 overflow-hidden">
            <div className="p-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 to-transparent flex items-center justify-between">
              <h3 className="text-lg font-mono font-bold text-white">Recent Deployments</h3>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-mono bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all">
                <GitBranch className="w-4 h-4" />
                New Deployment
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {recentDeployments.map((deployment, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-800 rounded-lg bg-gray-950/50 hover:border-cyan-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        deployment.status === 'success' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
                      }`}>
                        {deployment.status === 'success' ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-mono font-medium text-white">{deployment.version}</p>
                        <p className="text-sm font-mono text-gray-500">by {deployment.author}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="font-mono border-gray-700 text-gray-300">{deployment.environment}</Badge>
                      <p className="text-xs font-mono text-gray-500 mt-1">{deployment.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
};

export default PlatformTechAdminDashboard;
