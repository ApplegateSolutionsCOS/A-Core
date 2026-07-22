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
  Headphones,
  Users,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  UserPlus,
  BarChart3,
  Phone,
  Mail,
  MessageCircle,
  Star,
  ThumbsUp,
  ThumbsDown,
  Filter,
  Search,
  ArrowUpRight
} from 'lucide-react';

interface PlatformSupportAdminDashboardProps {
  onNavigate?: (view: string) => void;
}

const PlatformSupportAdminDashboard: React.FC<PlatformSupportAdminDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Mock data
  const supportMetrics = {
    openTickets: 47,
    resolvedToday: 23,
    avgResponseTime: '2.4h',
    customerSatisfaction: 94,
    escalatedTickets: 5,
    pendingEscalations: 3
  };

  const ticketsByPriority = [
    { priority: 'Critical', count: 3, color: 'bg-red-500' },
    { priority: 'High', count: 12, color: 'bg-orange-500' },
    { priority: 'Medium', count: 18, color: 'bg-yellow-500' },
    { priority: 'Low', count: 14, color: 'bg-green-500' },
  ];

  const ticketsByChannel = [
    { channel: 'Email', count: 28, icon: <Mail className="w-4 h-4" /> },
    { channel: 'Chat', count: 15, icon: <MessageCircle className="w-4 h-4" /> },
    { channel: 'Phone', count: 4, icon: <Phone className="w-4 h-4" /> },
  ];

  const recentTickets = [
    { id: 'TKT-1234', subject: 'Cannot access workspace', customer: 'Acme Corp', priority: 'high', status: 'open', time: '15 min ago' },
    { id: 'TKT-1233', subject: 'Billing inquiry', customer: 'TechStart Inc', priority: 'medium', status: 'pending', time: '1 hour ago' },
    { id: 'TKT-1232', subject: 'Feature request: Dark mode', customer: 'Design Co', priority: 'low', status: 'open', time: '2 hours ago' },
    { id: 'TKT-1231', subject: 'Integration not working', customer: 'DataFlow LLC', priority: 'critical', status: 'escalated', time: '3 hours ago' },
    { id: 'TKT-1230', subject: 'Password reset issue', customer: 'StartupXYZ', priority: 'high', status: 'resolved', time: '4 hours ago' },
  ];

  const supportTeam = [
    { name: 'Alex Johnson', role: 'Support Manager', status: 'online' as const, tickets: 8 },
    { name: 'Maria Garcia', role: 'Senior Support', status: 'online' as const, tickets: 12 },
    { name: 'Chris Lee', role: 'Support Agent', status: 'online' as const, tickets: 10 },
    { name: 'Jordan Smith', role: 'Support Agent', status: 'away' as const, tickets: 6 },
    { name: 'Taylor Brown', role: 'Support Agent', status: 'offline' as const, tickets: 0 },
  ];

  const recentActivities = [
    { title: 'Ticket escalated', description: 'TKT-1231 escalated to Tech team', time: '10 min ago', status: 'warning' as const, icon: <ArrowUpRight className="w-4 h-4" /> },
    { title: 'Ticket resolved', description: 'TKT-1230 marked as resolved', time: '30 min ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'New team member', description: 'Taylor Brown joined support team', time: '2 hours ago', status: 'info' as const, icon: <UserPlus className="w-4 h-4" /> },
    { title: 'SLA breach warning', description: 'TKT-1228 approaching SLA limit', time: '3 hours ago', status: 'warning' as const, icon: <AlertTriangle className="w-4 h-4" /> },
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
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardShell
      title="Support Admin Dashboard"
      subtitle="Ticket management, team performance, and customer satisfaction"
      roleBadge="Support Admin"
      roleColor="bg-green-100 text-green-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('tickets')}>
          <MessageSquare className="w-4 h-4 mr-2" />
          View All Tickets
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Open Tickets"
              value={supportMetrics.openTickets}
              change={-8}
              changeLabel="vs yesterday"
              icon={<MessageSquare className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Resolved Today"
              value={supportMetrics.resolvedToday}
              change={15}
              changeLabel="vs yesterday"
              icon={<CheckCircle className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Avg Response Time"
              value={supportMetrics.avgResponseTime}
              change={-12}
              changeLabel="vs last week"
              icon={<Clock className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Customer Satisfaction"
              value={`${supportMetrics.customerSatisfaction}%`}
              change={3}
              changeLabel="vs last month"
              icon={<Star className="w-6 h-6" />}
              trend="up"
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
                  title="Invite Support Manager"
                  description="Add a new manager to your team"
                  icon={<UserPlus className="w-5 h-5 text-green-600" />}
                  onClick={() => onNavigate?.('invite-manager')}
                  variant="primary"
                />
                <QuickAction
                  title="View Escalations"
                  description={`${supportMetrics.escalatedTickets} tickets need attention`}
                  icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
                  onClick={() => onNavigate?.('escalations')}
                  variant="warning"
                />
                <QuickAction
                  title="Performance Reports"
                  description="View team performance metrics"
                  icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
                  onClick={() => onNavigate?.('reports')}
                />
              </CardContent>
            </Card>

            {/* Tickets by Priority */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tickets by Priority</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticketsByPriority.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.priority}</span>
                      <span className="text-gray-500">{item.count} tickets</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${(item.count / supportMetrics.openTickets) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Tickets by Channel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tickets by Channel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticketsByChannel.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        {item.icon}
                      </div>
                      <span className="font-medium">{item.channel}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
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

        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Tickets</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTickets.map((ticket, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-mono text-gray-500">{ticket.id}</div>
                      <div>
                        <p className="font-medium">{ticket.subject}</p>
                        <p className="text-sm text-gray-500">{ticket.customer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                      <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                      <span className="text-xs text-gray-400">{ticket.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Support Team</CardTitle>
                <Button size="sm" onClick={() => onNavigate?.('invite-user')}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {supportTeam.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <TeamMember
                        name={member.name}
                        role={member.role}
                        status={member.status}
                      />
                      <div className="text-right">
                        <p className="font-medium">{member.tickets}</p>
                        <p className="text-xs text-gray-500">active tickets</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Positive Feedback</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">89%</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Avg Handle Time</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">18 min</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">First Contact Resolution</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">72%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center text-gray-400">
                  <BarChart3 className="w-12 h-12" />
                  <span className="ml-2">Chart visualization would go here</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ticket Volume Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center text-gray-400">
                  <TrendingUp className="w-12 h-12" />
                  <span className="ml-2">Chart visualization would go here</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
};

export default PlatformSupportAdminDashboard;
