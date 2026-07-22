import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Logo URL
const LOGO_URL = 'https://d64gsuwffb70l.cloudfront.net/695fc81af8bb22c52e2539fb_1769628610343_93d83d41.png';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <img 
          src={LOGO_URL}
          alt="Applegate CORE" 
          className="h-12 mx-auto mb-8 opacity-50"
        />
        
        {/* Error Code */}
        <div className="relative mb-8">
          <h1 className="text-[150px] font-bold text-slate-800 leading-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              404
            </span>
          </div>
        </div>
        
        {/* Message */}
        <h2 className="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
        <p className="text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Path Info */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4 mb-8">
          <p className="text-slate-500 text-sm">Requested path:</p>
          <code className="text-cyan-400 font-mono text-sm">{location.pathname}</code>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoBack}
            className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleGoHome}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Go to Home'}
          </button>
        </div>
        
        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-sm mb-4">Quick Links</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="/" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
              Home
            </a>
            {isAuthenticated && (
              <>
                <a href="/dashboard" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                  Dashboard
                </a>
                <a href="/workspaces" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                  Workspaces
                </a>
              </>
            )}
            {!isAuthenticated && (
              <>
                <a href="/login" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                  Sign In
                </a>
                <a href="/register" className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">
                  Sign Up
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
