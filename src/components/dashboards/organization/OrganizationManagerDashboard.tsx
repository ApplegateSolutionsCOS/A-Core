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
  Users,
  CheckCircle,
  Clock,
  ListTodo,
  UserPlus,
  MessageSquare,
  Calendar,
  BarChart3
} from 'lucide-react';

interface OrganizationManagerDashboardProps {
  onNavigate?: (view: string) => void;
  department: string;
}

const departmentConfig: Record<string, { color: string; title: string }> = {
  admin: { color: 'bg-indigo-100 text-indigo-800', title: 'Admin Manager' },
  tech: { color: 'bg-cyan-100 text-cyan-800', title: 'Tech Manager' },
  support: { color: 'bg-teal-100 text-teal-800', title: 'Support Manager' },
  sales: { color: 'bg-amber-100 text-amber-800', title: 'Sales Manager' },
  accounting: { color: 'bg-emerald-100 text-emerald-800', title: 'Accounting Manager' },
  personnel: { color: 'bg-pink-100 text-pink-800', title: 'Personnel Manager' },
  security: { color: 'bg-red-100 text-red-800', title: 'Security Manager' },
  general: { color: 'bg-gray-100 text-gray-800', title: 'Manager' },
};

const OrganizationManagerDashboard: React.FC<OrganizationManagerDashboardProps> = ({ 
  onNavigate,
  department 
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const config = departmentConfig[department] || departmentConfig.general;

  const teamMetrics = {
    teamMembers: 5,
    activeTasks: 12,
    completedThisWeek: 8,
    pendingApprovals: 2
  };

  const teamMembers = [
    { name: 'Alex Johnson', role: `${department} User`, status: 'online' as const, tasks: 4 },
    { name: 'Maria Garcia', role: `${department} User`, status: 'online' as const, tasks: 3 },
    { name: 'Chris Lee', role: `${department} User`, status: 'away' as const, tasks: 2 },
    { name: 'Jordan Smith', role: `${department} User`, status: 'online' as const, tasks: 3 },
  ];

  const recentActivities = [
    { title: 'Task completed', description: 'Alex completed quarterly report', time: '1h ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'New assignment', description: 'Maria assigned to project X', time: '3h ago', status: 'info' as const, icon: <ListTodo className="w-4 h-4" /> },
    { title: 'Meeting scheduled', description: 'Team sync tomorrow at 10am', time: '5h ago', status: 'info' as const, icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <DashboardShell
      title={`${department.charAt(0).toUpperCase() + department.slice(1)} Department`}
      subtitle="Manage your team and department activities"
      roleBadge={config.title}
      roleColor={config.color}
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('team')}>
          <Users className="w-4 h-4 mr-2" />
          My Team
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Team Members"
              value={teamMetrics.teamMembers}
              icon={<Users className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Active Tasks"
              value={teamMetrics.activeTasks}
              icon={<ListTodo className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Completed This Week"
              value={teamMetrics.completedThisWeek}
              icon={<CheckCircle className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Pending Approvals"
              value={teamMetrics.pendingApprovals}
              icon={<Clock className="w-6 h-6" />}
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
                  title="Invite Team Member"
                  description="Add new user to your team"
                  icon={<UserPlus className="w-5 h-5 text-blue-600" />}
                  onClick={() => onNavigate?.('invite')}
                  variant="primary"
                />
                <QuickAction
                  title="Create Task"
                  description="Assign task to team"
                  icon={<ListTodo className="w-5 h-5 text-green-600" />}
                  onClick={() => onNavigate?.('create-task')}
                />
                <QuickAction
                  title="Team Reports"
                  description="View performance metrics"
                  icon={<BarChart3 className="w-5 h-5 text-purple-600" />}
                  onClick={() => onNavigate?.('reports')}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Team Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <TeamMember
                        name={member.name}
                        role={member.role}
                        status={member.status}
                      />
                      <Badge variant="outline">{member.tasks} tasks</Badge>
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

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Team</CardTitle>
              <Button size="sm" onClick={() => onNavigate?.('invite')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <TeamMember
                      name={member.name}
                      role={member.role}
                      status={member.status}
                    />
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="font-bold">{member.tasks}</p>
                        <p className="text-xs text-gray-500">tasks</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Task management interface would go here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
};

export default OrganizationManagerDashboard;
