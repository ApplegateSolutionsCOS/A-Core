import React, { useState, useEffect, useCallback } from 'react';
import { invokeEdgeFunction, runDiagnostics, SUPABASE_URL, SUPABASE_ANON_KEY, testSingleStrategy, testCorsPreflightDirect, testSupabaseConnectivity, testGetConnectivity } from '@/lib/edgeFunctionClient';
import type { DiagnosticReport, StrategyDiagnostic, SingleStrategyResult, GetConnectivityResult } from '@/lib/edgeFunctionClient';





// ─── Icons ────────────────────────────────────────────────────────────────────

const SettingsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CheckCircleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const AlertCircleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

const ExternalLinkIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const CloseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const KeyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const DatabaseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const NewsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8V6Z" />
  </svg>
);

const SaveIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsPreferences {
  providerPriority: ('gateway' | 'gnews' | 'rss')[];
  preferredCategories: string[];
  cacheDurationMinutes: number;
  autoRefreshEnabled: boolean;
  autoRefreshIntervalMinutes: number;
  showThumbnails: boolean;
  articlesPerPage: number;
}

interface HealthStatus {
  youtube: {
    configured: boolean;
    quotaOk: boolean | null;
    lastCheck: string | null;
    error: string | null;
  };
  news: {
    gatewayConfigured: boolean;
    gnewsConfigured: boolean;
    gnewsRateLimit: {
      remaining: number;
      limit: number;
      resetsIn: string;
      allowed: boolean;
    } | null;
    rssAvailable: boolean;
    lastProvider: string | null;
    cacheStatus: string | null;
  };
}


const DEFAULT_PREFERENCES: NewsPreferences = {
  providerPriority: ['gateway', 'gnews', 'rss'],
  preferredCategories: [],
  cacheDurationMinutes: 7,
  autoRefreshEnabled: true,
  autoRefreshIntervalMinutes: 5,
  showThumbnails: true,
  articlesPerPage: 30,
};

const STORAGE_KEY = 'newsfeed_preferences';

const CATEGORIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'politics', label: 'Politics' },
  { value: 'science', label: 'Science' },
  { value: 'health', label: 'Health' },
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'world', label: 'World' },
  { value: 'security', label: 'Security' },
  { value: 'AI', label: 'AI & ML' },
];

// ─── YouTube Setup Icons ──────────────────────────────────────────────────────

const ShieldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const InfoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const PlayIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const WifiIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

interface NewsSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPreferencesChange?: (prefs: NewsPreferences) => void;
}

