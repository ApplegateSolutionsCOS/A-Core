
import React from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { WorkspaceColorProvider } from '@/contexts/WorkspaceColorContext';

interface IndexProps {
  initialView?: 'dashboard' | 'calendar' | 'tasks' | 'messages' | 'admin' | 'settings' | 'workspace' | 'workspaces' | 'login' | 'register';
}

const Index: React.FC<IndexProps> = ({ initialView }) => {
  const { slug } = useParams();
  
  return (
    <AppProvider>
      <WorkspaceColorProvider>
        <AppLayout 
          initialView={initialView} 
          workspaceSlug={slug}
        />
      </WorkspaceColorProvider>
    </AppProvider>
  );
};

export default Index;
