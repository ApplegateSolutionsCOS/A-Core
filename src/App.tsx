// Insert this at the very top, before other imports
if (typeof window !== 'undefined') {
  const rawConsoleError = console.error;
  console.error = (...args) => {
    // If the error contains the specific Edge Function message, kill it.
    const message = args[0]?.message || (typeof args[0] === 'string' ? args[0] : '');
    if (message.includes('Failed to send a request to the Edge Function') || 
        message.includes('FunctionsFetchError')) {
      return; 
    }
    rawConsoleError.apply(console, args);
  };

  const fontLink = document.createElement('link');
  // ⚡ MAKE SURE THIS URL HAS BOTH FONTS:
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Goldman:wght@400;700&family=Gruppo&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);
}

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { createContext, useContext, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { ConnectionBanner } from "@/components/connectivity/ConnectionBanner";
import { UpdateNotification } from "@/components/connectivity/UpdateNotification";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import DatabaseTest from "./pages/DatabaseTest";
import PhoneMirrorPage from "./pages/PhoneMirrorPage";

const queryClient = new QueryClient();

// --- GLOBAL NOTIFICATION SYSTEM ---
export type AlertType = 'info' | 'warning' | 'urgent';

export interface AppAlert {
  id: string;
  message: string;
  type: AlertType;
}

interface NotificationContextType {
  alerts: AppAlert[];
  addAlert: (alert: Omit<AppAlert, 'id'>) => void;
  removeAlert: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Exporting this hook allows any file (like TasksView) to trigger a global alert
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within App');
  return context;
};

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);

  const addAlert = useCallback((alert: Omit<AppAlert, 'id'>) => {
    setAlerts(prev => [...prev, { ...alert, id: crypto.randomUUID() }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setAlerts(current => current.filter(a => a.id !== alert.id)); // Use alert.id (which is undefined), wait, we need the generated ID
    }, 5000);
  }, []);

  // Fix for auto-remove: generate ID first
  const addAlertWithTimeout = useCallback((alert: Omit<AppAlert, 'id'>) => {
    const id = crypto.randomUUID();
    setAlerts(prev => [...prev, { ...alert, id }]);
    setTimeout(() => setAlerts(current => current.filter(a => a.id !== id)), 5000);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAlertStyles = (type: AlertType) => {
    switch (type) {
      case 'urgent': return 'bg-red-950/90 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
      case 'warning': return 'bg-orange-950/90 border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
      default: return 'bg-black/90 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.2)]';
    }
  };

  return (
    <NotificationContext.Provider value={{ alerts, addAlert: addAlertWithTimeout, removeAlert }}>
      {alerts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-2xl flex flex-col gap-2 pointer-events-none animate-in slide-in-from-top-4">
          {alerts.map(alert => (
            <div key={alert.id} className={`pointer-events-auto flex items-center justify-between p-3 rounded-lg border backdrop-blur-md font-mono text-sm ${getAlertStyles(alert.type)}`}>
              <span className="flex-1">{alert.message}</span>
              <button onClick={() => removeAlert(alert.id)} className="ml-4 opacity-70 hover:opacity-100 hover:text-white transition-opacity font-bold">✕</button>
            </div>
          ))}
        </div>
      )}
      {children}
    </NotificationContext.Provider>
  );
};
// ----------------------------------


const App = () => (
  <ThemeProvider defaultTheme="dark">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConnectionProvider>
          <NotificationProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <ConnectionBanner />
            <UpdateNotification />
            <BrowserRouter>
              <Routes>
                {/* Main app route */}
                <Route path="/" element={<Index />} />
                
                {/* Admin route - redirects to main app with admin action */}
                <Route path="/admin" element={<Index initialView="admin" />} />
                <Route path="/admin/*" element={<Index initialView="admin" />} />
                
                {/* Dashboard routes */}
                <Route path="/dashboard" element={<Index initialView="dashboard" />} />
                <Route path="/my-dashboard" element={<Index initialView="dashboard" />} />
                <Route path="/calendar" element={<Index initialView="calendar" />} />
                <Route path="/tasks" element={<Index initialView="tasks" />} />
                <Route path="/messages" element={<Index initialView="messages" />} />
                
                {/* Workspace routes */}
                <Route path="/workspace" element={<Navigate to="/workspaces" replace />} />
                <Route path="/workspace/:slug" element={<Index initialView="workspace" />} />
                <Route path="/workspaces" element={<Index initialView="workspaces" />} />

                {/* Settings routes */}
                <Route path="/settings" element={<Index initialView="settings" />} />
                <Route path="/settings/*" element={<Index initialView="settings" />} />
                
                {/* Auth routes - for direct linking */}
                <Route path="/login" element={<Index initialView="login" />} />
                <Route path="/register" element={<Index initialView="register" />} />
                <Route path="/signup" element={<Index initialView="register" />} />
                
                {/* Password reset route */}
                <Route path="/reset-password" element={<ResetPassword />} />

                
                {/* Email verification route */}
                <Route path="/verify-email" element={<VerifyEmail />} />
                
                {/* Database test route */}
                <Route path="/db-test" element={<DatabaseTest />} />
                
                {/* Phone Mirror companion page */}
                <Route path="/phone-mirror" element={<PhoneMirrorPage />} />
                
                {/* Catch-all for 404 */}
                <Route path="*" element={<NotFound />} />

              </Routes>
            </BrowserRouter>

          </TooltipProvider>
          </NotificationProvider>
        </ConnectionProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
