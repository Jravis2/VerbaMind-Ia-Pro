import React from 'react';
import {
  Sparkles,
  History,
  Settings,
} from 'lucide-react';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { I18N_TRANSLATIONS, UILanguage } from '../data/i18n';

export type AppMode = 'text' | 'ar_camera' | 'voice' | 'use_cases';

interface HeaderProps {
  currentMode?: AppMode;
  onChangeMode?: (mode: AppMode) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  historyCount: number;
  isOnline: boolean;
  onCheckConnection?: () => Promise<boolean>;
  appLanguage?: UILanguage;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenSettings,
  historyCount,
  isOnline,
  onCheckConnection,
  appLanguage = 'fr',
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

            <div className="truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none">
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
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Network Online / Offline Status Badge */}
            <NetworkStatusBadge
              isOnline={isOnline}
              onRefreshCheck={onCheckConnection}
            />

            {/* Comprehensive Settings Button */}
            <button
              id="btn-open-settings-modal"
              onClick={onOpenSettings}
              title={t.settings}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl theme-card border theme-text-primary text-xs font-bold transition-all shadow-md group"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
              <span className="hidden sm:inline">{t.settings}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                50+
              </span>
            </button>

            {/* History Toggle Button */}
            <button
              id="btn-open-history-header"
              onClick={onOpenHistory}
              title={t.history}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl theme-card border theme-text-primary text-xs font-semibold transition-all shadow-sm"
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
              <span className="hidden md:inline">{t.history}</span>
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
