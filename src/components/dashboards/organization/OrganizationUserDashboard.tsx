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
  CheckCircle,
  Clock,
  ListTodo,
  MessageSquare,
  Calendar,
  FileText,
  BookOpen,
  Bell
} from 'lucide-react';

interface OrganizationUserDashboardProps {
  onNavigate?: (view: string) => void;
  department: string;
}

const departmentConfig: Record<string, { color: string; title: string }> = {
  admin: { color: 'bg-indigo-100 text-indigo-800', title: 'Admin User' },
  tech: { color: 'bg-cyan-100 text-cyan-800', title: 'Tech User' },
  support: { color: 'bg-teal-100 text-teal-800', title: 'Support User' },
  sales: { color: 'bg-amber-100 text-amber-800', title: 'Sales User' },
  accounting: { color: 'bg-emerald-100 text-emerald-800', title: 'Accounting User' },
  personnel: { color: 'bg-pink-100 text-pink-800', title: 'Personnel User' },
  security: { color: 'bg-red-100 text-red-800', title: 'Security User' },
  general: { color: 'bg-gray-100 text-gray-800', title: 'User' },
};

const OrganizationUserDashboard: React.FC<OrganizationUserDashboardProps> = ({ 
  onNavigate,
  department 
}) => {
  const [selectedTab, setSelectedTab] = useState('tasks');
  const config = departmentConfig[department] || departmentConfig.general;

  const myMetrics = {
    assignedTasks: 5,
    completedToday: 2,
    upcomingDeadlines: 3,
    unreadMessages: 4
  };

  const myTasks = [
    { title: 'Complete quarterly report', priority: 'high', status: 'in_progress', dueDate: 'Today' },
    { title: 'Review documentation', priority: 'medium', status: 'todo', dueDate: 'Tomorrow' },
    { title: 'Update project status', priority: 'low', status: 'todo', dueDate: 'Friday' },
    { title: 'Attend team meeting', priority: 'medium', status: 'scheduled', dueDate: 'Tomorrow' },
    { title: 'Submit expense report', priority: 'high', status: 'in_progress', dueDate: 'Today' },
  ];

  const recentActivities = [
    { title: 'Task completed', description: 'Finished client presentation', time: '2h ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'New task assigned', description: 'Complete quarterly report', time: '4h ago', status: 'info' as const, icon: <ListTodo className="w-4 h-4" /> },
    { title: 'Meeting reminder', description: 'Team sync in 1 hour', time: '5h ago', status: 'info' as const, icon: <Calendar className="w-4 h-4" /> },
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
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardShell
      title="My Dashboard"
      subtitle="Your tasks, messages, and daily activities"
      roleBadge={config.title}
      roleColor={config.color}
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('messages')}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Messages
          {myMetrics.unreadMessages > 0 && (
            <Badge className="ml-2 bg-red-500 text-white">{myMetrics.unreadMessages}</Badge>
          )}
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
              title="Upcoming Deadlines"
              value={myMetrics.upcomingDeadlines}
              icon={<Clock className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Unread Messages"
              value={myMetrics.unreadMessages}
              icon={<Bell className="w-6 h-6" />}
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
              description="View company docs"
              icon={<BookOpen className="w-5 h-5 text-blue-600" />}
              onClick={() => onNavigate?.('docs')}
            />
            <QuickAction
              title="File Storage"
              description="Access shared files"
              icon={<FileText className="w-5 h-5 text-green-600" />}
              onClick={() => onNavigate?.('files')}
            />
            <QuickAction
              title="Calendar"
              description="View schedule"
              icon={<Calendar className="w-5 h-5 text-purple-600" />}
              onClick={() => onNavigate?.('calendar')}
            />
            <QuickAction
              title="Team Chat"
              description="Connect with team"
              icon={<MessageSquare className="w-5 h-5 text-orange-600" />}
              onClick={() => onNavigate?.('chat')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
};

export default OrganizationUserDashboard;
