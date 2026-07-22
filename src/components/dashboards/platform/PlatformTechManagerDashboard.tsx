import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  DashboardShell,
  MetricCard,
  QuickAction,
  ActivityItem,
  TeamMember,
} from '../shared/DashboardShell';
import {
  Code,
  Users,
  GitBranch,
  Bug,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserPlus,
  FileCode,
  Terminal,
  ListTodo,
  Calendar,
  MessageSquare
} from 'lucide-react';

interface PlatformTechManagerDashboardProps {
  onNavigate?: (view: string) => void;
}

const PlatformTechManagerDashboard: React.FC<PlatformTechManagerDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  const teamMetrics = {
    activeProjects: 5,
    openTasks: 23,
    completedThisWeek: 18,
    teamMembers: 6,
    codeReviews: 8,
    bugs: 4
  };

  const teamMembers = [
    { name: 'David Chen', role: 'Senior Engineer', status: 'online' as const, tasks: 5 },
    { name: 'Emily Parker', role: 'DevOps Engineer', status: 'online' as const, tasks: 4 },
    { name: 'James Wilson', role: 'Backend Developer', status: 'away' as const, tasks: 6 },
    { name: 'Lisa Thompson', role: 'Frontend Developer', status: 'online' as const, tasks: 3 },
    { name: 'Ryan Martinez', role: 'Junior Developer', status: 'offline' as const, tasks: 2 },
  ];

  const activeTasks = [
    { title: 'Implement user authentication flow', assignee: 'David Chen', priority: 'high', status: 'in_progress', dueDate: 'Tomorrow' },
    { title: 'Fix database connection pooling', assignee: 'James Wilson', priority: 'critical', status: 'in_progress', dueDate: 'Today' },
    { title: 'Update API documentation', assignee: 'Emily Parker', priority: 'medium', status: 'review', dueDate: 'Friday' },
    { title: 'Refactor dashboard components', assignee: 'Lisa Thompson', priority: 'low', status: 'todo', dueDate: 'Next week' },
  ];

  const recentActivities = [
    { title: 'PR merged', description: 'Feature/auth-flow merged to main', time: '30 min ago', status: 'success' as const, icon: <GitBranch className="w-4 h-4" /> },
    { title: 'Bug assigned', description: 'DB connection issue assigned to James', time: '1h ago', status: 'warning' as const, icon: <Bug className="w-4 h-4" /> },
    { title: 'Task completed', description: 'API endpoints documentation updated', time: '2h ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'Code review requested', description: 'Review needed for dashboard PR', time: '3h ago', status: 'info' as const, icon: <FileCode className="w-4 h-4" /> },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardShell
      title="Tech Manager Dashboard"
      subtitle="Team management, tasks, and project oversight"
      roleBadge="Tech Manager"
      roleColor="bg-cyan-100 text-cyan-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('tasks')}>
          <ListTodo className="w-4 h-4 mr-2" />
          View All Tasks
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Active Projects"
              value={teamMetrics.activeProjects}
              icon={<Code className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Open Tasks"
              value={teamMetrics.openTasks}
              change={-12}
              changeLabel="vs last week"
              icon={<ListTodo className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Completed This Week"
              value={teamMetrics.completedThisWeek}
              change={20}
              changeLabel="vs last week"
              icon={<CheckCircle className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Code Reviews"
              value={teamMetrics.codeReviews}
              icon={<FileCode className="w-6 h-6" />}
              trend="neutral"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickAction
                  title="Request New Team Member"
                  description="Submit request to Tech Admin"
                  icon={<UserPlus className="w-5 h-5 text-cyan-600" />}
                  onClick={() => onNavigate?.('request-member')}
                  variant="primary"
                />
                <QuickAction
                  title="Create Task"
                  description="Assign new task to team"
                  icon={<ListTodo className="w-5 h-5 text-blue-600" />}
                  onClick={() => onNavigate?.('create-task')}
                />
                <QuickAction
                  title="Schedule Meeting"
                  description="Set up team sync"
                  icon={<Calendar className="w-5 h-5 text-purple-600" />}
                  onClick={() => onNavigate?.('calendar')}
                />
              </CardContent>
            </Card>

            {/* Team Overview */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Team Members</CardTitle>
                <Badge variant="secondary">{teamMembers.length} members</Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teamMembers.slice(0, 4).map((member, index) => (
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

          {/* Recent Activity */}
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

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Tasks</CardTitle>
              <Button size="sm">
                <ListTodo className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-500">Assigned to: {task.assignee}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                      <Badge className={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                      <span className="text-xs text-gray-400">{task.dueDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Team</CardTitle>
              <Button size="sm" onClick={() => onNavigate?.('request-member')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Request Member
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
      </Tabs>
    </DashboardShell>
  );
};

export default PlatformTechManagerDashboard;
