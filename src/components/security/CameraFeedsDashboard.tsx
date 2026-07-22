import React, { useState, useEffect, useCallback, useRef } from 'react';

// Inline SVG Icons
const CameraIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
);
const VideoIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
);
const MaximizeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
);
const MinimizeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
);
const LockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const UnlockIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
);
const DoorIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" /><circle cx="15.5" cy="12" r="1" /></svg>
);
const AlertIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);
const ShieldIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
const UserIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const RefreshIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
);
const GridIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
);

interface CameraFeed {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'recording' | 'motion';
  resolution: string;
  fps: number;
  lastMotion: Date | null;
  ptzEnabled: boolean;
  nightVision: boolean;
  recording: boolean;
}

interface AccessPoint {
  id: string;
  name: string;
  location: string;
  type: 'door' | 'gate' | 'turnstile' | 'elevator' | 'garage';
  status: 'locked' | 'unlocked' | 'alarm' | 'maintenance';
  lastAccess: Date | null;
  lastAccessBy: string | null;
  accessLevel: 'public' | 'employee' | 'restricted' | 'top-secret';
  cardReaderOnline: boolean;
  biometricEnabled: boolean;
  accessCount24h: number;
  deniedCount24h: number;
}

interface AccessEvent {
  id: string;
  pointId: string;
  pointName: string;
  userName: string;
  action: 'granted' | 'denied' | 'forced' | 'tailgate';
  method: 'card' | 'biometric' | 'pin' | 'remote';
  timestamp: Date;
}

const CAMERAS: CameraFeed[] = [
  { id: 'cam-01', name: 'CAM-01', location: 'Main Entrance', status: 'recording', resolution: '4K', fps: 30, lastMotion: new Date(Date.now() - 45000), ptzEnabled: true, nightVision: true, recording: true },
  { id: 'cam-02', name: 'CAM-02', location: 'Parking Lot A', status: 'recording', resolution: '1080p', fps: 24, lastMotion: new Date(Date.now() - 120000), ptzEnabled: true, nightVision: true, recording: true },
  { id: 'cam-03', name: 'CAM-03', location: 'Server Room', status: 'recording', resolution: '4K', fps: 30, lastMotion: null, ptzEnabled: false, nightVision: true, recording: true },
  { id: 'cam-04', name: 'CAM-04', location: 'Loading Dock', status: 'motion', resolution: '1080p', fps: 24, lastMotion: new Date(Date.now() - 5000), ptzEnabled: true, nightVision: true, recording: true },
  { id: 'cam-05', name: 'CAM-05', location: 'Lobby', status: 'recording', resolution: '4K', fps: 30, lastMotion: new Date(Date.now() - 300000), ptzEnabled: true, nightVision: false, recording: true },
  { id: 'cam-06', name: 'CAM-06', location: 'Rear Exit', status: 'online', resolution: '1080p', fps: 24, lastMotion: new Date(Date.now() - 600000), ptzEnabled: false, nightVision: true, recording: false },
  { id: 'cam-07', name: 'CAM-07', location: 'Stairwell B', status: 'recording', resolution: '720p', fps: 15, lastMotion: null, ptzEnabled: false, nightVision: true, recording: true },
  { id: 'cam-08', name: 'CAM-08', location: 'Perimeter North', status: 'offline', resolution: '1080p', fps: 24, lastMotion: null, ptzEnabled: true, nightVision: true, recording: false },
];

