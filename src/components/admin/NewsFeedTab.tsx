import React, { useState, useRef, useEffect, useCallback } from 'react';
import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';

import NewsSettingsPanel, { NewsPreferences, NEWS_PREFERENCES_KEY, DEFAULT_PREFERENCES } from './NewsSettingsPanel';
import {
  MaximizeIcon,
  MinimizeIcon,
  PopoutIcon,
  CloseIcon,
  RefreshIcon,
  ExternalLinkIcon,
  SearchIcon,
  AlertCircleIcon,
  EditIcon,
  CheckIcon,
} from '@/components/icons/Icons';

// ─── Additional SVG Icons ─────────────────────────────────────────────────────

const PlusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const GlobeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const SettingsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const EyeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);


// ─── SVG Icons ───────────────────────────────────────────────────────────────


// ─── SVG Icons ───────────────────────────────────────────────────────────────

const NewsIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" />
    <path d="M15 18h-5" />
    <path d="M10 6h8v4h-8V6Z" />
  </svg>
);

const PipIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <rect x="12" y="9" width="8" height="6" rx="1" fill="currentColor" opacity="0.3" />
    <rect x="12" y="9" width="8" height="6" rx="1" />
    <line x1="6" y1="21" x2="18" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const ChevronDownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6,9 12,15 18,9" />
  </svg>
);

const ClockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const SignalIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 20h.01" />
    <path d="M7 20v-4" />
    <path d="M12 20v-8" />
    <path d="M17 20V8" />
    <path d="M22 4v16" />
  </svg>
);

const TvIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <polyline points="17,2 12,7 7,2" />
  </svg>
);

const RadarIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M2 12h4" />
    <path d="M18 12h4" />
  </svg>
);

const UsersIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// ─── Focus / Quad View Icons ──────────────────────────────────────────────────

const FocusIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  </svg>
);

const Grid4Icon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </svg>
);

const ChevronLeftIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15,18 9,12 15,6" />
  </svg>
);

const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9,18 15,12 9,6" />
  </svg>
);

const KeyboardIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
    <path d="M6 8h.001" />
    <path d="M10 8h.001" />
    <path d="M14 8h.001" />
    <path d="M18 8h.001" />
    <path d="M8 12h.001" />
    <path d="M12 12h.001" />
    <path d="M16 12h.001" />
    <path d="M7 16h10" />
  </svg>
);

// ─── Database Sync Icon ───────────────────────────────────────────────────────

const DatabaseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const SyncIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21.5 2v6h-6" />
    <path d="M2.5 22v-6h6" />
    <path d="M2 11.5a10 10 0 0 1 18.8-4.3" />
    <path d="M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);



// ─── Play Button Icon for Lazy Loading ────────────────────────────────────────

const PlayCircleIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.85" />
    <polygon points="10,8 16,12 10,16" fill="white" />
  </svg>
);

// ─── Lazy Loading Helper ──────────────────────────────────────────────────────

function extractVideoId(iframeSrc: string): string | null {
  const match = iframeSrc.match(/embed\/([^?]+)/);
  return match ? match[1] : null;
}

function getYoutubeThumbnail(videoId: string, quality: 'maxresdefault' | 'sddefault' | 'hqdefault' | 'mqdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}



// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsArticle {
  title: string;
  source: string;
  timestamp: string;
  thumbnail: string | null;
  url: string;
  description: string;
}

interface StreamSource {
  label: string;
  iframeSrc: string;
  directUrl: string;
}

interface StreamDetection {
  id: string;
  channelId: string;
  name: string;
  videoId: string;
  title: string;
  thumbnail: string;
  isLive: boolean;
  viewerCount: string | null;
  detectedAt: string;
  source: 'manual_override' | 'api_live' | 'api_upcoming' | 'api_search' | 'api_recent' | 'scrape_live' | 'fallback' | 'cache';
  verified?: boolean;
}

interface StreamHealthStatus {
  apiKeyConfigured: boolean;
  quotaExhausted: boolean;
  quotaExhaustedAt: string | null;
  quotaCooldownRemaining: number;
  cacheStatus: 'valid' | 'expired' | 'empty';
  cacheAge: number | null;
  lastSuccessfulApiCall: string | null;
  detectionCapabilities: {
    apiSearch: boolean;
    scraping: boolean;
    fallback: boolean;
  };
}

interface NewsHealthStatus {
  primaryApiConfigured: boolean;
  cacheStatus: 'valid' | 'stale' | 'empty';
  cacheAge: number | null;
  lastProvider: string | null;
  fallbacksAvailable: string[];
}



// ─── PiP Helper ───────────────────────────────────────────────────────────────

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
    };
  }
}

// ─── Stream URL Helpers ───────────────────────────────────────────────────────

function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`;
}

function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// ─── Feed Configurations ──────────────────────────────────────────────────────

const STORAGE_KEY = 'newsfeed_custom_streams';
const CUSTOM_CHANNELS_KEY = 'newsfeed_custom_channels';
const HIDDEN_FEEDS_KEY = 'newsfeed_hidden_feeds';
const QUAD_SELECTED_KEY = 'newsfeed_quad_selected';
const PRIORITY_CHANNELS_KEY = 'newsfeed_priority_channels';
const AUTO_UNLOAD_DISABLED_KEY = 'newsfeed_auto_unload_disabled';
const DETECTED_STREAMS_CACHE_KEY = 'newsfeed_detected_streams_cache';

function getPriorityChannels(): string[] {
  try {
    const stored = localStorage.getItem(PRIORITY_CHANNELS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePriorityChannels(ids: string[]) {
  localStorage.setItem(PRIORITY_CHANNELS_KEY, JSON.stringify(ids));
}

function getAutoUnloadDisabled(): boolean {
  try {
    return localStorage.getItem(AUTO_UNLOAD_DISABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveAutoUnloadDisabled(disabled: boolean) {
  localStorage.setItem(AUTO_UNLOAD_DISABLED_KEY, disabled ? 'true' : 'false');
}

function getQuadSelected(): string[] {
  try {
    const stored = localStorage.getItem(QUAD_SELECTED_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveQuadSelected(ids: string[]) {
  localStorage.setItem(QUAD_SELECTED_KEY, JSON.stringify(ids));
}


function getStoredStreams(): Record<string, string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function storeStream(feedId: string, videoId: string) {
  const streams = getStoredStreams();
  streams[feedId] = videoId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(streams));
}

interface CustomChannel {
  channelId: string;
  name: string;
  addedAt: string;
  customHandle?: string;
  fallbackVideoId?: string;
}


function getCustomChannels(): CustomChannel[] {
  try {
    const stored = localStorage.getItem(CUSTOM_CHANNELS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomChannels(channels: CustomChannel[]) {
  localStorage.setItem(CUSTOM_CHANNELS_KEY, JSON.stringify(channels));
}

function getHiddenFeeds(): string[] {
  try {
    const stored = localStorage.getItem(HIDDEN_FEEDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHiddenFeeds(hidden: string[]) {
  localStorage.setItem(HIDDEN_FEEDS_KEY, JSON.stringify(hidden));
}

interface FeedConfig {
  id: string;
  title: string;
  subtitle: string;
  network: string;
  channelId: string;
  sources: StreamSource[];
  watchUrl: string;
  logoColor: string;
  accentColor: string;
  borderColor: string;
  glowColor: string;
  logoSvg?: React.ReactNode;
  isCustom?: boolean;
  // Auto-detected metadata
  detectedTitle?: string;
  isLive?: boolean;
  viewerCount?: string | null;
  detectionSource?: string;
  detectedAt?: string;
}

const DEFAULT_FEEDS: FeedConfig[] = [
  {
    id: 'nbc',
    title: 'NBC News NOW',
    subtitle: '24/7 live streaming news from NBC News',
    network: 'NBC',
    channelId: 'UCeY0bbntWzzVIaj2z3QigXg',
    sources: [
      {
        label: 'NBC News NOW (YouTube)',
        iframeSrc: youtubeEmbedUrl('Gf8tPMbfSZs'), // Updated fallback
        directUrl: youtubeWatchUrl('Gf8tPMbfSZs'),
      },
    ],
    watchUrl: 'https://www.nbcnews.com/watch',
    logoColor: 'bg-blue-600',
    accentColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    glowColor: 'rgba(59,130,246,0.15)',
    logoSvg: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 12h3v8h14v-8h3L12 2z" fill="currentColor" opacity="0.9"/>
        <path d="M8 14h8v6H8z" fill="currentColor" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'cnn',
    title: 'CNN Live',
    subtitle: 'Breaking news and live coverage from CNN',
    network: 'CNN',
    channelId: 'UCupvZG-5ko_eiXAupbDfxWw',
    sources: [
      {
        label: 'CNN (YouTube)',
        iframeSrc: youtubeEmbedUrl('sVHMe5cEPis'), // Updated fallback - CNN Max stream
        directUrl: youtubeWatchUrl('sVHMe5cEPis'),
      },
    ],
    watchUrl: 'https://www.cnn.com/live-tv',
    logoColor: 'bg-red-600',
    accentColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    glowColor: 'rgba(239,68,68,0.15)',
    logoSvg: (
      <svg width="18" height="10" viewBox="0 0 40 18" fill="currentColor">
        <text x="0" y="15" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="18" fill="white">CNN</text>
      </svg>
    ),
  },
  {
    id: 'fox',
    title: 'Fox News',
    subtitle: 'Live news coverage from Fox News',
    network: 'Fox News',
    channelId: 'UCXIJgqnII2ZOINSWNOGFThA',
    sources: [
      {
        label: 'Fox News (YouTube)',
        iframeSrc: youtubeEmbedUrl('6CMclPVpxVU'), // Updated fallback
        directUrl: youtubeWatchUrl('6CMclPVpxVU'),
      },
    ],
    watchUrl: 'https://www.foxnews.com/video/5614615980001',
    logoColor: 'bg-blue-800',
    accentColor: 'text-blue-300',
    borderColor: 'border-blue-700/30',
    glowColor: 'rgba(30,64,175,0.15)',
    logoSvg: (
      <svg width="18" height="10" viewBox="0 0 40 18" fill="currentColor">
        <text x="0" y="15" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="16" fill="white">FOX</text>
      </svg>
    ),
  },
  {
    id: 'msnbc',
    title: 'MSNBC',
    subtitle: 'Live news and political coverage from MSNBC',
    network: 'MSNBC',
    channelId: 'UCaXkIU1QidjPwiAYu6GcHjg',
    sources: [
      {
        label: 'MSNBC (YouTube)',
        iframeSrc: youtubeEmbedUrl('Inga0sD7Gtc'), // Updated fallback
        directUrl: youtubeWatchUrl('Inga0sD7Gtc'),
      },
    ],
    watchUrl: 'https://www.msnbc.com/live',
    logoColor: 'bg-yellow-500',
    accentColor: 'text-yellow-300',
    borderColor: 'border-yellow-500/30',
    glowColor: 'rgba(234,179,8,0.15)',
    logoSvg: (
      <svg width="18" height="10" viewBox="0 0 50 18" fill="currentColor">
        <text x="0" y="14" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="12" fill="white">MSNBC</text>
      </svg>
    ),
  },
  {
    id: 'sky',
    title: 'Sky News',
    subtitle: 'International news coverage — 24/7 live',
    network: 'Sky News',
    channelId: 'UCoMdktPbSTixAyNGwb-UYkQ',
    sources: [
      {
        label: 'Sky News (YouTube)',
        iframeSrc: youtubeEmbedUrl('9Auq9mYxFEE'), // Sky News live stream
        directUrl: youtubeWatchUrl('9Auq9mYxFEE'),
      },
    ],
    watchUrl: 'https://news.sky.com/watch-live',
    logoColor: 'bg-sky-600',
    accentColor: 'text-sky-400',
    borderColor: 'border-sky-500/30',
    glowColor: 'rgba(14,165,233,0.15)',
  },
  {
    id: 'abc',
    title: 'ABC News',
    subtitle: 'Live streaming news from ABC News',
    network: 'ABC',
    channelId: 'UCBi2mrWuNuyYy4gbM6fU18Q',
    sources: [
      {
        label: 'ABC News (YouTube)',
        iframeSrc: youtubeEmbedUrl('w_Ma8oQLmSM'), // ABC News Live stream - verified ABC channel
        directUrl: youtubeWatchUrl('w_Ma8oQLmSM'),
      },
    ],
    watchUrl: 'https://abcnews.go.com/live',
    logoColor: 'bg-amber-600',
    accentColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    glowColor: 'rgba(217,119,6,0.15)',
  },
  {
    id: 'aljazeera',
    title: 'Al Jazeera English',
    subtitle: 'Global news from Al Jazeera — 24/7 live',
    network: 'Al Jazeera',
    channelId: 'UCNye-wNBqNL5ZzHSJj3l8Bg',
    sources: [
      {
        label: 'Al Jazeera (YouTube)',
        iframeSrc: youtubeEmbedUrl('gCNeDWCI0vo'), // Al Jazeera English live - verified AJE channel
        directUrl: youtubeWatchUrl('gCNeDWCI0vo'),
      },
    ],
    watchUrl: 'https://www.aljazeera.com/live',
    logoColor: 'bg-amber-700',
    accentColor: 'text-amber-300',
    borderColor: 'border-amber-600/30',
    glowColor: 'rgba(180,83,9,0.15)',
    logoSvg: (
      <svg width="18" height="14" viewBox="0 0 40 18" fill="currentColor">
        <text x="0" y="14" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" fill="white">AJE</text>
      </svg>
    ),
  },
  {
    id: 'france24',
    title: 'France 24 English',
    subtitle: 'International news from France — 24/7 live',
    network: 'France 24',
    channelId: 'UCQfwfsi5VrQ8yKZ-UWmAEFg',
    sources: [
      {
        label: 'France 24 (YouTube)',
        iframeSrc: youtubeEmbedUrl('h3MuIUNCCzI'), // France 24 English live
        directUrl: youtubeWatchUrl('h3MuIUNCCzI'),
      },
    ],
    watchUrl: 'https://www.france24.com/en/live',
    logoColor: 'bg-indigo-600',
    accentColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    glowColor: 'rgba(79,70,229,0.15)',
    logoSvg: (
      <svg width="18" height="14" viewBox="0 0 40 18" fill="currentColor">
        <text x="0" y="14" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="11" fill="white">F24</text>
      </svg>
    ),
  },
  {
    id: 'bbc',
    title: 'BBC News',
    subtitle: 'World news from the BBC — 24/7 live',
    network: 'BBC',
    channelId: 'UC16niRr50-MSBwiO3YDb3RA',
    sources: [
      {
        label: 'BBC News (YouTube)',
        iframeSrc: youtubeEmbedUrl('dp8PhLsUcFE'), // BBC World News live
        directUrl: youtubeWatchUrl('dp8PhLsUcFE'),
      },
    ],
    watchUrl: 'https://www.bbc.com/news/live',
    logoColor: 'bg-rose-700',
    accentColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    glowColor: 'rgba(190,18,60,0.15)',
    logoSvg: (
      <svg width="18" height="10" viewBox="0 0 40 18" fill="currentColor">
        <text x="0" y="15" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="16" fill="white">BBC</text>
      </svg>
    ),
  },
];



// Color palette for custom channels
const CUSTOM_COLORS = [
  { logoColor: 'bg-teal-600', accentColor: 'text-teal-400', borderColor: 'border-teal-500/30', glowColor: 'rgba(20,184,166,0.15)' },
  { logoColor: 'bg-fuchsia-600', accentColor: 'text-fuchsia-400', borderColor: 'border-fuchsia-500/30', glowColor: 'rgba(192,38,211,0.15)' },
  { logoColor: 'bg-lime-600', accentColor: 'text-lime-400', borderColor: 'border-lime-500/30', glowColor: 'rgba(132,204,22,0.15)' },
  { logoColor: 'bg-pink-600', accentColor: 'text-pink-400', borderColor: 'border-pink-500/30', glowColor: 'rgba(236,72,153,0.15)' },
  { logoColor: 'bg-emerald-600', accentColor: 'text-emerald-400', borderColor: 'border-emerald-500/30', glowColor: 'rgba(16,185,129,0.15)' },
  { logoColor: 'bg-violet-600', accentColor: 'text-violet-400', borderColor: 'border-violet-500/30', glowColor: 'rgba(139,92,246,0.15)' },
];

function buildCustomFeed(channel: CustomChannel, index: number): FeedConfig {
  const colors = CUSTOM_COLORS[index % CUSTOM_COLORS.length];
  return {
    id: `custom_${channel.channelId}`,
    title: channel.name,
    subtitle: `Custom channel — ${channel.channelId}`,
    network: channel.name,
    channelId: channel.channelId,
    sources: [],
    watchUrl: `https://www.youtube.com/channel/${channel.channelId}/live`,
    isCustom: true,
    ...colors,
    logoSvg: <GlobeIcon size={14} className="text-white" />,
  };
}


