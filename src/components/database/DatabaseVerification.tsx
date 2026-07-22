import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Database, 
  RefreshCw, 
  Table2, 
  FileText,
  AlertTriangle,
  Play,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TableInfo {
  name: string;
  rowCount: number;
  accessible: boolean;
  error?: string;
}

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

export const DatabaseVerification: React.FC = () => {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const criticalTables = [
    'platform_users',
    'organizations',
    'organization_users',
    'sms_verification_sessions',
    'user_sessions',
    'audit_logs',
    'workspaces',
    'invitations'
  ];

  const checkTables = async () => {
    setIsLoading(true);
    const tableInfo: TableInfo[] = [];

    for (const tableName of criticalTables) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: false })
          .limit(1);

        if (error) {
          tableInfo.push({
            name: tableName,
            rowCount: 0,
            accessible: false,
            error: error.message
          });
        } else {
          // Get actual count
          const { count: actualCount } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          tableInfo.push({
            name: tableName,
            rowCount: actualCount || 0,
            accessible: true
          });
        }
      } catch (err) {
        tableInfo.push({
          name: tableName,
          rowCount: 0,
          accessible: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    setTables(tableInfo);
    setIsLoading(false);
  };

  const runDatabaseTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    // Test 1: Insert into sms_verification_sessions
    try {
      const testSessionId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { data, error } = await supabase
        .from('sms_verification_sessions')
        .insert({
          session_id: testSessionId,
          email: 'db-test@example.com',
          phone_number: '+15551234567',
          code_hash: '123456',
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          purpose: 'db_test'
        })
        .select()
        .single();

      if (error) {
        results.push({
          name: 'Insert SMS Session',
          success: false,
          message: `Failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      } else {
        results.push({
          name: 'Insert SMS Session',
          success: true,
          message: `Successfully inserted session: ${testSessionId}`,
          data: data,
          timestamp: new Date().toISOString()
        });

        // Test 2: Read the inserted row
        const { data: readData, error: readError } = await supabase
          .from('sms_verification_sessions')
          .select('*')
          .eq('session_id', testSessionId)
          .single();

        if (readError) {
          results.push({
            name: 'Read SMS Session',
            success: false,
            message: `Failed: ${readError.message}`,
            timestamp: new Date().toISOString()
          });
        } else {
          results.push({
            name: 'Read SMS Session',
            success: true,
            message: `Successfully read session`,
            data: readData,
            timestamp: new Date().toISOString()
          });
        }

        // Test 3: Update the row
        const { error: updateError } = await supabase
          .from('sms_verification_sessions')
          .update({ attempts: 1, verified: true, verified_at: new Date().toISOString() })
          .eq('session_id', testSessionId);

        if (updateError) {
          results.push({
            name: 'Update SMS Session',
            success: false,
            message: `Failed: ${updateError.message}`,
            timestamp: new Date().toISOString()
          });
        } else {
          results.push({
            name: 'Update SMS Session',
            success: true,
            message: 'Successfully updated session',
            timestamp: new Date().toISOString()
          });
        }

        // Test 4: Delete the test row
        const { error: deleteError } = await supabase
          .from('sms_verification_sessions')
          .delete()
          .eq('session_id', testSessionId);

        if (deleteError) {
          results.push({
            name: 'Delete SMS Session',
            success: false,
            message: `Failed: ${deleteError.message}`,
            timestamp: new Date().toISOString()
          });
        } else {
          results.push({
            name: 'Delete SMS Session',
            success: true,
            message: 'Successfully deleted test session',
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      results.push({
        name: 'SMS Session Tests',
        success: false,
        message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 5: Check platform_users
    try {
      const { data, error } = await supabase
        .from('platform_users')
        .select('id, email, full_name, role, is_owner')
        .limit(5);

      if (error) {
        results.push({
          name: 'Read Platform Users',
          success: false,
          message: `Failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      } else {
        results.push({
          name: 'Read Platform Users',
          success: true,
          message: `Found ${data?.length || 0} platform users`,
          data: data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      results.push({
        name: 'Read Platform Users',
        success: false,
        message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }

    // Test 6: Test Edge Function connectivity
    try {
      const { data, error } = await supabase.functions.invoke('sms-verification', {
        body: { action: 'test_connection' }
      });

      if (error) {
        results.push({
          name: 'Edge Function Connectivity',
          success: false,
          message: `Failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      } else {
        results.push({
          name: 'Edge Function Connectivity',
          success: true,
          message: 'Edge function responded (may return error for invalid action, but connection works)',
          data: data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      results.push({
        name: 'Edge Function Connectivity',
        success: false,
        message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    }

    setTestResults(results);
    setIsRunningTests(false);
    
    // Refresh table counts after tests
    await checkTables();
  };

  const cleanupTestData = async () => {
    setIsRunningTests(true);
    
    // Delete all test sessions
    await supabase
      .from('sms_verification_sessions')
      .delete()
      .like('email', '%test%');
    
    await supabase
      .from('sms_verification_sessions')
      .delete()
      .like('purpose', '%test%');

    await checkTables();
    setIsRunningTests(false);
  };

  useEffect(() => {
    checkTables();
  }, []);

  const totalRows = tables.reduce((sum, t) => sum + t.rowCount, 0);
  const accessibleCount = tables.filter(t => t.accessible).length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-500" />
            <div>
              <CardTitle>Database Verification</CardTitle>
              <CardDescription>Verify database connectivity and data integrity</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={checkTables} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-blue-600">{criticalTables.length}</div>
            <div className="text-sm text-blue-600/70">Tables Checked</div>
          </div>
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
            <div className="text-2xl font-bold text-green-600">{accessibleCount}</div>
            <div className="text-sm text-green-600/70">Accessible</div>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
            <div className="text-2xl font-bold text-purple-600">{totalRows}</div>
            <div className="text-sm text-purple-600/70">Total Rows</div>
          </div>
        </div>

        {/* Tables Status */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Table Status
          </h4>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg border ${
                    table.accessible 
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {table.accessible ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-mono text-sm">{table.name}</span>
                  </div>
                  <Badge variant={table.rowCount > 0 ? 'default' : 'secondary'}>
                    {table.rowCount} rows
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Actions */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-medium flex items-center gap-2">
            <Play className="h-4 w-4" />
            Database Tests
          </h4>
          <div className="flex gap-2">
            <Button onClick={runDatabaseTests} disabled={isRunningTests}>
              {isRunningTests ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run CRUD Tests
            </Button>
            <Button variant="outline" onClick={cleanupTestData} disabled={isRunningTests}>
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Test Data
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Test Results
            </h4>
            <ScrollArea className="h-64 rounded-lg border">
              <div className="p-4 space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium text-sm">{result.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6">{result.message}</p>
                    {result.data && (
                      <pre className="mt-2 ml-6 p-2 bg-black/5 dark:bg-white/5 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Important Note */}
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">SMS Verification Note</p>
              <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                The SMS verification edge function creates a session in the database, then sends an SMS via Twilio. 
                If the SMS fails (e.g., invalid phone number), the session is automatically cleaned up. 
                This is why you may see 0 rows in sms_verification_sessions - it's working correctly!
                Use a real phone number to test the full flow.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseVerification;
