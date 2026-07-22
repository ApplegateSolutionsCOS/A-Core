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
} from '../shared/DashboardShell';
import {
  DollarSign,
  Target,
  Users,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Briefcase,
  UserPlus,
  FileText
} from 'lucide-react';

interface PlatformSalesUserDashboardProps {
  onNavigate?: (view: string) => void;
}

const PlatformSalesUserDashboard: React.FC<PlatformSalesUserDashboardProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState('pipeline');

  const myMetrics = {
    monthlyRevenue: 12500,
    quotaProgress: 78,
    activeDeals: 6,
    leadsToContact: 8
  };

  const myDeals = [
    { company: 'TechCorp', value: 5000, stage: 'Negotiation', probability: 80, nextAction: 'Send contract' },
    { company: 'StartupXYZ', value: 3000, stage: 'Proposal', probability: 60, nextAction: 'Follow up call' },
    { company: 'DesignHub', value: 2500, stage: 'Discovery', probability: 40, nextAction: 'Schedule demo' },
    { company: 'DataPro', value: 8000, stage: 'Closing', probability: 90, nextAction: 'Get signature' },
    { company: 'CloudCo', value: 4000, stage: 'Proposal', probability: 50, nextAction: 'Send pricing' },
  ];

  const myLeads = [
    { name: 'John Smith', company: 'ABC Corp', source: 'Website', status: 'new' },
    { name: 'Sarah Johnson', company: 'XYZ Inc', source: 'Referral', status: 'contacted' },
    { name: 'Mike Davis', company: 'Tech Solutions', source: 'LinkedIn', status: 'new' },
    { name: 'Emily Chen', company: 'StartupABC', source: 'Event', status: 'qualified' },
  ];

  const recentActivities = [
    { title: 'Deal progressed', description: 'DataPro moved to Closing stage', time: '1h ago', status: 'success' as const, icon: <CheckCircle className="w-4 h-4" /> },
    { title: 'Demo completed', description: 'Completed demo with TechCorp', time: '3h ago', status: 'success' as const, icon: <Calendar className="w-4 h-4" /> },
    { title: 'New lead', description: 'John Smith from ABC Corp', time: '5h ago', status: 'info' as const, icon: <UserPlus className="w-4 h-4" /> },
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

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardShell
      title="My Dashboard"
      subtitle="Your deals, leads, and sales activities"
      roleBadge="Sales User"
      roleColor="bg-rose-100 text-rose-800"
      headerActions={
        <Button variant="outline" size="sm" onClick={() => onNavigate?.('leads')}>
          <Users className="w-4 h-4 mr-2" />
          My Leads
        </Button>
      }
    >
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pipeline">My Pipeline</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Monthly Revenue"
              value={`$${myMetrics.monthlyRevenue.toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6" />}
              trend="up"
            />
            <MetricCard
              title="Quota Progress"
              value={`${myMetrics.quotaProgress}%`}
              icon={<Target className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Active Deals"
              value={myMetrics.activeDeals}
              icon={<Briefcase className="w-6 h-6" />}
              trend="neutral"
            />
            <MetricCard
              title="Leads to Contact"
              value={myMetrics.leadsToContact}
              icon={<Users className="w-6 h-6" />}
              trend="neutral"
            />
          </div>

          {/* Quota Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quota Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>$12,500 of $16,000</span>
                  <span className="font-medium">{myMetrics.quotaProgress}%</span>
                </div>
                <Progress value={myMetrics.quotaProgress} className="h-3" />
                <p className="text-sm text-gray-500">$3,500 remaining to hit quota</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Deals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myDeals.map((deal, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{deal.company}</p>
                      <p className="text-sm text-gray-500">Next: {deal.nextAction}</p>
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

        <TabsContent value="leads" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Leads</CardTitle>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myLeads.map((lead, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{lead.source}</Badge>
                      <Badge className={getLeadStatusColor(lead.status)}>{lead.status}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <QuickAction
                  title="Log Call"
                  description="Record a sales call"
                  icon={<Phone className="w-5 h-5 text-blue-600" />}
                  onClick={() => onNavigate?.('log-call')}
                />
                <QuickAction
                  title="Send Email"
                  description="Compose sales email"
                  icon={<Mail className="w-5 h-5 text-green-600" />}
                  onClick={() => onNavigate?.('email')}
                />
                <QuickAction
                  title="Schedule Meeting"
                  description="Book a demo or call"
                  icon={<Calendar className="w-5 h-5 text-purple-600" />}
                  onClick={() => onNavigate?.('schedule')}
                />
                <QuickAction
                  title="Create Proposal"
                  description="Generate a proposal"
                  icon={<FileText className="w-5 h-5 text-orange-600" />}
                  onClick={() => onNavigate?.('proposal')}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
};

export default PlatformSalesUserDashboard;