const NewsSettingsPanel: React.FC<NewsSettingsPanelProps> = ({ isOpen, onClose, onPreferencesChange }) => {
  const [activeTab, setActiveTab] = useState<'preferences' | 'api-keys' | 'health' | 'youtube-setup' | 'diagnostics'>('preferences');
  const [preferences, setPreferences] = useState<NewsPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    youtube: { configured: false, quotaOk: null, lastCheck: null, error: null },
    news: { gatewayConfigured: false, gnewsConfigured: false, gnewsRateLimit: null, rssAvailable: true, lastProvider: null, cacheStatus: null },
  });
  const [checking, setChecking] = useState(false);
  const [saved, setSaved] = useState(false);
  const [edgeFunctionError, setEdgeFunctionError] = useState<string | null>(null);
  const [youtubeTestResult, setYoutubeTestResult] = useState<{ valid: boolean; quotaOk: boolean; error?: string } | null>(null);
  const [testingYoutube, setTestingYoutube] = useState(false);
  const [youtubeSetupStep, setYoutubeSetupStep] = useState(0);

  // Diagnostics state
  const [diagReport, setDiagReport] = useState<DiagnosticReport | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagTarget, setDiagTarget] = useState<'find-live-streams' | 'fetch-news'>('find-live-streams');
  const [diagExpanded, setDiagExpanded] = useState<number | null>(null);

  const handleRunDiagnostics = useCallback(async () => {
    setDiagRunning(true);
    setDiagReport(null);
    setDiagExpanded(null);
    try {
      const report = await runDiagnostics(diagTarget, 15000);
      setDiagReport(report);
    } catch (err: any) {
      console.error('Diagnostics failed:', err);
    } finally {
      setDiagRunning(false);
    }
  }, [diagTarget]);

  const handleBypassServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.active) {
        reg.active.postMessage({ type: 'SET_BYPASS', enabled: true });
        alert('Service Worker bypass mode enabled. Try running diagnostics again.');
      } else {
        alert('No active service worker found.');
      }
    }
  }, []);


  // Load health status on mount
  useEffect(() => {
    if (isOpen) {
      checkHealthStatus();
    }
  }, [isOpen]);

  const checkHealthStatus = useCallback(async () => {
    setChecking(true);
    setEdgeFunctionError(null);
    
    let youtubeHealth = { configured: false, quotaOk: null as boolean | null, lastCheck: new Date().toISOString(), error: null as string | null };
    let newsHealth = { gatewayConfigured: false, gnewsConfigured: false, gnewsRateLimit: null as any, rssAvailable: true, lastProvider: null as string | null, cacheStatus: null as string | null };
    
    try {
      const { data: streamData, error: streamError } = await invokeEdgeFunction('find-live-streams', {
        healthCheck: true, testQuota: true,
      });

      if (streamError) {
        const isEdgeFnUnavailable = streamError.includes('ALL_STRATEGIES_FAILED') || streamError.includes('Failed to send a request');
        if (isEdgeFnUnavailable) {
          console.warn('[NewsSettings] find-live-streams edge function unreachable.');
          setEdgeFunctionError('Edge functions are unreachable from this browser. The find-live-streams and fetch-news edge functions need to be deployed to your Supabase project. Client-side RSS fallback is active for news.');
        } else {
          console.error('YouTube health check error:', streamError);
          youtubeHealth.error = streamError || 'Edge function not available';
        }
      } else if (streamData?.health) {
        youtubeHealth = {
          configured: streamData.health.apiKeyConfigured ?? false,
          quotaOk: streamData.health.quotaAvailable ?? (streamData.health.apiKeyValid === true ? true : null),
          lastCheck: new Date().toISOString(),
          error: streamData.health.quotaTestError || null,
        };
      }
    } catch (err: any) {
      const isEdgeFnUnavailable = err?.message?.includes('ALL_STRATEGIES_FAILED') || err?.message?.includes('Failed to send a request');
      if (isEdgeFnUnavailable) {
        console.warn('[NewsSettings] find-live-streams edge function unreachable.');
        setEdgeFunctionError('Edge functions are unreachable from this browser. The find-live-streams and fetch-news edge functions need to be deployed to your Supabase project. Client-side RSS fallback is active for news.');
      } else {
        console.error('YouTube health check exception:', err);
        youtubeHealth.error = err?.message || 'Failed to check YouTube API';
      }
    }


    try {
      const { data: newsData, error: newsError } = await invokeEdgeFunction('fetch-news', {
        healthCheck: true,
      });

      if (newsError) {
        const isEdgeFnUnavailable = newsError.includes('ALL_STRATEGIES_FAILED') || newsError.includes('Failed to send a request');
        if (isEdgeFnUnavailable) {
          console.warn('[NewsSettings] fetch-news edge function unreachable.');
          if (!edgeFunctionError) {
            setEdgeFunctionError('Edge functions are unreachable from this browser. The find-live-streams and fetch-news edge functions need to be deployed to your Supabase project. Client-side RSS fallback is active for news.');
          }
        } else {
          console.error('News health check error:', newsError);
        }
      } else if (newsData?.health) {
        newsHealth = {
          gatewayConfigured: newsData.health.primaryApiConfigured ?? false,
          gnewsConfigured: newsData.health.gnewsApiConfigured ?? false,
          gnewsRateLimit: newsData.health.gnewsRateLimit || null,
          rssAvailable: true,
          lastProvider: newsData.health.lastProvider || null,
          cacheStatus: newsData.health.cacheStatus || null,
        };
      }
    } catch (err: any) {
      const isEdgeFnUnavailable = err?.message?.includes('ALL_STRATEGIES_FAILED') || err?.message?.includes('Failed to send a request');
      if (isEdgeFnUnavailable) {
        console.warn('[NewsSettings] fetch-news edge function unreachable.');
        if (!edgeFunctionError) {
          setEdgeFunctionError('Edge functions are unreachable from this browser. Deploy the edge functions for full functionality.');
        }
      } else {
        console.error('News health check exception:', err);
      }
    }


    setHealthStatus({
      youtube: youtubeHealth,
      news: newsHealth,
    });
    setChecking(false);
  }, []);


  const testYoutubeCredentials = useCallback(async () => {
    setTestingYoutube(true);
    setYoutubeTestResult(null);
    try {
      const { data, error } = await invokeEdgeFunction('find-live-streams', {
        healthCheck: true, testQuota: true,
      });
      if (error) {
        const isUnreachable = error.includes('ALL_STRATEGIES_FAILED') || error.includes('Failed to send a request');
        setYoutubeTestResult({ 
          valid: false, 
          quotaOk: false, 
          error: isUnreachable ? 'Edge functions unreachable from this browser. Deploy find-live-streams to your Supabase project.' : (error || 'Edge function error')
        });
      } else if (data?.health) {
        setYoutubeTestResult({
          valid: data.health.apiKeyValid ?? data.health.apiKeyConfigured ?? false,
          quotaOk: data.health.quotaAvailable ?? false,
          error: data.health.quotaTestError || undefined,
        });
      } else {
        setYoutubeTestResult({ valid: false, quotaOk: false, error: 'Unexpected response format' });
      }
    } catch (err: any) {
      setYoutubeTestResult({ valid: false, quotaOk: false, error: err?.message || 'Connection failed' });
    } finally {
      setTestingYoutube(false);
    }
  }, []);


  const handleSavePreferences = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onPreferencesChange?.(preferences);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  }, [preferences, onPreferencesChange]);

  const handleToggleCategory = useCallback((category: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(category)
        ? prev.preferredCategories.filter(c => c !== category)
        : [...prev.preferredCategories, category],
    }));
  }, []);

  const handleMoveProvider = useCallback((provider: 'gateway' | 'gnews' | 'rss', direction: 'up' | 'down') => {
    setPreferences(prev => {
      const idx = prev.providerPriority.indexOf(provider);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.providerPriority.length) return prev;
      const newPriority = [...prev.providerPriority];
      [newPriority[idx], newPriority[newIdx]] = [newPriority[newIdx], newPriority[idx]];
      return { ...prev, providerPriority: newPriority };
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950">
          <div className="flex items-center gap-3">
            <SettingsIcon size={20} className="text-cyan-400" />
            <h3 className="text-white font-mono font-bold">News Feed Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-950/50 overflow-x-auto">
          {[
            { id: 'preferences', label: 'Preferences', icon: <SettingsIcon size={14} /> },
            { id: 'api-keys', label: 'API Keys', icon: <KeyIcon size={14} /> },
            { id: 'health', label: 'Health Check', icon: <DatabaseIcon size={14} /> },
            { id: 'youtube-setup', label: 'YouTube Setup', icon: <PlayIcon size={14} /> },
            { id: 'diagnostics', label: 'Diagnostics', icon: <WifiIcon size={14} /> },
          ].map(tab => (

            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-cyan-400 bg-cyan-500/5'
                  : 'text-gray-500 border-transparent hover:text-gray-400 hover:bg-gray-900/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Provider Priority */}
              <div>
                <h4 className="text-white font-mono font-medium mb-3 flex items-center gap-2">
                  <NewsIcon size={16} className="text-cyan-400" />
                  News Provider Priority
                </h4>
                <p className="text-xs text-gray-500 font-mono mb-3">
                  Drag to reorder. The system will try providers in this order.
                </p>
                <div className="space-y-2">
                  {preferences.providerPriority.map((provider, idx) => (
                    <div
                      key={provider}
                      className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-xs font-mono text-gray-400">
                          {idx + 1}
                        </span>
                        <span className={`text-sm font-mono font-medium ${
                          provider === 'gateway' ? 'text-emerald-400' :
                          provider === 'gnews' ? 'text-blue-400' :
                          'text-orange-400'
                        }`}>
                          {provider === 'gateway' ? 'Gateway API' :
                           provider === 'gnews' ? 'GNews API' :
                           'RSS Feeds'}
                        </span>
                        {provider === 'gateway' && healthStatus.news.gatewayConfigured && (
                          <CheckCircleIcon size={14} className="text-green-400" />
                        )}
                        {provider === 'gnews' && healthStatus.news.gnewsConfigured && (
                          <CheckCircleIcon size={14} className="text-green-400" />
                        )}
                        {provider === 'rss' && (
                          <span className="text-[10px] font-mono text-gray-500 px-1.5 py-0.5 bg-gray-800 rounded">Always available</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveProvider(provider, 'up')}
                          disabled={idx === 0}
                          className={`p-1.5 rounded transition-all ${
                            idx === 0 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="18 15 12 9 6 15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveProvider(provider, 'down')}
                          disabled={idx === preferences.providerPriority.length - 1}
                          className={`p-1.5 rounded transition-all ${
                            idx === preferences.providerPriority.length - 1 ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferred Categories */}
              <div>
                <h4 className="text-white font-mono font-medium mb-3">Preferred Categories</h4>
                <p className="text-xs text-gray-500 font-mono mb-3">
                  Select categories to prioritize. Leave empty to show all.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => handleToggleCategory(cat.value)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                        preferences.preferredCategories.includes(cat.value)
                          ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'
                          : 'text-gray-500 border-gray-700 hover:border-gray-600 hover:text-gray-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cache & Refresh Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">Cache Duration (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={preferences.cacheDurationMinutes}
                    onChange={e => setPreferences(prev => ({ ...prev, cacheDurationMinutes: parseInt(e.target.value) || 7 }))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">Articles Per Page</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={preferences.articlesPerPage}
                    onChange={e => setPreferences(prev => ({ ...prev, articlesPerPage: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-all">
                  <span className="text-sm font-mono text-gray-300">Auto-refresh headlines</span>
                  <input
                    type="checkbox"
                    checked={preferences.autoRefreshEnabled}
                    onChange={e => setPreferences(prev => ({ ...prev, autoRefreshEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/30"
                  />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-900 border border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-all">
                  <span className="text-sm font-mono text-gray-300">Show article thumbnails</span>
                  <input
                    type="checkbox"
                    checked={preferences.showThumbnails}
                    onChange={e => setPreferences(prev => ({ ...prev, showThumbnails: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500/30"
                  />
                </label>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                {saved && (
                  <span className="text-xs font-mono text-green-400 flex items-center gap-1.5">
                    <CheckCircleIcon size={14} />
                    Saved!
                  </span>
                )}
                <button
                  onClick={handleSavePreferences}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-mono text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-all"
                >
                  <SaveIcon size={16} />
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <div className="space-y-6">
              {/* YouTube API Key */}
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-mono font-medium">YouTube Data API v3</h4>
                      <p className="text-xs text-gray-500 font-mono">For live stream detection</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
                    healthStatus.youtube.configured
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    {healthStatus.youtube.configured ? <CheckCircleIcon size={12} /> : <AlertCircleIcon size={12} />}
                    {healthStatus.youtube.configured ? 'Configured' : 'Not Configured'}
                  </div>
                </div>

                <div className="space-y-3 text-xs font-mono text-gray-400">
                  <p><strong className="text-gray-300">Environment Variables:</strong> <code className="px-1.5 py-0.5 bg-gray-800 rounded text-cyan-400">YOUTUBE_API_KEY</code> (current), <code className="px-1.5 py-0.5 bg-gray-800 rounded text-cyan-400">YOUTUBE_API_KEY_ONE</code> or <code className="px-1.5 py-0.5 bg-gray-800 rounded text-cyan-400">YOUTUBE_API_KEY_TWO</code> (dual-key failover)</p>
                  <p className="text-gray-500 mt-1">The system checks all three secret names. Use <code className="text-cyan-400">YOUTUBE_API_KEY</code> for a single key, or <code className="text-cyan-400">YOUTUBE_API_KEY_ONE</code> + <code className="text-cyan-400">YOUTUBE_API_KEY_TWO</code> for automatic quota failover between two keys.</p>

                  <div className="p-3 bg-gray-950 border border-gray-700 rounded-lg">
                    <p className="text-gray-300 mb-2">How to get a YouTube API key:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-500">
                      <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Google Cloud Console</a></li>
                      <li>Create a new project or select an existing one</li>
                      <li>Enable the "YouTube Data API v3" in the API Library</li>
                      <li>Go to Credentials &rarr; Create Credentials &rarr; API Key</li>
                      <li>Copy the API key</li>
                    </ol>
                  </div>

                  <p className="text-amber-400/80">
                    <strong>Note:</strong> YouTube API has a daily quota of 10,000 units. Each search costs ~100 units.
                    The system caches results and uses fallbacks to minimize API usage.
                  </p>
                  
                  <button
                    onClick={() => setActiveTab('youtube-setup')}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all w-full justify-center"
                  >
                    <ShieldIcon size={14} />
                    View Full YouTube Setup Guide (API Key vs OAuth2)
                  </button>
                </div>
              </div>


              {/* Gateway API Key */}
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <NewsIcon size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-mono font-medium">Gateway News API</h4>
                      <p className="text-xs text-gray-500 font-mono">Primary news provider</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
                    healthStatus.news.gatewayConfigured
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    {healthStatus.news.gatewayConfigured ? <CheckCircleIcon size={12} /> : <AlertCircleIcon size={12} />}
                    {healthStatus.news.gatewayConfigured ? 'Configured' : 'Not Configured'}
                  </div>
                </div>

                <div className="space-y-3 text-xs font-mono text-gray-400">
                  <p><strong className="text-gray-300">Environment Variable:</strong> <code className="px-1.5 py-0.5 bg-gray-800 rounded text-cyan-400">GATEWAY_API_KEY</code></p>
                  <div className="p-3 bg-gray-950 border border-gray-700 rounded-lg">
                    <p className="text-gray-300 mb-2">The Gateway News API provides high-quality news articles.</p>
                    <p className="text-gray-500">This is pre-configured with the platform. Contact your system administrator if issues arise.</p>
                  </div>
                </div>
              </div>

              {/* GNews API Key */}
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <NewsIcon size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-mono font-medium">GNews API</h4>
                      <p className="text-xs text-gray-500 font-mono">Fallback news provider</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
                    healthStatus.news.gnewsConfigured
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : 'bg-gray-700 text-gray-400 border border-gray-600'
                  }`}>
                    {healthStatus.news.gnewsConfigured ? <CheckCircleIcon size={12} /> : <AlertCircleIcon size={12} />}
                    {healthStatus.news.gnewsConfigured ? 'Configured' : 'Not Configured'}
                  </div>
                </div>

                <div className="space-y-3 text-xs font-mono text-gray-400">
                  <p><strong className="text-gray-300">Environment Variable:</strong> <code className="px-1.5 py-0.5 bg-gray-800 rounded text-cyan-400">GNEWS_API_KEY</code></p>
                  
                  <div className="p-3 bg-gray-950 border border-gray-700 rounded-lg">
                    <p className="text-gray-300 mb-2">How to get a free GNews API key:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-500">
                      <li>Go to <a href="https://gnews.io" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">gnews.io</a></li>
                      <li>Sign up for a free account</li>
                      <li>Navigate to your dashboard to get your API key</li>
                      <li>Free tier: 100 requests/day</li>
                    </ol>
                  </div>

                  {!healthStatus.news.gnewsConfigured && (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <p className="text-amber-400 mb-1"><strong>Troubleshooting:</strong></p>
                      <ul className="list-disc list-inside space-y-1 text-gray-500">
                        <li>Verify the secret name is exactly <code className="px-1 bg-gray-800 rounded text-cyan-400">GNEWS_API_KEY</code> (case-sensitive)</li>
                        <li>After adding the secret, the edge function needs to be restarted (it may take a few minutes)</li>
                        <li>Try clicking "Refresh" on the Health Check tab to re-test</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* RSS Feeds */}
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-orange-400">
                        <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-mono font-medium">RSS Feeds</h4>
                      <p className="text-xs text-gray-500 font-mono">Built-in fallback (no API key needed)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono bg-green-500/10 text-green-400 border border-green-500/30">
                    <CheckCircleIcon size={12} />
                    Always Available
                  </div>
                </div>

                <div className="text-xs font-mono text-gray-400 space-y-2">
                  <p>RSS feeds from major news sources are used as a fallback when API providers are unavailable.</p>
                  <p className="text-gray-500">Sources include: NYT, BBC, The Guardian, Reuters, and more.</p>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <WifiIcon size={12} className="text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Client-side RSS Fallback</span>
                    </div>
                    <p className="text-gray-500">
                      Even if edge functions are unavailable, the app will automatically fetch news directly from RSS feeds in your browser.
                      This ensures you always have access to headlines.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Health Check Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-white font-mono font-medium">System Health</h4>
                <button
                  onClick={checkHealthStatus}
                  disabled={checking}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                    checking
                      ? 'text-gray-500 border-gray-700 bg-gray-800/50 cursor-not-allowed'
                      : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20'
                  }`}
                >
                  <RefreshIcon size={14} className={checking ? 'animate-spin' : ''} />
                  {checking ? 'Checking...' : 'Refresh'}
                </button>
              </div>

              {/* Edge Function Error Banner */}
              {edgeFunctionError && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                  <div className="flex items-start gap-3">
                    <AlertCircleIcon size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-red-400 font-mono font-medium mb-2">Edge Function Connection Issue</h5>
                      <p className="text-xs font-mono text-gray-400 mb-3">
                        {edgeFunctionError}
                      </p>
                      <div className="p-3 bg-gray-950 border border-gray-700 rounded-lg">
                        <p className="text-gray-300 text-xs font-mono mb-2">Possible causes:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs font-mono text-gray-500">
                          <li>Edge functions may need to be redeployed after a Supabase update</li>
                          <li>Temporary network connectivity issue</li>
                          <li>Edge function cold start timeout (try refreshing)</li>
                        </ul>
                      </div>
                      <p className="text-xs font-mono text-emerald-400 mt-3">
                        <strong>Good news:</strong> Client-side RSS fallback is active. News headlines will still load directly in your browser.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* YouTube API Status */}
              <div className={`p-4 rounded-xl border ${
                healthStatus.youtube.configured && healthStatus.youtube.quotaOk !== false
                  ? 'bg-green-500/5 border-green-500/30'
                  : healthStatus.youtube.configured
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-red-500/5 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-white font-mono font-medium flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube Data API
                  </h5>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
                    healthStatus.youtube.configured && healthStatus.youtube.quotaOk !== false
                      ? 'bg-green-500/10 text-green-400'
                      : healthStatus.youtube.configured
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    {healthStatus.youtube.configured && healthStatus.youtube.quotaOk !== false ? (
                      <><CheckCircleIcon size={12} /> Healthy</>
                    ) : healthStatus.youtube.configured ? (
                      <><AlertCircleIcon size={12} /> {healthStatus.youtube.quotaOk === false ? 'Quota Issue' : 'Checking...'}</>
                    ) : (
                      <><AlertCircleIcon size={12} /> Not Configured</>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 bg-gray-950/50 rounded">
                    <span className="text-gray-500">API Key:</span>
                    <span className={healthStatus.youtube.configured ? 'text-green-400' : 'text-red-400'}>
                      {healthStatus.youtube.configured ? 'Configured' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-950/50 rounded">
                    <span className="text-gray-500">Quota:</span>
                    <span className={
                      healthStatus.youtube.quotaOk === true ? 'text-green-400' :
                      healthStatus.youtube.quotaOk === false ? 'text-red-400' :
                      'text-gray-400'
                    }>
                      {healthStatus.youtube.quotaOk === true ? 'Available' :
                       healthStatus.youtube.quotaOk === false ? 'Exhausted/Error' :
                       checking ? 'Checking...' : 'Unknown'}
                    </span>
                  </div>
                </div>
                {healthStatus.youtube.error && (
                  <div className="mt-2 p-2 bg-gray-950/50 rounded">
                    <p className="text-xs font-mono text-amber-400">
                      {healthStatus.youtube.error === 'Request timed out' 
                        ? 'API test timed out (may be a cold start). Try refreshing.'
                        : healthStatus.youtube.error}
                    </p>
                  </div>
                )}
                {healthStatus.youtube.configured && (
                  <button
                    onClick={() => setActiveTab('youtube-setup')}
                    className="mt-2 text-xs font-mono text-cyan-400 hover:underline"
                  >
                    View YouTube Setup Guide &rarr;
                  </button>
                )}
              </div>

              {/* News API Status */}
              <div className={`p-4 rounded-xl border ${
                healthStatus.news.gatewayConfigured
                  ? 'bg-green-500/5 border-green-500/30'
                  : 'bg-amber-500/5 border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-white font-mono font-medium flex items-center gap-2">
                    <NewsIcon size={16} className="text-emerald-400" />
                    News APIs
                  </h5>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
                    healthStatus.news.gatewayConfigured
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {healthStatus.news.gatewayConfigured ? (
                      <><CheckCircleIcon size={12} /> Primary OK</>
                    ) : (
                      <><AlertCircleIcon size={12} /> Using Fallback</>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono mt-3">
                  <div className="flex items-center justify-between p-2 bg-gray-950/50 rounded">
                    <span className="text-gray-500">Gateway API:</span>
                    <span className={healthStatus.news.gatewayConfigured ? 'text-green-400' : 'text-red-400'}>
                      {healthStatus.news.gatewayConfigured ? 'OK' : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-950/50 rounded">
                    <span className="text-gray-500">GNews API:</span>
                    <span className={healthStatus.news.gnewsConfigured ? 'text-green-400' : 'text-gray-500'}>
                      {healthStatus.news.gnewsConfigured ? 'OK' : 'Not Configured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-950/50 rounded">
                    <span className="text-gray-500">RSS (Server):</span>
                    <span className="text-green-400">Available</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-950/50 rounded">
                    <span className="text-gray-500">RSS (Client):</span>
                    <span className="text-green-400">Available</span>
                  </div>
                </div>

                {/* GNews Rate Limit Info */}
                {healthStatus.news.gnewsConfigured && healthStatus.news.gnewsRateLimit && (
                  <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-blue-400">GNews Rate Limit</span>
                      <span className={healthStatus.news.gnewsRateLimit.allowed ? 'text-green-400' : 'text-red-400'}>
                        {healthStatus.news.gnewsRateLimit.remaining}/{healthStatus.news.gnewsRateLimit.limit} remaining
                      </span>
                    </div>
                    <div className="mt-1.5 w-full bg-gray-800 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all ${
                          healthStatus.news.gnewsRateLimit.remaining > 50 ? 'bg-green-500' :
                          healthStatus.news.gnewsRateLimit.remaining > 20 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(healthStatus.news.gnewsRateLimit.remaining / healthStatus.news.gnewsRateLimit.limit) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-mono text-gray-500">
                      Resets in {healthStatus.news.gnewsRateLimit.resetsIn}
                    </p>
                  </div>
                )}

                {/* GNews not configured hint */}
                {!healthStatus.news.gnewsConfigured && !edgeFunctionError && (
                  <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <p className="text-xs font-mono text-amber-400 mb-1">GNews API is not configured</p>
                    <p className="text-xs font-mono text-gray-500">
                      Add <code className="px-1 bg-gray-800 rounded text-cyan-400">GNEWS_API_KEY</code> to your Supabase Edge Function secrets.
                      After adding, edge functions may need a few minutes to pick up the new secret.
                    </p>
                  </div>
                )}

                {healthStatus.news.lastProvider && (
                  <p className="mt-2 text-xs font-mono text-gray-500">
                    Last provider used: <span className="text-cyan-400">{healthStatus.news.lastProvider}</span>
                  </p>
                )}
              </div>

              {/* Client-side Fallback Status */}
              <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-white font-mono font-medium flex items-center gap-2">
                    <WifiIcon size={16} className="text-emerald-400" />
                    Client-side RSS Fallback
                  </h5>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono bg-green-500/10 text-green-400">
                    <CheckCircleIcon size={12} /> Active
                  </div>
                </div>
                <p className="text-xs font-mono text-gray-400">
                  When edge functions are unavailable, the app automatically fetches news from RSS feeds directly in your browser.
                  This provides headlines from NYT, BBC, The Guardian, and Reuters without any server-side dependencies.
                </p>
              </div>

              {/* Last Check Time */}
              {healthStatus.youtube.lastCheck && (
                <p className="text-xs font-mono text-gray-600 text-center">
                  Last checked: {new Date(healthStatus.youtube.lastCheck).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* YouTube Setup Tab */}
          {activeTab === 'youtube-setup' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-white font-mono font-bold mb-2 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-red-400">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube API Setup Guide
                </h4>
                <p className="text-xs font-mono text-gray-400">
                  Complete guide for configuring YouTube Data API v3 for live stream detection.
                </p>
              </div>

              {/* API Key vs OAuth2 Comparison */}
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
                <h5 className="text-white font-mono font-medium mb-3 flex items-center gap-2">
                  <InfoIcon size={16} className="text-cyan-400" />
                  API Key vs OAuth2: Which Do You Need?
                </h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-950 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <KeyIcon size={14} className="text-green-400" />
                      <span className="text-green-400 font-mono font-medium text-sm">API Key</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono bg-green-500/20 text-green-400 border border-green-500/30 rounded">RECOMMENDED</span>
                    </div>
                    <ul className="text-xs font-mono text-gray-400 space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <CheckCircleIcon size={12} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Access public YouTube data</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircleIcon size={12} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Search for live streams</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircleIcon size={12} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Get video/channel details</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircleIcon size={12} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>Simple setup, no user consent</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircleIcon size={12} className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span><strong className="text-white">This is what we use</strong></span>
                      </li>
                    </ul>
                  </div>
                  <div className="p-3 bg-gray-950 border border-gray-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldIcon size={14} className="text-gray-400" />
                      <span className="text-gray-400 font-mono font-medium text-sm">OAuth2</span>
                      <span className="px-1.5 py-0.5 text-[9px] font-mono bg-gray-700 text-gray-400 border border-gray-600 rounded">NOT NEEDED</span>
                    </div>
                    <ul className="text-xs font-mono text-gray-500 space-y-1.5">
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-600 flex-shrink-0 mt-0.5">-</span>
                        <span>Access user-specific data</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-600 flex-shrink-0 mt-0.5">-</span>
                        <span>Manage user's playlists</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-600 flex-shrink-0 mt-0.5">-</span>
                        <span>Post comments, like videos</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-600 flex-shrink-0 mt-0.5">-</span>
                        <span>Requires user consent flow</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-gray-600 flex-shrink-0 mt-0.5">-</span>
                        <span>Complex setup with redirect URIs</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <p className="mt-3 text-xs font-mono text-gray-500">
                  For live stream detection, an <strong className="text-green-400">API Key</strong> is sufficient. 
                  OAuth2 is only needed if you want to access a user's private data (subscriptions, watch history, etc.).
                  You do <strong className="text-white">NOT</strong> need OAuth2 for this feature.
                </p>
              </div>

              {/* Step-by-step Setup */}
              <div className="space-y-3">
                <h5 className="text-white font-mono font-medium flex items-center gap-2">
                  <KeyIcon size={16} className="text-green-400" />
                  Step-by-Step API Key Setup
                </h5>

                {[
                  {
                    title: 'Create a Google Cloud Project',
                    content: (
                      <div className="space-y-2">
                        <ol className="list-decimal list-inside space-y-1 text-gray-500">
                          <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">console.cloud.google.com</a></li>
                          <li>Click "Select a project" at the top, then "New Project"</li>
                          <li>Name it (e.g., "My News App") and click "Create"</li>
                          <li>Wait for the project to be created, then select it</li>
                        </ol>
                      </div>
                    ),
                  },
                  {
                    title: 'Enable YouTube Data API v3',
                    content: (
                      <div className="space-y-2">
                        <ol className="list-decimal list-inside space-y-1 text-gray-500">
                          <li>In the Google Cloud Console, go to <strong className="text-gray-300">APIs & Services</strong> &rarr; <strong className="text-gray-300">Library</strong></li>
                          <li>Search for <strong className="text-cyan-400">"YouTube Data API v3"</strong></li>
                          <li>Click on it, then click <strong className="text-green-400">"Enable"</strong></li>
                          <li>Wait for the API to be enabled (takes a few seconds)</li>
                        </ol>
                        <p className="text-amber-400 text-xs mt-2">
                          <strong>Important:</strong> If you skip this step, you'll get a "accessNotConfigured" error.
                        </p>
                      </div>
                    ),
                  },
                  {
                    title: 'Create an API Key',
                    content: (
                      <div className="space-y-2">
                        <ol className="list-decimal list-inside space-y-1 text-gray-500">
                          <li>Go to <strong className="text-gray-300">APIs & Services</strong> &rarr; <strong className="text-gray-300">Credentials</strong></li>
                          <li>Click <strong className="text-cyan-400">"+ Create Credentials"</strong> &rarr; <strong className="text-cyan-400">"API Key"</strong></li>
                          <li>A new API key will be generated. <strong className="text-white">Copy it immediately.</strong></li>
                          <li>(Optional) Click "Restrict Key" to limit it to YouTube Data API v3 only for security</li>
                        </ol>
                      </div>
                    ),
                  },
                  {
                    title: 'Add to Supabase Secrets',
                    content: (
                      <div className="space-y-2">
                        <ol className="list-decimal list-inside space-y-1 text-gray-500">
                          <li>Go to your <strong className="text-gray-300">Supabase project dashboard</strong></li>
                          <li>Navigate to <strong className="text-gray-300">Edge Functions</strong> &rarr; <strong className="text-gray-300">Secrets</strong></li>
                          <li>Click <strong className="text-cyan-400">"Add Secret"</strong></li>
                          <li>Primary key: <code className="px-1 bg-gray-800 rounded text-cyan-400">YOUTUBE_API_KEY_ONE</code></li>
                          <li>Backup key: <code className="px-1 bg-gray-800 rounded text-cyan-400">YOUTUBE_API_KEY_TWO</code> (optional, for quota failover)</li>
                          <li>Value: Paste your API key for each</li>
                          <li>Click <strong className="text-green-400">"Save"</strong></li>
                        </ol>
                        <p className="text-gray-500 text-xs mt-2">
                          The edge function tries <code className="text-cyan-400">YOUTUBE_API_KEY_ONE</code> first. If quota is exhausted, it automatically falls back to <code className="text-cyan-400">YOUTUBE_API_KEY_TWO</code>.
                          Edge functions may take 1-2 minutes to pick up new secrets.
                        </p>
                      </div>
                    ),
                  },

                  {
                    title: 'Verify It Works',
                    content: (
                      <div className="space-y-3">
                        <p className="text-gray-500">Click the test button below to verify your YouTube API key is working:</p>
                        <button
                          onClick={testYoutubeCredentials}
                          disabled={testingYoutube}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-mono rounded-lg border transition-all w-full justify-center ${
                            testingYoutube
                              ? 'text-gray-500 border-gray-700 bg-gray-800/50 cursor-not-allowed'
                              : 'text-green-400 border-green-500/40 bg-green-500/10 hover:bg-green-500/20'
                          }`}
                        >
                          {testingYoutube ? (
                            <><div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /> Testing...</>
                          ) : (
                            <><PlayIcon size={16} /> Test YouTube API Key</>
                          )}
                        </button>
                        {youtubeTestResult && (
                          <div className={`p-3 rounded-lg border ${
                            youtubeTestResult.valid && youtubeTestResult.quotaOk
                              ? 'bg-green-500/10 border-green-500/30'
                              : youtubeTestResult.valid
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-red-500/10 border-red-500/30'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              {youtubeTestResult.valid && youtubeTestResult.quotaOk ? (
                                <><CheckCircleIcon size={14} className="text-green-400" /><span className="text-green-400 font-mono text-sm font-medium">API Key Valid & Quota Available</span></>
                              ) : youtubeTestResult.valid ? (
                                <><AlertCircleIcon size={14} className="text-amber-400" /><span className="text-amber-400 font-mono text-sm font-medium">API Key Valid but Quota Issue</span></>
                              ) : (
                                <><AlertCircleIcon size={14} className="text-red-400" /><span className="text-red-400 font-mono text-sm font-medium">API Key Invalid or Error</span></>
                              )}
                            </div>
                            {youtubeTestResult.error && (
                              <p className="text-xs font-mono text-gray-400 mt-1">
                                {youtubeTestResult.error === 'Request timed out' 
                                  ? 'Test timed out. This may be a cold start issue - try again in a moment.'
                                  : youtubeTestResult.error}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border transition-all ${
                      youtubeSetupStep === idx
                        ? 'border-cyan-500/30 bg-cyan-500/5'
                        : 'border-gray-800 bg-gray-900/30'
                    }`}
                  >
                    <button
                      onClick={() => setYoutubeSetupStep(youtubeSetupStep === idx ? -1 : idx)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 ${
                        youtubeSetupStep === idx
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          : 'bg-gray-800 text-gray-500 border border-gray-700'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`text-sm font-mono font-medium ${
                        youtubeSetupStep === idx ? 'text-white' : 'text-gray-400'
                      }`}>
                        {step.title}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`ml-auto text-gray-600 transition-transform ${youtubeSetupStep === idx ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {youtubeSetupStep === idx && (
                      <div className="px-4 pb-4 pl-14 text-xs font-mono">
                        {step.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* OAuth2 Setup (Informational) */}
              <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/30">
                <h5 className="text-gray-400 font-mono font-medium mb-3 flex items-center gap-2">
                  <ShieldIcon size={16} className="text-gray-500" />
                  OAuth2 Consent Screen Setup (Advanced - Not Required)
                </h5>
                <p className="text-xs font-mono text-gray-500 mb-3">
                  OAuth2 is <strong className="text-white">NOT required</strong> for live stream detection. 
                  This section is only for reference if you need user-specific YouTube features in the future.
                </p>
                <details className="group">
                  <summary className="text-xs font-mono text-cyan-400 cursor-pointer hover:underline">
                    Show OAuth2 setup steps (for reference only)
                  </summary>
                  <div className="mt-3 space-y-3 text-xs font-mono text-gray-500">
                    <ol className="list-decimal list-inside space-y-2">
                      <li>
                        <strong className="text-gray-300">Configure OAuth Consent Screen:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                          <li>Go to APIs & Services &rarr; OAuth consent screen</li>
                          <li>Choose "External" user type</li>
                          <li>Fill in app name, support email, and developer email</li>
                          <li>Add scopes: <code className="px-1 bg-gray-800 rounded text-cyan-400">youtube.readonly</code></li>
                          <li>Add test users if in "Testing" mode</li>
                        </ul>
                      </li>
                      <li>
                        <strong className="text-gray-300">Create OAuth2 Client ID:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                          <li>Go to Credentials &rarr; Create Credentials &rarr; OAuth client ID</li>
                          <li>Application type: "Web application"</li>
                          <li>Add authorized redirect URIs for your app</li>
                          <li>Save the Client ID and Client Secret</li>
                        </ul>
                      </li>
                      <li>
                        <strong className="text-gray-300">Implement OAuth Flow:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                          <li>Redirect user to Google's authorization URL</li>
                          <li>Handle the callback with the authorization code</li>
                          <li>Exchange code for access/refresh tokens</li>
                          <li>Use access token for API calls</li>
                        </ul>
                      </li>
                    </ol>
                    <p className="text-amber-400 mt-2">
                      <strong>Remember:</strong> For this app's live stream detection feature, a simple API Key is all you need.
                      OAuth2 adds unnecessary complexity for public data access.
                    </p>
                  </div>
                </details>
              </div>

              {/* Current Status */}
              <div className={`p-4 rounded-xl border ${
                healthStatus.youtube.configured
                  ? 'bg-green-500/5 border-green-500/30'
                  : 'bg-gray-900/30 border-gray-800'
              }`}>
                <h5 className="text-white font-mono font-medium mb-3">Current YouTube API Status</h5>
                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="flex flex-col items-center p-3 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500 mb-1">API Key</span>
                    <span className={`text-lg font-bold ${healthStatus.youtube.configured ? 'text-green-400' : 'text-red-400'}`}>
                      {healthStatus.youtube.configured ? 'OK' : 'Missing'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500 mb-1">Quota</span>
                    <span className={`text-lg font-bold ${
                      healthStatus.youtube.quotaOk === true ? 'text-green-400' :
                      healthStatus.youtube.quotaOk === false ? 'text-red-400' :
                      'text-gray-500'
                    }`}>
                      {healthStatus.youtube.quotaOk === true ? 'OK' :
                       healthStatus.youtube.quotaOk === false ? 'Low' :
                       '?'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500 mb-1">Fallbacks</span>
                    <span className="text-lg font-bold text-green-400">Active</span>
                  </div>
                </div>
                {!healthStatus.youtube.configured && (
                  <p className="mt-3 text-xs font-mono text-gray-500 text-center">
                    Follow the steps above to configure your YouTube API key.
                    Even without it, the system uses scraping and fallback video IDs.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* Diagnostics Tab                                                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h4 className="text-white font-mono font-bold mb-2 flex items-center gap-2">
                  <WifiIcon size={20} className="text-cyan-400" />
                  Edge Function Connection Diagnostics
                </h4>
                <p className="text-xs font-mono text-gray-400">
                  Tests each connection strategy individually to identify why edge functions may be unreachable from this browser.
                </p>
              </div>

              {/* Configuration Info */}
              <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/30 space-y-3">
                <h5 className="text-white font-mono font-medium text-sm">Configuration</h5>
                <div className="grid grid-cols-1 gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500">Supabase URL:</span>
                    <code className="text-cyan-400 text-[11px] break-all ml-2">{SUPABASE_URL}</code>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500">Anon Key:</span>
                    <span className="flex items-center gap-2">
                      <code className="text-cyan-400 text-[11px]">{SUPABASE_ANON_KEY.substring(0, 20)}...{SUPABASE_ANON_KEY.substring(SUPABASE_ANON_KEY.length - 10)}</code>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        SUPABASE_ANON_KEY.startsWith('eyJ') && SUPABASE_ANON_KEY.length > 100
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {SUPABASE_ANON_KEY.startsWith('eyJ') && SUPABASE_ANON_KEY.length > 100 ? 'Valid JWT' : 'Invalid!'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500">Key Length:</span>
                    <span className="text-gray-300">{SUPABASE_ANON_KEY.length} chars</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500">Network:</span>
                    <span className={navigator.onLine ? 'text-green-400' : 'text-red-400'}>
                      {navigator.onLine ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500">Page Origin:</span>
                    <code className="text-gray-300 text-[11px]">{window.location.origin}</code>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-950/50 rounded-lg">
                    <span className="text-gray-500">Target URL:</span>
                    <code className="text-cyan-400 text-[11px] break-all ml-2">{SUPABASE_URL}/functions/v1/{diagTarget}</code>
                  </div>
                </div>
              </div>

              {/* Test Controls */}
              <div className="flex items-center gap-3">
                <select
                  value={diagTarget}
                  onChange={(e) => setDiagTarget(e.target.value as any)}
                  className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="find-live-streams">find-live-streams</option>
                  <option value="fetch-news">fetch-news</option>
                </select>
                <button
                  onClick={handleRunDiagnostics}
                  disabled={diagRunning}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-mono rounded-lg border transition-all ${
                    diagRunning
                      ? 'text-gray-500 border-gray-700 bg-gray-800/50 cursor-not-allowed'
                      : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20'
                  }`}
                >
                  {diagRunning ? (
                    <><div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /> Running Diagnostics...</>
                  ) : (
                    <><WifiIcon size={16} /> Test Connection (6 Strategies + CORS)</>

                  )}
                </button>
              </div>

              {/* Service Worker Controls */}
              <div className="p-4 rounded-xl border border-gray-800 bg-gray-900/30">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-white font-mono font-medium text-sm flex items-center gap-2">
                    <SettingsIcon size={14} className="text-gray-400" />
                    Service Worker
                  </h5>
                  <button
                    onClick={handleBypassServiceWorker}
                    className="px-3 py-1.5 text-xs font-mono text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-all"
                  >
                    Bypass SW
                  </button>
                </div>
                <p className="text-xs font-mono text-gray-500">
                  The service worker passes through POST/OPTIONS requests (edge function calls). 
                  If you suspect interference, click "Bypass SW" to disable all caching temporarily, then re-run diagnostics.
                </p>
                {diagReport && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 bg-gray-950/50 rounded">
                      <span className="text-gray-500">SW Active:</span>
                      <span className={diagReport.serviceWorkerActive ? 'text-amber-400' : 'text-gray-400'}>
                        {diagReport.serviceWorkerActive ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-950/50 rounded">
                      <span className="text-gray-500">SW State:</span>
                      <span className="text-gray-300">{diagReport.serviceWorkerState || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Results */}
              {diagReport && (
                <div className="space-y-4">
                  {/* Overall Result Banner */}
                  <div className={`p-4 rounded-xl border ${
                    diagReport.overallResult === 'success'
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-red-500/5 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {diagReport.overallResult === 'success' ? (
                        <CheckCircleIcon size={24} className="text-green-400" />
                      ) : (
                        <AlertCircleIcon size={24} className="text-red-400" />
                      )}
                      <div>
                        <h5 className={`font-mono font-bold ${
                          diagReport.overallResult === 'success' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {diagReport.overallResult === 'success'
                            ? `Connection Successful via ${diagReport.firstSuccessStrategy}`
                            : 'All 4 Strategies Failed — Edge Functions Unreachable'
                          }
                        </h5>
                        <p className="text-xs font-mono text-gray-500 mt-1">
                          Tested at {new Date(diagReport.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* CORS Preflight Result */}
                  {diagReport.corsPreflightResult && (
                    <div className={`p-4 rounded-xl border ${
                      diagReport.corsPreflightResult.status === 'success'
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-white font-mono font-medium text-sm flex items-center gap-2">
                          <ShieldIcon size={14} className={diagReport.corsPreflightResult.status === 'success' ? 'text-green-400' : 'text-red-400'} />
                          CORS Preflight (OPTIONS)
                        </h5>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500">{diagReport.corsPreflightResult.durationMs}ms</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            diagReport.corsPreflightResult.status === 'success'
                              ? 'bg-green-500/20 text-green-400'
                              : diagReport.corsPreflightResult.status === 'timeout'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {diagReport.corsPreflightResult.status === 'success'
                              ? `HTTP ${diagReport.corsPreflightResult.httpStatus}`
                              : diagReport.corsPreflightResult.status.toUpperCase()
                            }
                          </span>
                        </div>
                      </div>
                      {diagReport.corsPreflightResult.status === 'success' && diagReport.corsPreflightResult.responsePreview && (
                        <div className="mt-2">
                          <p className="text-[10px] font-mono text-gray-500 mb-1">CORS Headers Received:</p>
                          <pre className="text-[10px] font-mono text-cyan-400 bg-gray-950 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
                            {diagReport.corsPreflightResult.responsePreview}
                          </pre>
                        </div>
                      )}
                      {diagReport.corsPreflightResult.errorMessage && (
                        <p className="mt-2 text-xs font-mono text-red-400">
                          {diagReport.corsPreflightResult.errorType}: {diagReport.corsPreflightResult.errorMessage}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Per-Strategy Results */}
                  <div className="space-y-2">
                    <h5 className="text-white font-mono font-medium text-sm">Strategy Results</h5>
                    {diagReport.strategies.map((strat, idx) => (
                      <div
                        key={idx}
                        className={`rounded-xl border transition-all ${
                          strat.status === 'success'
                            ? 'border-green-500/30 bg-green-500/5'
                            : strat.status === 'timeout'
                            ? 'border-amber-500/30 bg-amber-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                        }`}
                      >
                        <button
                          onClick={() => setDiagExpanded(diagExpanded === idx ? null : idx)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                              strat.status === 'success'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                : strat.status === 'timeout'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-red-500/20 text-red-400 border border-red-500/40'
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <span className="text-sm font-mono font-medium text-white">{strat.strategy}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                {strat.httpStatus && (
                                  <span className="text-[10px] font-mono text-gray-500">HTTP {strat.httpStatus}</span>
                                )}
                                <span className="text-[10px] font-mono text-gray-500">{strat.durationMs}ms</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              strat.status === 'success'
                                ? 'bg-green-500/20 text-green-400'
                                : strat.status === 'timeout'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {strat.status.toUpperCase()}
                            </span>
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              className={`text-gray-600 transition-transform ${diagExpanded === idx ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </button>
                        {diagExpanded === idx && (
                          <div className="px-4 pb-4 space-y-2">
                            <div className="grid grid-cols-1 gap-1.5 text-[11px] font-mono">
                              <div className="flex items-start justify-between p-2 bg-gray-950/50 rounded">
                                <span className="text-gray-500 flex-shrink-0">URL:</span>
                                <code className="text-cyan-400 break-all ml-2">{strat.url}</code>
                              </div>
                              <div className="flex items-start justify-between p-2 bg-gray-950/50 rounded">
                                <span className="text-gray-500 flex-shrink-0">Headers Sent:</span>
                                <code className="text-gray-300 ml-2">{Object.entries(strat.headers).map(([k,v]) => `${k}: ${v}`).join(', ')}</code>
                              </div>
                              {strat.errorMessage && (
                                <div className="flex items-start justify-between p-2 bg-red-500/5 border border-red-500/20 rounded">
                                  <span className="text-red-400 flex-shrink-0">Error:</span>
                                  <span className="text-red-300 ml-2 break-all">[{strat.errorType}] {strat.errorMessage}</span>
                                </div>
                              )}
                              {strat.responsePreview && (
                                <div className="p-2 bg-gray-950/50 rounded">
                                  <span className="text-gray-500 block mb-1">Response Body:</span>
                                  <pre className="text-[10px] text-cyan-400 whitespace-pre-wrap break-all overflow-x-auto max-h-32 overflow-y-auto">
                                    {strat.responsePreview}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Diagnosis Summary */}
                  {diagReport.overallResult === 'all_failed' && (
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                      <h5 className="text-amber-400 font-mono font-medium mb-3 flex items-center gap-2">
                        <AlertCircleIcon size={16} />
                        Diagnosis
                      </h5>
                      <div className="space-y-3 text-xs font-mono text-gray-400">
                        {diagReport.corsPreflightResult?.status !== 'success' && (
                          <div className="p-3 bg-gray-950 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 font-medium mb-1">CORS Preflight Failed</p>
                            <p className="text-gray-500">
                              The browser's CORS preflight OPTIONS request failed. This means the Supabase edge function 
                              is not returning the required <code className="text-cyan-400">Access-Control-Allow-Origin</code> header, 
                              or the edge function is not deployed/accessible at the URL.
                            </p>
                            <p className="text-gray-500 mt-1">
                              <strong className="text-gray-300">Fix:</strong> Verify the edge function is deployed at{' '}
                              <code className="text-cyan-400">{SUPABASE_URL}/functions/v1/{diagTarget}</code> and includes 
                              proper CORS headers in the OPTIONS response.
                            </p>
                          </div>
                        )}
                        {diagReport.corsPreflightResult?.status === 'success' && (
                          <div className="p-3 bg-gray-950 border border-amber-500/20 rounded-lg">
                            <p className="text-amber-400 font-medium mb-1">CORS OK but POST Failed</p>
                            <p className="text-gray-500">
                              The CORS preflight succeeded but all POST strategies failed. This could indicate:
                            </p>
                            <ul className="list-disc list-inside mt-1 text-gray-500 space-y-0.5">
                              <li>Edge function is crashing on the POST request body</li>
                              <li>The anon key is invalid or expired</li>
                              <li>Edge function has a runtime error</li>
                            </ul>
                          </div>
                        )}
                        {!diagReport.anonKeyValid && (
                          <div className="p-3 bg-gray-950 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 font-medium mb-1">Invalid Anon Key</p>
                            <p className="text-gray-500">
                              The Supabase anon key does not look like a valid JWT. It should start with 
                              <code className="text-cyan-400">eyJ</code> and be 200+ characters long.
                              Current: {SUPABASE_ANON_KEY.length} chars, starts with "{SUPABASE_ANON_KEY.substring(0, 3)}".
                            </p>
                          </div>
                        )}
                        <div className="p-3 bg-gray-950 border border-gray-700 rounded-lg">
                          <p className="text-gray-300 font-medium mb-1">Next Steps</p>
                          <ol className="list-decimal list-inside space-y-1 text-gray-500">
                            <li>Check the browser's DevTools Network tab for the failed request</li>
                            <li>Look for CORS errors in the Console tab</li>
                            <li>Verify the edge function is deployed: <code className="text-cyan-400">supabase functions list</code></li>
                            <li>Try invoking directly: <code className="text-cyan-400">supabase functions invoke {diagTarget} --body '{`{"healthCheck":true}`}'</code></li>
                            <li>Check Supabase Dashboard &rarr; Edge Functions &rarr; Logs for errors</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Raw Report (collapsible) */}
                  <details className="group">
                    <summary className="text-xs font-mono text-cyan-400 cursor-pointer hover:underline">
                      Show Raw Diagnostic Report (JSON)
                    </summary>
                    <pre className="mt-2 text-[10px] font-mono text-gray-400 bg-gray-950 p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto border border-gray-800">
                      {JSON.stringify(diagReport, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

};

export default NewsSettingsPanel;

// Export preferences type and storage key for use in NewsFeedTab
export type { NewsPreferences };
export { STORAGE_KEY as NEWS_PREFERENCES_KEY, DEFAULT_PREFERENCES };