const ACCESS_POINTS: AccessPoint[] = [
  { id: 'ap-01', name: 'Main Entrance', location: 'Building A - Ground Floor', type: 'door', status: 'locked', lastAccess: new Date(Date.now() - 30000), lastAccessBy: 'Sarah Chen', accessLevel: 'employee', cardReaderOnline: true, biometricEnabled: true, accessCount24h: 247, deniedCount24h: 3 },
  { id: 'ap-02', name: 'Server Room', location: 'Building A - Floor 2', type: 'door', status: 'locked', lastAccess: new Date(Date.now() - 3600000), lastAccessBy: 'Mike Torres', accessLevel: 'top-secret', cardReaderOnline: true, biometricEnabled: true, accessCount24h: 12, deniedCount24h: 1 },
  { id: 'ap-03', name: 'Parking Gate A', location: 'Parking Structure', type: 'gate', status: 'locked', lastAccess: new Date(Date.now() - 60000), lastAccessBy: 'Vehicle #A-4521', accessLevel: 'employee', cardReaderOnline: true, biometricEnabled: false, accessCount24h: 189, deniedCount24h: 7 },
  { id: 'ap-04', name: 'Executive Suite', location: 'Building A - Floor 5', type: 'door', status: 'locked', lastAccess: new Date(Date.now() - 7200000), lastAccessBy: 'Director Williams', accessLevel: 'restricted', cardReaderOnline: true, biometricEnabled: true, accessCount24h: 34, deniedCount24h: 0 },
  { id: 'ap-05', name: 'Lobby Turnstile 1', location: 'Building A - Ground Floor', type: 'turnstile', status: 'unlocked', lastAccess: new Date(Date.now() - 15000), lastAccessBy: 'Visitor Badge #V-102', accessLevel: 'public', cardReaderOnline: true, biometricEnabled: false, accessCount24h: 412, deniedCount24h: 11 },
  { id: 'ap-06', name: 'Freight Elevator', location: 'Building B - Basement', type: 'elevator', status: 'locked', lastAccess: new Date(Date.now() - 1800000), lastAccessBy: 'Maintenance Team', accessLevel: 'restricted', cardReaderOnline: true, biometricEnabled: false, accessCount24h: 28, deniedCount24h: 2 },
  { id: 'ap-07', name: 'Underground Garage', location: 'Building B - Sub-Level', type: 'garage', status: 'locked', lastAccess: new Date(Date.now() - 300000), lastAccessBy: 'Vehicle #B-7832', accessLevel: 'employee', cardReaderOnline: true, biometricEnabled: false, accessCount24h: 156, deniedCount24h: 4 },
  { id: 'ap-08', name: 'Lab Access', location: 'Building C - Floor 3', type: 'door', status: 'alarm', lastAccess: new Date(Date.now() - 120000), lastAccessBy: 'FORCED ENTRY ATTEMPT', accessLevel: 'top-secret', cardReaderOnline: true, biometricEnabled: true, accessCount24h: 8, deniedCount24h: 3 },
];

