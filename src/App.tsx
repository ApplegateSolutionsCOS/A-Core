// Insert this at the very top, before other imports
if (typeof window !== 'undefined') {
  // ⚡ ROBOT-BEATING ANDROID PUSH FIX
  // We MUST halt JS execution by throwing an error after setting href. 
  // Otherwise, React Router mounts too fast and cancels the browser's redirect attempt.
  const cleanPath = window.location.pathname.toLowerCase().replace(/\/$/, '');
  if (cleanPath !== '/messages' && cleanPath.endsWith('messages')) {
    window.location.href = '/messages' + window.location.search;
    throw new Error("HALT: Fixing bad Android native push route.");
  }

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
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ConnectionProvider } from "@/contexts/ConnectionContext";
import { ConnectionBanner } from "@/components/connectivity/ConnectionBanner";
import { UpdateNotification } from "@/components/connectivity/UpdateNotification";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import DatabaseTest from "./pages/DatabaseTest";
import PhoneMirrorPage from "./pages/PhoneMirrorPage";
import { supabase } from "@/lib/supabase";

const queryClient = new QueryClient();

// --- GLOBAL NOTIFICATION SYSTEM ---
export type AlertType = 'info' | 'warning' | 'urgent';

export interface AppAlert {
  id: string;
  message: string;
  type: AlertType;
  onClick?: () => void;
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

  const generateId = () => {
    // Fallback for non-https local development environments
    return (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
      ? crypto.randomUUID() 
      : `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  };

  const addAlert = useCallback((alert: Omit<AppAlert, 'id'>) => {
    const id = generateId();
    setAlerts(prev => [...prev, { ...alert, id }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setAlerts(current => current.filter(a => a.id !== id));
    }, 5000);
  }, []);

  // Fix for auto-remove: generate ID first
  const addAlertWithTimeout = useCallback((alert: Omit<AppAlert, 'id'>) => {
    const id = generateId();
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
        <div className="fixed bottom-6 right-6 z-[100] w-[350px] flex flex-col gap-3 pointer-events-none">
          {alerts.map(alert => (
            <div 
              key={alert.id} 
              onClick={() => { if(alert.onClick) { alert.onClick(); removeAlert(alert.id); } }}
              className={`pointer-events-auto flex flex-col p-4 rounded-xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-8 fade-in duration-300 font-mono text-sm ${alert.onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''} ${getAlertStyles(alert.type)}`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className="font-bold text-white tracking-wide text-xs uppercase">
                  {alert.type === 'info' ? 'Incoming Message' : 'System Alert'}
                </span>
                <button 
                  onClick={() => removeAlert(alert.id)} 
                  className="opacity-50 hover:opacity-100 hover:text-white transition-opacity ml-4"
                >
                  ✕
                </button>
              </div>
              <span className="opacity-90 leading-relaxed text-sm">{alert.message}</span>
            </div>
          ))}
        </div>
      )}
      {children}
    </NotificationContext.Provider>
  );
};
// ----------------------------------

// ⚡ GLOBAL NOTIFICATION COMPONENT
// Moved below NotificationProvider so it can safely use the useNotifications hook
const GlobalNotificationListener = () => {
  const { user } = useAuth();
  const { addAlert } = useNotifications();
  const currentUserId = user?.id || (user as any)?.uid;

  React.useEffect(() => {
    if (!currentUserId) return;

    const globalSubscription = supabase.channel(`global_notifications_app_${currentUserId}_${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'app_private', table: 'messages' }, async (payload) => {
        const newDbMsg = payload.new as any;
        
        // ⚡ FIX: Strictly typecast both IDs to strings to prevent phantom self-notifications
        if (String(newDbMsg.sender_id) === String(currentUserId)) return;

        const { data: participant } = await supabase.schema('app_private')
          .from('chat_participants')
          .select('user_id')
          .eq('thread_id', newDbMsg.thread_id)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (participant) {
          // 1. Fetch Sender Info
          const { data: sender } = await supabase.schema('app_private')
            .from('organization_users')
            .select('full_name, email')
            .eq('id', newDbMsg.sender_id)
            .maybeSingle();

          // 2. Fetch Thread Info (to check for Group Chats)
          const { data: thread } = await supabase.schema('app_private')
            .from('chat_threads')
            .select('title, is_group')
            .eq('id', newDbMsg.thread_id)
            .maybeSingle();
            
          const senderName = sender?.full_name || sender?.email || 'New Message';
          
          // 3. Format the Display Title
          const displayTitle = (thread?.is_group && thread?.title) 
            ? `${senderName} (${thread.title})` 
            : senderName;

          const previewText = newDbMsg.message_type === 'text' ? newDbMsg.content : `Sent a ${newDbMsg.message_type}`;
          
          // ⚡ ALWAYS FIRE THE IN-APP TOAST (Clicking it opens the thread!)
          addAlert({ 
            message: `${displayTitle}: "${previewText}"`, 
            type: 'info',
            onClick: () => {
              window.postMessage({ type: 'OPEN_CHAT_THREAD', threadId: newDbMsg.thread_id }, '*');
            }
          });
        }
      }).subscribe();

    return () => { supabase.removeChannel(globalSubscription); };
  }, [currentUserId, addAlert]);

  return null;
};

// ⚡ OS PUSH NOTIFICATION FIX
// Android natively resolves relative push URLs against the suspended background tab.
// This catches those bad OS-level native navigations and forces them to the absolute path.
const OSPushRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/messages${location.search}`} replace />;
};

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConnectionProvider>
          <NotificationProvider>
            <GlobalNotificationListener />
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
                
                {/* ⚡ Catch and correct bad OS-level relative push navigations */}
                <Route path="/workspace/messages" element={<OSPushRedirect />} />
                <Route path="/admin/messages" element={<OSPushRedirect />} />
                <Route path="/settings/messages" element={<OSPushRedirect />} />

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
