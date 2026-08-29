import React from 'react';
import {
  Sparkles,
  History,
  Settings,
  Maximize2,
  Minimize2,
  Database,
  Camera,
  Crop,
} from 'lucide-react';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { I18N_TRANSLATIONS, UILanguage } from '../data/i18n';

export type AppMode = 'text' | 'ar_camera' | 'voice' | 'use_cases';

interface HeaderProps {
  currentMode?: AppMode;
  onChangeMode?: (mode: AppMode) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenOfflineLexicon?: () => void;
  onTakeScreenshot?: () => void;
  onTakePhoto?: () => void;
  historyCount: number;
  offlineWordsCount?: number;
  isOnline: boolean;
  onCheckConnection?: () => Promise<boolean>;
  appLanguage?: UILanguage;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenSettings,
  onOpenOfflineLexicon,
  onTakeScreenshot,
  onTakePhoto,
  historyCount,
  offlineWordsCount = 0,
  isOnline,
  onCheckConnection,
  appLanguage = 'fr',
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const t = I18N_TRANSLATIONS[appLanguage] || I18N_TRANSLATIONS.fr;

  return (
    <header className="w-full border-b theme-header sticky top-0 z-40 max-w-full">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-2 sm:gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400/30">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>

            <div className="truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black theme-text-primary tracking-tight truncate">
                  {t.appName}
                </h1>
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] theme-text-muted font-medium hidden md:block truncate">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Take Photo Button */}
            {onTakePhoto && (
              <button
                id="btn-header-take-photo"
                onClick={onTakePhoto}
                title="Prendre une photo avec l'appareil photo / caméra"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-indigo-500/15 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-white text-xs font-bold transition-all shadow-md group hover:scale-105 active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden sm:inline">Prendre photo</span>
              </button>
            )}

            {/* Take Screenshot Button */}
            {onTakeScreenshot && (
              <button
                id="btn-header-take-screenshot"
                onClick={onTakeScreenshot}
                title="Prendre une capture d'écran de l'application"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500/15 via-cyan-500/10 to-indigo-500/15 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 hover:text-white text-xs font-bold transition-all shadow-md group hover:scale-105 active:scale-95"
              >
                <Crop className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden sm:inline">Capture écran</span>
              </button>
            )}

            {/* Network Online / Offline Status Badge */}
            <NetworkStatusBadge
              isOnline={isOnline}
              onRefreshCheck={onCheckConnection}
            />

            {/* Offline Lexicon Memory Button */}
            {onOpenOfflineLexicon && (
              <button
                id="btn-open-offline-lexicon"
                onClick={onOpenOfflineLexicon}
                title="Dictionnaire & Mémoire Hors Ligne (Tous les mots enregistrés)"
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl theme-card border theme-text-primary text-xs font-bold transition-all shadow-md hover:border-cyan-500/50 hover:bg-cyan-500/10 group"
              >
                <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="hidden xl:inline">Mémoire Hors Ligne</span>
                {offlineWordsCount > 0 && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-600/80 text-white font-bold">
                    {offlineWordsCount}
                  </span>
                )}
              </button>
            )}

            {/* Direct Fullscreen Toggle Button */}
            {onToggleFullscreen && (
              <button
                id="btn-toggle-fullscreen"
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Quitter le plein écran (Échap / F11)" : "Mettre directement en plein écran (F11)"}
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl theme-card border text-xs font-bold transition-all shadow-md group ${
                  isFullscreen
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'theme-text-primary hover:border-indigo-500/50 hover:bg-indigo-500/10'
                }`}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
                )}
                <span className="hidden 2xl:inline">
                  {isFullscreen ? "Fenêtré" : "Plein Écran"}
                </span>
              </button>
            )}

            {/* Comprehensive Settings Button */}
            <button
              id="btn-open-settings-modal"
              onClick={onOpenSettings}
              title={t.settings}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl theme-card border theme-text-primary text-xs font-bold transition-all shadow-md group"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
              <span className="hidden md:inline">{t.settings}</span>
            </button>

            {/* History Toggle Button */}
            <button
              id="btn-open-history-header"
              onClick={onOpenHistory}
              title={t.history}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl theme-card border theme-text-primary text-xs font-semibold transition-all shadow-sm"
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
              <span className="hidden lg:inline">{t.history}</span>
              {historyCount > 0 && (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500 text-white font-bold">
                  {historyCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

