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
  Building2,
  TrendingUp,
  Target,
  UserPlus,
  BarChart3,
  PieChart,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Briefcase,
  CreditCard,
  Percent
} from 'lucide-react';

interface PlatformSalesAdminDashboardProps {
  onNavigate?: (view: string) => void;
}

const PlatformSalesAdminDashboard: React.FC<PlatformSalesAdminDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Mock data
  const salesMetrics = {
    mrr: 127500,
    arr: 1530000,
    newOrganizations: 12,
    churnRate: 2.1,
    conversionRate: 24,
    avgDealSize: 8500,
    pipelineValue: 485000,
    quotaAttainment: 87
  };

  const recentSignups = [
    { name: 'TechStart Inc', plan: 'Enterprise', mrr: 2500, date: '2 hours ago', status: 'active' },
    { name: 'Design Studio Pro', plan: 'Business', mrr: 499, date: '5 hours ago', status: 'active' },
    { name: 'DataFlow Solutions', plan: 'Enterprise', mrr: 3500, date: '1 day ago', status: 'trial' },
    { name: 'Creative Agency', plan: 'Business', mrr: 499, date: '2 days ago', status: 'active' },
    { name: 'Startup Labs', plan: 'Starter', mrr: 99, date: '3 days ago', status: 'active' },
  ];

  const pipelineDeals = [
    { company: 'Global Corp', value: 15000, stage: 'Negotiation', probability: 80, owner: 'John D.' },
    { company: 'MegaTech Inc', value: 25000, stage: 'Proposal', probability: 60, owner: 'Sarah M.' },
    { company: 'Innovation Labs', value: 8000, stage: 'Discovery', probability: 30, owner: 'Mike R.' },
    { company: 'Enterprise Co', value: 45000, stage: 'Negotiation', probability: 75, owner: 'John D.' },
  ];

  const salesTeam = [
    { name: 'John Davis', role: 'Sales Manager', status: 'online' as const, quota: 92, deals: 8 },
    { name: 'Sarah Miller', role: 'Account Executive', status: 'online' as const, quota: 105, deals: 12 },
    { name: 'Mike Roberts', role: 'Account Executive', status: 'away' as const, quota: 78, deals: 6 },
    { name: 'Emily Chen', role: 'SDR', status: 'online' as const, quota: 88, deals: 15 },
    { name: 'Alex Thompson', role: 'SDR', status: 'offline' as const, quota: 65, deals: 10 },
  ];

  const recentActivities = [
    { title: 'New signup', description: 'TechStart Inc signed Enterprise plan', time: '2h ago', status: 'success' as const, icon: <Building2 className="w-4 h-4" /> },
    { title: 'Deal won', description: '$15,000 deal closed with Global Corp', time: '4h ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'Demo scheduled', description: 'MegaTech Inc demo tomorrow at 2pm', time: '6h ago', status: 'info' as const, icon: <Calendar className="w-4 h-4" /> },
    { title: 'Proposal sent', description: 'Sent proposal to Innovation Labs', time: '1d ago', status: 'info' as const, icon: <Mail className="w-4 h-4" /> },
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Negotiation': return 'bg-green-100 text-green-800';
      case 'Proposal': return 'bg-blue-100 text-blue-800';
      case 'Discovery': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardShell
      title="Sales Admin Dashboard"
      subtitle="Revenue metrics, organization signups, and sales pipeline"
      roleBadge="Sales Admin"
      roleColor="bg-orange-100 text-orange-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('organizations')}>
          <Building2 className="w-4 h-4 mr-2" />
          View Organizations
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Monthly Recurring Revenue"
              value={`$${salesMetrics.mrr.toLocaleString()}`}
              change={8}
              changeLabel="vs last month"
              icon={<DollarSign className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="New Organizations"
              value={salesMetrics.newOrganizations}
              change={25}
              changeLabel="vs last month"
              icon={<Building2 className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${salesMetrics.conversionRate}%`}
              change={5}
              changeLabel="vs last month"
              icon={<Target className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Churn Rate"
              value={`${salesMetrics.churnRate}%`}
              change={-15}
              changeLabel="vs last month"
              icon={<TrendingUp className="w-6 h-6" />}
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
                  title="Invite Sales Manager"
                  description="Add a new manager to your team"
                  icon={<UserPlus className="w-5 h-5 text-orange-600" />}
                  onClick={() => onNavigate?.('invite-manager')}
                  variant="primary"
                />
                <QuickAction
                  title="View Pipeline"
                  description={`$${salesMetrics.pipelineValue.toLocaleString()} in pipeline`}
                  icon={<Briefcase className="w-5 h-5 text-blue-600" />}
                  onClick={() => setSelectedTab('pipeline')}
                />
                <QuickAction
                  title="Revenue Reports"
                  description="View detailed revenue analytics"
                  icon={<BarChart3 className="w-5 h-5 text-green-600" />}
                  onClick={() => onNavigate?.('reports')}
                />
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Enterprise</span>
                    <span className="font-medium">$85,000</span>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Business</span>
                    <span className="font-medium">$32,500</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Starter</span>
                    <span className="font-medium">$10,000</span>
                  </div>
                  <Progress value={8} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Quota Attainment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quota Attainment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${salesMetrics.quotaAttainment * 3.52} 352`}
                        className="text-orange-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">{salesMetrics.quotaAttainment}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">of quarterly quota</p>
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

        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pipeline Value</p>
                    <p className="text-2xl font-bold">${salesMetrics.pipelineValue.toLocaleString()}</p>
                  </div>
                  <Briefcase className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Avg Deal Size</p>
                    <p className="text-2xl font-bold">${salesMetrics.avgDealSize.toLocaleString()}</p>
                  </div>
                  <CreditCard className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Win Rate</p>
                    <p className="text-2xl font-bold">{salesMetrics.conversionRate}%</p>
                  </div>
                  <Percent className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Active Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipelineDeals.map((deal, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {deal.company.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{deal.company}</p>
                        <p className="text-sm text-gray-500">Owner: {deal.owner}</p>
                      </div>
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

        <TabsContent value="organizations" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Signups</CardTitle>
              <Button variant="outline" size="sm">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSignups.map((org, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {org.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-sm text-gray-500">{org.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${org.mrr}/mo</p>
                        <Badge variant="outline">{org.plan}</Badge>
                      </div>
                      <Badge className={org.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {org.status}
                      </Badge>
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
                <CardTitle>Sales Team</CardTitle>
                <Button size="sm" onClick={() => onNavigate?.('invite-user')}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesTeam.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Above Quota</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">2</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">On Track</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">2</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Needs Attention</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">1</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
};

export default PlatformSalesAdminDashboard;
