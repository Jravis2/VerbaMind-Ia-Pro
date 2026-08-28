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
      if (typeof navigator !== 'undefined') {
        const online = navigator.onLine;
        setIsOnline(online);
        if (online) {
          setLastOnlineAt(Date.now());
        } else {
          setLastOfflineAt(Date.now());
        }
        return online;
      }
      return true;
    } catch {
      return true;
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
