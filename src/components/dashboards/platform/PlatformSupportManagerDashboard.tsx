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
  Headphones,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  BarChart3,
  Star,
  Phone,
  ArrowUpRight
} from 'lucide-react';

interface PlatformSupportManagerDashboardProps {
  onNavigate?: (view: string) => void;
}

const PlatformSupportManagerDashboard: React.FC<PlatformSupportManagerDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  const teamMetrics = {
    teamTickets: 32,
    resolvedToday: 15,
    avgResponseTime: '1.8h',
    teamSatisfaction: 92,
    escalations: 2
  };

  const teamMembers = [
    { name: 'Chris Lee', role: 'Support Agent', status: 'online' as const, tickets: 10, satisfaction: 95 },
    { name: 'Jordan Smith', role: 'Support Agent', status: 'online' as const, tickets: 8, satisfaction: 91 },
    { name: 'Taylor Brown', role: 'Support Agent', status: 'away' as const, tickets: 6, satisfaction: 88 },
    { name: 'Casey Wilson', role: 'Support Agent', status: 'online' as const, tickets: 8, satisfaction: 94 },
  ];

  const teamTickets = [
    { id: 'TKT-1240', subject: 'Login issues', customer: 'Acme Corp', priority: 'high', assignee: 'Chris Lee', status: 'open' },
    { id: 'TKT-1239', subject: 'Payment failed', customer: 'TechStart', priority: 'critical', assignee: 'Jordan Smith', status: 'in_progress' },
    { id: 'TKT-1238', subject: 'Feature question', customer: 'Design Co', priority: 'low', assignee: 'Taylor Brown', status: 'pending' },
    { id: 'TKT-1237', subject: 'API timeout', customer: 'DataFlow', priority: 'high', assignee: 'Casey Wilson', status: 'escalated' },
  ];

  const recentActivities = [
    { title: 'Ticket resolved', description: 'TKT-1235 resolved by Chris Lee', time: '15 min ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'Escalation', description: 'TKT-1237 escalated to Tech team', time: '1h ago', status: 'warning' as const, icon: <ArrowUpRight className="w-4 h-4" /> },
    { title: 'New assignment', description: 'TKT-1240 assigned to Chris Lee', time: '2h ago', status: 'info' as const, icon: <MessageSquare className="w-4 h-4" /> },
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

  return (
    <DashboardShell
      title="Support Manager Dashboard"
      subtitle="Team performance, ticket management, and escalations"
      roleBadge="Support Manager"
      roleColor="bg-teal-100 text-teal-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('team-tickets')}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Team Tickets
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Team Tickets"
              value={teamMetrics.teamTickets}
              icon={<MessageSquare className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Resolved Today"
              value={teamMetrics.resolvedToday}
              change={25}
              changeLabel="vs yesterday"
              icon={<CheckCircle className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Avg Response Time"
              value={teamMetrics.avgResponseTime}
              change={-10}
              changeLabel="vs last week"
              icon={<Clock className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Team Satisfaction"
              value={`${teamMetrics.teamSatisfaction}%`}
              change={2}
              changeLabel="vs last month"
              icon={<Star className="w-6 h-6" />}
              trend="up"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickAction
                  title="Request New Agent"
                  description="Submit request to Support Admin"
                  icon={<UserPlus className="w-5 h-5 text-teal-600" />}
                  onClick={() => onNavigate?.('request-agent')}
                  variant="primary"
                />
                <QuickAction
                  title="View Escalations"
                  description={`${teamMetrics.escalations} pending escalations`}
                  icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
                  onClick={() => onNavigate?.('escalations')}
                  variant="warning"
                />
                <QuickAction
                  title="Team Performance"
                  description="View detailed metrics"
                  icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
                  onClick={() => onNavigate?.('performance')}
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
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{member.tickets} tickets</Badge>
                        <Badge className="bg-green-100 text-green-800">{member.satisfaction}%</Badge>
                      </div>
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

        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamTickets.map((ticket, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500">{ticket.id}</span>
                        <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                      </div>
                      <p className="font-medium mt-1">{ticket.subject}</p>
                      <p className="text-sm text-gray-500">{ticket.customer} • Assigned to {ticket.assignee}</p>
                    </div>
                    <Button variant="outline" size="sm">View</Button>
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
              <Button size="sm" onClick={() => onNavigate?.('request-agent')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Request Agent
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
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="font-bold">{member.tickets}</p>
                        <p className="text-xs text-gray-500">tickets</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">{member.satisfaction}%</p>
                        <p className="text-xs text-gray-500">satisfaction</p>
                      </div>
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

export default PlatformSupportManagerDashboard;
