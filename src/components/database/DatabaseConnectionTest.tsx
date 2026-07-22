import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SUPABASE_URL } from '@/lib/supabaseConfig';
import { CheckCircle, XCircle, Loader2, Database, RefreshCw } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ConnectionStatus {
  isConnected: boolean;
  message: string;
  timestamp: string | null;
  tables: string[];
  error: string | null;
}

export const DatabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    message: 'Testing connection...',
    timestamp: null,
    tables: [],
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const testConnection = async () => {
    setIsLoading(true);
    setStatus(prev => ({ ...prev, message: 'Testing connection...', error: null }));

    try {
      // Test 1: Query the connection_test table
      const { data: testData, error: testError } = await supabase
        .from('connection_test')
        .select('*')
        .limit(1);

      if (testError) {
        throw new Error(`Connection test failed: ${testError.message}`);
      }

      // Test 2: Check if we can query the tables we created
      const tablesToCheck = ['organizations', 'users', 'organization_users', 'workspaces', 'audit_logs'];
      const availableTables: string[] = [];

      for (const table of tablesToCheck) {
        try {
          const { error } = await supabase.from(table).select('id').limit(1);
          if (!error) {
            availableTables.push(table);
          }
        } catch {
          // Table might not exist or not accessible
        }
      }

      setStatus({
        isConnected: true,
        message: testData?.[0]?.test_message || 'Database connection successful!',
        timestamp: new Date().toISOString(),
        tables: availableTables,
        error: null,
      });
    } catch (error) {
      setStatus({
        isConnected: false,
        message: 'Connection failed',
        timestamp: new Date().toISOString(),
        tables: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-500" />
          <div>
            <CardTitle>Database Connection Status</CardTitle>
            <CardDescription>Supabase database connectivity test</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          {isLoading ? (
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          ) : status.isConnected ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <XCircle className="h-8 w-8 text-red-500" />
          )}
          <div className="flex-1">
            <p className={`font-semibold ${status.isConnected ? 'text-green-600' : status.error ? 'text-red-600' : 'text-muted-foreground'}`}>
              {isLoading ? 'Testing connection...' : status.isConnected ? 'Connected' : 'Disconnected'}
            </p>
            <p className="text-sm text-muted-foreground">{status.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={testConnection} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error Display */}
        {status.error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-800">Error Details:</p>
            <p className="text-sm text-red-600 mt-1">{status.error}</p>
          </div>
        )}

        {/* Available Tables */}
        {status.tables.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Available Tables ({status.tables.length})</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {status.tables.map((table) => (
                <div
                  key={table}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 border border-green-200"
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-mono text-green-700">{table}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connection Info */}
        <div className="pt-4 border-t space-y-2">
          <h4 className="font-medium text-sm">Connection Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Host:</span>
              <p className="font-mono text-xs mt-1 truncate">{SUPABASE_URL.replace('https://', '')}</p>
            </div>

            <div>
              <span className="text-muted-foreground">Last Checked:</span>
              <p className="font-mono text-xs mt-1">
                {status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseConnectionTest;
