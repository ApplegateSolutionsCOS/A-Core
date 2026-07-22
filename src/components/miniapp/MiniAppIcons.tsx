import React from 'react';
import * as LucideIcons from 'lucide-react';

// The default fallback icon if a mapping fails
const FallbackIcon = LucideIcons.Box;

export const getMiniAppIcon = (iconName: string): React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> => {
  if (!iconName) return FallbackIcon;
  
  // 1. Try to find the exact component inside the Lucide library dynamically
  const IconComponent = (LucideIcons as any)[iconName];
  
  if (IconComponent) {
    return IconComponent;
  }
  
  // 2. Safeties for legacy lowercase names (if your DB still has any)
  const legacyMap: Record<string, React.FC<any>> = {
    'main': LucideIcons.Home,
    'admin': LucideIcons.Shield,
    'security': LucideIcons.Lock,
    'accounting': LucideIcons.BarChart,
    'personnel': LucideIcons.Users,
    'data': LucideIcons.Database,
  };

  if (legacyMap[iconName.toLowerCase()]) {
    return legacyMap[iconName.toLowerCase()];
  }
  
  // 3. Ultimate Fallback
  return FallbackIcon;
};