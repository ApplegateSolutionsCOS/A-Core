import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
type ShareMode = 'screen' | 'camera';

const PhoneIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);
const CameraIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
  </svg>
);
const ScreenIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);
const CheckIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PhoneMirrorPage: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [sessionId, setSessionId] = useState('');
  const [shareMode, setShareMode] = useState<ShareMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get session from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session');
    if (sid) setSessionId(sid);
  }, []);

  // Detect phone type
  const getPhoneType = () => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'other';
  };

  const supportsScreenShare = () => {
    return !!(navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia);
  };

  const connectToDesktop = useCallback(async (mode: ShareMode) => {
    if (!sessionId) { setError('No session code provided'); return; }
    setShareMode(mode);
    setStatus('connecting');
    setError(null);

    try {
      // Connect to the Realtime channel
      const channel = supabase.channel(`phone-mirror-${sessionId}`, {
        config: { broadcast: { self: false } }
      });

      channelRef.current = channel;

      // Announce connection
      channel
        .on('broadcast', { event: 'desktop-ack' }, async () => {
          // Desktop acknowledged, start WebRTC
          try {
            let stream: MediaStream;
            if (mode === 'screen' && supportsScreenShare()) {
              stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
            } else {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
              });
            }
            streamRef.current = stream;
            if (videoRef.current) videoRef.current.srcObject = stream;
            setIsStreaming(true);

            // Create WebRTC peer connection
            const pc = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ]
            });
            peerRef.current = pc;

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                channel.send({
                  type: 'broadcast',
                  event: 'phone-ice',
                  payload: { candidate: event.candidate.toJSON() }
                });
              }
            };

            pc.onconnectionstatechange = () => {
              if (pc.connectionState === 'connected') {
                setStatus('connected');
              } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setStatus('error');
                setError('Connection lost');
              }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channel.send({
              type: 'broadcast',
              event: 'phone-offer',
              payload: { offer }
            });
          } catch (err: any) {
            console.error('Media error:', err);
            setError(err.message || 'Failed to access camera/screen');
            setStatus('error');
          }
        })
        .on('broadcast', { event: 'desktop-answer' }, async (payload: any) => {
          try {
            if (peerRef.current) {
              await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.payload.answer));
              setStatus('connected');
            }
          } catch (err) {
            console.error('Answer error:', err);
          }
        })
        .on('broadcast', { event: 'desktop-ice' }, async (payload: any) => {
          try {
            if (peerRef.current) {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.payload.candidate));
            }
          } catch (err) {
            console.error('ICE error:', err);
          }
        })
        .subscribe(() => {
          // Send connection announcement
          channel.send({
            type: 'broadcast',
            event: 'phone-connect',
            payload: {
              phoneType: getPhoneType(),
              userAgent: navigator.userAgent,
              mode,
            }
          });
        });
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(err.message || 'Failed to connect');
      setStatus('error');
    }
  }, [sessionId]);

  const disconnect = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.close();
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    streamRef.current = null;
    peerRef.current = null;
    channelRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
    setIsStreaming(false);
    setShareMode(null);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      peerRef.current?.close();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-cyan-500/20 bg-gradient-to-r from-black via-cyan-950/10 to-black">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
            <PhoneIcon size={20} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-bold text-cyan-400">Phone Mirror</h1>
            <p className="text-xs text-gray-500 font-mono">Applegate CORE - Screen Sharing</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {status === 'idle' && (
          <div className="text-center space-y-6 max-w-sm w-full">
            {sessionId ? (
              <>
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/40 flex items-center justify-center">
                    <PhoneIcon size={36} className="text-cyan-400" />
                  </div>
                </div>

                <div>
                  <p className="text-white font-mono font-bold text-lg mb-1">Ready to Connect</p>
                  <p className="text-gray-400 font-mono text-sm">Session: <span className="text-cyan-400 tracking-[0.2em]">{sessionId}</span></p>
                </div>

                <div className="space-y-3">
                  {supportsScreenShare() && (
                    <button onClick={() => connectToDesktop('screen')}
                      className="w-full flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/40 rounded-xl hover:bg-cyan-500/20 transition-all">
                      <ScreenIcon size={24} className="text-cyan-400" />
                      <div className="text-left">
                        <p className="text-white font-mono font-bold text-sm">Share Screen</p>
                        <p className="text-gray-500 font-mono text-xs">Mirror your entire screen</p>
                      </div>
                    </button>
                  )}
                  <button onClick={() => connectToDesktop('camera')}
                    className="w-full flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/40 rounded-xl hover:bg-blue-500/20 transition-all">
                    <CameraIcon size={24} className="text-blue-400" />
                    <div className="text-left">
                      <p className="text-white font-mono font-bold text-sm">Share Camera</p>
                      <p className="text-gray-500 font-mono text-xs">Use camera to show your screen</p>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <div>
                <PhoneIcon size={48} className="text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 font-mono text-sm">No session code found.</p>
                <p className="text-gray-600 font-mono text-xs mt-2">Open this page from the Phone Mirror tool in Applegate CORE.</p>
              </div>
            )}
          </div>
        )}

        {status === 'connecting' && (
          <div className="text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-spin" style={{ borderTopColor: '#0ff' }} />
              <PhoneIcon size={24} className="absolute inset-0 m-auto text-cyan-400" />
            </div>
            <p className="text-cyan-400 font-mono text-sm animate-pulse">Connecting to desktop...</p>
            <p className="text-gray-600 font-mono text-xs">Mode: {shareMode === 'screen' ? 'Screen Share' : 'Camera'}</p>
          </div>
        )}

        {status === 'connected' && (
          <div className="w-full max-w-lg space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-500/5 border border-green-500/30 rounded-lg">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-75" />
              </div>
              <div className="flex-1">
                <p className="text-green-400 font-mono text-sm font-bold">Connected to Desktop</p>
                <p className="text-gray-500 font-mono text-xs">{shareMode === 'screen' ? 'Sharing screen' : 'Sharing camera'}</p>
              </div>
              <CheckIcon size={20} className="text-green-400" />
            </div>

            {/* Preview */}
            <div className="relative bg-gray-950 rounded-xl border border-cyan-500/20 overflow-hidden aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-gray-600 font-mono text-sm">Starting stream...</p>
                </div>
              )}
            </div>

            <button onClick={disconnect}
              className="w-full py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-mono font-bold">
              Disconnect
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <PhoneIcon size={28} className="text-red-400" />
            </div>
            <p className="text-red-400 font-mono text-sm">{error || 'Connection failed'}</p>
            <button onClick={() => { disconnect(); if (shareMode) connectToDesktop(shareMode); }}
              className="px-6 py-2 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all font-mono text-sm">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-center">
        <p className="text-gray-700 font-mono text-[10px]">
          Secure WebRTC connection - No data stored on servers
        </p>
      </div>
    </div>
  );
};

export default PhoneMirrorPage;
