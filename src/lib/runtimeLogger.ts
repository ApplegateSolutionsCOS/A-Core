// ═══════════════════════════════════════════════════════════════════
// RUNTIME LOGGER — Captures ALL code execution for real-time debugging
// With database persistence (batch insert every 30s)
// ═══════════════════════════════════════════════════════════════════

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type LogCategory = 
  | 'api_call'
  | 'api_response'
  | 'state_change'
  | 'navigation'
  | 'user_action'
  | 'click'
  | 'form_submit'
  | 'render'
  | 'effect'
  | 'error'
  | 'console'
  | 'network'
  | 'auth'
  | 'database'
  | 'supabase'
  | 'function_call'
  | 'component_mount'
  | 'component_unmount'
  | 'timer'
  | 'storage'
  | 'dom_event'
  | 'websocket'
  | 'system';

export interface RuntimeLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  source: string;       // File/component name
  action: string;       // What happened
  details?: string;     // Additional details
  data?: any;           // Raw data (objects, payloads, etc.)
  duration?: number;    // Duration in ms for timed operations
  stackTrace?: string;  // Stack trace for errors
  tags?: string[];      // Custom tags for filtering
}

type LogListener = (entry: RuntimeLogEntry) => void;

class RuntimeLogger {
  private logs: RuntimeLogEntry[] = [];
  private maxLogs: number = 5000;
  private listeners: Set<LogListener> = new Set();
  private idCounter: number = 0;
  private isInitialized: boolean = false;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
    debug: typeof console.debug;
  };
  private originalFetch: typeof fetch;

  // ── Persistence fields ──
  private pendingLogs: RuntimeLogEntry[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private _persistenceEnabled: boolean = false;
  private sessionId: string;
  private lastFlushedIndex: number = 0;
  private flushInProgress: boolean = false;
  private persistenceListeners: Set<(enabled: boolean) => void> = new Set();
  private _totalPersisted: number = 0;
  private _lastFlushTime: string | null = null;
  private _lastFlushCount: number = 0;

  constructor() {
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
    };
    this.originalFetch = window.fetch.bind(window);
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // ── Persistence getters ──
  get persistenceEnabled(): boolean { return this._persistenceEnabled; }
  get totalPersisted(): number { return this._totalPersisted; }
  get lastFlushTime(): string | null { return this._lastFlushTime; }
  get lastFlushCount(): number { return this._lastFlushCount; }
  get pendingCount(): number { return this.pendingLogs.length; }

  // Enable/disable persistence
  setPersistence(enabled: boolean): void {
    this._persistenceEnabled = enabled;
    if (enabled && !this.flushInterval) {
      this.startFlushTimer();
      this.log('INFO', 'system', 'RuntimeLogger', 'Persistence enabled', 'Logs will be batch-inserted to DB every 30 seconds');
    } else if (!enabled && this.flushInterval) {
      // Flush remaining before stopping
      this.flushToDatabase();
      clearInterval(this.flushInterval);
      this.flushInterval = null;
      this.log('INFO', 'system', 'RuntimeLogger', 'Persistence disabled', 'Logs will only be kept in memory');
    }
    this.persistenceListeners.forEach(l => l(enabled));
  }

  onPersistenceChange(listener: (enabled: boolean) => void): () => void {
    this.persistenceListeners.add(listener);
    return () => this.persistenceListeners.delete(listener);
  }

  private startFlushTimer(): void {
    if (this.flushInterval) return;
    this.flushInterval = setInterval(() => {
      if (this._persistenceEnabled && this.pendingLogs.length > 0) {
        this.flushToDatabase();
      }
    }, 30000); // 30 seconds
  }

  async flushToDatabase(): Promise<{ success: boolean; count: number }> {
    if (this.flushInProgress || this.pendingLogs.length === 0) {
      return { success: true, count: 0 };
    }

    this.flushInProgress = true;
    const logsToFlush = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      // Use original fetch to avoid interceptor loop
      const response = await this.originalFetch(
        `${this.getSupabaseUrl()}/functions/v1/persist-runtime-logs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getSupabaseAnonKey()}`,
            'apikey': this.getSupabaseAnonKey(),
          },
          body: JSON.stringify({
            action: 'batch_insert',
            logs: logsToFlush,
            session_id: this.sessionId,
            user_agent: navigator.userAgent,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        this._totalPersisted += result.inserted || logsToFlush.length;
        this._lastFlushTime = new Date().toISOString();
        this._lastFlushCount = result.inserted || logsToFlush.length;
        this.flushInProgress = false;
        return { success: true, count: result.inserted || logsToFlush.length };
      } else {
        // Put logs back
        this.pendingLogs = [...logsToFlush, ...this.pendingLogs];
        this.flushInProgress = false;
        return { success: false, count: 0 };
      }
    } catch (err) {
      // Put logs back on failure
      this.pendingLogs = [...logsToFlush, ...this.pendingLogs];
      this.flushInProgress = false;
      return { success: false, count: 0 };
    }
  }

  private getSupabaseUrl(): string {
    // Read from the supabase config that's already set up
    const meta = (document.querySelector('meta[name="supabase-url"]') as HTMLMetaElement)?.content;
    if (meta) return meta;
    // Fallback: try to find it from localStorage or window
    try {
      const stored = localStorage.getItem('supabase_url');
      if (stored) return stored;
    } catch {}
    // Last resort: extract from existing supabase client import path
    return (window as any).__SUPABASE_URL__ || '';
  }

  private getSupabaseAnonKey(): string {
    const meta = (document.querySelector('meta[name="supabase-anon-key"]') as HTMLMetaElement)?.content;
    if (meta) return meta;
    try {
      const stored = localStorage.getItem('supabase_anon_key');
      if (stored) return stored;
    } catch {}
    return (window as any).__SUPABASE_ANON_KEY__ || '';
  }

  // Set supabase credentials for persistence (called from app init)
  setSupabaseCredentials(url: string, anonKey: string): void {
    (window as any).__SUPABASE_URL__ = url;
    (window as any).__SUPABASE_ANON_KEY__ = anonKey;
  }

  // Generate unique ID
  private genId(): string {
    return `rl_${Date.now()}_${++this.idCounter}`;
  }

  // Core log method
  log(
    level: LogLevel,
    category: LogCategory,
    source: string,
    action: string,
    details?: string,
    data?: any,
    duration?: number,
    tags?: string[]
  ): RuntimeLogEntry {
    const entry: RuntimeLogEntry = {
      id: this.genId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      source,
      action,
      details,
      data: data !== undefined ? this.safeSerialize(data) : undefined,
      duration,
      tags,
    };

    this.logs.unshift(entry);
    
    // Trim if over max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Add to pending persistence queue
    if (this._persistenceEnabled) {
      this.pendingLogs.push(entry);
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (e) {
        // Don't let listener errors break logging
      }
    });

    return entry;
  }

  // Safe serialization to prevent circular references
  private safeSerialize(data: any): any {
    if (data === null || data === undefined) return data;
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') return data;
    
    try {
      const seen = new WeakSet();
      const serialized = JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }
        if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
        if (value instanceof Error) return { message: value.message, stack: value.stack };
        if (value instanceof HTMLElement) return `[HTMLElement: ${value.tagName}]`;
        return value;
      }));
      return serialized;
    } catch (e) {
      return String(data);
    }
  }

  // Convenience methods
  debug(category: LogCategory, source: string, action: string, details?: string, data?: any) {
    return this.log('DEBUG', category, source, action, details, data);
  }

  info(category: LogCategory, source: string, action: string, details?: string, data?: any) {
    return this.log('INFO', category, source, action, details, data);
  }

  warn(category: LogCategory, source: string, action: string, details?: string, data?: any) {
    return this.log('WARN', category, source, action, details, data);
  }

  error(category: LogCategory, source: string, action: string, details?: string, data?: any) {
    return this.log('ERROR', category, source, action, details, data);
  }

  critical(category: LogCategory, source: string, action: string, details?: string, data?: any) {
    return this.log('CRITICAL', category, source, action, details, data);
  }

  // Timed operation helper
  startTimer(category: LogCategory, source: string, action: string): () => RuntimeLogEntry {
    const start = performance.now();
    return (details?: string, data?: any) => {
      const duration = Math.round(performance.now() - start);
      return this.log('INFO', category, source, action, details || `Completed in ${duration}ms`, data, duration);
    };
  }

  // Subscribe to new log entries
  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get all logs
  getLogs(): RuntimeLogEntry[] {
    return [...this.logs];
  }

  // Get logs filtered by category
  getLogsByCategory(category: LogCategory): RuntimeLogEntry[] {
    return this.logs.filter(l => l.category === category);
  }

  // Get logs filtered by level
  getLogsByLevel(level: LogLevel): RuntimeLogEntry[] {
    return this.logs.filter(l => l.level === level);
  }

  // Get logs filtered by source
  getLogsBySource(source: string): RuntimeLogEntry[] {
    return this.logs.filter(l => l.source.toLowerCase().includes(source.toLowerCase()));
  }

  // Search logs
  search(query: string): RuntimeLogEntry[] {
    const q = query.toLowerCase();
    return this.logs.filter(l => 
      l.source.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.details && l.details.toLowerCase().includes(q)) ||
      l.category.toLowerCase().includes(q) ||
      (l.tags && l.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  // Clear all logs
  clear(): void {
    this.logs = [];
    this.listeners.forEach(listener => {
      try {
        listener({
          id: this.genId(),
          timestamp: new Date().toISOString(),
          level: 'INFO',
          category: 'system',
          source: 'RuntimeLogger',
          action: 'Logs cleared',
        });
      } catch (e) {}
    });
  }

  // Get stats
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    errorsLast5Min: number;
    logsPerSecond: number;
  } {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const oneSecAgo = now - 1000;

    const byLevel: Record<LogLevel, number> = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 };
    const byCategory: Record<string, number> = {};
    let errorsLast5Min = 0;
    let logsPerSecond = 0;

    this.logs.forEach(l => {
      byLevel[l.level]++;
      byCategory[l.category] = (byCategory[l.category] || 0) + 1;
      const ts = new Date(l.timestamp).getTime();
      if ((l.level === 'ERROR' || l.level === 'CRITICAL') && ts > fiveMinAgo) errorsLast5Min++;
      if (ts > oneSecAgo) logsPerSecond++;
    });

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      errorsLast5Min,
      logsPerSecond,
    };
  }

  // Initialize interceptors
  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.log('INFO', 'system', 'RuntimeLogger', 'Initialized', 'Runtime logging system started');

    // Intercept console methods
    this.interceptConsole();

    // Intercept fetch/network
    this.interceptFetch();

    // Intercept global errors
    this.interceptErrors();

    // Intercept navigation
    this.interceptNavigation();

    // Intercept clicks
    this.interceptClicks();

    // Intercept storage
    this.interceptStorage();
  }

  private interceptConsole(): void {
    const self = this;

    console.log = function (...args: any[]) {
      self.originalConsole.log(...args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      // Don't log our own logs to prevent infinite loop
      if (!message.includes('RuntimeLogger') && !message.includes('rl_')) {
        self.log('DEBUG', 'console', 'console.log', message, undefined, args.length > 1 ? args : undefined);
      }
    };

    console.warn = function (...args: any[]) {
      self.originalConsole.warn(...args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      self.log('WARN', 'console', 'console.warn', message, undefined, args.length > 1 ? args : undefined);
    };

    console.error = function (...args: any[]) {
      self.originalConsole.error(...args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      self.log('ERROR', 'console', 'console.error', message, undefined, args.length > 1 ? args : undefined);
    };

    console.info = function (...args: any[]) {
      self.originalConsole.info(...args);
      const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      if (!message.includes('RuntimeLogger')) {
        self.log('INFO', 'console', 'console.info', message, undefined, args.length > 1 ? args : undefined);
      }
    };
  }

  private interceptFetch(): void {
    const self = this;
    const origFetch = this.originalFetch;

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = init?.method || 'GET';
      
      // Skip logging our own persistence calls to prevent infinite loop
      if (url.includes('persist-runtime-logs')) {
        return origFetch(input, init);
      }
      
      // Determine if it's a Supabase call
      const isSupabase = url.includes('supabase') || url.includes('sb-');
      const category: LogCategory = isSupabase ? 'supabase' : 'network';
      
      // Extract useful info from URL
      const urlObj = new URL(url, window.location.origin);
      const shortUrl = urlObj.pathname + (urlObj.search ? '?' + urlObj.search.substring(0, 100) : '');
      
      const endTimer = self.startTimer(category, 'fetch', `${method} ${shortUrl}`);
      
      self.log('INFO', 'api_call', 'fetch', `${method} ${shortUrl}`, undefined, {
        url: shortUrl,
        method,
        hasBody: !!init?.body,
        headers: init?.headers ? Object.keys(init.headers as Record<string, string>) : undefined,
      });

      try {
        const response = await origFetch(input, init);
        
        const entry = endTimer(`Status: ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: shortUrl,
        });

        if (!response.ok) {
          self.log('WARN', 'api_response', 'fetch', `${method} ${shortUrl} failed`, `Status: ${response.status}`, {
            status: response.status,
            statusText: response.statusText,
          });
        }

        return response;
      } catch (err: any) {
        self.log('ERROR', 'api_response', 'fetch', `${method} ${shortUrl} error`, err?.message || 'Network error', {
          error: err?.message,
          url: shortUrl,
        });
        throw err;
      }
    };
  }

  private interceptErrors(): void {
    const self = this;

    window.addEventListener('error', (event) => {
      self.log('ERROR', 'error', event.filename || 'unknown', 'Uncaught Error', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }, undefined, ['uncaught']);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      self.log('ERROR', 'error', 'Promise', 'Unhandled Rejection', 
        reason?.message || String(reason), 
        { stack: reason?.stack },
        undefined, ['unhandled-rejection']
      );
    });
  }

  private interceptNavigation(): void {
    const self = this;
    const origPushState = history.pushState.bind(history);
    const origReplaceState = history.replaceState.bind(history);

    history.pushState = function (...args: any[]) {
      self.log('INFO', 'navigation', 'Router', 'pushState', `Navigated to: ${args[2]}`, { url: args[2] });
      return origPushState(...args);
    };

    history.replaceState = function (...args: any[]) {
      self.log('DEBUG', 'navigation', 'Router', 'replaceState', `Replaced to: ${args[2]}`, { url: args[2] });
      return origReplaceState(...args);
    };

    window.addEventListener('popstate', () => {
      self.log('INFO', 'navigation', 'Router', 'popstate', `Back/Forward to: ${window.location.pathname}`);
    });
  }

  private interceptClicks(): void {
    const self = this;

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const tag = target.tagName?.toLowerCase();
      const isInteractive = tag === 'button' || tag === 'a' || tag === 'input' || 
                           target.getAttribute('role') === 'button' ||
                           target.closest('button') || target.closest('a');

      if (isInteractive) {
        const btn = target.closest('button') || target.closest('a') || target;
        const text = btn.textContent?.trim().substring(0, 60) || '';
        const title = btn.getAttribute('title') || '';
        const className = btn.className?.toString().substring(0, 80) || '';
        const id = btn.id || '';
        
        self.log('DEBUG', 'click', 'DOM', `Click: ${tag}`, 
          text || title || id || className.substring(0, 40), {
          tag,
          text: text.substring(0, 60),
          title,
          id,
          classList: className.substring(0, 80),
        });
      }
    }, { capture: true });
  }

  private interceptStorage(): void {
    const self = this;
    const origSetItem = localStorage.setItem.bind(localStorage);
    const origRemoveItem = localStorage.removeItem.bind(localStorage);

    localStorage.setItem = function (key: string, value: string) {
      self.log('DEBUG', 'storage', 'localStorage', `setItem: ${key}`, 
        `Value length: ${value.length} chars`, undefined, undefined, ['storage']);
      return origSetItem(key, value);
    };

    localStorage.removeItem = function (key: string) {
      self.log('DEBUG', 'storage', 'localStorage', `removeItem: ${key}`, undefined, undefined, undefined, ['storage']);
      return origRemoveItem(key);
    };
  }

  // Destroy and restore originals
  destroy(): void {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
    window.fetch = this.originalFetch;
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance
export const runtimeLogger = new RuntimeLogger();

// Export convenience functions
export const rlog = {
  debug: (category: LogCategory, source: string, action: string, details?: string, data?: any) =>
    runtimeLogger.debug(category, source, action, details, data),
  info: (category: LogCategory, source: string, action: string, details?: string, data?: any) =>
    runtimeLogger.info(category, source, action, details, data),
  warn: (category: LogCategory, source: string, action: string, details?: string, data?: any) =>
    runtimeLogger.warn(category, source, action, details, data),
  error: (category: LogCategory, source: string, action: string, details?: string, data?: any) =>
    runtimeLogger.error(category, source, action, details, data),
  timer: (category: LogCategory, source: string, action: string) =>
    runtimeLogger.startTimer(category, source, action),
};
