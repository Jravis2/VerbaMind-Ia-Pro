import React, { useState } from 'react';
import {
  Github,
  Check,
  Copy,
  ExternalLink,
  Globe,
  X,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Share2,
  Settings,
  ArrowRight,
  HelpCircle,
  Zap,
} from 'lucide-react';

interface GitHubDeployGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubDeployGuideModal: React.FC<GitHubDeployGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const targetUrl = 'https://jravis2.github.io/VerbaMind-Ia-Pro/';
  const pagesSettingsUrl = 'https://github.com/jravis2/VerbaMind-Ia-Pro/settings/pages';
  const repoUrl = 'https://github.com/jravis2/VerbaMind-Ia-Pro';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0b142c] border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-[#0d1838]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Publication 100% Mobile & Sans Terminal
              </h2>
              <p className="text-xs text-slate-400">
                Déployez sur GitHub en 2 touches depuis votre téléphone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-sm text-slate-300">
          {/* Target URL Badge */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0f1d42] to-[#141b38] border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Globe className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Votre URL publique</div>
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-cyan-300 hover:underline flex items-center gap-1.5 break-all"
                >
                  {targetUrl}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
            <button
              onClick={() => copyToClipboard(targetUrl)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all self-end sm:self-auto shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>

          {/* Step 1 */}
          <div className="p-4 rounded-2xl bg-[#0d1733] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h3 className="font-bold text-white text-sm">
                Exporter vers GitHub depuis AI Studio
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pl-9">
              Sur votre écran en haut à droite (dans la barre d'AI Studio), appuyez sur le bouton de menu <strong className="text-white">⚙️ (Settings)</strong> ou <strong className="text-white">Share / Export</strong>, puis touchez <strong className="text-indigo-300">« Export to GitHub »</strong>.
            </p>
            <div className="ml-9 p-3 rounded-xl bg-[#080d1e] border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Tous les fichiers ainsi que le script de déploiement automatique (<code className="text-indigo-300">.github/workflows/deploy.yml</code>) seront synchronisés sur votre dépôt <strong className="text-white">jravis2/VerbaMind-Ia-Pro</strong>.
              </span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl bg-[#0d1733] border border-slate-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h3 className="font-bold text-white text-sm">
                Activer GitHub Pages sur votre téléphone
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed pl-9">
              Ouvrez les réglages de votre dépôt GitHub directement dans votre navigateur mobile (Safari, Chrome) :
            </p>

            <div className="ml-9 space-y-2.5">
              <a
                href={pagesSettingsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
              >
                <Settings className="w-4 h-4" />
                <span>Ouvrir les Réglages Pages sur GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="p-3 rounded-xl bg-[#080d1e] border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-white">Une fois sur la page :</div>
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>Dans la section <strong>Build and deployment &gt; Source</strong></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>
                    Sélectionnez simplement : <strong className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">GitHub Actions</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl bg-[#0d1733] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                ✓
              </span>
              <h3 className="font-bold text-white text-sm">
                Publication automatique en 30 secondes
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pl-9">
              Dès l'exportation, GitHub compile l'application et la met en ligne automatiquement. Votre application sera disponible en direct sur :
            </p>
            <div className="ml-9">
              <a
                href={targetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-semibold text-emerald-400 hover:underline flex items-center gap-1"
              >
                {targetUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#0d1838] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Aucune commande, aucun terminal requis</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
          >
            Compris !
          </button>
        </div>
      </div>
    </div>
  );
};
