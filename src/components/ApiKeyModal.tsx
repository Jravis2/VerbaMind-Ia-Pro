import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Trash2,
  Globe,
} from 'lucide-react';
import { getStoredApiKey, saveStoredApiKey, testGeminiApiKey } from '../services/clientGemini';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveStoredApiKey(apiKey);
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const result = await testGeminiApiKey(apiKey);
    setIsTesting(false);
    setTestResult(result);
    if (result.ok) {
      saveStoredApiKey(apiKey);
    }
  };

  const handleClear = () => {
    setApiKey('');
    saveStoredApiKey('');
    setTestResult({ ok: true, message: 'Clé retirée. Le mode autonome public est actif.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0b1329] border border-indigo-500/40 rounded-2xl shadow-2xl shadow-indigo-950/80 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0e1938]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Paramètres IA & Clé Gemini</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  GitHub Pages Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Mode autonome actif + Support direct Google Gemini API
              </p>
            </div>
          </div>
          <button
            id="btn-close-api-key-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-200">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Fonctionnement 100% Autonome sur GitHub Pages</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              VerbaMind fonctionne <strong>instantanément sans aucune clé</strong> grâce au moteur public multi-langues intégré.
            </p>
            <p className="text-slate-300 leading-relaxed">
              Pour débloquer la puissance maximale de l&apos;IA (OCR Caméra ultra-précise, restructuration complexe et philologie), vous pouvez insérer votre propre <strong>Clé Google Gemini gratuite</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block font-semibold text-white">
              Clé API Google Gemini (Optionnelle) :
            </label>
            <input
              id="input-gemini-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080e21] border border-slate-700 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult.ok
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/30 border-red-500/40 text-red-200'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              <span>Obtenir une clé Gemini gratuite</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer la clé</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-800 bg-[#0e1938]">
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting || !apiKey.trim()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold transition-colors flex items-center gap-1.5 text-xs"
          >
            {isTesting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Test en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Tester la clé</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold transition-all shadow-md text-xs"
          >
            Enregistrer & Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
