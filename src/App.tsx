/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, AppMode } from './components/Header';
import { TextTranslatorView } from './components/TextTranslatorView';
import { ARLiveCameraView } from './components/ARLiveCameraView';
import { VoiceTranslatorView } from './components/VoiceTranslatorView';
import { UseCasesView } from './components/UseCasesView';
import { HistoryModal } from './components/HistoryModal';
import { GitHubDeployGuideModal } from './components/GitHubDeployGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { OfflineBanner } from './components/OfflineBanner';
import { useNetworkStatus } from './utils/useNetworkStatus';
import { useAutoViewport } from './utils/useAutoViewport';
import { HistoryItem, ToneStyle } from './types';
import {
  AppSettings,
  loadStoredSettings,
  applyThemeToDOM,
} from './utils/appSettings';
import { I18N_TRANSLATIONS } from './data/i18n';
import { Sparkles, Cpu, Zap, Globe } from 'lucide-react';

const LOCAL_STORAGE_HISTORY_KEY = 'verbamind_history_v1';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('text');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGitHubGuideOpen, setIsGitHubGuideOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(loadStoredSettings());

  // Automatic screen size & viewport monitor
  const viewport = useAutoViewport();

  // Apply theme and initialize on mount
  useEffect(() => {
    const loaded = loadStoredSettings();
    setSettings(loaded);
    applyThemeToDOM(loaded);
  }, []);

  // Network Status Hook
  const {
    isOnline,
    showReconnectedToast,
    checkConnection,
    dismissReconnectedToast,
  } = useNetworkStatus();

  // States passed from UseCases to TextTranslator
  const [prefilledText, setPrefilledText] = useState('');
  const [prefilledTone, setPrefilledTone] = useState<ToneStyle>('natural');

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load history from localStorage:', e);
    }
  }, []);

  // Save history to state and localStorage
  const handleSaveHistory = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    setHistory((prev) => {
      // Avoid duplicate consecutive identical items
      if (prev.length > 0 && prev[0].sourceText === item.sourceText && prev[0].targetLang === item.targetLang) {
        return prev;
      }
      const newItem: HistoryItem = {
        ...item,
        id: `vm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: Date.now(),
        isFavorite: false,
      };
      const limit = settings.historyAutoSaveLimit || 100;
      const updated = [newItem, ...prev].slice(0, limit);
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist history:', e);
      }
      return updated;
    });
  };

  // Toggle favorite
  const handleToggleFavorite = (id: string) => {
    setHistory((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Clear history
  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
  };

  // Restore history item into editor
  const handleRestoreItem = (item: HistoryItem) => {
    setPrefilledText(item.sourceText);
    setPrefilledTone(item.tone);
    setCurrentMode('text');
  };

  // Open translator from Use Case preset
  const handleOpenTranslatorWithText = (text: string, tone: ToneStyle) => {
    setPrefilledText(text);
    setPrefilledTone(tone);
    setCurrentMode('text');
  };

  const handleSettingsChanged = (newSettings: AppSettings) => {
    setSettings(newSettings);
    applyThemeToDOM(newSettings);
  };

  const t = I18N_TRANSLATIONS[settings.appLanguage] || I18N_TRANSLATIONS.fr;

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden transition-colors duration-300">
      {/* Ambient background glow effects */}
      {settings.backgroundParticles && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full filter blur-[140px]" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-cyan-500/8 rounded-full filter blur-[140px]" />
          <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-violet-600/8 rounded-full filter blur-[140px]" />
        </div>
      )}

      {/* Top Header */}
      <Header
        currentMode={currentMode}
        onChangeMode={(mode) => setCurrentMode(mode)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        historyCount={history.length}
        isOnline={isOnline}
        onCheckConnection={checkConnection}
        appLanguage={settings.appLanguage}
      />

      {/* Online / Offline Status Warning Banner */}
      <OfflineBanner
        isOnline={isOnline}
        showReconnectedToast={showReconnectedToast}
        onDismissToast={dismissReconnectedToast}
        onCheckConnection={checkConnection}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8 py-3 sm:py-6 flex flex-col items-center">
        {currentMode === 'text' && (
          <TextTranslatorView
            onSaveHistory={handleSaveHistory}
            initialSourceText={prefilledText}
            initialTone={prefilledTone}
            isOnline={isOnline}
            settings={settings}
          />
        )}

        {currentMode === 'ar_camera' && (
          <ARLiveCameraView
            onSaveHistory={handleSaveHistory}
            isOnline={isOnline}
            settings={settings}
          />
        )}

        {currentMode === 'voice' && (
          <VoiceTranslatorView
            onSaveHistory={handleSaveHistory}
            isOnline={isOnline}
            settings={settings}
          />
        )}

        {currentMode === 'use_cases' && (
          <UseCasesView
            onSaveHistory={handleSaveHistory}
            onOpenTranslatorWithText={handleOpenTranslatorWithText}
          />
        )}
      </main>

      {/* Technical Footer */}
      <footer className="relative z-10 border-t theme-card-subtle py-6 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs theme-text-muted">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg theme-card border flex items-center justify-center text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold theme-text-primary">{t.appName} Pro</span>
              <span className="theme-text-muted ml-2">{t.appSubtitle}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] theme-text-muted">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>{settings.debounceDelay}ms Debounce</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>{settings.aiModel}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>+200 Langues</span>
            </span>
          </div>

          <div className="theme-text-muted text-right">
            <span>&copy; {new Date().getFullYear()} {t.appName} Pro.</span>
          </div>
        </div>
      </footer>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onToggleFavorite={handleToggleFavorite}
        onClearHistory={handleClearHistory}
        onRestoreItem={handleRestoreItem}
      />

      {/* 50+ Options Pro Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsChanged={handleSettingsChanged}
        onOpenGitHubGuide={() => {
          setIsSettingsModalOpen(false);
          setIsGitHubGuideOpen(true);
        }}
      />

      {/* GitHub Deployment Guide Modal */}
      <GitHubDeployGuideModal
        isOpen={isGitHubGuideOpen}
        onClose={() => setIsGitHubGuideOpen(false)}
      />
    </div>
  );
}
