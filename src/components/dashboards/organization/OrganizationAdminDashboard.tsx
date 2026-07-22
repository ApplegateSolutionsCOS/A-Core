import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DashboardShell,
  MetricCard,
  QuickAction,
  ActivityItem,
  TeamMember,
} from '../shared/DashboardShell';
import {
  Building2,
  Users,
  Briefcase,
  Settings,
  CreditCard,
  Shield,
  UserPlus,
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  Newspaper
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import IntegrationsPanel from '@/components/integrations/IntegrationsPanel';
import QuantumVisualization from '@/components/dashboard/QuantumVisualization';


interface OrganizationAdminDashboardProps {
  onNavigate?: (view: string) => void;
}

const OrganizationAdminDashboard: React.FC<OrganizationAdminDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const { organization } = useAuth();

  const orgMetrics = {
    totalUsers: 24,
    activeWorkspaces: 6,
    monthlySpend: 1499,
    storageUsed: 45
  };

  const departments = [
    { name: 'Admin', managers: 1, users: 3, icon: <Shield className="w-4 h-4" /> },
    { name: 'Tech', managers: 2, users: 5, icon: <Settings className="w-4 h-4" /> },
    { name: 'Support', managers: 1, users: 4, icon: <Users className="w-4 h-4" /> },
    { name: 'Sales', managers: 2, users: 6, icon: <Briefcase className="w-4 h-4" /> },
  ];

  const recentUsers = [
    { name: 'John Smith', role: 'Tech Manager', status: 'online' as const, joined: '2 days ago' },
    { name: 'Sarah Johnson', role: 'Sales User', status: 'online' as const, joined: '1 week ago' },
    { name: 'Mike Davis', role: 'Support Manager', status: 'away' as const, joined: '2 weeks ago' },
  ];

  const recentActivities = [
    { title: 'New user added', description: 'John Smith joined as Tech Manager', time: '2 days ago', status: 'success' as const, icon: <UserPlus className="w-4 h-4" /> },
    { title: 'Workspace created', description: 'New "Marketing" workspace created', time: '1 week ago', status: 'info' as const, icon: <Briefcase className="w-4 h-4" /> },
    { title: 'Billing updated', description: 'Payment method updated', time: '2 weeks ago', status: 'success' as const, icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <DashboardShell
      title={organization?.name || "Organization Dashboard"}
      subtitle="Manage your organization, users, and workspaces"
      roleBadge="Organization Admin"
      roleColor="bg-indigo-100 text-indigo-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('settings')}>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="quantum">Quantum</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>


        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={orgMetrics.totalUsers}
              icon={<Users className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Active Workspaces"
              value={orgMetrics.activeWorkspaces}
              icon={<Briefcase className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Monthly Spend"
              value={`$${orgMetrics.monthlySpend}`}
              icon={<CreditCard className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Storage Used"
              value={`${orgMetrics.storageUsed}%`}
              icon={<Building2 className="w-6 h-6" />}
              trend="neutral"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickAction
                  title="Invite User"
                  description="Add new team members"
                  icon={<UserPlus className="w-5 h-5 text-indigo-600" />}
                  onClick={() => onNavigate?.('invite')}
                  variant="primary"
                />
                <QuickAction
                  title="Create Workspace"
                  description="Set up a new workspace"
                  icon={<Briefcase className="w-5 h-5 text-blue-600" />}
                  onClick={() => onNavigate?.('new-workspace')}
                />
                <QuickAction
                  title="View Reports"
                  description="Organization analytics"
                  icon={<BarChart3 className="w-5 h-5 text-green-600" />}
                  onClick={() => onNavigate?.('reports')}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Departments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {departments.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        {dept.icon}
                      </div>
                      <span className="font-medium">{dept.name}</span>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">{dept.managers + dept.users}</p>
                      <p className="text-gray-500">users</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <TeamMember
                        name={user.name}
                        role={user.role}
                        status={user.status}
                      />
                      <span className="text-xs text-gray-400">{user.joined}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Organization Users</CardTitle>
              <Button size="sm" onClick={() => onNavigate?.('invite')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite User
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">User management interface would go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspaces" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Workspaces</CardTitle>
              <Button size="sm" onClick={() => onNavigate?.('new-workspace')}>
                <Briefcase className="w-4 h-4 mr-2" />
                Create Workspace
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Workspace management interface would go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsPanel isOrganizationAdmin={true} />
        </TabsContent>

        <TabsContent value="quantum" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quantum Analytics - IBM Qiskit Runtime</CardTitle>
            </CardHeader>
            <CardContent>
              <QuantumVisualization />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5" />
                Local News Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src="https://www.youtube.com/embed/live_stream?channel=UCeY0bbntWzzVIaj2z3QigXg"
                    title="NBC News Live"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <iframe
                    src="https://www.youtube.com/embed/live_stream?channel=UCupvZG-5ko_eiXAupbDfxWw"
                    title="CNN Live"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <h4 className="font-medium">News Headlines</h4>
                {[
                  { title: 'Tech Industry Sees Record Growth in Q4', source: 'Reuters', time: '2 hours ago' },
                  { title: 'New Cybersecurity Regulations Announced', source: 'WSJ', time: '4 hours ago' },
                  { title: 'Global Markets Rally on Economic Data', source: 'Bloomberg', time: '6 hours ago' },
                ].map((news, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{news.title}</p>
                      <p className="text-xs text-gray-500">{news.source}</p>
                    </div>
                    <span className="text-xs text-gray-400">{news.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Billing management interface would go here</p>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </DashboardShell>
  );
};

export default OrganizationAdminDashboard;
