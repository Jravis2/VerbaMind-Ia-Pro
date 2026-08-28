import React, { useState } from 'react';
import {
  WifiOff,
  Wifi,
  AlertTriangle,
  RefreshCw,
  History,
  X,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  showReconnectedToast: boolean;
  onDismissToast: () => void;
  onCheckConnection: () => Promise<boolean>;
  onOpenHistory?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  showReconnectedToast,
  onDismissToast,
  onCheckConnection,
  onOpenHistory,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isManuallyDismissed, setIsManuallyDismissed] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onCheckConnection();
    } finally {
      setIsRetrying(false);
    }
  };

  // If reconnected toast should show
  if (isOnline && showReconnectedToast) {
    return (
      <div className="w-full bg-emerald-600/90 text-white px-4 py-2.5 shadow-lg border-b border-emerald-500/40 animate-fade-in sticky top-18 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-emerald-700/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            </div>
            <span>
              <strong>Connexion Internet rétablie</strong> — Les requêtes vers les modèles Gemini AI sont à nouveau opérationnelles.
            </span>
          </div>
          <button
            onClick={onDismissToast}
            className="p-1 rounded-lg hover:bg-emerald-700/60 text-emerald-100 transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // If offline
  if (!isOnline) {
    if (isManuallyDismissed) {
      return (
        <div className="w-full bg-rose-950/80 border-b border-rose-800/60 px-4 py-1.5 text-xs text-rose-200 flex items-center justify-between sticky top-18 z-30 backdrop-blur-md">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-medium">
              <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Mode hors ligne actif — Accès aux modèles Gemini interrompu.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="underline hover:text-white font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>Tester</span>
              </button>
              <button
                onClick={() => setIsManuallyDismissed(false)}
                className="underline hover:text-white text-[11px]"
              >
                Détails
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full bg-gradient-to-r from-rose-950/95 via-rose-900/90 to-amber-950/95 text-rose-100 px-4 py-3 shadow-xl border-b border-rose-500/40 animate-fade-in sticky top-18 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 mt-0.5 sm:mt-0">
              <WifiOff className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>Connexion Internet perdue (Mode Hors Ligne)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-500/40 font-mono">
                  Gemini Offline
                </span>
              </div>
              <p className="text-xs text-rose-200/90 mt-0.5">
                Les appels aux modèles <strong>Gemini AI</strong> (traduction en direct, reconnaissance OCR et voix) nécessitent un accès réseau. Votre historique et vos favoris enregistrés restent consultables localement.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0 mt-2 md:mt-0">
            {onOpenHistory && (
              <button
                onClick={onOpenHistory}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>Historique Local</span>
              </button>
            )}

            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Test en cours...' : 'Réessayer'}</span>
            </button>

            <button
              onClick={() => setIsManuallyDismissed(true)}
              className="p-1.5 rounded-xl hover:bg-rose-800/40 text-rose-300 hover:text-white transition-colors"
              title="Réduire l'alerte"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
