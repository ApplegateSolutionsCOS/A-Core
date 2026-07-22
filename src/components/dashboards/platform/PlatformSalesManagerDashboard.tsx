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
  DollarSign,
  Users,
  Target,
  TrendingUp,
  UserPlus,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Briefcase
} from 'lucide-react';

interface PlatformSalesManagerDashboardProps {
  onNavigate?: (view: string) => void;
}

const PlatformSalesManagerDashboard: React.FC<PlatformSalesManagerDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  const teamMetrics = {
    teamRevenue: 45000,
    teamQuota: 85,
    activeDeals: 18,
    closedThisMonth: 8,
    teamMembers: 4
  };

  const teamMembers = [
    { name: 'Sarah Miller', role: 'Account Executive', status: 'online' as const, quota: 105, deals: 6, revenue: 18000 },
    { name: 'Mike Roberts', role: 'Account Executive', status: 'online' as const, quota: 78, deals: 4, revenue: 12000 },
    { name: 'Emily Chen', role: 'SDR', status: 'away' as const, quota: 88, deals: 5, revenue: 10000 },
    { name: 'Alex Thompson', role: 'SDR', status: 'online' as const, quota: 65, deals: 3, revenue: 5000 },
  ];

  const teamDeals = [
    { company: 'TechCorp', value: 8000, stage: 'Negotiation', owner: 'Sarah Miller', probability: 80 },
    { company: 'StartupXYZ', value: 5000, stage: 'Proposal', owner: 'Mike Roberts', probability: 60 },
    { company: 'DesignHub', value: 3500, stage: 'Discovery', owner: 'Emily Chen', probability: 40 },
    { company: 'DataPro', value: 12000, stage: 'Closing', owner: 'Sarah Miller', probability: 90 },
  ];

  const recentActivities = [
    { title: 'Deal closed', description: 'Sarah closed $8,000 deal with TechCorp', time: '2h ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'Demo scheduled', description: 'Mike scheduled demo with StartupXYZ', time: '4h ago', status: 'info' as const, icon: <Calendar className="w-4 h-4" /> },
    { title: 'Proposal sent', description: 'Emily sent proposal to DesignHub', time: '6h ago', status: 'info' as const, icon: <Mail className="w-4 h-4" /> },
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Closing': return 'bg-green-100 text-green-800';
      case 'Negotiation': return 'bg-blue-100 text-blue-800';
      case 'Proposal': return 'bg-purple-100 text-purple-800';
      case 'Discovery': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardShell
      title="Sales Manager Dashboard"
      subtitle="Team performance, deals, and quota tracking"
      roleBadge="Sales Manager"
      roleColor="bg-amber-100 text-amber-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('team-deals')}>
          <Briefcase className="w-4 h-4 mr-2" />
          Team Deals
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Team Revenue"
              value={`$${teamMetrics.teamRevenue.toLocaleString()}`}
              change={15}
              changeLabel="vs last month"
              icon={<DollarSign className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Team Quota"
              value={`${teamMetrics.teamQuota}%`}
              icon={<Target className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Active Deals"
              value={teamMetrics.activeDeals}
              icon={<Briefcase className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Closed This Month"
              value={teamMetrics.closedThisMonth}
              change={33}
              changeLabel="vs last month"
              icon={<CheckCircle className="w-6 h-6" />}
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
                  title="Request Sales Rep"
                  description="Submit request to Sales Admin"
                  icon={<UserPlus className="w-5 h-5 text-amber-600" />}
                  onClick={() => onNavigate?.('request-rep')}
                  variant="primary"
                />
                <QuickAction
                  title="Schedule Team Call"
                  description="Set up team sync meeting"
                  icon={<Phone className="w-5 h-5 text-blue-600" />}
                  onClick={() => onNavigate?.('schedule-call')}
                />
                <QuickAction
                  title="View Pipeline"
                  description="Review team deals"
                  icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                  onClick={() => setSelectedTab('deals')}
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          <Badge variant="outline">{member.role}</Badge>
                        </div>
                        <span className={`font-bold ${member.quota >= 100 ? 'text-green-600' : member.quota >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {member.quota}%
                        </span>
                      </div>
                      <Progress value={member.quota} className="h-2" />
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

        <TabsContent value="deals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamDeals.map((deal, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{deal.company}</p>
                      <p className="text-sm text-gray-500">Owner: {deal.owner}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${deal.value.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{deal.probability}% probability</p>
                      </div>
                      <Badge className={getStageColor(deal.stage)}>{deal.stage}</Badge>
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
              <Button size="sm" onClick={() => onNavigate?.('request-rep')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Request Rep
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
                        <p className="font-bold">{member.deals}</p>
                        <p className="text-xs text-gray-500">deals</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold">${(member.revenue / 1000).toFixed(0)}k</p>
                        <p className="text-xs text-gray-500">revenue</p>
                      </div>
                      <div className="text-center">
                        <p className={`font-bold ${member.quota >= 100 ? 'text-green-600' : member.quota >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {member.quota}%
                        </p>
                        <p className="text-xs text-gray-500">quota</p>
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

export default PlatformSalesManagerDashboard;
