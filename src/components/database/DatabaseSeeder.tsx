import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPABASE_URL } from '@/lib/supabaseConfig';

import { 
  Database, 
  Play, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Users, 
  Building2, 
  FolderKanban,
  ScrollText,
  Trash2,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SeedResult {
  success: boolean;
  message: string;
  counts?: {
    organizations: number;
    platform_users: number;
    organization_users: number;
    workspaces: number;
    audit_logs: number;
  };
  errors?: string[];
  timestamp: string;
}

interface TableStatus {
  name: string;
  exists: boolean;
  count: number;
}

// Sample data to seed
const SAMPLE_ORGANIZATIONS = [
  {
    name: 'Acme Corporation',
    slug: 'acme-corp',
    domain: 'acme-corp.com',
    subscription_tier: 'enterprise',
    monthly_base_price: 499.00,
    per_user_price: 15.00,
    max_users: 100,
    is_active: true,
    settings: { theme: 'light', timezone: 'America/New_York' }
  },
  {
    name: 'TechStart Inc',
    slug: 'techstart',
    domain: 'techstart.io',
    subscription_tier: 'professional',
    monthly_base_price: 199.00,
    per_user_price: 12.00,
    max_users: 50,
    is_active: true,
    settings: { theme: 'dark', timezone: 'America/Los_Angeles' }
  },
  {
    name: 'Global Dynamics',
    slug: 'global-dynamics',
    domain: 'globaldynamics.net',
    subscription_tier: 'starter',
    monthly_base_price: 49.00,
    per_user_price: 8.00,
    max_users: 10,
    is_active: true,
    settings: { theme: 'system', timezone: 'Europe/London' }
  }
];

const SAMPLE_PLATFORM_USERS = [
  {
    email: 'owner@applegate-bos.com',
    full_name: 'System Owner',
    role: 'platform_owner_admin',
    department: 'tech',
    status: 'active',
    is_owner: true,
    phone_number: '+1-555-0100'
  },
  {
    email: 'tech.admin@applegate-bos.com',
    full_name: 'Tech Administrator',
    role: 'platform_tech_admin',
    department: 'tech',
    status: 'active',
    is_owner: false,
    phone_number: '+1-555-0101'
  },
  {
    email: 'support.admin@applegate-bos.com',
    full_name: 'Support Administrator',
    role: 'platform_support_admin',
    department: 'support',
    status: 'active',
    is_owner: false,
    phone_number: '+1-555-0102'
  },
  {
    email: 'sales.admin@applegate-bos.com',
    full_name: 'Sales Administrator',
    role: 'platform_sales_admin',
    department: 'sales',
    status: 'active',
    is_owner: false,
    phone_number: '+1-555-0103'
  },
  {
    email: 'tech.manager@applegate-bos.com',
    full_name: 'Tech Manager',
    role: 'platform_tech_manager',
    department: 'tech',
    status: 'active',
    is_owner: false,
    phone_number: '+1-555-0104'
  },
  {
    email: 'support.user@applegate-bos.com',
    full_name: 'Support Agent',
    role: 'platform_support_user',
    department: 'support',
    status: 'active',
    is_owner: false,
    phone_number: '+1-555-0105'
  },
  {
    email: 'sales.user@applegate-bos.com',
    full_name: 'Sales Representative',
    role: 'platform_sales_user',
    department: 'sales',
    status: 'active',
    is_owner: false,
    phone_number: '+1-555-0106'
  }
];

const SAMPLE_ORG_USERS_TEMPLATE = [
  { email_suffix: 'admin', full_name_suffix: 'Admin', role: 'organization_admin', department: 'admin', is_org_creator: true },
  { email_suffix: 'tech.manager', full_name_suffix: 'Tech Manager', role: 'organization_tech_manager', department: 'tech', is_org_creator: false },
  { email_suffix: 'support.manager', full_name_suffix: 'Support Manager', role: 'organization_support_manager', department: 'support', is_org_creator: false },
  { email_suffix: 'tech.user', full_name_suffix: 'Developer', role: 'organization_tech_user', department: 'tech', is_org_creator: false },
  { email_suffix: 'support.user', full_name_suffix: 'Support Agent', role: 'organization_support_user', department: 'support', is_org_creator: false },
];

const SAMPLE_WORKSPACES_TEMPLATE = [
  { name: 'Admin', slug: 'admin', icon: 'shield', description: 'Administrative workspace' },
  { name: 'Main', slug: 'main', icon: 'home', description: 'Main workspace for daily operations' },
  { name: 'Accounting', slug: 'accounting', icon: 'calculator', description: 'Financial management' },
  { name: 'Personnel', slug: 'personnel', icon: 'users', description: 'HR and personnel management' },
  { name: 'Data', slug: 'data', icon: 'database', description: 'Data management and analytics' },
  { name: 'Security', slug: 'security', icon: 'lock', description: 'Security and access control' },
];

const AUDIT_ACTIONS = [
  'user.login',
  'user.logout',
  'user.created',
  'user.updated',
  'organization.created',
  'workspace.created',
  'workspace.updated',
  'settings.updated',
  'invitation.sent',
  'invitation.accepted',
  'password.changed',
  'role.changed',
];

export const DatabaseSeeder: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [tableStatus, setTableStatus] = useState<TableStatus[]>([]);
  const [activeTab, setActiveTab] = useState('seed');

  const checkTables = async () => {
    setIsChecking(true);
    const tables = [
      'organizations',
      'platform_users',
      'organization_users',
      'workspaces',
      'workspace_access',
      'mini_apps',
      'audit_logs',
      'invitations',
      'messages',
      'tasks'
    ];

    const statuses: TableStatus[] = [];

    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        statuses.push({
          name: table,
          exists: !error,
          count: count || 0
        });
      } catch (e) {
        statuses.push({
          name: table,
          exists: false,
          count: 0
        });
      }
    }

    setTableStatus(statuses);
    setIsChecking(false);
  };

  const clearAllData = async () => {
    // Delete in reverse order of dependencies
    const tables = [
      'audit_logs',
      'workspace_access',
      'workspaces',
      'organization_users',
      'platform_users',
      'organizations'
    ];

    for (const table of tables) {
      try {
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.log(`Could not clear ${table}:`, e);
      }
    }
  };

  const seedDatabase = async () => {
    setIsSeeding(true);
    setResult(null);
    const errors: string[] = [];
    const counts = {
      organizations: 0,
      platform_users: 0,
      organization_users: 0,
      workspaces: 0,
      audit_logs: 0
    };

    try {
      // Clear existing data if requested
      if (clearExisting) {
        await clearAllData();
      }

      // 1. Seed Organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .upsert(SAMPLE_ORGANIZATIONS, { onConflict: 'slug' })
        .select();

      if (orgsError) {
        errors.push(`Organizations: ${orgsError.message}`);
      } else {
        counts.organizations = orgs?.length || 0;
      }

      // 2. Seed Platform Users
      const { data: platformUsers, error: platformUsersError } = await supabase
        .from('platform_users')
        .upsert(SAMPLE_PLATFORM_USERS, { onConflict: 'email' })
        .select();

      if (platformUsersError) {
        errors.push(`Platform Users: ${platformUsersError.message}`);
      } else {
        counts.platform_users = platformUsers?.length || 0;
      }

      // 3. Seed Organization Users (for each org)
      if (orgs && orgs.length > 0) {
        for (const org of orgs) {
          const orgUsers = SAMPLE_ORG_USERS_TEMPLATE.map((template, index) => ({
            organization_id: org.id,
            email: `${template.email_suffix}@${org.domain}`,
            full_name: `${org.name} ${template.full_name_suffix}`,
            role: template.role,
            department: template.department,
            status: 'active',
            is_org_creator: template.is_org_creator,
            phone_number: `+1-555-${String(org.id.charCodeAt(0)).padStart(4, '0').slice(0, 4)}`
          }));

          const { data: createdOrgUsers, error: orgUsersError } = await supabase
            .from('organization_users')
            .upsert(orgUsers, { onConflict: 'organization_id,email' })
            .select();

          if (orgUsersError) {
            errors.push(`Org Users (${org.name}): ${orgUsersError.message}`);
          } else {
            counts.organization_users += createdOrgUsers?.length || 0;
          }

          // 4. Seed Workspaces for each org
          const workspaces = SAMPLE_WORKSPACES_TEMPLATE.map((template, index) => ({
            organization_id: org.id,
            name: template.name,
            slug: template.slug,
            icon: template.icon,
            description: template.description,
            is_visible: true,
            display_order: index
          }));

          const { data: createdWorkspaces, error: workspacesError } = await supabase
            .from('workspaces')
            .upsert(workspaces, { onConflict: 'organization_id,slug' })
            .select();

          if (workspacesError) {
            errors.push(`Workspaces (${org.name}): ${workspacesError.message}`);
          } else {
            counts.workspaces += createdWorkspaces?.length || 0;
          }
        }
      }

      // 5. Seed Audit Logs
      const auditLogs = [];
      const now = new Date();
      
      for (let i = 0; i < 20; i++) {
        const randomAction = AUDIT_ACTIONS[Math.floor(Math.random() * AUDIT_ACTIONS.length)];
        const randomOrg = orgs ? orgs[Math.floor(Math.random() * orgs.length)] : null;
        const randomUser = platformUsers ? platformUsers[Math.floor(Math.random() * platformUsers.length)] : null;
        
        auditLogs.push({
          organization_id: randomOrg?.id || null,
          user_id: randomUser?.id || null,
          user_type: 'platform',
          user_email: randomUser?.email || 'system@applegate-bos.com',
          action: randomAction,
          entity_type: randomAction.split('.')[0],
          ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          metadata: { source: 'database_seeder', index: i },
          created_at: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      const { data: createdLogs, error: logsError } = await supabase
        .from('audit_logs')
        .insert(auditLogs)
        .select();

      if (logsError) {
        errors.push(`Audit Logs: ${logsError.message}`);
      } else {
        counts.audit_logs = createdLogs?.length || 0;
      }

      // Set result
      setResult({
        success: errors.length === 0,
        message: errors.length === 0 
          ? 'Database seeded successfully!' 
          : `Seeding completed with ${errors.length} error(s)`,
        counts,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const copySQL = () => {
    const sqlUrl = 'https://github.com/your-repo/docs/CREATE_TABLES.sql';
    navigator.clipboard.writeText(`-- Copy the SQL from: docs/CREATE_TABLES.sql
-- Or run it directly in Supabase SQL Editor`);
  };

  const statCards = [
    { key: 'organizations', label: 'Organizations', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50' },
    { key: 'platform_users', label: 'Platform Users', icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
    { key: 'organization_users', label: 'Org Users', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { key: 'workspaces', label: 'Workspaces', icon: FolderKanban, color: 'text-purple-500', bg: 'bg-purple-50' },
    { key: 'audit_logs', label: 'Audit Logs', icon: ScrollText, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-purple-500" />
          <div>
            <CardTitle>Database Setup & Seeder</CardTitle>
            <CardDescription>Create tables and populate with sample data for testing</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">1. Setup Tables</TabsTrigger>
            <TabsTrigger value="check">2. Check Status</TabsTrigger>
            <TabsTrigger value="seed">3. Seed Data</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Step 1: Create Tables in Supabase</h4>
              <p className="text-sm text-blue-700 mb-4">
                Before seeding data, you need to create the database tables. Follow these steps:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                <li>Go to your Supabase project dashboard</li>
                <li>Click on <strong>SQL Editor</strong> in the left sidebar</li>
                <li>Create a new query</li>
                <li>Copy and paste the SQL from <code className="bg-blue-100 px-1 rounded">docs/CREATE_TABLES.sql</code></li>
                <li>Click <strong>Run</strong> to execute the SQL</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.open(`${SUPABASE_URL.replace('.co', '.com/dashboard/project/' + SUPABASE_URL.split('//')[1].split('.')[0])}/sql`, '_blank')}

              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open SQL Editor
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText('See docs/CREATE_TABLES.sql for the full SQL script');
                  alert('Check the file: docs/CREATE_TABLES.sql');
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy SQL Path
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-700 font-medium">Important Notes:</p>
                  <ul className="list-disc list-inside text-sm text-amber-600 mt-1 space-y-1">
                    <li>Tables are created in the <strong>public</strong> schema</li>
                    <li>RLS (Row Level Security) is enabled with permissive policies for testing</li>
                    <li>You should customize RLS policies for production</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Check Status Tab */}
          <TabsContent value="check" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Table Status</h4>
              <Button onClick={checkTables} disabled={isChecking} size="sm">
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check Tables
                  </>
                )}
              </Button>
            </div>

            {tableStatus.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {tableStatus.map((table) => (
                  <div 
                    key={table.name}
                    className={`p-3 rounded-lg border ${
                      table.exists 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm">{table.name}</span>
                      {table.exists ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    {table.exists && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {table.count} records
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Click "Check Tables" to verify database status
              </div>
            )}

            {tableStatus.length > 0 && tableStatus.some(t => !t.exists) && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">
                  Some tables are missing. Please run the SQL script from Step 1 first.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Seed Tab */}
          <TabsContent value="seed" className="space-y-6 mt-4">
            {/* Seed Options */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="clear-existing" className="text-base font-medium">Clear Existing Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Remove all existing data before seeding
                  </p>
                </div>
                <Switch
                  id="clear-existing"
                  checked={clearExisting}
                  onCheckedChange={setClearExisting}
                />
              </div>

              {clearExisting && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Warning: This will delete all existing data in the database tables.
                  </p>
                </div>
              )}
            </div>

            {/* Seed Data Preview */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Data to be created:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span>3 Organizations</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <Users className="h-4 w-4 text-green-500" />
                  <span>7 Platform Users</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <Users className="h-4 w-4 text-cyan-500" />
                  <span>15 Org Users</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <FolderKanban className="h-4 w-4 text-purple-500" />
                  <span>18 Workspaces</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <ScrollText className="h-4 w-4 text-orange-500" />
                  <span>20 Audit Logs</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {clearExisting ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="flex-1" 
                      disabled={isSeeding}
                      variant="destructive"
                    >
                      {isSeeding ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Seeding...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear & Seed Database
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will delete all existing data in the database tables and replace it with sample data. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={seedDatabase} className="bg-red-600 hover:bg-red-700">
                        Yes, clear and seed
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button 
                  className="flex-1" 
                  onClick={seedDatabase}
                  disabled={isSeeding}
                >
                  {isSeeding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Seeding Database...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Seed Database
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Results */}
            {result && (
              <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.message}
                  </span>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="mb-4 p-3 rounded bg-red-100 border border-red-200">
                    <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.counts && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
                    {statCards.map(({ key, label, icon: Icon, color, bg }) => (
                      <div key={key} className={`p-3 rounded-lg ${bg}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-4 w-4 ${color}`} />
                          <span className="text-xs font-medium text-muted-foreground">{label}</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {result.counts?.[key as keyof typeof result.counts] || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-3">
                  Completed at: {new Date(result.timestamp).toLocaleString()}
                </p>
              </div>
            )}

            {/* Sample Users Info */}
            <div className="pt-4 border-t space-y-3">
              <h4 className="font-medium text-sm">Sample Platform Users:</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 font-medium">Role</th>
                      <th className="text-left p-2 font-medium">Email</th>
                      <th className="text-left p-2 font-medium">Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_PLATFORM_USERS.slice(0, 5).map((user, i) => (
                      <tr key={i} className="border-b border-muted/30">
                        <td className="p-2 text-muted-foreground">{user.role.replace(/_/g, ' ')}</td>
                        <td className="p-2 font-mono text-xs">{user.email}</td>
                        <td className="p-2 text-muted-foreground capitalize">{user.department}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DatabaseSeeder;
