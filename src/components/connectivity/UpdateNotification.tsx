import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Non-intrusive "A new version is available" toast/banner.
 *
 * Instead of auto-reloading the page (which would interrupt users mid-edit),
 * main.tsx now dispatches a `sw-update-available` window event carrying a
 * reference to the *waiting* service worker. This component surfaces that as a
 * dismissible toast. Clicking "Refresh" posts the existing SKIP_WAITING message
 * to the waiting worker; the `controllerchange` listener in main.tsx then
 * performs the single, controlled reload.
 */
export function UpdateNotification() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [visible, setVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent).detail as ServiceWorker | undefined;
      if (detail) {
        setWaitingWorker(detail);
      }
      setVisible(true);
    };

    window.addEventListener('sw-update-available', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('sw-update-available', handleUpdate as EventListener);
    };
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Trigger the existing SKIP_WAITING flow. main.tsx's controllerchange
    // listener will reload the page once the new worker takes control.
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          // Fallback: nothing waiting, just reload to fetch the latest build.
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  }, [waitingWorker]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[9999] w-[min(92vw,28rem)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-cyan-500/10 backdrop-blur-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">
            A new version is available
          </p>
          <p className="truncate text-xs text-slate-400">
            Refresh to load the latest update. Your work is safe.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss update notification"
          className="shrink-0 rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default UpdateNotification;
