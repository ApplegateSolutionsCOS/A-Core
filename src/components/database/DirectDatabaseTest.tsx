import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabaseConfig';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Database, 
  Eye,
  Plus,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface QueryResult {
  table: string;
  action: string;
  success: boolean;
  data: any;
  error: string | null;
  timestamp: string;
  rowCount?: number;
}

export const DirectDatabaseTest: React.FC = () => {
  const [results, setResults] = useState<QueryResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTable, setActiveTable] = useState('platform_users');

  // Connection info from centralized config
  const connectionInfo = {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY,
  };


  const tables = [
    'platform_users',
    'organizations', 
    'organization_users',
    'sms_verification_sessions',
    'user_sessions',
    'audit_logs',
    'workspaces',
    'invitations'
  ];

  const addResult = (result: QueryResult) => {
    setResults(prev => [result, ...prev]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Direct SELECT query
  const queryTable = async (tableName: string) => {
    setIsLoading(true);
    const timestamp = new Date().toISOString();
    
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' });

      addResult({
        table: tableName,
        action: 'SELECT *',
        success: !error,
        data: data,
        error: error?.message || null,
        timestamp,
        rowCount: count || data?.length || 0
      });
    } catch (err) {
      addResult({
        table: tableName,
        action: 'SELECT *',
        success: false,
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp
      });
    }
    
    setIsLoading(false);
  };

  // Insert test data that PERSISTS (not auto-deleted)
  const insertTestData = async (tableName: string) => {
    setIsLoading(true);
    const timestamp = new Date().toISOString();
    const testId = `manual-test-${Date.now()}`;

    let insertData: any = {};
    
    switch (tableName) {
      case 'sms_verification_sessions':
        insertData = {
          session_id: testId,
          email: 'manual-test@verification.test',
          phone_number: '+15551234567',
          code_hash: 'test-hash-123456',
          expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          purpose: 'manual_verification_test'
        };
        break;
      case 'platform_users':
        insertData = {
          email: `test-user-${Date.now()}@test.com`,
          full_name: 'Test User ' + Date.now(),
          role: 'platform_tech_user',
          is_owner: false,
          status: 'pending_approval'
        };
        break;
      case 'organizations':
        insertData = {
          name: 'Test Organization ' + Date.now(),
          slug: 'test-org-' + Date.now(),
          status: 'active'
        };
        break;
      case 'audit_logs':
        insertData = {
          action: 'manual_test',
          entity_type: 'test',
          entity_id: testId,
          details: { test: true, timestamp: Date.now() }
        };
        break;
      default:
        addResult({
          table: tableName,
          action: 'INSERT',
          success: false,
          data: null,
          error: 'Insert test not configured for this table',
          timestamp
        });
        setIsLoading(false);
        return;
    }

    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert(insertData)
        .select();

      addResult({
        table: tableName,
        action: 'INSERT',
        success: !error,
        data: error ? insertData : data,
        error: error?.message || null,
        timestamp
      });

      // If successful, immediately query to show the new data
      if (!error) {
        await queryTable(tableName);
      }
    } catch (err) {
      addResult({
        table: tableName,
        action: 'INSERT',
        success: false,
        data: insertData,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp
      });
    }
    
    setIsLoading(false);
  };

  // Delete test data
  const deleteTestData = async (tableName: string) => {
    setIsLoading(true);
    const timestamp = new Date().toISOString();

    try {
      let query;
      
      switch (tableName) {
        case 'sms_verification_sessions':
          query = supabase.from(tableName).delete().like('session_id', 'manual-test%');
          break;
        case 'platform_users':
          query = supabase.from(tableName).delete().like('email', 'test-user-%@test.com');
          break;
        case 'organizations':
          query = supabase.from(tableName).delete().like('slug', 'test-org-%');
          break;
        case 'audit_logs':
          query = supabase.from(tableName).delete().eq('action', 'manual_test');
          break;
        default:
          addResult({
            table: tableName,
            action: 'DELETE',
            success: false,
            data: null,
            error: 'Delete test not configured for this table',
            timestamp
          });
          setIsLoading(false);
          return;
      }

      const { error, count } = await query;

      addResult({
        table: tableName,
        action: 'DELETE test data',
        success: !error,
        data: { deletedCount: count },
        error: error?.message || null,
        timestamp
      });

      // Refresh table data
      if (!error) {
        await queryTable(tableName);
      }
    } catch (err) {
      addResult({
        table: tableName,
        action: 'DELETE',
        success: false,
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp
      });
    }
    
    setIsLoading(false);
  };

  // Query all tables at once
  const queryAllTables = async () => {
    setIsLoading(true);
    for (const table of tables) {
      await queryTable(table);
    }
    setIsLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Connection Info Card */}
      <Card className="border-2 border-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-600">
            <Database className="h-5 w-5" />
            Supabase Connection Details
          </CardTitle>
          <CardDescription>
            These are the credentials being used to connect to your database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Supabase URL:</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(connectionInfo.url)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <code className="text-sm text-blue-600 dark:text-blue-400 break-all">{connectionInfo.url}</code>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">API Key (anon/public):</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(connectionInfo.key)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <code className="text-sm text-green-600 dark:text-green-400 break-all">{connectionInfo.key}</code>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <a 
              href={`${connectionInfo.url}/project/default/editor`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open Supabase Dashboard
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Database Tests</CardTitle>
          <CardDescription>
            Insert test data that will PERSIST in the database. Check your Supabase dashboard to verify.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTable} onValueChange={setActiveTable}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
              {tables.map(table => (
                <TabsTrigger key={table} value={table} className="text-xs">
                  {table}
                </TabsTrigger>
              ))}
            </TabsList>

            {tables.map(table => (
              <TabsContent key={table} value={table} className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={() => queryTable(table)} 
                    disabled={isLoading}
                    variant="outline"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                    View All Data
                  </Button>
                  <Button 
                    onClick={() => insertTestData(table)} 
                    disabled={isLoading}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Insert Test Row
                  </Button>
                  <Button 
                    onClick={() => deleteTestData(table)} 
                    disabled={isLoading}
                    variant="destructive"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Delete Test Data
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button onClick={queryAllTables} disabled={isLoading} variant="secondary">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Query All Tables
            </Button>
            <Button onClick={clearResults} variant="ghost">
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Query Results ({results.length})</span>
              <span className="text-sm font-normal text-muted-foreground">
                Most recent first
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border-2 ${
                      result.success 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                        : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span className="font-bold">{result.table}</span>
                      <span className="text-sm text-muted-foreground">→ {result.action}</span>
                      {result.rowCount !== undefined && (
                        <span className="ml-auto text-sm font-medium bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                          {result.rowCount} rows
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground mb-2">
                      {new Date(result.timestamp).toLocaleString()}
                    </div>

                    {result.error && (
                      <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded text-red-700 dark:text-red-300 text-sm mb-2">
                        Error: {result.error}
                      </div>
                    )}

                    {result.data && (
                      <div className="relative">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(JSON.stringify(result.data, null, 2))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <pre className="p-3 bg-slate-900 text-slate-100 rounded text-xs overflow-x-auto max-h-64">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-amber-500">
        <CardHeader>
          <CardTitle className="text-amber-600">How to Verify Data in Supabase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Click <strong>"Insert Test Row"</strong> for any table above</li>
            <li>Note the data shown in the results (copy it if needed)</li>
            <li>Open your <a href={connectionInfo.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Supabase Dashboard</a></li>
            <li>Go to <strong>Table Editor</strong> in the left sidebar</li>
            <li>Select the table you inserted into</li>
            <li>You should see the test row with matching data</li>
            <li>Use <strong>"Delete Test Data"</strong> to clean up when done</li>
          </ol>
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg mt-4">
            <strong>Note:</strong> Test data inserted here will remain in the database until you manually delete it.
            This allows you to verify in the Supabase dashboard that writes are actually persisting.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectDatabaseTest;
