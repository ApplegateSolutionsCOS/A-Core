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
} from '../shared/DashboardShell';
import {
  Code,
  CheckCircle,
  Clock,
  GitBranch,
  FileCode,
  ListTodo,
  Bug,
  BookOpen,
  Terminal,
  MessageSquare
} from 'lucide-react';

interface PlatformTechUserDashboardProps {
  onNavigate?: (view: string) => void;
}

const PlatformTechUserDashboard: React.FC<PlatformTechUserDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('tasks');

  const myMetrics = {
    assignedTasks: 6,
    completedToday: 2,
    codeReviews: 3,
    openBugs: 1
  };

  const myTasks = [
    { title: 'Implement password reset flow', priority: 'high', status: 'in_progress', dueDate: 'Today', project: 'Auth Module' },
    { title: 'Write unit tests for API', priority: 'medium', status: 'todo', dueDate: 'Tomorrow', project: 'Backend' },
    { title: 'Review PR #234', priority: 'high', status: 'review', dueDate: 'Today', project: 'Frontend' },
    { title: 'Update error handling', priority: 'low', status: 'todo', dueDate: 'Friday', project: 'Backend' },
    { title: 'Fix CSS alignment issue', priority: 'low', status: 'in_progress', dueDate: 'Tomorrow', project: 'Frontend' },
    { title: 'Document API endpoints', priority: 'medium', status: 'todo', dueDate: 'Next week', project: 'Docs' },
  ];

  const recentActivities = [
    { title: 'Task completed', description: 'Finished login form validation', time: '1h ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'PR submitted', description: 'Submitted PR for auth flow', time: '3h ago', status: 'info' as const, icon: <GitBranch className="w-4 h-4" /> },
    { title: 'Code review', description: 'Reviewed PR #233', time: '5h ago', status: 'success' as const, icon: <FileCode className="w-4 h-4" /> },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardShell
      title="My Dashboard"
      subtitle="Your tasks, code reviews, and daily work"
      roleBadge="Tech User"
      roleColor="bg-slate-100 text-slate-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('messages')}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Messages
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Assigned Tasks"
              value={myMetrics.assignedTasks}
              icon={<ListTodo className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Completed Today"
              value={myMetrics.completedToday}
              icon={<CheckCircle className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Code Reviews"
              value={myMetrics.codeReviews}
              icon={<FileCode className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Open Bugs"
              value={myMetrics.openBugs}
              icon={<Bug className="w-6 h-6" />}
              trend="neutral"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myTasks.map((task, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-gray-500">{task.project}</p>
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

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
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

        <TabsContent value="resources" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickAction
              title="Documentation"
              description="View technical documentation"
              icon={<BookOpen className="w-5 h-5 text-blue-600" />}
              onClick={() => onNavigate?.('docs')}
            />
            <QuickAction
              title="Code Repository"
              description="Access source code"
              icon={<GitBranch className="w-5 h-5 text-purple-600" />}
              onClick={() => onNavigate?.('repo')}
            />
            <QuickAction
              title="Dev Tools"
              description="Development utilities"
              icon={<Terminal className="w-5 h-5 text-green-600" />}
              onClick={() => onNavigate?.('tools')}
            />
            <QuickAction
              title="Team Chat"
              description="Connect with your team"
              icon={<MessageSquare className="w-5 h-5 text-orange-600" />}
              onClick={() => onNavigate?.('chat')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
};

export default PlatformTechUserDashboard;
