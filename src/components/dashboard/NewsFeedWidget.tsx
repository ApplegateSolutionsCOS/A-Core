import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  CloseIcon,
  SearchIcon,
  RefreshIcon,
  ExternalLinkIcon,
  PopoutIcon
} from '@/components/icons/Icons';

interface NewsArticle {
  title: string;
  source: string;
  timestamp: string;
  thumbnail: string | null;
  url: string;
  description: string;
}

const NewsFeedWidget: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('technology');
  const [searchInput, setSearchInput] = useState('technology');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('fetch-news', {
        body: { query, count: 8 }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to fetch news');
      }

      if (data?.articles) {
        setArticles(data.articles);
        setLastUpdated(new Date());
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Error fetching news:', err);
      setError(err.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(searchQuery);
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchNews(searchQuery);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [searchQuery, fetchNews]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
    }
  };

  const handleOpenNewWindow = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ExternalLinkIcon size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white font-mono">Live News Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(0,255,0,0.8)] animate-pulse" />
          <span className="text-xs text-green-400 font-mono">LIVE</span>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-3">
        <div className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search news..."
            className="w-full bg-gray-900/80 border border-gray-700 rounded-lg pl-9 pr-20 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50 transition-all"
          />
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => fetchNews(searchQuery)}
              className="p-1.5 text-gray-500 hover:text-cyan-400 transition-colors"
              title="Refresh"
            >
              <RefreshIcon size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="submit"
              className="px-2 py-1 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-400 text-xs font-mono hover:bg-cyan-500/30 transition-all"
            >
              Search
            </button>
          </div>
        </div>
      </form>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-[10px] text-gray-600 font-mono mb-2">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Articles List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 darkwave-scrollbar">
        {loading && articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-3" />
            <p className="text-gray-500 font-mono text-sm">Loading news...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mb-3">
              <CloseIcon size={24} className="text-red-400" />
            </div>
            <p className="text-red-400 font-mono text-sm mb-2">Failed to load news</p>
            <p className="text-gray-600 font-mono text-xs mb-3">{error}</p>
            <button
              onClick={() => fetchNews(searchQuery)}
              className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded text-cyan-400 text-xs font-mono hover:bg-cyan-500/30 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-gray-500 font-mono text-sm">No articles found for &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          articles.map((article, index) => (
            <div
              key={index}
              className="group relative flex gap-3 p-2 bg-gray-900/50 border border-gray-800 rounded-lg hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
            >
              {/* Main clickable area */}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 flex-1 min-w-0"
              >
                {/* Thumbnail */}
                {article.thumbnail ? (
                  <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-800">
                    <img
                      src={article.thumbnail}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 flex-shrink-0 rounded-md bg-gradient-to-br from-cyan-950/50 to-fuchsia-950/50 border border-gray-800 flex items-center justify-center">
                    <ExternalLinkIcon size={20} className="text-gray-600" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-white text-xs font-medium font-mono line-clamp-2 group-hover:text-cyan-400 transition-colors">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-cyan-400 text-[10px] font-mono truncate max-w-[120px]">
                      {article.source}
                    </span>
                    <span className="text-gray-600 text-[10px]">&bull;</span>
                    <span className="text-gray-500 text-[10px] font-mono">
                      {formatTimestamp(article.timestamp)}
                    </span>
                  </div>
                  {article.description && (
                    <p className="text-gray-600 text-[10px] font-mono mt-1 line-clamp-1">
                      {article.description}
                    </p>
                  )}
                </div>
              </a>

              {/* New Window button - top-right corner of each card */}
              <button
                onClick={(e) => handleOpenNewWindow(e, article.url)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-gray-800/80 border border-gray-700/50 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:shadow-[0_0_8px_rgba(6,182,212,0.3)] transition-all duration-200 z-10"
                title="Open in new window"
              >
                <PopoutIcon size={12} className="" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600 font-mono">
            Showing {articles.length} articles for &quot;{searchQuery}&quot;
          </span>
          <span className="text-[10px] text-gray-600 font-mono">
            Powered by NewsAPI
          </span>
        </div>
      </div>

      <style>{`
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default NewsFeedWidget;
