import React from 'react';
import {
  Sparkles,
  Layers,
  Camera,
  Mic,
  Briefcase,
  History,
  Zap,
  Globe,
  Github,
} from 'lucide-react';
import { NetworkStatusBadge } from './NetworkStatusBadge';

export type AppMode = 'text' | 'ar_camera' | 'voice' | 'use_cases';

interface HeaderProps {
  currentMode: AppMode;
  onChangeMode: (mode: AppMode) => void;
  onOpenHistory: () => void;
  onOpenGitHubGuide?: () => void;
  historyCount: number;
  isOnline: boolean;
  onCheckConnection?: () => Promise<boolean>;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onChangeMode,
  onOpenHistory,
  onOpenGitHubGuide,
  historyCount,
  isOnline,
  onCheckConnection,
}) => {
  const modes: { id: AppMode; label: string; icon: any; badge?: string }[] = [
    { id: 'text', label: 'Éditeur & Traduction Live', icon: Layers },
    { id: 'ar_camera', label: 'AR Live Camera & OCR', icon: Camera, badge: '1.5s Live' },
    { id: 'voice', label: 'Voix & Dictée IA', icon: Mic },
    { id: 'use_cases', label: 'Cas d\'Usage Pro', icon: Briefcase },
  ];

  return (
    <header className="w-full border-b border-indigo-500/20 bg-[#070d1e]/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
                  VerbaMind AI
                </h1>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Traduction contextuelle, restructuration syntaxique & AR Live
              </p>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1.5 bg-[#0b142e] border border-slate-800 rounded-2xl">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const isActive = currentMode === mode.id;
              return (
                <button
                  key={mode.id}
                  id={`nav-tab-${mode.id}`}
                  onClick={() => onChangeMode(mode.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`} />
                  <span>{mode.label}</span>
                  {mode.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                      {mode.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Speed & Lang Badges */}
            <div className="hidden xl:flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>&lt;300ms Debounce</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>+200 Langues</span>
              </span>
            </div>

            {/* Network Online / Offline Status Badge */}
            <NetworkStatusBadge
              isOnline={isOnline}
              onRefreshCheck={onCheckConnection}
            />

            {/* GitHub Pages Guide Button */}
            {onOpenGitHubGuide && (
              <button
                id="btn-open-github-deploy-guide"
                onClick={onOpenGitHubGuide}
                title="Guide de déploiement GitHub Pages"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-200 hover:text-white text-xs font-semibold transition-all shadow-sm"
              >
                <Github className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Publier GitHub</span>
              </button>
            )}

            {/* History Toggle Button */}
            <button
              id="btn-open-history-header"
              onClick={onOpenHistory}
              title="Ouvrir l'historique des traductions"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0e183a] hover:bg-indigo-600/30 border border-indigo-500/30 text-white text-xs font-semibold transition-all shadow-sm"
            >
              <History className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Historique</span>
              {historyCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-500 text-white font-bold">
                  {historyCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-between overflow-x-auto py-2.5 border-t border-slate-800/60 gap-1 scrollbar-none">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = currentMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => onChangeMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white bg-[#0b142e]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
