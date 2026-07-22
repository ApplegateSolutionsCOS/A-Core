import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformUser, OrganizationUser } from '@/types';

// Platform Dashboards
import PlatformTechAdminDashboard from './platform/PlatformTechAdminDashboard';
import PlatformSupportAdminDashboard from './platform/PlatformSupportAdminDashboard';
import PlatformSalesAdminDashboard from './platform/PlatformSalesAdminDashboard';
import PlatformTechManagerDashboard from './platform/PlatformTechManagerDashboard';
import PlatformSupportManagerDashboard from './platform/PlatformSupportManagerDashboard';
import PlatformSalesManagerDashboard from './platform/PlatformSalesManagerDashboard';
import PlatformTechUserDashboard from './platform/PlatformTechUserDashboard';
import PlatformSupportUserDashboard from './platform/PlatformSupportUserDashboard';
import PlatformSalesUserDashboard from './platform/PlatformSalesUserDashboard';

// Organization Dashboards (placeholder for future)
import OrganizationAdminDashboard from './organization/OrganizationAdminDashboard';
import OrganizationManagerDashboard from './organization/OrganizationManagerDashboard';
import OrganizationUserDashboard from './organization/OrganizationUserDashboard';

// Default Dashboard
import DefaultDashboard from './DefaultDashboard';

interface DashboardRouterProps {
  onNavigate?: (view: string) => void;
}

const DashboardRouter: React.FC<DashboardRouterProps> = ({ onNavigate }) => {
  const { 
    user, 
    userType, 
    isPlatformOwner,
    getUserRole 
  } = useAuth();

  if (!user || !userType) {
    return <DefaultDashboard onNavigate={onNavigate} />;
  }

  const role = getUserRole();

  // Platform Owner gets the Tech Admin dashboard (God Mode has access to everything)
  if (isPlatformOwner()) {
    return <PlatformTechAdminDashboard onNavigate={onNavigate} isGodMode />;
  }

  // Platform Users
  if (userType === 'platform') {
    const platformUser = user as PlatformUser;
    
    console.log('[DashboardRouter] Platform user role:', platformUser.role);
    
    switch (platformUser.role) {
      case 'platform_owner':
      case 'platform_owner_admin':
        // Platform owner should already be handled above, but just in case
        return <PlatformTechAdminDashboard onNavigate={onNavigate} isGodMode />;
      case 'platform_tech_admin':
        return <PlatformTechAdminDashboard onNavigate={onNavigate} />;
      case 'platform_support_admin':
        return <PlatformSupportAdminDashboard onNavigate={onNavigate} />;
      case 'platform_sales_admin':
        return <PlatformSalesAdminDashboard onNavigate={onNavigate} />;
      case 'platform_tech_manager':
        return <PlatformTechManagerDashboard onNavigate={onNavigate} />;
      case 'platform_support_manager':
        return <PlatformSupportManagerDashboard onNavigate={onNavigate} />;
      case 'platform_sales_manager':
        return <PlatformSalesManagerDashboard onNavigate={onNavigate} />;
      case 'platform_tech_user':
        return <PlatformTechUserDashboard onNavigate={onNavigate} />;
      case 'platform_support_user':
        return <PlatformSupportUserDashboard onNavigate={onNavigate} />;
      case 'platform_sales_user':
        return <PlatformSalesUserDashboard onNavigate={onNavigate} />;
      default:
        console.log('[DashboardRouter] Unknown platform role, using default:', platformUser.role);
        return <DefaultDashboard onNavigate={onNavigate} />;
    }
  }

  // Organization Users

  if (userType === 'organization') {
    const orgUser = user as OrganizationUser;
    
    // Organization Admin
    if (orgUser.role === 'organization_admin') {
      return <OrganizationAdminDashboard onNavigate={onNavigate} />;
    }
    
    // Organization Managers
    if (orgUser.role.includes('_manager')) {
      return <OrganizationManagerDashboard onNavigate={onNavigate} department={getDepartmentFromRole(orgUser.role)} />;
    }
    
    // Organization Users
    return <OrganizationUserDashboard onNavigate={onNavigate} department={getDepartmentFromRole(orgUser.role)} />;
  }

  return <DefaultDashboard onNavigate={onNavigate} />;
};

// Helper function to extract department from role
function getDepartmentFromRole(role: string): string {
  if (role.includes('tech')) return 'tech';
  if (role.includes('support')) return 'support';
  if (role.includes('sales')) return 'sales';
  if (role.includes('accounting')) return 'accounting';
  if (role.includes('personnel')) return 'personnel';
  if (role.includes('security')) return 'security';
  if (role.includes('admin')) return 'admin';
  return 'general';
}

export default DashboardRouter;
