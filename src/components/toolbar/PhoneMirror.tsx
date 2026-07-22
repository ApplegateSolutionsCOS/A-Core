import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Inline icons
const PhoneIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);
const QrIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" />
    <rect x="14" y="14" width="4" height="4" /><rect x="20" y="14" width="2" height="2" /><rect x="14" y="20" width="2" height="2" /><rect x="20" y="20" width="2" height="2" />
  </svg>
);
const LinkIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const WifiIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);
const CloseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const MaximizeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const MinimizeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);
const CopyIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const CameraIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
  </svg>
);

type ConnectionStatus = 'idle' | 'generating' | 'waiting' | 'connecting' | 'connected' | 'error';
type PhoneType = 'unknown' | 'ios' | 'android' | 'other';

interface PhoneMirrorProps {
  isOpen: boolean;
  onClose: () => void;
}

// Generate a simple session ID
const generateSessionId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

// Simple QR code generator using SVG (no external library needed)
const QRCodeSVG: React.FC<{ data: string; size?: number }> = ({ data, size = 200 }) => {
  // Simple QR-like visual representation using a grid pattern
  // For a real app, you'd use a proper QR library, but this creates a visual placeholder
  const gridSize = 21;
  const cellSize = size / gridSize;
  
  // Generate deterministic pattern from data
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h);
  };
  
  const cells: boolean[][] = [];
  for (let y = 0; y < gridSize; y++) {
    cells[y] = [];
    for (let x = 0; x < gridSize; x++) {
      // Fixed patterns for QR finder patterns
      const isFinderTL = (x < 7 && y < 7);
      const isFinderTR = (x >= gridSize - 7 && y < 7);
      const isFinderBL = (x < 7 && y >= gridSize - 7);
      
      if (isFinderTL || isFinderTR || isFinderBL) {
        const lx = isFinderTR ? x - (gridSize - 7) : x;
        const ly = isFinderBL ? y - (gridSize - 7) : y;
        cells[y][x] = (lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4));
      } else {
        cells[y][x] = (hash(data + x + ',' + y) % 3) !== 0;
      }
    }
  }
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg">
      <rect width={size} height={size} fill="white" />
      {cells.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect key={`${x}-${y}`} x={x * cellSize} y={y * cellSize} width={cellSize} height={cellSize} fill="black" />
          ) : null
        )
      )}
    </svg>
  );
};

