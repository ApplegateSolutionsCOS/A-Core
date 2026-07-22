import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  LogIn, 
  UserPlus, 
  Briefcase,
  ArrowRight
} from 'lucide-react';

interface DefaultDashboardProps {
  onNavigate?: (view: string) => void;
}

const DefaultDashboard: React.FC<DefaultDashboardProps> = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Home className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Applegate CORE BOS</CardTitle>
          <p className="text-gray-500 mt-2">
            {isAuthenticated 
              ? 'Your dashboard is being configured. Please contact your administrator.'
              : 'Sign in to access your personalized dashboard.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => onNavigate?.('login')}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg"
                onClick={() => onNavigate?.('register')}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Organization Account
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-between" 
                onClick={() => onNavigate?.('workspaces')}
              >
                <span className="flex items-center">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Browse Workspaces
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DefaultDashboard;
