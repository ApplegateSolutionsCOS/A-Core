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
  Headphones,
  CheckCircle,
  Clock,
  MessageSquare,
  Star,
  BookOpen,
  Phone,
  Mail,
  AlertTriangle
} from 'lucide-react';

interface PlatformSupportUserDashboardProps {
  onNavigate?: (view: string) => void;
}

const PlatformSupportUserDashboard: React.FC<PlatformSupportUserDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('tickets');

  const myMetrics = {
    assignedTickets: 8,
    resolvedToday: 5,
    avgResponseTime: '12 min',
    satisfaction: 96
  };

  const myTickets = [
    { id: 'TKT-1250', subject: 'Cannot login to account', customer: 'John Smith', priority: 'high', status: 'open', time: '5 min ago' },
    { id: 'TKT-1249', subject: 'Billing question', customer: 'Sarah Johnson', priority: 'medium', status: 'in_progress', time: '20 min ago' },
    { id: 'TKT-1248', subject: 'Feature not working', customer: 'Mike Davis', priority: 'high', status: 'open', time: '1h ago' },
    { id: 'TKT-1247', subject: 'Password reset help', customer: 'Emily Chen', priority: 'low', status: 'pending', time: '2h ago' },
    { id: 'TKT-1246', subject: 'Integration setup', customer: 'Alex Wilson', priority: 'medium', status: 'in_progress', time: '3h ago' },
  ];

  const recentActivities = [
    { title: 'Ticket resolved', description: 'Closed TKT-1245 - Login issue', time: '30 min ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'Customer feedback', description: '5-star rating from Sarah J.', time: '1h ago', status: 'success' as const, icon: <Star className="w-4 h-4" /> },
    { title: 'New ticket assigned', description: 'TKT-1250 assigned to you', time: '5 min ago', status: 'info' as const, icon: <MessageSquare className="w-4 h-4" /> },
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
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardShell
      title="My Dashboard"
      subtitle="Your tickets and support activities"
      roleBadge="Support User"
      roleColor="bg-emerald-100 text-emerald-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('queue')}>
          <Headphones className="w-4 h-4 mr-2" />
          Ticket Queue
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Assigned Tickets"
              value={myMetrics.assignedTickets}
              icon={<MessageSquare className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Resolved Today"
              value={myMetrics.resolvedToday}
              icon={<CheckCircle className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Avg Response"
              value={myMetrics.avgResponseTime}
              icon={<Clock className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Satisfaction"
              value={`${myMetrics.satisfaction}%`}
              icon={<Star className="w-6 h-6" />}
              trend="up"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>My Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myTickets.map((ticket, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500">{ticket.id}</span>
                        <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                      </div>
                      <p className="font-medium mt-1">{ticket.subject}</p>
                      <p className="text-sm text-gray-500">{ticket.customer}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(ticket.status)}>{ticket.status.replace('_', ' ')}</Badge>
                      <span className="text-xs text-gray-400">{ticket.time}</span>
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
              title="Knowledge Base"
              description="Search support articles"
              icon={<BookOpen className="w-5 h-5 text-blue-600" />}
              onClick={() => onNavigate?.('kb')}
            />
            <QuickAction
              title="Escalation Guide"
              description="When and how to escalate"
              icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
              onClick={() => onNavigate?.('escalation')}
            />
            <QuickAction
              title="Call Scripts"
              description="Phone support templates"
              icon={<Phone className="w-5 h-5 text-green-600" />}
              onClick={() => onNavigate?.('scripts')}
            />
            <QuickAction
              title="Email Templates"
              description="Response templates"
              icon={<Mail className="w-5 h-5 text-purple-600" />}
              onClick={() => onNavigate?.('templates')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
};

export default PlatformSupportUserDashboard;
