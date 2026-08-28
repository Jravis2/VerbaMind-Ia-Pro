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
import { HistoryItem, ToneStyle } from './types';
import { Sparkles, Shield, Cpu, Zap, Globe, Layers, BookOpen } from 'lucide-react';

const LOCAL_STORAGE_HISTORY_KEY = 'verbamind_history_v1';

export default function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('text');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isGitHubGuideOpen, setIsGitHubGuideOpen] = useState(false);

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
      const updated = [newItem, ...prev].slice(0, 100);
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

  return (
    <div className="min-h-screen bg-[#060b19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Ambient background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full filter blur-[140px]"></div>
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-cyan-500/8 rounded-full filter blur-[140px]"></div>
        <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-violet-600/8 rounded-full filter blur-[140px]"></div>
      </div>

      {/* Top Header */}
      <Header
        currentMode={currentMode}
        onChangeMode={(mode) => setCurrentMode(mode)}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        onOpenGitHubGuide={() => setIsGitHubGuideOpen(true)}
        historyCount={history.length}
      />

      {/* Main View Area */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center">
        {currentMode === 'text' && (
          <TextTranslatorView
            onSaveHistory={handleSaveHistory}
            initialSourceText={prefilledText}
            initialTone={prefilledTone}
          />
        )}

        {currentMode === 'ar_camera' && (
          <ARLiveCameraView onSaveHistory={handleSaveHistory} />
        )}

        {currentMode === 'voice' && (
          <VoiceTranslatorView onSaveHistory={handleSaveHistory} />
        )}

        {currentMode === 'use_cases' && (
          <UseCasesView
            onSaveHistory={handleSaveHistory}
            onOpenTranslatorWithText={handleOpenTranslatorWithText}
          />
        )}
      </main>

      {/* Modern Technical Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#060d21]/90 backdrop-blur-md py-6 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-white">VerbaMind AI Pro</span>
              <span className="text-slate-500 ml-2">Moteur de Compréhension Contextuelle & AR Visuel</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-indigo-400" />
              <span>Anti-Rebond 200ms</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>Gemini 2.5 Flash Engine</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>+200 Langues (Vivantes, Mortes, Régionales, Construites)</span>
            </span>
          </div>

          <div className="text-slate-400 text-right">
            <span>&copy; {new Date().getFullYear()} VerbaMind AI Pro. Tous droits réservés.</span>
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

      {/* GitHub Deployment Guide Modal */}
      <GitHubDeployGuideModal
        isOpen={isGitHubGuideOpen}
        onClose={() => setIsGitHubGuideOpen(false)}
      />
    </div>
  );
}
