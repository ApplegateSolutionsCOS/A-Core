import React, { Component, ErrorInfo, ReactNode } from 'react';

const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/695fc81af8bb22c52e2539fb_1769628610343_93d83d41.png';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onSignOut?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleSignOut = () => {
    // Clear all auth storage
    localStorage.removeItem('bos_user');
    localStorage.removeItem('bos_user_type');
    localStorage.removeItem('bos_organization');
    
    // Clear session token
    try {
      localStorage.removeItem('bos_session_token');
      sessionStorage.removeItem('bos_session_token');
    } catch {}

    // Call the provided onSignOut if available
    if (this.props.onSignOut) {
      this.props.onSignOut();
    }

    // Force reload to reset all state
    window.location.href = '/';
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(0,255,255,0.15) 2%, transparent 0%)',
              backgroundSize: '50px 50px',
            }} />
          </div>
          
          <div className="relative z-10 max-w-lg w-full">
            <div className="text-center mb-8">
              <img 
                src={LOGO_URL} 
                alt="Applegate CORE" 
                className="h-12 w-auto mx-auto mb-4 drop-shadow-[0_0_15px_rgba(0,255,255,0.5)]" 
              />
            </div>

            <div className="bg-gray-950/80 border border-red-500/30 rounded-xl p-6 backdrop-blur-sm shadow-[0_0_40px_rgba(239,68,68,0.1)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-mono font-bold text-white">
                    {this.props.fallbackTitle || 'Something went wrong'}
                  </h2>
                  <p className="text-sm text-gray-400 font-mono">
                    An unexpected error occurred while loading the application.
                  </p>
                </div>
              </div>

              {this.state.error && (
                <div className="mb-4 p-3 bg-black/50 border border-gray-800 rounded-lg overflow-auto max-h-32">
                  <p className="text-xs text-red-400 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 py-3 px-4 bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-mono text-sm font-medium rounded-lg hover:bg-cyan-500/20 hover:border-cyan-400/60 transition-all"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Try Again
                  </span>
                </button>
                <button
                  onClick={this.handleSignOut}
                  className="flex-1 py-3 px-4 bg-red-500/10 border border-red-500/40 text-red-400 font-mono text-sm font-medium rounded-lg hover:bg-red-500/20 hover:border-red-400/60 transition-all"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </span>
                </button>
              </div>

              <p className="text-[10px] text-gray-600 font-mono mt-4 text-center">
                If this problem persists, try signing out and signing back in.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
