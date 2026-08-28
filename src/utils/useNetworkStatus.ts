import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOfflineAt: number | null;
  lastOnlineAt: number | null;
  checkConnection: () => Promise<boolean>;
  dismissReconnectedToast: () => void;
  showReconnectedToast: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [showReconnectedToast, setShowReconnectedToast] = useState<boolean>(false);
  const [lastOfflineAt, setLastOfflineAt] = useState<number | null>(null);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Fast check with navigator first
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
        return false;
      }

      // Quick fetch to verify actual external/internal reachability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      const reachable = !!res && res.ok;
      setIsOnline(reachable);
      if (reachable) {
        setLastOnlineAt(Date.now());
      } else {
        setLastOfflineAt(Date.now());
      }
      return reachable;
    } catch {
      setIsOnline(false);
      setLastOfflineAt(Date.now());
      return false;
    }
  }, []);

  const dismissReconnectedToast = useCallback(() => {
    setShowReconnectedToast(false);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(Date.now());
      if (wasOffline) {
        setShowReconnectedToast(true);
        // Auto-dismiss reconnected notification after 4 seconds
        const timer = setTimeout(() => {
          setShowReconnectedToast(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowReconnectedToast(false);
      setLastOfflineAt(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      setWasOffline(true);
      setLastOfflineAt(Date.now());
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return {
    isOnline,
    wasOffline,
    lastOfflineAt,
    lastOnlineAt,
    checkConnection,
    dismissReconnectedToast,
    showReconnectedToast,
  };
}
