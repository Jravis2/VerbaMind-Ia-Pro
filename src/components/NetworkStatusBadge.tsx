import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface NetworkStatusBadgeProps {
  isOnline: boolean;
  onRefreshCheck?: () => Promise<boolean>;
}

export const NetworkStatusBadge: React.FC<NetworkStatusBadgeProps> = ({
  isOnline,
  onRefreshCheck,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [showPopover, setShowPopover] = useState(false);

  const handleManualCheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRefreshCheck || isChecking) return;
    setIsChecking(true);
    try {
      await onRefreshCheck();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        id="btn-network-status-indicator"
        onClick={() => setShowPopover(!showPopover)}
        title={
          isOnline
            ? 'Connecté à Internet — Les appels API Gemini sont actifs'
            : 'Hors ligne — Les appels API Gemini nécessitent une connexion Internet'
        }
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer ${
          isOnline
            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40 animate-pulse ring-1 ring-rose-500/40'
        }`}
      >
        {isOnline ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline text-[11px]">En ligne</span>
          </>
        ) : (
          <>
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] font-bold">Hors ligne</span>
          </>
        )}
      </button>

      {/* Detail Popover on Click */}
      {showPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0d1733] border border-slate-700 shadow-2xl p-4 z-50 animate-fade-in text-xs text-slate-300 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 font-bold text-white">
                {isOnline ? (
                  <>
                    <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <span>Statut Réseau : Connecté</span>
                  </>
                ) : (
                  <>
                    <div className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
                      <WifiOff className="w-4 h-4" />
                    </div>
                    <span className="text-rose-300">Statut Réseau : Déconnecté</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowPopover(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isOnline
                ? 'Votre appareil est connecté à Internet. Toutes les fonctionnalités IA (traductions contextuelles, restructuration syntaxique, vision AR et transcription audio) sont opérationnelles.'
                : 'Votre appareil a perdu la connexion Internet. Les modèles Gemini AI nécessitent un accès réseau actif pour traiter vos requêtes. Vos favoris et votre historique local restent accessibles.'}
            </p>

            <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400">
                {isOnline ? 'Prêt pour les requêtes Gemini' : 'Requêtes IA suspendues'}
              </span>
              {onRefreshCheck && (
                <button
                  onClick={handleManualCheck}
                  disabled={isChecking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-semibold transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Vérification...' : 'Tester le réseau'}</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