const generateAccessEvents = (): AccessEvent[] => {
  const names = ['Sarah Chen', 'Mike Torres', 'Emily Davis', 'James Wilson', 'Alex Kim', 'Visitor #V-102', 'Maria Lopez', 'David Park'];
  const methods: Array<'card' | 'biometric' | 'pin' | 'remote'> = ['card', 'biometric', 'pin', 'remote'];
  const actions: Array<'granted' | 'denied' | 'forced' | 'tailgate'> = ['granted', 'granted', 'granted', 'granted', 'granted', 'denied', 'denied', 'tailgate'];
  
  return Array.from({ length: 15 }, (_, i) => ({
    id: `evt-${i}`,
    pointId: ACCESS_POINTS[Math.floor(Math.random() * ACCESS_POINTS.length)].id,
    pointName: ACCESS_POINTS[Math.floor(Math.random() * ACCESS_POINTS.length)].name,
    userName: names[Math.floor(Math.random() * names.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    method: methods[Math.floor(Math.random() * methods.length)],
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
  })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const CameraFeedsDashboard: React.FC = () => {
  const [cameras, setCameras] = useState<CameraFeed[]>(CAMERAS);
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>(ACCESS_POINTS);
  const [accessEvents, setAccessEvents] = useState<AccessEvent[]>(generateAccessEvents());
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [cameraGridCols, setCameraGridCols] = useState(4);
  const [showAccessLog, setShowAccessLog] = useState(false);
  const [scanLines, setScanLines] = useState<Record<string, number>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  // Simulate camera feed noise/scan lines
  useEffect(() => {
    const interval = setInterval(() => {
      setCameras(prev => prev.map(cam => {
        if (cam.status === 'offline') return cam;
        const rand = Math.random();
        return {
          ...cam,
          status: cam.id === 'cam-04' && rand > 0.7 ? 'motion' : cam.status === 'motion' && rand > 0.5 ? 'recording' : cam.status,
          lastMotion: cam.status === 'motion' ? new Date() : cam.lastMotion,
        };
      }));
      
      // Simulate new access events
      if (Math.random() > 0.6) {
        const names = ['Sarah Chen', 'Mike Torres', 'Emily Davis', 'James Wilson', 'Alex Kim'];
        const methods: Array<'card' | 'biometric' | 'pin' | 'remote'> = ['card', 'biometric', 'pin', 'remote'];
        const ap = ACCESS_POINTS[Math.floor(Math.random() * ACCESS_POINTS.length)];
        const newEvent: AccessEvent = {
          id: `evt-${Date.now()}`,
          pointId: ap.id,
          pointName: ap.name,
          userName: names[Math.floor(Math.random() * names.length)],
          action: Math.random() > 0.15 ? 'granted' : 'denied',
          method: methods[Math.floor(Math.random() * methods.length)],
          timestamp: new Date(),
        };
        setAccessEvents(prev => [newEvent, ...prev].slice(0, 30));
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Draw camera feed simulation on canvas
  useEffect(() => {
    const drawFeed = () => {
      Object.entries(canvasRefs.current).forEach(([camId, canvas]) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const cam = cameras.find(c => c.id === camId);
        if (!cam) return;

        const w = canvas.width;
        const h = canvas.height;

        if (cam.status === 'offline') {
          ctx.fillStyle = '#111';
          ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#333';
          ctx.font = '14px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('NO SIGNAL', w / 2, h / 2);
          return;
        }

        // Dark background with noise
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        // Simulated scene - different for each camera
        const hue = parseInt(camId.replace('cam-', '')) * 30;
        
        // Floor/ground
        ctx.fillStyle = `hsl(${hue}, 5%, 8%)`;
        ctx.fillRect(0, h * 0.6, w, h * 0.4);
        
        // Walls
        ctx.fillStyle = `hsl(${hue}, 5%, 12%)`;
        ctx.fillRect(0, 0, w, h * 0.6);

        // Some structural elements
        ctx.strokeStyle = `hsl(${hue}, 10%, 18%)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const x = (w / 5) * (i + 1);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h * 0.6);
          ctx.stroke();
        }

        // Horizon line
        ctx.strokeStyle = `hsl(${hue}, 10%, 15%)`;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.6);
        ctx.lineTo(w, h * 0.6);
        ctx.stroke();

        // Grid lines on floor (perspective)
        ctx.strokeStyle = `hsl(${hue}, 5%, 12%)`;
        for (let i = 0; i < 6; i++) {
          const y = h * 0.6 + (h * 0.4 / 6) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }

        // Random noise pixels
        for (let i = 0; i < 50; i++) {
          const x = Math.random() * w;
          const y = Math.random() * h;
          const brightness = Math.random() * 30;
          ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, 0.5)`;
          ctx.fillRect(x, y, 1, 1);
        }

        // Motion detection highlight
        if (cam.status === 'motion') {
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
          ctx.lineWidth = 2;
          const mx = w * 0.3 + Math.random() * w * 0.4;
          const my = h * 0.3 + Math.random() * h * 0.3;
          ctx.strokeRect(mx - 30, my - 40, 60, 80);
          
          ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
          ctx.fillRect(mx - 30, my - 40, 60, 80);
        }

        // Scan line effect
        const scanY = (Date.now() / 20) % h;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(w, scanY);
        ctx.stroke();

        // Timestamp overlay
        const now = new Date();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, h - 22, w, 22);
        ctx.fillStyle = '#ff9900';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${cam.name} | ${cam.location}`, 6, h - 8);
        ctx.textAlign = 'right';
        ctx.fillText(now.toLocaleTimeString(), w - 6, h - 8);

        // REC indicator
        if (cam.recording) {
          const blink = Math.floor(Date.now() / 500) % 2 === 0;
          if (blink) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(14, 14, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#ff0000';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText('REC', 22, 18);
        }

        // Resolution badge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(w - 45, 4, 41, 16);
        ctx.fillStyle = '#888';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(cam.resolution, w - 6, 15);
      });
    };

    const animFrame = setInterval(drawFeed, 100);
    return () => clearInterval(animFrame);
  }, [cameras]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': case 'recording': return { dot: 'bg-green-400', text: 'text-green-400', glow: 'shadow-[0_0_6px_rgba(0,255,0,0.8)]' };
      case 'motion': return { dot: 'bg-red-400 animate-pulse', text: 'text-red-400', glow: 'shadow-[0_0_8px_rgba(255,0,0,0.8)]' };
      case 'offline': return { dot: 'bg-gray-600', text: 'text-gray-500', glow: '' };
      default: return { dot: 'bg-gray-500', text: 'text-gray-400', glow: '' };
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'public': return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' };
      case 'employee': return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
      case 'restricted': return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' };
      case 'top-secret': return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
      default: return { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' };
    }
  };

  const getAccessPointStatusColor = (status: string) => {
    switch (status) {
      case 'locked': return { bg: 'border-green-500/30', icon: 'text-green-400', label: 'LOCKED', labelBg: 'bg-green-500/10 text-green-400 border-green-500/30' };
      case 'unlocked': return { bg: 'border-yellow-500/30', icon: 'text-yellow-400', label: 'UNLOCKED', labelBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
      case 'alarm': return { bg: 'border-red-500/50', icon: 'text-red-400', label: 'ALARM', labelBg: 'bg-red-500/20 text-red-400 border-red-500/50' };
      case 'maintenance': return { bg: 'border-purple-500/30', icon: 'text-purple-400', label: 'MAINT', labelBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      default: return { bg: 'border-gray-700', icon: 'text-gray-400', label: 'UNKNOWN', labelBg: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'door': return DoorIcon;
      case 'gate': return ShieldIcon;
      case 'turnstile': return UserIcon;
      case 'elevator': return GridIcon;
      case 'garage': return DoorIcon;
      default: return DoorIcon;
    }
  };

  const handleToggleLock = (pointId: string) => {
    setAccessPoints(prev => prev.map(ap => {
      if (ap.id !== pointId) return ap;
      if (ap.status === 'alarm') return ap; // Can't toggle alarm state
      return { ...ap, status: ap.status === 'locked' ? 'unlocked' : 'locked' };
    }));
  };

  const handleLockdown = () => {
    setAccessPoints(prev => prev.map(ap => ({
      ...ap,
      status: ap.status === 'alarm' ? 'alarm' : 'locked',
    })));
  };

  const handleDismissAlarm = (pointId: string) => {
    setAccessPoints(prev => prev.map(ap => {
      if (ap.id !== pointId) return ap;
      return { ...ap, status: 'locked' };
    }));
  };

  const formatTimeSince = (date: Date | null): string => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const onlineCams = cameras.filter(c => c.status !== 'offline').length;
  const motionCams = cameras.filter(c => c.status === 'motion').length;
  const alarmPoints = accessPoints.filter(ap => ap.status === 'alarm').length;
  const unlockedPoints = accessPoints.filter(ap => ap.status === 'unlocked').length;
  const totalAccess24h = accessPoints.reduce((sum, ap) => sum + ap.accessCount24h, 0);
  const totalDenied24h = accessPoints.reduce((sum, ap) => sum + ap.deniedCount24h, 0);

  return (
    <div className="space-y-6">
      {/* ═══ CAMERA FEEDS ═══ */}
      <div className="rounded-xl border border-orange-500/30 bg-black overflow-hidden" style={{ boxShadow: '0 0 25px rgba(255,153,0,0.1)' }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,153,0,0.2)', background: 'linear-gradient(to right, rgba(255,100,0,0.08), transparent, rgba(255,100,0,0.08))' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-orange-500/20 rounded-lg blur-md" />
              <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/50 flex items-center justify-center">
                <VideoIcon size={18} className="text-orange-400" />
              </div>
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-sm">Surveillance Camera Feeds</h3>
              <p className="text-gray-500 font-mono text-[10px]">{onlineCams}/{cameras.length} cameras online {motionCams > 0 && <span className="text-red-400 animate-pulse">| {motionCams} motion detected</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[2, 4, 6].map(cols => (
              <button
                key={cols}
                onClick={() => setCameraGridCols(cols)}
                className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${cameraGridCols === cols ? 'bg-orange-500/15 border-orange-500/40 text-orange-400' : 'border-gray-800 text-gray-600 hover:text-gray-400'}`}
              >
                {cols}x
              </button>
            ))}
          </div>
        </div>

        {/* Camera Grid */}
        <div className={`grid gap-1 p-1`} style={{ gridTemplateColumns: `repeat(${selectedCamera ? 1 : cameraGridCols}, 1fr)` }}>
          {(selectedCamera ? cameras.filter(c => c.id === selectedCamera) : cameras).map(cam => {
            const sc = getStatusColor(cam.status);
            return (
              <div key={cam.id} className="relative group bg-black rounded overflow-hidden" style={{ border: cam.status === 'motion' ? '1px solid rgba(255,0,0,0.5)' : '1px solid rgba(50,50,50,0.5)' }}>
                {/* Canvas feed */}
                <canvas
                  ref={el => { canvasRefs.current[cam.id] = el; }}
                  width={selectedCamera ? 800 : 320}
                  height={selectedCamera ? 450 : 180}
                  className="w-full h-auto"
                />

                {/* Status overlay */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${sc.dot} ${sc.glow}`} />
                  <span className={`text-[9px] font-mono font-bold uppercase ${sc.text}`}>{cam.status}</span>
                </div>

                {/* Motion alert */}
                {cam.status === 'motion' && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 border border-red-500/50 rounded animate-pulse">
                    <AlertIcon size={10} className="text-red-400" />
                    <span className="text-[9px] font-mono font-bold text-red-400">MOTION</span>
                  </div>
                )}

                {/* Hover controls */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setSelectedCamera(selectedCamera === cam.id ? null : cam.id)}
                    className="p-2 bg-black/60 border border-orange-500/40 rounded-lg text-orange-400 hover:bg-orange-500/20 transition-all"
                  >
                    {selectedCamera === cam.id ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
                  </button>
                </div>

                {/* PTZ / Night Vision badges */}
                {!selectedCamera && (
                  <div className="absolute bottom-6 left-1 flex gap-1">
                    {cam.ptzEnabled && <span className="px-1 py-0.5 bg-black/60 rounded text-[8px] font-mono text-cyan-400 border border-cyan-500/30">PTZ</span>}
                    {cam.nightVision && <span className="px-1 py-0.5 bg-black/60 rounded text-[8px] font-mono text-green-400 border border-green-500/30">NV</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ PHYSICAL ACCESS CONTROLS ═══ */}
      <div className="rounded-xl border border-orange-500/30 bg-black overflow-hidden" style={{ boxShadow: '0 0 25px rgba(255,153,0,0.1)' }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,153,0,0.2)', background: 'linear-gradient(to right, rgba(255,100,0,0.08), transparent, rgba(255,100,0,0.08))' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-orange-500/20 rounded-lg blur-md" />
              <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/50 flex items-center justify-center">
                <LockIcon size={18} className="text-orange-400" />
              </div>
            </div>
            <div>
              <h3 className="text-white font-mono font-bold text-sm">Physical Access Controls</h3>
              <p className="text-gray-500 font-mono text-[10px]">
                {accessPoints.length} access points
                {alarmPoints > 0 && <span className="text-red-400 animate-pulse ml-2">| {alarmPoints} ALARM</span>}
                {unlockedPoints > 0 && <span className="text-yellow-400 ml-2">| {unlockedPoints} unlocked</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAccessLog(!showAccessLog)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs border transition-all ${showAccessLog ? 'bg-orange-500/15 border-orange-500/40 text-orange-400' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}
            >
              Access Log
            </button>
            <button
              onClick={handleLockdown}
              className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25 transition-all"
            >
              LOCKDOWN ALL
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,153,0,0.1)' }}>
          <div className="text-center p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
            <p className="text-xl font-mono font-bold text-green-400">{accessPoints.filter(ap => ap.status === 'locked').length}</p>
            <p className="text-[9px] font-mono text-gray-500 uppercase">Secured</p>
          </div>
          <div className="text-center p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
            <p className="text-xl font-mono font-bold text-yellow-400">{unlockedPoints}</p>
            <p className="text-[9px] font-mono text-gray-500 uppercase">Unlocked</p>
          </div>
          <div className="text-center p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
            <p className="text-xl font-mono font-bold text-cyan-400">{totalAccess24h}</p>
            <p className="text-[9px] font-mono text-gray-500 uppercase">Access 24h</p>
          </div>
          <div className="text-center p-2 bg-gray-900/50 border border-gray-800 rounded-lg">
            <p className="text-xl font-mono font-bold text-red-400">{totalDenied24h}</p>
            <p className="text-[9px] font-mono text-gray-500 uppercase">Denied 24h</p>
          </div>
        </div>

        {/* Access Points Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 p-4">
          {accessPoints.map(ap => {
            const sc = getAccessPointStatusColor(ap.status);
            const lc = getAccessLevelColor(ap.accessLevel);
            const TypeIcon = getTypeIcon(ap.type);
            const isAlarm = ap.status === 'alarm';

            return (
              <div
                key={ap.id}
                className={`relative rounded-xl border bg-black/80 p-4 transition-all ${sc.bg} ${isAlarm ? 'animate-pulse' : 'hover:shadow-lg'}`}
                style={isAlarm ? { boxShadow: '0 0 20px rgba(255,0,0,0.2)' } : {}}
              >
                {/* Alarm flash overlay */}
                {isAlarm && (
                  <div className="absolute inset-0 rounded-xl bg-red-500/5 animate-pulse pointer-events-none" />
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isAlarm ? 'bg-red-500/20 border-red-500/50' : 'bg-gray-900 border-gray-800'}`}>
                      {ap.status === 'locked' ? <LockIcon size={16} className={sc.icon} /> : ap.status === 'unlocked' ? <UnlockIcon size={16} className={sc.icon} /> : ap.status === 'alarm' ? <AlertIcon size={16} className="text-red-400" /> : <TypeIcon size={16} className={sc.icon} />}
                    </div>
                    <div>
                      <h5 className="text-white font-mono text-xs font-bold">{ap.name}</h5>
                      <p className="text-gray-600 font-mono text-[9px]">{ap.location}</p>
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${sc.labelBg}`}>{sc.label}</span>
                </div>

                {/* Access level + type */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${lc.bg} ${lc.text} ${lc.border}`}>
                    {ap.accessLevel.toUpperCase()}
                  </span>
                  <span className="text-[8px] font-mono text-gray-600">{ap.type}</span>
                  {ap.biometricEnabled && <span className="px-1 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-[8px] font-mono text-purple-400">BIO</span>}
                  {ap.cardReaderOnline && <span className="px-1 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[8px] font-mono text-cyan-400">RFID</span>}
                </div>

                {/* Last access */}
                <div className="text-[10px] font-mono text-gray-500 mb-3">
                  <span className="text-gray-600">Last:</span> {ap.lastAccessBy || 'None'} <span className="text-gray-700">&middot;</span> {formatTimeSince(ap.lastAccess)}
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-[9px] text-gray-600 font-mono">Access</span>
                      <p className="text-xs font-mono font-bold text-cyan-400">{ap.accessCount24h}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-600 font-mono">Denied</span>
                      <p className="text-xs font-mono font-bold text-red-400">{ap.deniedCount24h}</p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  {isAlarm ? (
                    <button
                      onClick={() => handleDismissAlarm(ap.id)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-all"
                    >
                      DISMISS ALARM
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleLock(ap.id)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                        ap.status === 'locked'
                          ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                          : 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                      }`}
                    >
                      {ap.status === 'locked' ? 'UNLOCK' : 'LOCK'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Access Log */}
        {showAccessLog && (
          <div className="p-4" style={{ borderTop: '1px solid rgba(255,153,0,0.15)' }}>
            <h4 className="text-white font-mono font-bold text-sm mb-3 flex items-center gap-2">
              <UserIcon size={16} className="text-orange-400" />
              Live Access Log
            </h4>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto darkwave-scrollbar">
              {accessEvents.map(evt => (
                <div
                  key={evt.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                    evt.action === 'granted' ? 'bg-green-500/5 border-green-500/15' :
                    evt.action === 'denied' ? 'bg-red-500/5 border-red-500/15' :
                    evt.action === 'tailgate' ? 'bg-yellow-500/5 border-yellow-500/15' :
                    'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    evt.action === 'granted' ? 'bg-green-400' :
                    evt.action === 'denied' ? 'bg-red-400' :
                    evt.action === 'tailgate' ? 'bg-yellow-400' :
                    'bg-red-500 animate-pulse'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-xs font-medium">{evt.userName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border ${
                        evt.action === 'granted' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                        evt.action === 'denied' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                        evt.action === 'tailgate' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                        'bg-red-500/20 text-red-400 border-red-500/50'
                      }`}>{evt.action.toUpperCase()}</span>
                      <span className="px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded text-[8px] font-mono text-gray-500">{evt.method}</span>
                    </div>
                    <p className="text-[10px] font-mono text-gray-600">{evt.pointName}</p>
                  </div>
                  <span className="text-[10px] font-mono text-gray-600 flex-shrink-0">{evt.timestamp.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraFeedsDashboard;