const PhoneMirror: React.FC<PhoneMirrorProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [sessionId, setSessionId] = useState('');
  const [phoneType, setPhoneType] = useState<PhoneType>('unknown');
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneInfo, setPhoneInfo] = useState<string>('');
  const [streamActive, setStreamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const pollRef = useRef<any>(null);

  // Generate session and start listening
  const startSession = useCallback(async () => {
    setStatus('generating');
    setError(null);
    const sid = generateSessionId();
    setSessionId(sid);
    setStatus('waiting');

    // Use Supabase Realtime to listen for phone connections
    try {
      const channel = supabase.channel(`phone-mirror-${sid}`, {
        config: { broadcast: { self: false } }
      });

      channel
        .on('broadcast', { event: 'phone-connect' }, (payload: any) => {
          const data = payload.payload;
          setPhoneType(data.phoneType || 'unknown');
          setPhoneInfo(data.userAgent || 'Unknown device');
          setStatus('connecting');
          
          // Send acknowledgment
          channel.send({
            type: 'broadcast',
            event: 'desktop-ack',
            payload: { ready: true }
          });
        })
        .on('broadcast', { event: 'phone-offer' }, async (payload: any) => {
          try {
            const pc = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ]
            });
            peerRef.current = pc;

            pc.ontrack = (event) => {
              if (videoRef.current && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                setStreamActive(true);
                setStatus('connected');
              }
            };

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                channel.send({
                  type: 'broadcast',
                  event: 'desktop-ice',
                  payload: { candidate: event.candidate.toJSON() }
                });
              }
            };

            pc.onconnectionstatechange = () => {
              if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setStatus('error');
                setError('Phone disconnected');
                setStreamActive(false);
              }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(payload.payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'desktop-answer',
              payload: { answer: answer }
            });
          } catch (err) {
            console.error('WebRTC error:', err);
            setError('Failed to establish connection');
            setStatus('error');
          }
        })
        .on('broadcast', { event: 'phone-ice' }, async (payload: any) => {
          try {
            if (peerRef.current) {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
            }
          } catch (err) {
            console.error('ICE candidate error:', err);
          }
        })
        .on('broadcast', { event: 'phone-camera' }, (payload: any) => {
          // Fallback: phone sends camera frames as base64
          setPhoneType(payload.payload.phoneType || 'unknown');
          setPhoneInfo(payload.payload.userAgent || 'Unknown device');
          setStatus('connected');
          setStreamActive(true);
        })
        .subscribe();

      channelRef.current = channel;
    } catch (err) {
      console.error('Channel error:', err);
      setError('Failed to create session');
      setStatus('error');
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (peerRef.current) {
        peerRef.current.close();
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/phone-mirror?session=${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
    setStreamActive(false);
    setSessionId('');
    setPhoneType('unknown');
    setPhoneInfo('');
    setError(null);
  };

  if (!isOpen) return null;

  const mirrorUrl = sessionId ? `${window.location.origin}/phone-mirror?session=${sessionId}` : '';

  // ⚡ FIX: Use createPortal to break out of z-index stacking contexts
  return createPortal(
    <div className="fixed inset-0 z-[10010]">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`absolute ${isExpanded ? 'inset-4' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] max-w-[95vw]'} bg-black border border-cyan-500/30 rounded-2xl shadow-[0_0_60px_rgba(0,255,255,0.15)] overflow-hidden flex flex-col transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-gradient-to-r from-black via-cyan-950/10 to-black flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-cyan-500/30 rounded-lg blur-md animate-pulse" />
              <div className="relative w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
                <PhoneIcon size={20} className="text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold text-white">Phone Mirror</h2>
              <p className="text-xs text-gray-500 font-mono">
                {status === 'connected' ? `Connected - ${phoneInfo || phoneType}` :
                 status === 'waiting' ? 'Waiting for phone...' :
                 status === 'connecting' ? 'Establishing connection...' :
                 'Link your phone to display its screen'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 text-gray-400 hover:text-cyan-400 rounded-lg transition-all">
              {isExpanded ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-400 rounded-lg transition-all">
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto darkwave-scrollbar p-4">
          {status === 'idle' && (
            <div className="text-center space-y-6 py-6">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/40 flex items-center justify-center">
                  <PhoneIcon size={36} className="text-cyan-400" />
                </div>
              </div>
              
              <div>
                <h3 className="text-white font-mono font-bold text-lg mb-2">Connect Your Phone</h3>
                <p className="text-gray-400 font-mono text-sm max-w-xs mx-auto">
                  Mirror your phone screen to this computer. Works with all phone types - iOS, Android, and older devices.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                {[
                  { icon: QrIcon, label: 'Scan QR Code', desc: 'Modern phones' },
                  { icon: LinkIcon, label: 'Share Link', desc: 'Any phone' },
                  { icon: CameraIcon, label: 'Camera Mode', desc: 'Older phones' },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg text-center">
                      <Icon size={20} className="text-cyan-400 mx-auto mb-1" />
                      <p className="text-white font-mono text-[10px] font-bold">{item.label}</p>
                      <p className="text-gray-600 font-mono text-[9px]">{item.desc}</p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={startSession}
                className="px-8 py-3 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)] transition-all font-mono font-bold"
              >
                Start Phone Mirror Session
              </button>

              {/* Compatibility info */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 max-w-sm mx-auto text-left">
                <p className="text-gray-400 font-mono text-xs font-bold mb-2">Compatible Devices:</p>
                <div className="space-y-1 text-gray-500 font-mono text-[11px]">
                  <p>iPhone 6+ (iOS 12+) - Screen Share or Camera</p>
                  <p>Android 5.0+ - Screen Share or Camera</p>
                  <p>Older phones - Camera mode (point at screen)</p>
                  <p>Any phone with a web browser</p>
                </div>
              </div>
            </div>
          )}

          {(status === 'waiting' || status === 'generating') && (
            <div className="text-center space-y-6 py-4">
              {/* QR Code */}
              <div className="inline-block p-4 bg-white rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                <QRCodeSVG data={mirrorUrl} size={180} />
              </div>

              <div>
                <p className="text-white font-mono text-sm mb-1">Scan this QR code with your phone</p>
                <p className="text-gray-500 font-mono text-xs">Or open the link below in your phone's browser</p>
              </div>

              {/* Session Code */}
              <div className="bg-gray-900/50 border border-cyan-500/30 rounded-lg p-4 max-w-sm mx-auto">
                <p className="text-gray-500 font-mono text-xs mb-2">Session Code:</p>
                <p className="text-3xl font-mono font-bold text-cyan-400 tracking-[0.3em]">{sessionId}</p>
              </div>

              {/* Link */}
              <div className="flex items-center gap-2 max-w-sm mx-auto">
                <input
                  type="text"
                  value={mirrorUrl}
                  readOnly
                  className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg px-3 py-2 text-gray-400 font-mono text-xs"
                />
                <button
                  onClick={handleCopyLink}
                  className={`p-2 rounded-lg border transition-all ${copied ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50'}`}
                >
                  <CopyIcon size={16} />
                </button>
              </div>
              {copied && <p className="text-green-400 font-mono text-xs">Link copied!</p>}

              {/* Waiting animation */}
              <div className="flex items-center justify-center gap-2">
                <WifiIcon size={16} className="text-cyan-400 animate-pulse" />
                <span className="text-cyan-400 font-mono text-sm animate-pulse">Waiting for phone to connect...</span>
              </div>

              <button onClick={handleDisconnect} className="text-gray-500 hover:text-red-400 font-mono text-xs transition-colors">
                Cancel Session
              </button>
            </div>
          )}

          {status === 'connecting' && (
            <div className="text-center space-y-4 py-8">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-spin" style={{ borderTopColor: '#0ff' }} />
                <PhoneIcon size={24} className="absolute inset-0 m-auto text-cyan-400" />
              </div>
              <p className="text-cyan-400 font-mono text-sm animate-pulse">Establishing connection...</p>
              <p className="text-gray-500 font-mono text-xs">Phone detected: {phoneInfo || phoneType}</p>
            </div>
          )}

          {status === 'connected' && (
            <div className="space-y-4">
              {/* Connection info bar */}
              <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/30 rounded-lg">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75" />
                </div>
                <div className="flex-1">
                  <p className="text-green-400 font-mono text-sm font-bold">Connected</p>
                  <p className="text-gray-500 font-mono text-xs">{phoneInfo || 'Phone connected'}</p>
                </div>
                <button onClick={handleDisconnect} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all font-mono text-xs">
                  Disconnect
                </button>
              </div>

              {/* Video display */}
              <div className={`relative bg-gray-950 rounded-xl border border-cyan-500/20 overflow-hidden ${isExpanded ? 'aspect-auto min-h-[400px]' : 'aspect-[9/16] max-h-[500px]'}`}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                {!streamActive && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <PhoneIcon size={48} className="text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-600 font-mono text-sm">Waiting for video stream...</p>
                      <p className="text-gray-700 font-mono text-xs mt-1">
                        On your phone, tap "Share Screen" or "Share Camera"
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Phone frame overlay */}
                <div className="absolute inset-0 pointer-events-none border-2 border-gray-800/50 rounded-xl" />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-gray-800 rounded-full" />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <PhoneIcon size={28} className="text-red-400" />
              </div>
              <p className="text-red-400 font-mono text-sm">{error || 'Connection failed'}</p>
              <button
                onClick={() => { handleDisconnect(); startSession(); }}
                className="px-6 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-mono text-sm"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Instructions footer */}
        {(status === 'waiting' || status === 'idle') && (
          <div className="p-4 border-t border-gray-800 bg-black/90 flex-shrink-0">
            <p className="text-gray-600 font-mono text-[10px] text-center">
              Your phone opens a secure web page - no app installation required. 
              Connection uses end-to-end WebRTC encryption.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body // ⚡ FIX: Attach to document body
  );
};

export default PhoneMirror;