// ─── Detection Source Labels ──────────────────────────────────────────────────

function getSourceLabel(source: string): { label: string; color: string } {
  switch (source) {
    case 'manual_override':
      return { label: 'Manual Override', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
    case 'api_live':
      return { label: 'Auto-detected (Live)', color: 'bg-green-500/10 text-green-400 border-green-500/30' };
    case 'api_search':
      return { label: 'Auto-detected (Search)', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
    case 'scrape_live':
      return { label: 'Scraped (/live page)', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' };
    case 'api_upcoming':
      return { label: 'Upcoming', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
    case 'api_recent':
      return { label: 'Recent Upload', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
    case 'fallback':
      return { label: 'Fallback ID', color: 'bg-gray-500/10 text-gray-400 border-gray-600' };
    case 'cache':
      return { label: 'Cached', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    default:
      return { label: source, color: 'bg-gray-500/10 text-gray-400 border-gray-600' };
  }
}




function formatViewerCount(count: string | null | undefined): string {
  if (!count) return '';
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

// Pin/Lock icon for priority channels
const PinIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

interface LiveFeedCardProps {
  feed: FeedConfig;
  onUpdateVideoId: (feedId: string, videoId: string) => void;
  isPriority?: boolean;
  autoUnloadEnabled?: boolean;
  onActiveChange?: (feedId: string, isActive: boolean) => void;
  onFocus?: (feedId: string) => void;
  feedIndex?: number;
}

const LiveFeedCard: React.FC<LiveFeedCardProps> = ({ feed, onUpdateVideoId, isPriority = false, autoUnloadEnabled = true, onActiveChange, onFocus, feedIndex }) => {

  const cardRef = useRef<HTMLDivElement>(null);
  const [isCardFullscreen, setIsCardFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [currentSourceIdx, setCurrentSourceIdx] = useState(0);
  const [streamError, setStreamError] = useState(feed.sources.length === 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editVideoId, setEditVideoId] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // ─── Lazy Loading + Unloading State ─────────────────────────────────────
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const hasEverLoadedRef = useRef(false); // Track if it ever loaded (for unload indicator)
  const [wasUnloaded, setWasUnloaded] = useState(false); // Show "unloaded" indicator
  const [thumbnailImgError, setThumbnailImgError] = useState(false);

  const hasSources = feed.sources.length > 0;
  const currentSource = hasSources ? (feed.sources[currentSourceIdx] || feed.sources[0]) : null;

  // Extract video ID for thumbnail
  const currentVideoId = currentSource ? extractVideoId(currentSource.iframeSrc) : null;

  // Report active state changes to parent
  const isIframeActive = hasEnteredViewport && !streamError && hasSources;
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (prevActiveRef.current !== isIframeActive) {
      prevActiveRef.current = isIframeActive;
      onActiveChange?.(feed.id, isIframeActive);
    }
  }, [isIframeActive, feed.id, onActiveChange]);

  // Cleanup: report inactive on unmount
  useEffect(() => {
    return () => {
      if (prevActiveRef.current) {
        onActiveChange?.(feed.id, false);
      }
    };
  }, [feed.id, onActiveChange]);

  // ─── Observer 1: Lazy Loading (load when entering viewport + 200px margin) ──
  useEffect(() => {
    if (hasEnteredViewport) return; // Already loaded, let observer 2 handle unloading

    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            hasEverLoadedRef.current = true;
            setHasEnteredViewport(true);
            setWasUnloaded(false);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px 0px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEnteredViewport]); // Re-observe when unloaded

  // ─── Observer 2: Unloading (unload when >1000px from viewport) ──────────
  useEffect(() => {
    // Only observe for unloading if: iframe is active, auto-unload is enabled, not priority, not fullscreen/pip
    if (!hasEnteredViewport || !autoUnloadEnabled || isPriority || isCardFullscreen || isPip) return;

    const el = cardRef.current;
    if (!el) return;

    const unloadObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // When the card leaves the 1000px extended zone, unload it
          if (!entry.isIntersecting) {
            setHasEnteredViewport(false);
            setWasUnloaded(true);
            setIframeKey(prev => prev + 1); // Force fresh iframe on reload
          }
        }
      },
      {
        // 1000px margin means the card must be >1000px away from viewport to trigger unload
        rootMargin: '1000px 0px',
        threshold: 0,
      }
    );

    unloadObserver.observe(el);
    return () => unloadObserver.disconnect();
  }, [hasEnteredViewport, autoUnloadEnabled, isPriority, isCardFullscreen, isPip]);

  // Also mark as loaded if card enters fullscreen or PiP (user explicitly interacted)
  useEffect(() => {
    if (isCardFullscreen || isPip) {
      hasEverLoadedRef.current = true;
      setHasEnteredViewport(true);
      setWasUnloaded(false);
    }
  }, [isCardFullscreen, isPip]);




  // Update streamError when sources change (e.g. after detection)
  useEffect(() => {
    if (feed.sources.length > 0 && streamError) {
      setStreamError(false);
      setCurrentSourceIdx(0);
    }
  }, [feed.sources.length]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsCardFullscreen(document.fullscreenElement === cardRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (hasSources) setStreamError(false);
  }, [currentSourceIdx, iframeKey]);


  const handleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await cardRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  const handleNewWindow = useCallback(() => {
    if (!currentSource) return;
    const width = 1000;
    const height = 650;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    window.open(
      currentSource.directUrl,
      `${feed.title.replace(/\s/g, '_')}_Live`,
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
    );
  }, [currentSource, feed.title]);

  const handleRefresh = useCallback(() => {
    setStreamError(false);
    setIframeKey(prev => prev + 1);
  }, []);

  const handleWatchDirect = useCallback(() => {
    window.open(feed.watchUrl, '_blank', 'noopener,noreferrer');
  }, [feed.watchUrl]);

  const handleEditStart = useCallback(() => {
    if (currentSource) {
      const match = currentSource.iframeSrc.match(/embed\/([^?]+)/);
      setEditVideoId(match ? match[1] : '');
    } else {
      setEditVideoId('');
    }
    setIsEditing(true);
    setTimeout(() => editInputRef.current?.focus(), 100);
  }, [currentSource]);

  const handleEditSave = useCallback(() => {
    let videoId = editVideoId.trim();
    if (!videoId) {
      setIsEditing(false);
      return;
    }
    const urlMatch = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
    if (urlMatch) {
      videoId = urlMatch[1];
    }
    onUpdateVideoId(feed.id, videoId);
    setIsEditing(false);
    setStreamError(false);
    setIframeKey(prev => prev + 1);
  }, [editVideoId, feed.id, onUpdateVideoId]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSave();
    if (e.key === 'Escape') setIsEditing(false);
  }, [handleEditSave]);

  const handlePip = useCallback(async () => {
    if (!currentSource) return;
    const iframeSrcForPip = currentSource.iframeSrc;

    if (window.documentPictureInPicture) {
      try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
          width: 480,
          height: 320,
        });

        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map(rule => rule.cssText).join('');
            const style = pipWindow.document.createElement('style');
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          } catch {
            if (styleSheet.href) {
              const link = pipWindow.document.createElement('link');
              link.rel = 'stylesheet';
              link.href = styleSheet.href;
              pipWindow.document.head.appendChild(link);
            }
          }
        });

        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.padding = '0';
        pipWindow.document.body.style.background = '#000';
        pipWindow.document.body.style.overflow = 'hidden';

        const header = pipWindow.document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(to right,#0a0a0a,#111,#0a0a0a);border-bottom:1px solid #333;';
        const dot = pipWindow.document.createElement('div');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px rgba(255,0,0,0.8);animation:pulse 2s infinite;';
        const label = pipWindow.document.createElement('span');
        label.textContent = `LIVE — ${feed.title}`;
        label.style.cssText = 'color:#f87171;font-family:monospace;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;';
        header.appendChild(dot);
        header.appendChild(label);
        pipWindow.document.body.appendChild(header);

        const animStyle = pipWindow.document.createElement('style');
        animStyle.textContent = '@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}';
        pipWindow.document.head.appendChild(animStyle);

        const container = pipWindow.document.createElement('div');
        container.style.cssText = 'position:absolute;top:36px;left:0;right:0;bottom:0;';
        const iframe = pipWindow.document.createElement('iframe');
        iframe.src = iframeSrcForPip;
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        container.appendChild(iframe);
        pipWindow.document.body.appendChild(container);

        setIsPip(true);
        pipWindow.addEventListener('pagehide', () => setIsPip(false));
        return;
      } catch (err) {
        console.warn('Document PiP failed, falling back to popup:', err);
      }
    }

    const pipWidth = 480;
    const pipHeight = 320;
    const left = window.screen.width - pipWidth - 30;
    const top = window.screen.height - pipHeight - 100;
    const pipWin = window.open(
      '',
      `PiP_${feed.title.replace(/\s/g, '_')}`,
      `width=${pipWidth},height=${pipHeight},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`
    );
    if (pipWin) {
      pipWin.document.write(`
        <!DOCTYPE html>
        <html><head><title>${feed.title} — PiP</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{background:#000;overflow:hidden;font-family:monospace}
          .header{display:flex;align-items:center;gap:8px;padding:6px 12px;background:linear-gradient(to right,#0a0a0a,#111,#0a0a0a);border-bottom:1px solid #333}
          .dot{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px rgba(255,0,0,0.8);animation:pulse 2s infinite}
          .label{color:#f87171;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
          iframe{width:100%;height:calc(100vh - 32px);border:none}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        </style></head><body>
        <div class="header"><div class="dot"></div><span class="label">LIVE — ${feed.title}</span></div>
        <iframe src="${iframeSrcForPip}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </body></html>
      `);
      pipWin.document.close();
      setIsPip(true);
      const timer = setInterval(() => {
        if (pipWin.closed) {
          setIsPip(false);
          clearInterval(timer);
        }
      }, 500);
    }
  }, [currentSource, feed.title]);


  const handleIframeError = useCallback(() => {
    if (currentSourceIdx < feed.sources.length - 1) {
      setCurrentSourceIdx(prev => prev + 1);
    } else {
      setStreamError(true);
    }
  }, [currentSourceIdx, feed.sources.length]);

  const detectionBadge = feed.detectionSource ? getSourceLabel(feed.detectionSource) : null;

  return (
    <div
      ref={cardRef}
      className={`relative rounded-xl border bg-black overflow-hidden transition-all duration-300 group ${
        isCardFullscreen
          ? 'fixed inset-0 z-[9999] rounded-none border-0 flex flex-col'
          : `${feed.borderColor} hover:shadow-lg`
      }`}
      style={!isCardFullscreen ? { ['--tw-shadow-color' as string]: feed.glowColor } : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 ${
        isCardFullscreen ? 'py-4 px-6' : ''
      }`}>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${feed.isLive !== false ? 'bg-red-500 shadow-[0_0_8px_rgba(255,0,0,0.8)] animate-pulse' : 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]'}`} />
          <span className={`text-xs font-mono uppercase font-bold tracking-wider flex-shrink-0 ${feed.isLive !== false ? 'text-red-400' : 'text-yellow-400'}`}>
            {feed.isLive !== false ? 'LIVE' : 'STREAM'}
          </span>
          <div className="w-px h-4 bg-gray-700 flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${feed.logoColor}`}>
              {feed.logoSvg || <NewsIcon size={14} className="text-white" />}
            </div>
            <div className="min-w-0">
              <h4 className={`text-sm font-mono font-bold truncate ${feed.accentColor}`}>{feed.title}</h4>
              {isCardFullscreen && <p className="text-xs text-gray-500 font-mono truncate">{feed.detectedTitle || feed.subtitle}</p>}
            </div>
          </div>
          {/* Viewer count */}
          {feed.viewerCount && (
            <span className="ml-1 flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded flex-shrink-0">
              <UsersIcon size={10} />
              {formatViewerCount(feed.viewerCount)}
            </span>
          )}
          {/* Detection source badge */}
          {detectionBadge && (
            <span className={`ml-1 px-2 py-0.5 text-[10px] font-mono border rounded flex-shrink-0 hidden lg:inline-block ${detectionBadge.color}`}>
              {detectionBadge.label}
            </span>
          )}
          {isPip && (
            <span className="ml-1 px-2 py-0.5 text-[10px] font-mono bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded flex-shrink-0">
              PiP Active
            </span>
          )}
          {streamError && (
            <span className="ml-1 px-2 py-0.5 text-[10px] font-mono bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded flex-shrink-0">
              Stream Unavailable
            </span>
          )}
        </div>

        {/* Controls — always visible for touch screen support */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Focus button (inline with other controls) */}
          {onFocus && (
            <button
              onClick={() => onFocus(feed.id)}
              className="p-2 text-gray-500 hover:text-amber-400 rounded-lg border border-transparent hover:border-amber-500/30 hover:bg-amber-500/10 transition-all duration-200"
              title={`Focus on ${feed.title}${feedIndex !== undefined ? ` (${feedIndex + 1})` : ''}`}
            >
              <FocusIcon size={16} />
            </button>
          )}

          <button
            onClick={handleEditStart}
            className="p-2 text-gray-500 hover:text-yellow-400 rounded-lg border border-transparent hover:border-yellow-500/30 hover:bg-yellow-500/10 transition-all duration-200"
            title="Edit stream URL"
          >
            <EditIcon size={16} />
          </button>

          <button onClick={handleRefresh} className="p-2 text-gray-500 hover:text-cyan-400 rounded-lg border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all duration-200" title="Refresh stream">
            <RefreshIcon size={16} />
          </button>

          <button
            onClick={handlePip}
            className={`p-2 rounded-lg border transition-all duration-200 ${
              isPip
                ? 'text-purple-400 border-purple-500/30 bg-purple-500/10'
                : 'text-gray-500 hover:text-purple-400 border-transparent hover:border-purple-500/30 hover:bg-purple-500/10'
            }`}
            title={isPip ? 'PiP is active' : 'Picture-in-Picture'}
          >
            <PipIcon size={16} />
          </button>

          <button onClick={handleNewWindow} className="p-2 text-gray-500 hover:text-orange-400 rounded-lg border border-transparent hover:border-orange-500/30 hover:bg-orange-500/10 transition-all duration-200" title="Open in new window">
            <PopoutIcon size={16} />
          </button>
          <button onClick={handleWatchDirect} className="p-2 text-gray-500 hover:text-blue-400 rounded-lg border border-transparent hover:border-blue-500/30 hover:bg-blue-500/10 transition-all duration-200" title={`Watch on ${feed.network}`}>
            <ExternalLinkIcon size={16} />
          </button>

          <div className="w-px h-5 bg-gray-700 mx-0.5" />

          <button
            onClick={handleFullscreen}
            className={`p-2 rounded-lg border transition-all duration-200 ${
              isCardFullscreen
                ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
                : 'text-gray-500 hover:text-green-400 border-transparent hover:border-green-500/30 hover:bg-green-500/10'
            }`}
            title={isCardFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isCardFullscreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
          </button>

          {isCardFullscreen && (
            <button onClick={handleFullscreen} className="p-2 text-gray-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-200 ml-1" title="Exit fullscreen">
              <CloseIcon size={18} />
            </button>
          )}
        </div>
      </div>


      {/* Edit Stream URL Bar */}
      {isEditing && (
        <div className="px-4 py-3 border-b border-gray-800 bg-gray-950/80 flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono whitespace-nowrap">Video ID or URL:</span>
          <input
            ref={editInputRef}
            type="text"
            value={editVideoId}
            onChange={e => setEditVideoId(e.target.value)}
            onKeyDown={handleEditKeyDown}
            placeholder="e.g. S9b725MQyQ0 or https://youtube.com/watch?v=..."
            className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
          />
          <button
            onClick={handleEditSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all"
          >
            <CheckIcon size={14} />
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* Video / Stream Error Fallback */}
      <div className={`relative bg-gray-950 ${isCardFullscreen ? 'flex-1' : 'aspect-video'}`}>
        {streamError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-6">
            <div className={`w-20 h-20 rounded-2xl ${feed.logoColor} flex items-center justify-center mb-4 shadow-lg`}>
              <TvIcon size={36} className="text-white" />
            </div>
            <h4 className="text-white font-mono font-bold text-lg mb-1">{feed.title}</h4>
            <p className="text-gray-500 font-mono text-sm mb-6 text-center max-w-sm">
              This live stream is currently unavailable for embedding. You can watch directly on {feed.network}'s website or update the stream URL.
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={handleWatchDirect}
                className={`flex items-center gap-2 px-5 py-2.5 text-sm font-mono text-white ${feed.logoColor} rounded-lg hover:opacity-90 transition-all shadow-lg`}
              >
                <ExternalLinkIcon size={16} />
                Watch on {feed.network}
              </button>
              <button
                onClick={handleEditStart}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-mono text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-all"
              >
                <EditIcon size={16} />
                Update Stream URL
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-mono text-gray-400 bg-gray-900 border border-gray-700 rounded-lg hover:border-gray-600 transition-all"
              >
                <RefreshIcon size={16} />
                Retry
              </button>
            </div>
          </div>
        ) : hasEnteredViewport ? (
          /* ─── Iframe (lazy-loaded after entering viewport) ─── */
          <>
            <iframe
              key={iframeKey}
              src={currentSource!.iframeSrc}
              title={`${feed.title} Live`}
              className="w-full h-full absolute inset-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ border: 'none' }}
              onError={handleIframeError}
            />
            {!isCardFullscreen && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            )}
          </>
        ) : (
          /* ─── Thumbnail placeholder (before entering viewport / after unloading) ─── */
          <div
            className="absolute inset-0 cursor-pointer group/thumb-play"
            onClick={() => {
              hasEverLoadedRef.current = true;
              setHasEnteredViewport(true);
              setWasUnloaded(false);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                hasEverLoadedRef.current = true;
                setHasEnteredViewport(true);
                setWasUnloaded(false);
              }
            }}
            aria-label={`Load ${feed.title} live stream`}
          >
            {/* Thumbnail image */}
            {currentVideoId && !thumbnailImgError ? (
              <img
                src={getYoutubeThumbnail(currentVideoId, 'hqdefault')}
                alt={`${feed.title} thumbnail`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setThumbnailImgError(true)}
              />
            ) : (
              /* Fallback: branded gradient when no thumbnail available */
              <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-950 to-black flex items-center justify-center">
                <div className={`w-16 h-16 rounded-2xl ${feed.logoColor} flex items-center justify-center shadow-lg opacity-60`}>
                  {feed.logoSvg || <TvIcon size={32} className="text-white" />}
                </div>
              </div>
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover/thumb-play:bg-black/25 transition-all duration-300" />

            {/* Play button overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] group-hover/thumb-play:scale-110 group-hover/thumb-play:bg-red-500 transition-all duration-300">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <polygon points="9.5,7 9.5,17 18,12" />
                </svg>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-mono text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                  {wasUnloaded ? 'Unloaded — click or scroll to reload' : 'Click to load stream'}
                </span>
              </div>
            </div>

            {/* Channel branding in corner */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className={`w-7 h-7 rounded flex items-center justify-center ${feed.logoColor} shadow-md`}>
                {feed.logoSvg || <NewsIcon size={14} className="text-white" />}
              </div>
              {feed.isLive !== false && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600/90 rounded text-[10px] font-mono text-white font-bold shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </span>
              )}
              {isPriority && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-600/90 rounded text-[10px] font-mono text-white font-bold shadow-md">
                  <PinIcon size={10} className="text-white" />
                  PINNED
                </span>
              )}
            </div>

            {/* Status indicator */}
            <div className="absolute bottom-3 right-3">
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded backdrop-blur-sm ${
                wasUnloaded
                  ? 'text-amber-300/70 bg-amber-900/40'
                  : 'text-white/40 bg-black/40'
              }`}>
                {wasUnloaded ? 'Memory reclaimed' : 'Scroll to auto-load'}
              </span>
            </div>
          </div>
        )}



      </div>

      {/* Footer */}
      {!isCardFullscreen && (
        <div className="px-4 py-3 border-t border-gray-800 bg-gradient-to-r from-gray-950 to-black">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="text-white font-mono font-medium text-sm truncate">{feed.detectedTitle || feed.title}</h4>
              <p className="text-gray-500 text-xs font-mono mt-0.5 truncate">{feed.subtitle}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              {feed.sources.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {feed.sources.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentSourceIdx(idx); setStreamError(false); setIframeKey(prev => prev + 1); }}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-all ${
                        currentSourceIdx === idx
                          ? `${feed.accentColor} border-current bg-current/10`
                          : 'text-gray-600 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {src.label.split('(')[1]?.replace(')', '') || `Source ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}
              {feed.viewerCount && (
                <div className="flex items-center gap-1.5">
                  <UsersIcon size={12} className="text-red-400" />
                  <span className="text-[10px] font-mono text-red-400">{formatViewerCount(feed.viewerCount)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <SignalIcon size={14} className={streamError ? 'text-yellow-500' : feed.isLive !== false ? 'text-green-500' : 'text-yellow-500'} />
                <span className={`text-[10px] font-mono ${streamError ? 'text-yellow-500' : feed.isLive !== false ? 'text-gray-600' : 'text-yellow-500'}`}>
                  {streamError ? 'UNAVAILABLE' : feed.isLive !== false ? 'STREAMING' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen footer */}
      {isCardFullscreen && (
        <div className="px-6 py-3 border-t border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(255,0,0,0.8)] animate-pulse" />
              <span className="text-xs text-red-400 font-mono uppercase">Live Broadcast</span>
            </div>
            <div className="w-px h-4 bg-gray-700" />
            <span className="text-xs text-gray-500 font-mono">{feed.detectedTitle || feed.subtitle}</span>
            {feed.viewerCount && (
              <>
                <div className="w-px h-4 bg-gray-700" />
                <span className="text-xs text-red-400 font-mono flex items-center gap-1">
                  <UsersIcon size={12} />
                  {formatViewerCount(feed.viewerCount)} watching
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePip} className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-purple-400 border border-gray-700 hover:border-purple-500/30 rounded-lg transition-all">
              <PipIcon size={14} />
              PiP
            </button>
            <button onClick={handleNewWindow} className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-orange-400 border border-gray-700 hover:border-orange-500/30 rounded-lg transition-all">
              <PopoutIcon size={14} />
              New Window
            </button>
            <button onClick={handleFullscreen} className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/30 rounded-lg transition-all">
              <MinimizeIcon size={14} />
              Exit Fullscreen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

const HeadlineSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg animate-pulse">
    <div className="w-2.5 h-2.5 rounded-full bg-gray-700 flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <div className="h-4 bg-gray-700 rounded w-3/4" />
      <div className="flex items-center gap-2">
        <div className="h-3 bg-gray-700 rounded w-20" />
        <div className="h-4 bg-gray-700 rounded w-14" />
      </div>
    </div>
    <div className="h-3 bg-gray-700 rounded w-16 flex-shrink-0" />
  </div>
);

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: '', label: 'All Categories' },
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

const categoryColors: Record<string, string> = {
  technology: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  business: 'bg-green-500/10 text-green-400 border-green-500/30',
  politics: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  science: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  health: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  sports: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  entertainment: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
  world: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  security: 'bg-red-500/10 text-red-400 border-red-500/30',
  AI: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

// ─── Time Formatter ───────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

function guessCategoryFromArticle(article: NewsArticle): string {
  const text = (article.title + ' ' + article.description + ' ' + article.source).toLowerCase();
  if (/\bai\b|artificial intelligence|machine learning|chatgpt|openai|llm|neural/.test(text)) return 'AI';
  if (/cyber|security|hack|breach|malware|ransomware|vulnerability/.test(text)) return 'security';
  if (/tech|software|hardware|apple|google|microsoft|startup|silicon/.test(text)) return 'technology';
  if (/politic|election|congress|senate|president|government|democrat|republican|legislation/.test(text)) return 'politics';
  if (/business|market|stock|economy|finance|invest|revenue|profit|bank|trade/.test(text)) return 'business';
  if (/health|medical|hospital|disease|vaccine|drug|treatment|patient|doctor/.test(text)) return 'health';
  if (/science|research|study|discover|space|nasa|physics|climate/.test(text)) return 'science';
  if (/sport|game|team|player|league|championship|nba|nfl|soccer|football|baseball/.test(text)) return 'sports';
  if (/movie|film|music|celebrity|entertainment|show|actor|singer|album|concert/.test(text)) return 'entertainment';
  if (/world|international|global|country|nation|foreign|war|conflict/.test(text)) return 'world';
  return 'world';
}

// ─── Main Component ───────────────────────────────────────────────────────

const NEWS_REFRESH_MS = 5 * 60 * 1000;
const STREAM_DETECT_MS = 30 * 60 * 1000; // 30 minutes

// Helper: format seconds into M:SS
function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Lightweight countdown display that uses refs to avoid re-renders
const CountdownDisplay: React.FC<{ lastTimestamp: number; intervalMs: number; label: string }> = React.memo(
  ({ lastTimestamp, intervalMs, label }) => {
    const spanRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const update = () => {
        if (!spanRef.current) return;
        const elapsed = Date.now() - lastTimestamp;
        const remaining = Math.max(0, Math.ceil((intervalMs - elapsed) / 1000));
        spanRef.current.textContent = `${label} ${formatCountdown(remaining)}`;
      };
      update();
      const timer = setInterval(update, 5000); // Update every 5s instead of 1s
      return () => clearInterval(timer);
    }, [lastTimestamp, intervalMs, label]);

    return <span ref={spanRef} className="text-[11px] text-gray-500 font-mono" />;
  }
);

const NewsFeedTab: React.FC = () => {
  const headlinesRef = useRef<HTMLDivElement>(null);
  const [headlinesFullscreen, setHeadlinesFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'stacked' | 'quad'>('grid');

  // ─── News Settings Panel State ──────────────────────────────────────────────
  const [showNewsSettings, setShowNewsSettings] = useState(false);
  const [newsPreferences, setNewsPreferences] = useState<NewsPreferences>(() => {
    try {
      const stored = localStorage.getItem(NEWS_PREFERENCES_KEY);
      return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  // ─── Focus Mode & Quad View State ───────────────────────────────────────────
  const [focusedFeedId, setFocusedFeedId] = useState<string | null>(null);
  const [quadSelectedIds, setQuadSelectedIds] = useState<string[]>(() => {
    const stored = getQuadSelected();
    return stored.length === 4 ? stored : DEFAULT_FEEDS.slice(0, 4).map(f => f.id);
  });
  const [showQuadSelector, setShowQuadSelector] = useState(false);
  const thumbnailStripRef = useRef<HTMLDivElement>(null);

  // Channel management state
  const [showChannelManager, setShowChannelManager] = useState(false);
  const [customChannels, setCustomChannels] = useState<CustomChannel[]>(getCustomChannels);
  const [hiddenFeeds, setHiddenFeeds] = useState<string[]>(getHiddenFeeds);
  const [addChannelId, setAddChannelId] = useState('');
  const [addChannelName, setAddChannelName] = useState('');
  const [resolvingChannel, setResolvingChannel] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const addChannelInputRef = useRef<HTMLInputElement>(null);

  // Stream detection state
  const [streamDetecting, setStreamDetecting] = useState(false);
  const [streamDetectError, setStreamDetectError] = useState<string | null>(null);
  const [lastStreamDetectTs, setLastStreamDetectTs] = useState(0);
  const [detectionSummary, setDetectionSummary] = useState<{ live: number; total: number; apiDetected: number; scraped: number; manualOverride: number; fallback: number; verified?: number } | null>(null);
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('newsfeed_manual_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Health status state
  const [streamHealth, setStreamHealth] = useState<StreamHealthStatus | null>(null);
  const [newsHealth, setNewsHealth] = useState<NewsHealthStatus | null>(null);
  const [newsProvider, setNewsProvider] = useState<string | null>(null);
  const [detectedStreams, setDetectedStreams] = useState<Record<string, StreamDetection>>({});

  // ─── Database Stream Cache State ────────────────────────────────────────────
  const [dbCachedStreams, setDbCachedStreams] = useState<StreamDetection[]>([]);
  const [dbCacheLoading, setDbCacheLoading] = useState(false);
  const [dbCacheError, setDbCacheError] = useState<string | null>(null);
  const [dbCacheLastSync, setDbCacheLastSync] = useState<string | null>(null);
  const [dbCacheSize, setDbCacheSize] = useState(0);
  const [dbSyncing, setDbSyncing] = useState(false);
  const [dbSyncResult, setDbSyncResult] = useState<string | null>(null);
  const dbCacheFetchedRef = useRef(false);

  // Handle preferences change from settings panel
  const handlePreferencesChange = useCallback((prefs: NewsPreferences) => {
    setNewsPreferences(prefs);
    // Force a news refresh with new preferences
    lastNewsFetchParamsRef.current = '';
  }, []);

  // ─── Fetch Stream Cache from Database ───────────────────────────────────────
  const fetchStreamCache = useCallback(async () => {
    if (dbCacheFetchedRef.current) return; // Only fetch once per session
    setDbCacheLoading(true);
    setDbCacheError(null);
    console.log('[NewsFeedTab] Fetching stream cache from database via sync-stream-ids...');
    try {
      const result = await invokeEdgeFunction('sync-stream-ids', { action: 'read' });
      if (result.error) {
        console.warn('[NewsFeedTab] stream_cache read error:', result.error);
        setDbCacheError(result.error);
        return;
      }
      const data = result.data;
      if (data?.success && Array.isArray(data.streams)) {
        const mapped: StreamDetection[] = data.streams.map((s: any) => ({
          id: s.id || s.channelId,
          channelId: s.channelId || s.channel_id,
          name: s.name || s.channel_name || 'Unknown',
          videoId: s.videoId || s.video_id,
          title: s.title || '',
          thumbnail: s.thumbnail || `https://img.youtube.com/vi/${s.videoId || s.video_id}/hqdefault.jpg`,
          isLive: s.isLive ?? s.is_live ?? false,
          viewerCount: s.viewerCount || s.viewer_count || null,
          detectedAt: s.detectedAt || s.detected_at || new Date().toISOString(),
          source: 'cache' as const,
          verified: s.verified ?? false,
        }));
        setDbCachedStreams(mapped);
        setDbCacheSize(data.cacheSize || mapped.length);
        setDbCacheLastSync(data.lastSyncAt || null);
        dbCacheFetchedRef.current = true;
        console.log(`[NewsFeedTab] Loaded ${mapped.length} streams from database cache (last sync: ${data.lastSyncAt || 'unknown'})`);
      } else {
        console.log('[NewsFeedTab] stream_cache is empty or returned no streams');
        dbCacheFetchedRef.current = true;
      }
    } catch (err: any) {
      console.warn('[NewsFeedTab] Failed to fetch stream cache:', err?.message);
      setDbCacheError(err?.message || 'Failed to read stream cache');
    } finally {
      setDbCacheLoading(false);
    }
  }, []);

  // ─── Trigger Database Sync (manual) ─────────────────────────────────────────
  const triggerDbSync = useCallback(async () => {
    setDbSyncing(true);
    setDbSyncResult(null);
    console.log('[NewsFeedTab] Triggering manual sync-stream-ids sync...');
    try {
      const result = await invokeEdgeFunction('sync-stream-ids', { action: 'sync' });
      if (result.error) {
        setDbSyncResult(`Sync failed: ${result.error}`);
        console.error('[NewsFeedTab] sync-stream-ids sync error:', result.error);
        return;
      }
      const data = result.data;
      if (data?.success) {
        const msg = `Synced ${data.upserted || 0} streams to database (${data.streamsDetected || 0} detected, ${data.errors?.length || 0} errors)`;
        setDbSyncResult(msg);
        console.log('[NewsFeedTab]', msg);
        // Refresh the cache after sync
        dbCacheFetchedRef.current = false;
        await fetchStreamCache();
      } else {
        setDbSyncResult(`Sync returned: ${data?.error || 'unknown error'}`);
      }
    } catch (err: any) {
      const msg = err?.message || 'Sync failed';
      setDbSyncResult(`Error: ${msg}`);
      console.error('[NewsFeedTab] sync-stream-ids error:', err);
    } finally {
      setDbSyncing(false);
      // Clear result message after 10 seconds
      setTimeout(() => setDbSyncResult(null), 10000);
    }
  }, [fetchStreamCache]);

  // ─── Apply DB Cache as Fallback ─────────────────────────────────────────────
  const applyDbCacheToFeeds = useCallback(() => {
    if (dbCachedStreams.length === 0) {
      console.log('[NewsFeedTab] No DB cached streams to apply as fallback');
      return false;
    }
    console.log(`[NewsFeedTab] Applying ${dbCachedStreams.length} DB cached streams as fallback`);
    const newMap: Record<string, StreamDetection> = {};
    for (const s of dbCachedStreams) {
      newMap[s.channelId] = { ...s, source: 'cache' };
    }
    setDetectedStreams(newMap);
    setIsCachedResult(true);
    setDetectionSummary({
      live: dbCachedStreams.filter(s => s.isLive).length,
      total: dbCachedStreams.length,
      apiDetected: 0,
      scraped: 0,
      manualOverride: 0,
      fallback: 0,
      verified: 0,
    });
    return true;
  }, [dbCachedStreams]);




  // Refs to prevent concurrent calls and track mount
  const streamFetchInFlight = useRef(false);
  const newsFetchInFlight = useRef(false);
  const mountedRef = useRef(false);
  const customChannelsRef = useRef(customChannels);
  customChannelsRef.current = customChannels;
  const lastNewsFetchParamsRef = useRef('');



  // ─── Priority Channels & Iframe Lifecycle Management ────────────────────────
  const [priorityChannels, setPriorityChannels] = useState<string[]>(getPriorityChannels);
  const [autoUnloadDisabled, setAutoUnloadDisabled] = useState(getAutoUnloadDisabled);
  const [activeIframeCount, setActiveIframeCount] = useState(0);
  const activeIframesRef = useRef(new Set<string>());

  const handleActiveChange = useCallback((feedId: string, isActive: boolean) => {
    const set = activeIframesRef.current;
    if (isActive) {
      set.add(feedId);
    } else {
      set.delete(feedId);
    }
    setActiveIframeCount(set.size);
  }, []);

  const handleTogglePriority = useCallback((feedId: string) => {
    setPriorityChannels(prev => {
      const updated = prev.includes(feedId)
        ? prev.filter(id => id !== feedId)
        : [...prev, feedId];
      savePriorityChannels(updated);
      return updated;
    });
  }, []);

  const handleToggleAutoUnload = useCallback(() => {
    setAutoUnloadDisabled(prev => {
      const next = !prev;
      saveAutoUnloadDisabled(next);
      return next;
    });
  }, []);

  // Build all feeds from defaults + custom channels
  const allFeedConfigs = useCallback((): FeedConfig[] => {
    const stored = getStoredStreams();
    const builtInFeeds = DEFAULT_FEEDS.map(feed => {
      const customVideoId = stored[feed.id];
      if (customVideoId) {
        return {
          ...feed,
          sources: [{
            label: `${feed.network} (Custom)`,
            iframeSrc: youtubeEmbedUrl(customVideoId),
            directUrl: youtubeWatchUrl(customVideoId),
          }, ...feed.sources],
        };
      }
      return feed;
    });
    const customFeeds = customChannels.map((ch, i) => {
      const feed = buildCustomFeed(ch, i);
      const customVideoId = stored[feed.id];
      if (customVideoId) {
        return {
          ...feed,
          sources: [{
            label: `${ch.name} (Custom)`,
            iframeSrc: youtubeEmbedUrl(customVideoId),
            directUrl: youtubeWatchUrl(customVideoId),
          }],
        };
      }
      return feed;
    });
    return [...builtInFeeds, ...customFeeds];
  }, [customChannels]);

  const [feeds, setFeeds] = useState<FeedConfig[]>(allFeedConfigs);

  // Rebuild feeds when custom channels change
  useEffect(() => {
    setFeeds(allFeedConfigs());
  }, [customChannels, allFeedConfigs]);

  // Visible feeds (filtered by hidden)
  const visibleFeeds = feeds.filter(f => !hiddenFeeds.includes(f.id));

  // ─── Auto-detect live streams (with concurrency guard) ──────────────────────

  const fetchLiveStreams = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent calls
    if (streamFetchInFlight.current) {
      console.log('[NewsFeedTab] Stream fetch already in flight, skipping...');
      return;
    }
    
    streamFetchInFlight.current = true;
    setStreamDetecting(true);
    setStreamDetectError(null);

    try {
      const body: any = {
        forceRefresh,
        manualOverrides,
      };

      // Include custom channels if any
      if (customChannelsRef.current.length > 0) {
        body.customChannels = customChannelsRef.current.map(ch => ({
          channelId: ch.channelId,
          name: ch.name,
          customHandle: ch.customHandle || '',
          fallbackVideoId: ch.fallbackVideoId || '',
        }));
      }
      const result = await invokeEdgeFunction('find-live-streams', body);
      const data = result.data;
      const error = result.error;

      if (error) {
        const isEdgeFunctionUnavailable = error === 'ALL_STRATEGIES_FAILED';
        
        if (isEdgeFunctionUnavailable) {
          console.warn('[NewsFeedTab] find-live-streams unreachable from browser (network/CORS). Trying DB cache fallback...');
          const appliedCache = applyDbCacheToFeeds();
          if (appliedCache) {
            setStreamDetectError('Edge functions unreachable — using database-cached stream IDs. Cache has ' + dbCachedStreams.length + ' streams.');
          } else {
            setStreamDetectError('Edge functions unreachable from this browser. Streams using hardcoded fallback video IDs. This is typically a network/CORS issue — the functions are deployed and working server-side.');
          }
        } else {
          console.error('Stream detection error:', error);
          setStreamDetectError(error || 'Failed to detect streams');
        }
        return;
      }




      if (!data?.success && data?.error) {
        setStreamDetectError(data.error);
      }

      // Capture health status from response
      if (data?.health) {
        setStreamHealth(data.health as StreamHealthStatus);
      }

      if (data?.streams && Array.isArray(data.streams)) {
        const newMap: Record<string, StreamDetection> = {};
        for (const s of data.streams) {
          newMap[s.channelId] = s;
        }
        setDetectedStreams(newMap);
        setLastStreamDetectTs(Date.now());
        setIsCachedResult(data.cached === true);

        if (data.summary) {
          setDetectionSummary({
            live: data.summary.live || 0,
            total: data.summary.total || 0,
            apiDetected: data.summary.apiDetected || 0,
            scraped: data.summary.scraped || 0,
            manualOverride: data.summary.manualOverride || 0,
            fallback: data.summary.fallback || 0,
            verified: data.summary.verified || 0,
          });
        }
      }
    } catch (err: any) {
      // Check if this is an edge function connectivity issue
      const isEdgeFunctionUnavailable = err?.message?.includes('Failed to send a request') ||
                                         err?.message?.includes('ALL_STRATEGIES_FAILED') ||
                                         err?.name === 'FunctionsFetchError';
      
      if (isEdgeFunctionUnavailable) {
        console.warn('[NewsFeedTab] find-live-streams unreachable from browser (catch). Trying DB cache fallback...');
        const appliedCache = applyDbCacheToFeeds();
        if (appliedCache) {
          setStreamDetectError('Edge functions unreachable — using database-cached stream IDs. Cache has ' + dbCachedStreams.length + ' streams.');
        } else {
          setStreamDetectError('Edge functions unreachable — streams using fallback video IDs. The functions are deployed but cannot be reached from this browser (network/CORS).');
        }
      } else {
        console.error('Stream detection error:', err);
        setStreamDetectError(err?.message || 'Unknown error');
      }

    } finally {
      streamFetchInFlight.current = false;
      setStreamDetecting(false);
    }
  }, [manualOverrides, applyDbCacheToFeeds, dbCachedStreams.length]);



  // Fetch stream cache from DB on mount, then fetch live streams
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      // First load DB cache as fallback, then attempt live detection
      fetchStreamCache().finally(() => {
        fetchLiveStreams(false);
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh streams every 30 minutes (stable interval)
  useEffect(() => {
    const interval = setInterval(() => fetchLiveStreams(true), STREAM_DETECT_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // ─── Focus Mode & Quad View Handlers ────────────────────────────────────────

  const handleFocusFeed = useCallback((feedId: string) => {
    setFocusedFeedId(prev => prev === feedId ? null : feedId);
  }, []);

  const handleExitFocus = useCallback(() => {
    setFocusedFeedId(null);
  }, []);

  const handleToggleQuadView = useCallback(() => {
    if (viewMode === 'quad') {
      setViewMode('grid');
      setShowQuadSelector(false);
    } else {
      setViewMode('quad');
      setFocusedFeedId(null);
      // Ensure we have 4 valid selections from visible feeds
      setQuadSelectedIds(prev => {
        const validIds = prev.filter(id => visibleFeeds.some(f => f.id === id));
        if (validIds.length >= 4) return validIds.slice(0, 4);
        const remaining = visibleFeeds.filter(f => !validIds.includes(f.id)).map(f => f.id);
        const filled = [...validIds, ...remaining].slice(0, 4);
        saveQuadSelected(filled);
        return filled;
      });
    }
  }, [viewMode, visibleFeeds]);

  const handleQuadToggleChannel = useCallback((feedId: string) => {
    setQuadSelectedIds(prev => {
      let updated: string[];
      if (prev.includes(feedId)) {
        updated = prev.filter(id => id !== feedId);
      } else {
        if (prev.length >= 4) {
          updated = [...prev.slice(0, 3), feedId];
        } else {
          updated = [...prev, feedId];
        }
      }
      saveQuadSelected(updated);
      return updated;
    });
  }, []);

  const handleScrollThumbnails = useCallback((direction: 'left' | 'right') => {
    if (thumbnailStripRef.current) {
      const scrollAmount = 200;
      thumbnailStripRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  // ─── Keyboard Shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
        return;
      }

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        const feedIndex = num - 1;
        if (feedIndex < visibleFeeds.length) {
          if (viewMode === 'quad') return;
          handleFocusFeed(visibleFeeds[feedIndex].id);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (showQuadSelector) {
          setShowQuadSelector(false);
        } else if (focusedFeedId) {
          handleExitFocus();
        } else if (viewMode === 'quad') {
          setViewMode('grid');
        }
        return;
      }

      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        handleToggleQuadView();
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        if (focusedFeedId) {
          handleExitFocus();
        } else if (visibleFeeds.length > 0) {
          handleFocusFeed(visibleFeeds[0].id);
        }
        return;
      }

      if (focusedFeedId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const currentIdx = visibleFeeds.findIndex(f => f.id === focusedFeedId);
        if (currentIdx === -1) return;
        const nextIdx = e.key === 'ArrowLeft'
          ? (currentIdx - 1 + visibleFeeds.length) % visibleFeeds.length
          : (currentIdx + 1) % visibleFeeds.length;
        setFocusedFeedId(visibleFeeds[nextIdx].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleFeeds, focusedFeedId, viewMode, showQuadSelector, handleFocusFeed, handleExitFocus, handleToggleQuadView]);



  const handleUpdateVideoId = useCallback((feedId: string, videoId: string) => {
    storeStream(feedId, videoId);
    setFeeds(prev => prev.map(feed => {
      if (feed.id !== feedId) return feed;
      const defaultSources = DEFAULT_FEEDS.find(f => f.id === feedId)?.sources || [];
      return {
        ...feed,
        sources: [{
          label: `${feed.network} (Custom)`,
          iframeSrc: youtubeEmbedUrl(videoId),
          directUrl: youtubeWatchUrl(videoId),
        }, ...defaultSources],
      };
    }));
  }, []);

  // ─── Channel Management ─────────────────────────────────────────────────────

  const handleResolveChannelName = useCallback(async () => {
    const channelId = addChannelId.trim();
    if (!channelId) return;

    let resolvedId = channelId;
    const urlMatch = channelId.match(/youtube\.com\/channel\/([^/?]+)/);
    if (urlMatch) resolvedId = urlMatch[1];

    setResolveError(null);
    try {
      const result = await invokeEdgeFunction('find-live-streams', { resolveNames: true, channelIds: [resolvedId] });
      const data = result.data;
      const error = result.error;
      if (error) throw new Error(error);

      if (data?.channels?.[resolvedId]) {
        setAddChannelName(data.channels[resolvedId]);
        setAddChannelId(resolvedId);
      } else {
        setAddChannelId(resolvedId);
        setResolveError('Channel not found. Please verify the channel ID.');
      }
    } catch (err: any) {
      setResolveError(err.message || 'Failed to resolve channel name');
    } finally {
      setResolvingChannel(false);
    }
  }, [addChannelId]);

  const handleAddChannel = useCallback(() => {
    const channelId = addChannelId.trim();
    const name = addChannelName.trim() || `Channel ${channelId.substring(0, 8)}`;
    if (!channelId) return;

    const allChannelIds = [
      ...DEFAULT_FEEDS.map(f => f.channelId),
      ...customChannels.map(c => c.channelId),
    ];
    if (allChannelIds.includes(channelId)) {
      setResolveError('This channel is already in the feed list.');
      return;
    }

    const newChannel: CustomChannel = {
      channelId,
      name,
      addedAt: new Date().toISOString(),
    };
    const updated = [...customChannels, newChannel];
    setCustomChannels(updated);
    saveCustomChannels(updated);
    setAddChannelId('');
    setAddChannelName('');
    setResolveError(null);

    // Trigger a fresh detection after a short delay
    setTimeout(() => fetchLiveStreams(true), 1000);
  }, [addChannelId, addChannelName, customChannels, fetchLiveStreams]);

  const handleRemoveCustomChannel = useCallback((channelId: string) => {
    const updated = customChannels.filter(c => c.channelId !== channelId);
    setCustomChannels(updated);
    saveCustomChannels(updated);
  }, [customChannels]);

  const handleToggleFeedVisibility = useCallback((feedId: string) => {
    setHiddenFeeds(prev => {
      const updated = prev.includes(feedId)
        ? prev.filter(id => id !== feedId)
        : [...prev, feedId];
      saveHiddenFeeds(updated);
      return updated;
    });
  }, []);

  // ─── News Headlines State ───────────────────────────────────────────────────

  const [articles, setArticles] = useState<(NewsArticle & { category: string })[]>([]);
  const [cachedArticles, setCachedArticles] = useState<(NewsArticle & { category: string })[]>([]);
  const [isShowingCached, setIsShowingCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [fetchQuery, setFetchQuery] = useState('breaking news');
  const [lastNewsRefreshTs, setLastNewsRefreshTs] = useState(Date.now());
  const searchInputRef = useRef<HTMLInputElement>(null);



  // Load cached articles from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('newsfeed_cached_articles');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCachedArticles(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load cached articles:', e);
    }
  }, []);

  // Save articles to localStorage when they change
  useEffect(() => {
    if (articles.length > 0) {
      try {
        localStorage.setItem('newsfeed_cached_articles', JSON.stringify(articles));
        localStorage.setItem('newsfeed_cached_timestamp', Date.now().toString());
      } catch (e) {
        console.warn('Failed to cache articles:', e);
      }
    }
  }, [articles]);

  // ─── Client-side RSS Fallback (Multi-Proxy, Multi-Source) ─────────────────
  const fetchClientSideRSS = useCallback(async (): Promise<(NewsArticle & { category: string })[]> => {
    const RSS_FEEDS = [
      // High-reliability feeds
      { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC News' },
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', name: 'NYT' },
      { url: 'https://www.theguardian.com/world/rss', name: 'The Guardian' },
      { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters' },
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', name: 'NYT Tech' },
      { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', name: 'BBC Tech' },
      { url: 'https://www.theguardian.com/technology/rss', name: 'Guardian Tech' },
      { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
      { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', name: 'BBC Science' },
      { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera' },
    ];

    // Multiple RSS-to-JSON proxy services to try
    const PROXY_SERVICES = [
      (feedUrl: string) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`,
      (feedUrl: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
      (feedUrl: string) => `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`,
    ];

    const allArticles: (NewsArticle & { category: string })[] = [];

    // Try rss2json first (returns clean JSON)
    for (const feed of RSS_FEEDS) {
      if (allArticles.length >= 30) break;
      try {
        const proxyUrl = PROXY_SERVICES[0](feed.url);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timer);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok' && data.items) {
            for (const item of data.items) {
              if (allArticles.length >= 30) break;
              const article: NewsArticle = {
                title: item.title || 'Untitled',
                source: feed.name || data.feed?.title || 'RSS',
                timestamp: item.pubDate || new Date().toISOString(),
                thumbnail: item.thumbnail || item.enclosure?.link || null,
                url: item.link || '#',
                description: item.description
                  ? item.description.replace(/<[^>]*>/g, '').substring(0, 200)
                  : '',
              };
              allArticles.push({
                ...article,
                category: guessCategoryFromArticle(article),
              });
            }
          }
        }
      } catch (e) {
        // Silently continue to next feed
      }
    }

    // If rss2json didn't work well, try allorigins proxy (returns raw XML)
    if (allArticles.length < 5) {
      console.log('[NewsFeedTab] rss2json returned few results, trying allorigins proxy...');
      for (const feed of RSS_FEEDS.slice(0, 4)) {
        if (allArticles.length >= 25) break;
        try {
          const proxyUrl = PROXY_SERVICES[1](feed.url);
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const response = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timer);
          if (response.ok) {
            const data = await response.json();
            const xmlText = data.contents;
            if (xmlText) {
              // Parse XML manually
              const parser = new DOMParser();
              const doc = parser.parseFromString(xmlText, 'text/xml');
              const items = doc.querySelectorAll('item');
              items.forEach((item) => {
                if (allArticles.length >= 25) return;
                const title = item.querySelector('title')?.textContent || 'Untitled';
                const link = item.querySelector('link')?.textContent || '#';
                const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
                const desc = item.querySelector('description')?.textContent || '';
                // Try to extract thumbnail from media:content or enclosure
                const mediaContent = item.querySelector('content')?.getAttribute('url') || 
                                     item.querySelector('enclosure')?.getAttribute('url') || null;
                const article: NewsArticle = {
                  title,
                  source: feed.name,
                  timestamp: pubDate,
                  thumbnail: mediaContent,
                  url: link,
                  description: desc.replace(/<[^>]*>/g, '').substring(0, 200),
                };
                allArticles.push({
                  ...article,
                  category: guessCategoryFromArticle(article),
                });
              });
            }
          }
        } catch (e) {
          // Silently continue
        }
      }
    }

    // If still no results, try corsproxy.io
    if (allArticles.length < 3) {
      console.log('[NewsFeedTab] Trying corsproxy.io as last proxy...');
      for (const feed of RSS_FEEDS.slice(0, 3)) {
        if (allArticles.length >= 15) break;
        try {
          const proxyUrl = PROXY_SERVICES[2](feed.url);
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 8000);
          const response = await fetch(proxyUrl, { signal: controller.signal });
          clearTimeout(timer);
          if (response.ok) {
            const xmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlText, 'text/xml');
            const items = doc.querySelectorAll('item');
            items.forEach((item) => {
              if (allArticles.length >= 15) return;
              const title = item.querySelector('title')?.textContent || 'Untitled';
              const link = item.querySelector('link')?.textContent || '#';
              const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
              const desc = item.querySelector('description')?.textContent || '';
              const article: NewsArticle = {
                title,
                source: feed.name,
                timestamp: pubDate,
                thumbnail: null,
                url: link,
                description: desc.replace(/<[^>]*>/g, '').substring(0, 200),
              };
              allArticles.push({
                ...article,
                category: guessCategoryFromArticle(article),
              });
            });
          }
        } catch (e) {
          // Silently continue
        }
      }
    }

    // Absolute last resort: hardcoded emergency headlines so the UI isn't empty
    if (allArticles.length === 0) {
      console.warn('[NewsFeedTab] All RSS proxy services failed. Showing emergency placeholder headlines.');
      const emergencyHeadlines: (NewsArticle & { category: string })[] = [
        {
          title: 'News feeds are temporarily unavailable — RSS proxy services are unreachable',
          source: 'System Notice',
          timestamp: new Date().toISOString(),
          thumbnail: null,
          url: 'https://news.google.com',
          description: 'All news proxy services are currently unreachable from this browser. This may be due to network restrictions, ad blockers, or temporary service outages. Try refreshing in a few minutes or visit news sites directly.',
          category: 'world',
        },
        {
          title: 'Visit BBC News for the latest headlines',
          source: 'BBC News',
          timestamp: new Date().toISOString(),
          thumbnail: null,
          url: 'https://www.bbc.com/news',
          description: 'Click to open BBC News in a new tab for the latest breaking news and analysis from around the world.',
          category: 'world',
        },
        {
          title: 'Visit Reuters for breaking news coverage',
          source: 'Reuters',
          timestamp: new Date().toISOString(),
          thumbnail: null,
          url: 'https://www.reuters.com',
          description: 'Click to open Reuters for trusted international news coverage, business updates, and market data.',
          category: 'business',
        },
        {
          title: 'Visit The New York Times for in-depth reporting',
          source: 'New York Times',
          timestamp: new Date().toISOString(),
          thumbnail: null,
          url: 'https://www.nytimes.com',
          description: 'Click to open The New York Times for comprehensive news coverage, opinion, and analysis.',
          category: 'world',
        },
        {
          title: 'Visit Al Jazeera for global news perspective',
          source: 'Al Jazeera',
          timestamp: new Date().toISOString(),
          thumbnail: null,
          url: 'https://www.aljazeera.com',
          description: 'Click to open Al Jazeera English for international news from a global perspective.',
          category: 'world',
        },
        {
          title: 'Visit TechCrunch for technology news',
          source: 'TechCrunch',
          timestamp: new Date().toISOString(),
          thumbnail: null,
          url: 'https://techcrunch.com',
          description: 'Click to open TechCrunch for the latest technology news, startup coverage, and product launches.',
          category: 'technology',
        },
      ];
      return emergencyHeadlines;
    }

    return allArticles;
  }, []);


  const fetchNews = useCallback(async (query?: string) => {
    // Prevent concurrent news fetches
    if (newsFetchInFlight.current) return;

    const effectiveQuery = query || fetchQuery || 'breaking news';
    const effectiveCategory = selectedCategory || '';
    const paramsKey = `${effectiveQuery}|${effectiveCategory}`;

    // Skip if we just fetched with the same params (debounce)
    if (paramsKey === lastNewsFetchParamsRef.current && articles.length > 0 && !query) {
      return;
    }

    newsFetchInFlight.current = true;
    setLoading(true);
    setError(null);
    setIsShowingCached(false);
    
    // ─── Strategy 1: Try Edge Function ────────────────────────────────────────
    let edgeFunctionWorked = false;
    let edgeFunctionError: string | null = null;
    
    try {
      const result = await invokeEdgeFunction('fetch-news', {
        query: effectiveQuery,
        count: 30,
        category: effectiveCategory || undefined,
      });
      const data = result.data;
      const fnError = result.error;

      if (fnError) {
        edgeFunctionError = fnError;
        // Don't throw - fall through to RSS fallback
      } else if (data?.error && !data?.articles?.length) {
        edgeFunctionError = data.error;
      } else {
        // Capture health status and provider info
        if (data?.health) {
          setNewsHealth(data.health as NewsHealthStatus);
        }
        if (data?.provider) {
          setNewsProvider(data.provider);
        }

        const fetchedArticles: NewsArticle[] = data?.articles || [];
        
        if (fetchedArticles.length > 0) {
          const enriched = fetchedArticles.map(a => ({
            ...a,
            category: guessCategoryFromArticle(a),
          }));
          setArticles(enriched);
          setCachedArticles(enriched);
          setIsShowingCached(false);
          setLastNewsRefreshTs(Date.now());
          lastNewsFetchParamsRef.current = paramsKey;
          edgeFunctionWorked = true;
        }
      }
    } catch (err: any) {
      edgeFunctionError = err?.message || 'Edge function error';
    }

    // ─── Strategy 2: Client-side RSS Fallback ─────────────────────────────────
    if (!edgeFunctionWorked) {
      const isEdgeFunctionUnavailable = edgeFunctionError === 'ALL_STRATEGIES_FAILED' ||
        edgeFunctionError?.includes('Failed to send') ||
        edgeFunctionError?.includes('FunctionsFetchError');

      if (isEdgeFunctionUnavailable) {
        console.log('[NewsFeedTab] Edge function unreachable, trying client-side RSS fallback...');
      } else if (edgeFunctionError) {
        console.warn('[NewsFeedTab] Edge function returned error:', edgeFunctionError, '— trying client-side RSS...');
      } else {
        console.log('[NewsFeedTab] Edge function returned no articles, trying client-side RSS...');
      }

      try {
        const rssArticles = await fetchClientSideRSS();
        if (rssArticles.length > 0) {
          setArticles(rssArticles);
          setNewsProvider('client-rss');
          setIsShowingCached(false);
          setError(null);
          setLastNewsRefreshTs(Date.now());
          lastNewsFetchParamsRef.current = paramsKey;
          console.log(`[NewsFeedTab] Client-side RSS loaded ${rssArticles.length} articles successfully`);
          setLoading(false);
          newsFetchInFlight.current = false;
          return; // Success via client-side RSS
        }
      } catch (rssErr) {
        console.warn('[NewsFeedTab] Client-side RSS fallback also failed:', rssErr);
      }

      // ─── Strategy 3: Show cached articles ───────────────────────────────────
      if (cachedArticles.length > 0) {
        setArticles(cachedArticles);
        setIsShowingCached(true);
        setError(
          isEdgeFunctionUnavailable
            ? 'Edge functions unreachable & RSS proxies unavailable. Showing cached content.'
            : `${edgeFunctionError || 'Failed to load news'}. Showing cached content.`
        );
      } else {
        // ─── Strategy 4: Emergency headlines ──────────────────────────────────
        setArticles([]);
        setError(
          isEdgeFunctionUnavailable
            ? 'Edge functions unreachable and all RSS proxy services failed. Check network connection or try again later.'
            : (edgeFunctionError || 'Failed to load news headlines. Please try again.')
        );
      }
    }

    setLoading(false);
    newsFetchInFlight.current = false;
  }, [fetchQuery, selectedCategory, articles.length, cachedArticles, fetchClientSideRSS]);





  // Fetch news once on mount
  useEffect(() => {
    fetchNews();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh news every 5 minutes (stable interval)
  useEffect(() => {
    const interval = setInterval(() => {
      lastNewsFetchParamsRef.current = ''; // Force refresh
      fetchNews();
    }, NEWS_REFRESH_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      setFetchQuery(q);
      lastNewsFetchParamsRef.current = ''; // Force new fetch
      // Fetch with the new query directly
      setTimeout(() => fetchNews(q), 0);
    }
  };

  const handleCategoryChange = useCallback((cat: string) => {
    setSelectedCategory(cat);
    lastNewsFetchParamsRef.current = ''; // Force new fetch
    // Delay slightly to let state update
    setTimeout(() => fetchNews(), 50);
  }, [fetchNews]);

  const filteredArticles = articles.filter(a => {
    const matchesSearch = !searchQuery.trim() ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      setHeadlinesFullscreen(document.fullscreenElement === headlinesRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleHeadlinesFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await headlinesRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch (err) { console.error('Fullscreen error:', err); }
  };

  const handleHeadlineNewWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };


  const openHeadlinesInNewWindow = () => {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const newWin = window.open('', 'NewsHeadlines', `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    if (newWin) {
      newWin.document.write(`
        <html>
        <head><title>News Headlines - Applegate CORE</title>
        <style>
          body { background: #0a0a0a; color: #e5e5e5; font-family: 'Courier New', monospace; padding: 24px; margin: 0; }
          h1 { color: #22d3ee; font-size: 18px; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 12px; }
          .item { padding: 12px 16px; border: 1px solid #333; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; }
          .item:hover { border-color: #22d3ee; background: rgba(34,211,238,0.05); }
          .title { font-size: 14px; color: #fff; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #666; }
          .source { color: #22d3ee; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; border: 1px solid #666; color: #999; margin-left: 8px; }
          .desc { font-size: 11px; color: #888; margin-top: 4px; }
        </style></head><body>
        <h1>NEWS HEADLINES // Applegate CORE — ${new Date().toLocaleString()}</h1>
        ${filteredArticles.map(h => `
          <div class="item" onclick="window.open('${h.url}','_blank')">
            <div class="title">${h.title}</div>
            <div class="meta"><span class="source">${h.source}</span> &bull; ${formatTimeAgo(h.timestamp)} <span class="badge">${h.category}</span></div>
            ${h.description ? `<div class="desc">${h.description.substring(0, 150)}...</div>` : ''}
          </div>
        `).join('')}
        </body></html>
      `);
      newWin.document.close();
    }
  };

  // Chunk feeds into rows of 2 for grid view
  const feedRows: FeedConfig[][] = [];
  for (let i = 0; i < visibleFeeds.length; i += 2) {
    feedRows.push(visibleFeeds.slice(i, i + 2));
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-950/20 to-red-950/20 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-mono font-bold text-white mb-2 flex items-center gap-3">
              <NewsIcon size={24} className="text-orange-400" />
              Live News Feed
              <span className="text-xs font-normal text-gray-500 ml-1">
                {visibleFeeds.length} channel{visibleFeeds.length !== 1 ? 's' : ''}
                {hiddenFeeds.length > 0 && ` (${hiddenFeeds.length} hidden)`}
              </span>
            </h3>
            <p className="text-gray-400 font-mono text-sm">
              Real-time live news streams from {visibleFeeds.length} networks. Stream IDs are auto-detected via YouTube API every 30 minutes.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Auto-detect streams button */}
            <button
              onClick={() => fetchLiveStreams(true)}
              disabled={streamDetecting}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-lg border transition-all ${
                streamDetecting
                  ? 'text-gray-500 border-gray-700 bg-gray-800/50 cursor-not-allowed'
                  : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/60'
              }`}
              title="Use YouTube API to find current live stream video IDs for all channels"
            >
              <RadarIcon size={16} className={streamDetecting ? 'animate-spin' : ''} />
              {streamDetecting ? 'Detecting...' : 'Auto-detect streams'}
            </button>

            {/* Manage Channels button */}
            <button
              onClick={() => setShowChannelManager(!showChannelManager)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-lg border transition-all ${
                showChannelManager
                  ? 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10'
                  : 'text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
              }`}
              title="Add, remove, or hide news channels"
            >
              <SettingsIcon size={16} />
              Manage Channels
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/80 border border-gray-700 rounded-lg">
              <ClockIcon size={14} className="text-gray-500" />
              <CountdownDisplay lastTimestamp={lastNewsRefreshTs} intervalMs={NEWS_REFRESH_MS} label="News" />
            </div>


            {/* View mode buttons */}
            <div className="flex items-center gap-1 bg-gray-900/60 border border-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => { setViewMode('grid'); setFocusedFeedId(null); }}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
                  viewMode === 'grid' && !focusedFeedId
                    ? 'text-orange-400 bg-orange-500/10 shadow-sm'
                    : 'text-gray-500 hover:text-gray-400'
                }`}
                title="Grid view"
              >
                Grid
              </button>
              <button
                onClick={() => { setViewMode('stacked'); setFocusedFeedId(null); }}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
                  viewMode === 'stacked' && !focusedFeedId
                    ? 'text-orange-400 bg-orange-500/10 shadow-sm'
                    : 'text-gray-500 hover:text-gray-400'
                }`}
                title="Stacked view"
              >
                Stacked
              </button>
              <button
                onClick={handleToggleQuadView}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-md transition-all ${
                  viewMode === 'quad'
                    ? 'text-violet-400 bg-violet-500/10 shadow-sm'
                    : 'text-gray-500 hover:text-gray-400'
                }`}
                title="Quad view (Q)"
              >
                <Grid4Icon size={14} />
                Quad
              </button>
            </div>

            {/* Focus mode indicator */}
            {focusedFeedId && (
              <button
                onClick={handleExitFocus}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-all animate-pulse"
                title="Exit Focus Mode (Esc)"
              >
                <FocusIcon size={14} />
                Focus Mode
                <CloseIcon size={12} />
              </button>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono text-gray-600">
              <KeyboardIcon size={12} />
              <span>1-9 Focus</span>
              <span className="text-gray-700">|</span>
              <span>Q Quad</span>
              <span className="text-gray-700">|</span>
              <span>Esc Exit</span>
            </div>
          </div>
        </div>
      </div>




      {/* ─── Channel Manager Panel ─── */}
      {showChannelManager && (
        <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/10 to-gray-950/50 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
            <div className="flex items-center gap-3">
              <SettingsIcon size={18} className="text-cyan-400" />
              <h4 className="text-white font-mono font-medium">Channel Manager</h4>
              <span className="text-xs text-gray-600 font-mono">
                {DEFAULT_FEEDS.length} built-in + {customChannels.length} custom
              </span>
            </div>
            <button
              onClick={() => setShowChannelManager(false)}
              className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all"
            >
              <CloseIcon size={16} />
            </button>
          </div>

          {/* Add Custom Channel */}
          <div className="px-6 py-4 border-b border-gray-800/60 bg-gray-950/30">
            <div className="flex items-center gap-2 mb-3">
              <PlusIcon size={16} className="text-cyan-400" />
              <span className="text-sm font-mono text-white">Add Custom Channel</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  ref={addChannelInputRef}
                  type="text"
                  value={addChannelId}
                  onChange={e => { setAddChannelId(e.target.value); setResolveError(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleResolveChannelName(); }}
                  placeholder="YouTube Channel ID (e.g. UCeY0bbntWzzVIaj2z3QigXg)"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>
              <button
                onClick={handleResolveChannelName}
                disabled={!addChannelId.trim() || resolvingChannel}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-lg border transition-all ${
                  resolvingChannel
                    ? 'text-gray-500 border-gray-700 bg-gray-800/50 cursor-not-allowed'
                    : !addChannelId.trim()
                      ? 'text-gray-600 border-gray-700 bg-gray-800/30 cursor-not-allowed'
                      : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20'
                }`}
              >
                {resolvingChannel ? (
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SearchIcon size={14} />
                )}
                {resolvingChannel ? 'Resolving...' : 'Lookup Name'}
              </button>
              {addChannelName && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={addChannelName}
                    onChange={e => setAddChannelName(e.target.value)}
                    placeholder="Channel name"
                    className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 w-48"
                  />
                  <button
                    onClick={handleAddChannel}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-all"
                  >
                    <PlusIcon size={14} />
                    Add Channel
                  </button>
                </div>
              )}
            </div>
            {resolveError && (
              <p className="text-xs font-mono text-red-400 mt-2 flex items-center gap-1.5">
                <AlertCircleIcon size={12} />
                {resolveError}
              </p>
            )}
            <p className="text-[11px] font-mono text-gray-600 mt-2">
              Paste a YouTube channel ID or channel URL. The system will auto-detect live streams for the channel.
              Find channel IDs at <span className="text-cyan-500">youtube.com/channel/CHANNEL_ID</span>
            </p>
          </div>


          {/* ─── Database Stream Cache / Sync Now ─── */}
          <div className="px-6 py-4 border-b border-gray-800/60 bg-gray-950/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DatabaseIcon size={16} className="text-purple-400" />
                <span className="text-sm font-mono text-white">Database Stream Cache</span>
                {dbCacheSize > 0 && (
                  <span className="text-[10px] font-mono text-purple-400 px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded">
                    {dbCacheSize} cached
                  </span>
                )}
                {dbCacheLoading && (
                  <span className="text-[10px] font-mono text-cyan-400 animate-pulse">Loading...</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Refresh cache from DB */}
                <button
                  onClick={() => { dbCacheFetchedRef.current = false; fetchStreamCache(); }}
                  disabled={dbCacheLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg border transition-all ${
                    dbCacheLoading
                      ? 'text-gray-500 border-gray-700 bg-gray-800/50 cursor-not-allowed'
                      : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20'
                  }`}
                  title="Re-read cached stream IDs from the database"
                >
                  <RefreshIcon size={12} className={dbCacheLoading ? 'animate-spin' : ''} />
                  Read Cache
                </button>
                {/* Sync Now button */}
                <button
                  onClick={triggerDbSync}
                  disabled={dbSyncing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-lg border transition-all ${
                    dbSyncing
                      ? 'text-gray-500 border-gray-700 bg-gray-800/50 cursor-not-allowed'
                      : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50'
                  }`}
                  title="Detect live streams and write results to the database cache (sync-stream-ids action:sync)"
                >
                  <SyncIcon size={12} className={dbSyncing ? 'animate-spin' : ''} />
                  {dbSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>

            {/* Cache info row */}
            <div className="flex items-center gap-4 text-[10px] font-mono text-gray-500 flex-wrap">
              {dbCacheLastSync && (
                <span>Last sync: <span className="text-gray-400">{new Date(dbCacheLastSync).toLocaleString()}</span></span>
              )}
              {dbCachedStreams.length > 0 && (
                <span>Cached streams: <span className="text-purple-400">{dbCachedStreams.length}</span></span>
              )}
              {dbCachedStreams.length > 0 && (
                <span>Live: <span className="text-green-400">{dbCachedStreams.filter(s => s.isLive).length}</span></span>
              )}
              {!dbCacheLastSync && !dbCacheLoading && dbCachedStreams.length === 0 && (
                <span className="text-gray-600">No database cache available. Click "Sync Now" to populate.</span>
              )}
            </div>

            {/* DB cache error */}
            {dbCacheError && (
              <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-amber-400">
                <AlertCircleIcon size={12} />
                <span>Cache read error: {dbCacheError}</span>
              </div>
            )}

            {/* Sync result message */}
            {dbSyncResult && (
              <div className={`mt-2 flex items-center gap-2 text-[10px] font-mono ${
                dbSyncResult.startsWith('Error') || dbSyncResult.startsWith('Sync failed')
                  ? 'text-red-400'
                  : 'text-emerald-400'
              }`}>
                {dbSyncResult.startsWith('Error') || dbSyncResult.startsWith('Sync failed')
                  ? <AlertCircleIcon size={12} />
                  : <SyncIcon size={12} />
                }
                <span>{dbSyncResult}</span>
              </div>
            )}

            {/* Cached streams preview */}
            {dbCachedStreams.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                {dbCachedStreams.slice(0, 8).map(s => (
                  <div key={s.channelId} className="flex items-center gap-1.5 px-2 py-1 bg-gray-900/60 border border-gray-700/50 rounded text-[9px] font-mono">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.isLive ? 'bg-green-400' : 'bg-gray-600'}`} />
                    <span className="text-gray-400 truncate">{s.name}</span>
                    <span className="text-gray-600 flex-shrink-0">{s.videoId?.substring(0, 6)}...</span>
                  </div>
                ))}
                {dbCachedStreams.length > 8 && (
                  <div className="flex items-center justify-center px-2 py-1 text-[9px] font-mono text-gray-600">
                    +{dbCachedStreams.length - 8} more
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] font-mono text-gray-600 mt-2">
              The database cache stores detected stream IDs as a fallback when edge functions are unreachable from the browser (CORS issues).
              "Sync Now" triggers the edge function to detect streams and save them to the <code className="px-1 py-0.5 bg-gray-800 rounded text-gray-500">stream_cache</code> table.
            </p>
          </div>


          {/* Channel List */}
          <div className="px-6 py-4 max-h-[400px] overflow-y-auto space-y-2">
            {/* Built-in channels */}
            <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Built-in Channels ({DEFAULT_FEEDS.length})</div>

            {DEFAULT_FEEDS.map(feed => {
              const isHidden = hiddenFeeds.includes(feed.id);
              const isPriority = priorityChannels.includes(feed.id);
              const hasOverride = !!(manualOverrides[feed.id]);
              const feedData = feeds.find(f => f.id === feed.id);
              const sourceInfo = feedData?.detectionSource ? getSourceLabel(feedData.detectionSource) : null;
              return (
                <div key={feed.id} className={`flex flex-col gap-1.5 p-2.5 rounded-lg border transition-all ${isHidden ? 'border-gray-800 bg-gray-950/30 opacity-50' : 'border-gray-700/50 bg-gray-900/40'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded flex items-center justify-center overflow-hidden flex-shrink-0 ${feed.logoColor}`}>
                      {feed.logoSvg || <GlobeIcon size={14} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-200 truncate">{feed.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {sourceInfo && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${sourceInfo.color}`}>{sourceInfo.label}</span>
                        )}
                        {feedData?.isLive && <span className="text-[9px] font-mono text-green-400 px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded">LIVE</span>}
                        {hasOverride && <span className="text-[9px] font-mono text-yellow-400 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded">OVERRIDE</span>}
                        {isPriority && <span className="text-[9px] font-mono text-purple-400 px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded">PRIORITY</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          const updated = isPriority ? priorityChannels.filter(id => id !== feed.id) : [...priorityChannels, feed.id];
                          setPriorityChannels(updated);
                          savePriorityChannels(updated);
                        }}
                        className={`p-1.5 rounded transition-colors ${isPriority ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-gray-800 text-gray-500 hover:text-purple-400 hover:bg-gray-700'}`}
                        title={isPriority ? 'Remove priority (allow auto-unload)' : 'Set as priority (keep always loaded)'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={isPriority ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      </button>
                      <button
                        onClick={() => {
                          if (isHidden) {
                            const updated = hiddenFeeds.filter(id => id !== feed.id);
                            setHiddenFeeds(updated);
                            saveHiddenFeeds(updated);
                          } else {
                            const updated = [...hiddenFeeds, feed.id];
                            setHiddenFeeds(updated);
                            saveHiddenFeeds(updated);
                          }
                        }}
                        className={`p-1.5 rounded transition-colors ${isHidden ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
                        title={isHidden ? 'Show channel' : 'Hide channel'}
                      >
                        {isHidden ? <EyeOffIcon size={12} /> : <EyeIcon size={12} />}
                      </button>
                    </div>
                  </div>
                  {/* Manual override video ID input */}
                  <div className="flex items-center gap-2 pl-11">
                    <input
                      type="text"
                      placeholder="Paste YouTube video ID override..."
                      value={manualOverrides[feed.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        let videoId = val;
                        try {
                          if (val.includes('youtube.com') || val.includes('youtu.be')) {
                            const url = new URL(val.includes('http') ? val : `https://${val}`);
                            videoId = url.searchParams.get('v') || url.pathname.split('/').pop() || val;
                          }
                        } catch {}
                        const updated = { ...manualOverrides, [feed.id]: videoId };
                        if (!videoId) delete updated[feed.id];
                        setManualOverrides(updated);
                        localStorage.setItem('newsfeed_manual_overrides', JSON.stringify(updated));
                      }}
                      className="flex-1 text-[10px] font-mono bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-300 placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none"
                    />
                    {hasOverride && (
                      <button
                        onClick={() => {
                          const updated = { ...manualOverrides };
                          delete updated[feed.id];
                          setManualOverrides(updated);
                          localStorage.setItem('newsfeed_manual_overrides', JSON.stringify(updated));
                        }}
                        className="p-1 rounded bg-gray-800 text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
                        title="Clear override"
                      >
                        <CloseIcon size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Custom channels */}
            {customChannels.length > 0 && (
              <>
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2 mt-4">Custom Channels ({customChannels.length})</div>
                {customChannels.map((ch, idx) => {
                  const feedId = `custom_${ch.channelId}`;
                  const isHidden = hiddenFeeds.includes(feedId);
                  const colors = CUSTOM_COLORS[idx % CUSTOM_COLORS.length];
                  const feedData = feeds.find(f => f.id === feedId);
                  return (
                    <div key={ch.channelId} className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${isHidden ? 'border-gray-800/50 bg-gray-950/30 opacity-50' : `${colors.borderColor} bg-gray-900/30`}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${colors.logoColor}`}>
                          <GlobeIcon size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-mono font-bold ${isHidden ? 'text-gray-500' : colors.accentColor}`}>{ch.name}</span>
                            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-gray-500/10 text-gray-400 border border-gray-600 rounded">Custom</span>
                            {feedData?.isLive && (
                              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded">LIVE</span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-gray-600 block truncate">{ch.channelId}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleToggleFeedVisibility(feedId)} className={`p-2 rounded-lg border transition-all ${isHidden ? 'text-gray-600 border-gray-700 hover:text-gray-400 hover:border-gray-600' : `${colors.accentColor} ${colors.borderColor}`}`} title={isHidden ? 'Show channel' : 'Hide channel'}>
                          {isHidden ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                        </button>
                        <button onClick={() => handleRemoveCustomChannel(ch.channelId)} className="p-2 text-gray-600 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all" title="Remove custom channel">
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}



      {/* Health Status & Stream Detection Banner */}
      <div className={`rounded-lg border px-4 py-3 flex flex-col gap-2 transition-all ${
        streamDetectError?.includes('unreachable')
          ? 'bg-amber-500/5 border-amber-500/20'
          : streamDetectError
          ? 'bg-red-500/10 border-red-500/30'
          : streamHealth?.quotaExhausted
          ? 'bg-amber-500/10 border-amber-500/30'
          : !streamHealth?.apiKeyConfigured && streamHealth !== null
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : 'bg-zinc-800/50 border-zinc-700/50'
      }`}>
        {/* Edge Functions Unreachable Notice */}
        {streamDetectError?.includes('unreachable') && (
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Edge functions unreachable from this browser — streams using fallback video IDs. This is typically a network/CORS issue. Deploy <code className="px-1 py-0.5 bg-amber-500/10 rounded text-amber-300">find-live-streams</code> and <code className="px-1 py-0.5 bg-amber-500/10 rounded text-amber-300">fetch-news</code> to your Supabase project for auto-detection.</span>
          </div>
        )}
        
        {/* Health Warnings (only show when edge function IS reachable) */}
        {!streamDetectError?.includes('unreachable') && !streamHealth?.apiKeyConfigured && streamHealth !== null && (
          <div className="flex items-center gap-2 text-yellow-400 text-xs font-mono">
            <AlertCircleIcon size={14} />
            <span>YouTube API key not configured — using scraping/fallback detection. Add <code className="px-1 py-0.5 bg-yellow-500/10 rounded text-yellow-300">YOUTUBE_API_KEY_ONE</code> to edge function secrets.</span>
          </div>
        )}
        {streamHealth?.quotaExhausted && (
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono">
            <AlertCircleIcon size={14} />
            <span>
              YouTube API quota exhausted — cooldown: {Math.ceil((streamHealth.quotaCooldownRemaining || 0) / 60)}m remaining
            </span>
          </div>
        )}
        
        {/* Detection Status Row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
            {streamDetecting ? (
              <span className="text-cyan-400 animate-pulse">Detecting streams...</span>
            ) : detectionSummary ? (
              <>
                <span className="text-green-400">{detectionSummary.live}/{detectionSummary.total} live</span>
                <span className="text-zinc-500">|</span>
                <span title="Detected via YouTube API">API: {detectionSummary.apiDetected}</span>
                <span title="Detected via page scraping">Scrape: {detectionSummary.scraped}</span>
                <span title="Manual overrides">Manual: {detectionSummary.manualOverride}</span>
                <span title="Using fallback videos">Fallback: {detectionSummary.fallback}</span>
                {detectionSummary.verified !== undefined && (
                  <span className="text-emerald-400" title="Verified channel ownership">Verified: {detectionSummary.verified}</span>
                )}
                {isCachedResult && <span className="text-zinc-500">(cached)</span>}
              </>
            ) : streamDetectError?.includes('unreachable') ? (
              <span className="text-amber-400/70">Using fallback video IDs (edge functions unreachable)</span>
            ) : (
              <span>No detection data</span>
            )}
          </div>
          
          {/* News Provider Info */}
          {newsProvider && (
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span>News:</span>
              <span className={`px-1.5 py-0.5 rounded ${
                newsProvider === 'gateway' ? 'bg-emerald-500/20 text-emerald-400' :
                newsProvider === 'gnews' ? 'bg-blue-500/20 text-blue-400' :
                newsProvider === 'rss' ? 'bg-orange-500/20 text-orange-400' :
                newsProvider === 'client-rss' ? 'bg-teal-500/20 text-teal-400' :
                'bg-zinc-700 text-zinc-400'
              }`}>
                {newsProvider === 'client-rss' ? 'CLIENT RSS' : newsProvider.toUpperCase()}
              </span>

              {newsHealth?.cacheStatus === 'stale' && (
                <span className="text-amber-400">(stale cache)</span>
              )}
            </div>
          )}
        </div>
        
        {/* Real errors (not edge function unreachable issues) */}
        {streamDetectError && !streamDetectError.includes('unreachable') && (
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-xs font-mono">{streamDetectError}</span>
            <button
              onClick={() => fetchLiveStreams(true)}
              className="text-[10px] font-mono text-red-400 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded hover:bg-red-500/20 transition-all"
            >
              Retry
            </button>
          </div>
        )}
      </div>




      {/* Iframe lifecycle controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleToggleAutoUnload}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-mono transition-all ${
            autoUnloadDisabled
              ? 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
              : 'text-gray-500 border-gray-700 bg-gray-900/40 hover:text-gray-400 hover:border-gray-600'
          }`}
          title={autoUnloadDisabled ? 'Auto-unload is OFF — all iframes stay loaded' : 'Auto-unload is ON — iframes unload when scrolled >1000px away'}
        >
          <PinIcon size={11} />
          {autoUnloadDisabled ? 'Auto-unload OFF' : 'Auto-unload ON'}
        </button>

        {lastStreamDetectTs > 0 && (
          <span className="text-[10px] font-mono text-gray-600">
            Last scan: {new Date(lastStreamDetectTs).toLocaleTimeString()}
          </span>
        )}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-900/60 border border-gray-700/50 rounded">
          <ClockIcon size={12} className="text-gray-600" />
          <CountdownDisplay lastTimestamp={lastStreamDetectTs || Date.now()} intervalMs={STREAM_DETECT_MS} label="Next scan:" />
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ─── FOCUS MODE ─── */}
      {focusedFeedId && visibleFeeds.length > 0 && (() => {
        const focusedFeed = visibleFeeds.find(f => f.id === focusedFeedId);
        const otherFeeds = visibleFeeds.filter(f => f.id !== focusedFeedId);
        const focusedIndex = visibleFeeds.findIndex(f => f.id === focusedFeedId);
        if (!focusedFeed) return null;
        return (
          <div className="space-y-4">
            {/* Focus header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <FocusIcon size={16} className="text-amber-400" />
                <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">Focus Mode</span>
                <div className="w-px h-4 bg-gray-700" />
                <div className={`w-5 h-5 rounded flex items-center justify-center ${focusedFeed.logoColor}`}>
                  {focusedFeed.logoSvg || <NewsIcon size={10} className="text-white" />}
                </div>
                <span className={`text-sm font-mono font-bold ${focusedFeed.accentColor}`}>{focusedFeed.title}</span>
                <span className="text-[10px] font-mono text-gray-600">({focusedIndex + 1} of {visibleFeeds.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const prevIdx = (focusedIndex - 1 + visibleFeeds.length) % visibleFeeds.length;
                    setFocusedFeedId(visibleFeeds[prevIdx].id);
                  }}
                  className="p-1.5 text-gray-500 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 transition-all"
                  title="Previous channel (Left Arrow)"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <button
                  onClick={() => {
                    const nextIdx = (focusedIndex + 1) % visibleFeeds.length;
                    setFocusedFeedId(visibleFeeds[nextIdx].id);
                  }}
                  className="p-1.5 text-gray-500 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 transition-all"
                  title="Next channel (Right Arrow)"
                >
                  <ChevronRightIcon size={14} />
                </button>
                <button
                  onClick={handleExitFocus}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all"
                  title="Exit Focus Mode (Esc)"
                >
                  <CloseIcon size={12} />
                  Exit
                </button>
              </div>
            </div>

            {/* Focused feed - full width */}
            <LiveFeedCard key={focusedFeed.id} feed={focusedFeed} onUpdateVideoId={handleUpdateVideoId} isPriority={priorityChannels.includes(focusedFeed.id)} autoUnloadEnabled={!autoUnloadDisabled} onActiveChange={handleActiveChange} />


            {/* Thumbnail strip of other feeds */}
            {otherFeeds.length > 0 && (
              <div className="relative">
                {/* Scroll buttons */}
                {otherFeeds.length > 4 && (
                  <>
                    <button
                      onClick={() => handleScrollThumbnails('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-gray-900/90 border border-gray-700 rounded-full text-gray-400 hover:text-white hover:border-gray-500 transition-all shadow-lg"
                    >
                      <ChevronLeftIcon size={14} />
                    </button>
                    <button
                      onClick={() => handleScrollThumbnails('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-gray-900/90 border border-gray-700 rounded-full text-gray-400 hover:text-white hover:border-gray-500 transition-all shadow-lg"
                    >
                      <ChevronRightIcon size={14} />
                    </button>
                  </>
                )}
                <div
                  ref={thumbnailStripRef}
                  className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-2 px-1"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {otherFeeds.map((feed, idx) => {
                    const globalIdx = visibleFeeds.findIndex(f => f.id === feed.id);
                    return (
                      <button
                        key={feed.id}
                        onClick={() => setFocusedFeedId(feed.id)}
                        className={`flex-shrink-0 w-44 rounded-lg border ${feed.borderColor} bg-gray-950 hover:bg-gray-900 transition-all group/thumb overflow-hidden`}
                      >
                        <div className="aspect-video bg-gray-900 relative overflow-hidden">
                          {feed.sources.length > 0 ? (
                            <img
                              src={`https://img.youtube.com/vi/${feed.sources[0].iframeSrc.match(/embed\/([^?]+)/)?.[1] || ''}/mqdefault.jpg`}
                              alt={feed.title}
                              className="w-full h-full object-cover opacity-70 group-hover/thumb:opacity-100 transition-opacity"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className={`w-full h-full ${feed.logoColor} opacity-20`} />
                          )}
                          {/* Number badge */}
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded bg-black/70 border border-gray-600 flex items-center justify-center">
                            <span className="text-[10px] font-mono text-white font-bold">{globalIdx + 1}</span>
                          </div>
                          {/* Live indicator */}
                          {feed.isLive !== false && (
                            <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-red-600/90 rounded text-[8px] font-mono text-white font-bold">
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              LIVE
                            </div>
                          )}
                        </div>
                        <div className="px-2 py-1.5 flex items-center gap-1.5">
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${feed.logoColor}`}>
                            {feed.logoSvg || <NewsIcon size={8} className="text-white" />}
                          </div>
                          <span className={`text-[10px] font-mono font-bold truncate ${feed.accentColor}`}>{feed.network}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── QUAD VIEW ─── */}
      {viewMode === 'quad' && !focusedFeedId && (
        <div className="space-y-4">
          {/* Quad header */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-violet-500/20 bg-violet-500/5">
            <div className="flex items-center gap-3">
              <Grid4Icon size={16} className="text-violet-400" />
              <span className="text-xs font-mono text-violet-400 font-bold uppercase tracking-wider">Quad View</span>
              <div className="w-px h-4 bg-gray-700" />
              <span className="text-[10px] font-mono text-gray-500">{quadSelectedIds.length}/4 channels selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQuadSelector(!showQuadSelector)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all ${
                  showQuadSelector
                    ? 'text-violet-400 border-violet-500/40 bg-violet-500/10'
                    : 'text-gray-400 border-gray-700 hover:border-gray-600'
                }`}
              >
                <SettingsIcon size={12} />
                Select Channels
              </button>
              <button
                onClick={() => { setViewMode('grid'); setShowQuadSelector(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-all"
              >
                <CloseIcon size={12} />
                Exit Quad
              </button>
            </div>
          </div>

          {/* Quad channel selector */}
          {showQuadSelector && (
            <div className="rounded-lg border border-violet-500/20 bg-gray-950/50 p-4">
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">Select 4 channels for Quad View</div>
              <div className="flex flex-wrap gap-2">
                {visibleFeeds.map(feed => {
                  const isSelected = quadSelectedIds.includes(feed.id);
                  const selectionIdx = quadSelectedIds.indexOf(feed.id);
                  return (
                    <button
                      key={feed.id}
                      onClick={() => handleQuadToggleChannel(feed.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? `${feed.borderColor} ${feed.accentColor} bg-gray-900`
                          : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                      }`}
                    >
                      {isSelected && (
                        <span className="w-5 h-5 rounded bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-[10px] font-mono text-violet-400 font-bold">
                          {selectionIdx + 1}
                        </span>
                      )}
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${feed.logoColor}`}>
                        {feed.logoSvg || <NewsIcon size={10} className="text-white" />}
                      </div>
                      <span className="text-xs font-mono font-bold">{feed.network}</span>
                      {feed.isLive !== false && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-4">
            {quadSelectedIds.slice(0, 4).map(id => {
              const feed = visibleFeeds.find(f => f.id === id);
              if (!feed) return <div key={id} className="aspect-video bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center"><span className="text-xs font-mono text-gray-600">Channel not found</span></div>;
              return <LiveFeedCard key={feed.id} feed={feed} onUpdateVideoId={handleUpdateVideoId} isPriority={priorityChannels.includes(feed.id)} autoUnloadEnabled={!autoUnloadDisabled} onActiveChange={handleActiveChange} />;

            })}
            {/* Fill empty slots */}
            {quadSelectedIds.length < 4 && Array.from({ length: 4 - quadSelectedIds.length }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-video bg-gray-950 rounded-xl border border-dashed border-gray-700 flex flex-col items-center justify-center gap-3">
                <Grid4Icon size={32} className="text-gray-700" />
                <span className="text-xs font-mono text-gray-600">Select a channel</span>
                <button
                  onClick={() => setShowQuadSelector(true)}
                  className="px-3 py-1.5 text-[10px] font-mono text-violet-400 border border-violet-500/30 rounded-lg hover:bg-violet-500/10 transition-all"
                >
                  Choose Channel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── NORMAL GRID / STACKED VIEW ─── */}
      {!focusedFeedId && viewMode !== 'quad' && (
        <>
          {feedRows.map((row, rowIdx) => (
            <div key={rowIdx} className={viewMode === 'grid' ? 'grid md:grid-cols-2 gap-6' : 'space-y-6'}>
              {row.map((feed, feedIdx) => {
                const globalIdx = rowIdx * 2 + feedIdx;
                return (
                  <div key={feed.id} className="relative group/card">
                    {/* Channel number badge */}
                    {globalIdx < 9 && (
                      <div className="absolute top-14 left-3 z-10 w-6 h-6 rounded bg-gray-900/80 border border-gray-700 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all">
                        <span className="text-[10px] font-mono text-gray-400 font-bold">{globalIdx + 1}</span>
                      </div>
                    )}
                    <LiveFeedCard
                      feed={feed}
                      onUpdateVideoId={handleUpdateVideoId}
                      isPriority={priorityChannels.includes(feed.id)}
                      autoUnloadEnabled={!autoUnloadDisabled}
                      onActiveChange={handleActiveChange}
                      onFocus={handleFocusFeed}
                      feedIndex={globalIdx}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}


      {visibleFeeds.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-12 text-center">
          <TvIcon size={48} className="text-gray-700 mx-auto mb-4" />
          <h4 className="text-white font-mono font-medium mb-2">No Channels Visible</h4>
          <p className="text-gray-500 font-mono text-sm mb-4">
            All channels are hidden. Open the Channel Manager to show some channels.
          </p>
          <button
            onClick={() => setShowChannelManager(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all mx-auto"
          >
            <SettingsIcon size={16} />
            Manage Channels
          </button>
        </div>
      )}


      {/* ─── News Headlines Section ─── */}
      <div
        ref={headlinesRef}
        className={`rounded-xl border border-gray-800 bg-black/80 overflow-hidden ${
          headlinesFullscreen ? 'fixed inset-0 z-[9999] rounded-none border-0 flex flex-col' : ''
        }`}
      >
        {/* Headlines Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950">
          <div className="flex items-center gap-3">
            <NewsIcon size={18} className="text-cyan-400" />
            <h4 className="text-white font-mono font-medium">News Headlines</h4>
            {!loading && (
              <span className="text-xs text-gray-600 font-mono">
                ({filteredArticles.length}{filteredArticles.length !== articles.length ? ` of ${articles.length}` : ''} articles)
              </span>
            )}
            {loading && (
              <span className="text-xs text-cyan-500 font-mono animate-pulse">Loading...</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchNews()}
              disabled={loading}
              className={`p-2 rounded-lg border border-transparent transition-all duration-200 ${
                loading
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-500 hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10'
              }`}
              title="Refresh headlines"
            >
              <RefreshIcon size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openHeadlinesInNewWindow}
              className="p-2 text-gray-500 hover:text-orange-400 rounded-lg border border-transparent hover:border-orange-500/30 hover:bg-orange-500/10 transition-all duration-200"
              title="Open headlines in new window"
            >
              <PopoutIcon size={16} />
            </button>
            <button
              onClick={handleHeadlinesFullscreen}
              className={`p-2 rounded-lg border transition-all duration-200 ${
                headlinesFullscreen
                  ? 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20'
                  : 'text-gray-500 hover:text-green-400 border-transparent hover:border-green-500/30 hover:bg-green-500/10'
              }`}
              title={headlinesFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {headlinesFullscreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
            </button>
            {headlinesFullscreen && (
              <button
                onClick={handleHeadlinesFullscreen}
                className="p-2 text-gray-400 hover:text-red-400 rounded-lg border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-200 ml-1"
                title="Exit fullscreen"
              >
                <CloseIcon size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-4 border-b border-gray-800/60 bg-gray-950/50">
          <div className="flex items-center gap-3 flex-wrap">
            <form onSubmit={handleSearch} className="flex-1 min-w-[240px] relative">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search headlines or type a topic and press Enter..."
                className="w-full pl-10 pr-20 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded hover:bg-cyan-500/20 transition-all"
              >
                Fetch
              </button>
            </form>

            <div className="relative">
              <select
                value={selectedCategory}
                onChange={e => handleCategoryChange(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all cursor-pointer"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <ChevronDownIcon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-mono whitespace-nowrap">
              <ClockIcon size={12} className="text-gray-600" />
              Updated {new Date(lastNewsRefreshTs).toLocaleTimeString()}
            </div>

          </div>
        </div>

        {/* Headlines List */}
        <div className={`p-4 space-y-3 ${headlinesFullscreen ? 'flex-1 overflow-y-auto p-6' : 'max-h-[600px] overflow-y-auto'}`}>
          {loading && articles.length === 0 && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <HeadlineSkeleton key={i} />
              ))}
            </>
          )}

          {/* Cached Content Banner */}
          {isShowingCached && !loading && articles.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg mb-3">
              <AlertCircleIcon size={16} className="text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-amber-400 text-xs font-mono">
                  Showing cached content from earlier. Fresh news unavailable.
                </span>
              </div>
              <button
                onClick={() => { lastNewsFetchParamsRef.current = ''; fetchNews(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded hover:bg-amber-500/20 transition-all flex-shrink-0"
              >
                <RefreshIcon size={12} />
                Retry
              </button>
            </div>
          )}

          {/* Provider Indicator Badge */}
          {newsProvider && !loading && articles.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono text-gray-600">Source:</span>
              <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                newsProvider === 'gateway' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                newsProvider === 'gnews' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                newsProvider === 'rss' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                newsProvider === 'client-rss' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' :
                'bg-gray-700 text-gray-400 border-gray-600'
              }`}>
                {newsProvider === 'gateway' ? 'Gateway API' :
                 newsProvider === 'gnews' ? 'GNews API' :
                 newsProvider === 'rss' ? 'RSS Feeds' :
                 newsProvider === 'client-rss' ? 'Client RSS' :
                 newsProvider || 'Unknown'}
              </span>


              {newsHealth?.cacheStatus === 'stale' && (
                <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                  Stale Cache
                </span>
              )}
            </div>
          )}

          {/* Error State with Retry */}
          {error && !loading && articles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                <AlertCircleIcon size={28} className="text-red-400" />
              </div>
              <h5 className="text-white font-mono font-medium mb-2">News Temporarily Unavailable</h5>
              <p className="text-gray-500 font-mono text-sm mb-4 max-w-md">{error}</p>
              <button
                onClick={() => { lastNewsFetchParamsRef.current = ''; fetchNews(); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
              >
                <RefreshIcon size={14} />
                Try Again
              </button>
            </div>
          )}

          {/* Empty State - No Articles */}
          {!loading && !error && filteredArticles.length === 0 && articles.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                <NewsIcon size={28} className="text-gray-600" />
              </div>
              <h5 className="text-white font-mono font-medium mb-2">News Temporarily Unavailable</h5>
              <p className="text-gray-500 font-mono text-sm mb-4 max-w-md">
                Unable to fetch news articles at this time. Please try again in a moment.
              </p>
              <button
                onClick={() => { lastNewsFetchParamsRef.current = ''; fetchNews(); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
              >
                <RefreshIcon size={14} />
                Retry
              </button>
            </div>
          )}

          {/* Empty Filtered Results */}
          {!loading && !error && filteredArticles.length === 0 && articles.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-4">
                <SearchIcon size={28} className="text-gray-600" />
              </div>
              <h5 className="text-white font-mono font-medium mb-2">No Matching Headlines</h5>
              <p className="text-gray-500 font-mono text-sm mb-4">
                No articles match your current search or category filter.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-mono text-gray-400 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-all"
              >
                Clear Filters
              </button>
            </div>
          )}



          {!error && filteredArticles.map((article, i) => (
            <div
              key={`${article.url}-${i}`}
              onClick={() => handleHeadlineNewWindow(article.url)}
              className="group flex items-start gap-4 p-4 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all cursor-pointer"
            >
              {article.thumbnail ? (
                <div className="w-16 h-12 rounded overflow-hidden flex-shrink-0 border border-gray-700">
                  <img
                    src={article.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-full h-full bg-gray-800 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg></div>';
                    }}
                  />
                </div>
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.5)] flex-shrink-0 mt-1.5" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-mono group-hover:text-cyan-400 transition-colors leading-snug">
                  {article.title}
                </p>
                {article.description && (
                  <p className="text-gray-600 text-xs font-mono mt-1 line-clamp-2 leading-relaxed">
                    {article.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-cyan-400 text-xs font-mono">{article.source}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                    categoryColors[article.category] || 'text-gray-400 border-gray-600 bg-gray-800/50'
                  }`}>
                    {article.category}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
                <span className="text-xs text-gray-600 font-mono whitespace-nowrap">
                  {formatTimeAgo(article.timestamp)}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); handleHeadlineNewWindow(article.url); }}
                  className="p-1.5 text-gray-600 hover:text-orange-400 rounded border border-transparent hover:border-orange-500/30 hover:bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Open in new window"
                >
                  <PopoutIcon size={14} />
                </button>
                <ExternalLinkIcon size={14} className="text-gray-700 group-hover:text-cyan-500 transition-colors" />
              </div>
            </div>
          ))}

          {loading && articles.length > 0 && (
            <div className="flex items-center justify-center py-4 gap-3">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-cyan-400 font-mono">Refreshing headlines...</span>
            </div>
          )}
        </div>

        {headlinesFullscreen && (
          <div className="px-6 py-3 border-t border-gray-800 bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-600 font-mono">
                Showing {filteredArticles.length} of {articles.length} headlines
              </span>
              <CountdownDisplay lastTimestamp={lastNewsRefreshTs} intervalMs={NEWS_REFRESH_MS} label="Auto-refresh in" />

            </div>
            <button
              onClick={handleHeadlinesFullscreen}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/30 rounded-lg transition-all"
            >
              <MinimizeIcon size={14} />
              Exit Fullscreen
            </button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-gray-800/50 bg-gray-950/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-gray-600 flex-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-xs font-mono">
              <span className="text-gray-500">Tips:</span> Stream IDs are <span className="text-emerald-400">auto-detected every 30 minutes</span> via YouTube Data API v3. Click{' '}
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <RadarIcon size={12} />
                Auto-detect streams
              </span>{' '}
              to scan immediately. Click{' '}
              <span className="inline-flex items-center gap-1 text-cyan-400">
                <SettingsIcon size={12} />
                Manage Channels
              </span>{' '}
              to add custom YouTube channels, hide/show feeds, or remove channels. Hover over any feed to reveal controls.
              Click{' '}
              <span className="inline-flex items-center gap-1 text-purple-400">
                <PipIcon size={12} />
                PiP
              </span>{' '}
              to float a feed. Click{' '}
              <span className="inline-flex items-center gap-1 text-yellow-400">
                <EditIcon size={12} />
              </span>{' '}
              to manually override a stream's video ID.
            </p>
          </div>
          {/* News Settings Button */}
          <button
            onClick={() => setShowNewsSettings(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-gray-400 border border-gray-700 rounded-lg hover:text-cyan-400 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-all ml-4 flex-shrink-0"
            title="News Feed Settings"
          >
            <SettingsIcon size={14} />
            Settings
          </button>
        </div>
      </div>

      {/* News Settings Panel Modal */}
      <NewsSettingsPanel
        isOpen={showNewsSettings}
        onClose={() => setShowNewsSettings(false)}
        onPreferencesChange={handlePreferencesChange}
      />
    </div>
  );
};

export default NewsFeedTab;
