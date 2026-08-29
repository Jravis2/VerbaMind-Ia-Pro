import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Share2,
  Scan,
  Sparkles,
  Camera,
  Layers,
  FileImage,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { downloadImage, copyImageToClipboard } from '../utils/screenshotService';
import { triggerHapticFeedback, playUiChime } from '../utils/appSettings';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotUrl: string | null;
  onRetake?: () => void;
  onSendToOcr?: (imageDataUrl: string) => void;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  screenshotUrl,
  onRetake,
  onSendToOcr,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  if (!isOpen || !screenshotUrl) return null;

  const handleCopy = async () => {
    triggerHapticFeedback(20);
    playUiChime('click');
    const ok = await copyImageToClipboard(screenshotUrl);
    if (ok) {
      setCopied(true);
      playUiChime('success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    triggerHapticFeedback(25);
    playUiChime('success');
    downloadImage(screenshotUrl);
  };

  const handleShare = async () => {
    triggerHapticFeedback(15);
    try {
      const res = await fetch(screenshotUrl);
      const blob = await res.blob();
      const file = new File([blob], 'VerbaMind_Capture.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Capture d’écran VerbaMind Pro',
          text: 'Capture réalisée depuis VerbaMind AI Pro',
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      } else {
        handleCopy();
      }
    } catch (e) {
      console.warn('Share not supported, copied instead');
      handleCopy();
    }
  };

  const handleSendToOcr = () => {
    triggerHapticFeedback(25);
    playUiChime('click');
    if (onSendToOcr && screenshotUrl) {
      onSendToOcr(screenshotUrl);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn no-screenshot"
      onClick={onClose}
    >
      <div
        id="screenshot-preview-modal"
        className="w-full max-w-3xl theme-card border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b theme-border-subtle bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black theme-text-primary tracking-tight">
                  Capture d’écran Réussie
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  PNG HD
                </span>
              </div>
              <p className="text-xs theme-text-muted">
                Capture instantanée de l'application VerbaMind
              </p>
            </div>
          </div>

          <button
            id="btn-close-screenshot-modal"
            onClick={onClose}
            className="p-2 rounded-xl theme-card-subtle theme-text-muted hover:theme-text-primary transition-all"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="flex-1 p-3 sm:p-5 overflow-auto flex items-center justify-center bg-black/30 min-h-[220px]">
          <div className="relative max-w-full max-h-[55vh] rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-slate-950 flex items-center justify-center group">
            <img
              src={screenshotUrl}
              alt="Capture d'écran"
              className="max-w-full max-h-[55vh] object-contain rounded-xl"
            />
            <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-mono text-cyan-300 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
              Haute Définition
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 border-t theme-border-subtle bg-slate-900/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onRetake && (
              <button
                id="btn-retake-screenshot"
                onClick={() => {
                  onClose();
                  setTimeout(onRetake, 300);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl theme-card border theme-text-primary text-xs font-bold transition-all hover:bg-white/5"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>Reprendre</span>
              </button>
            )}

            {onSendToOcr && (
              <button
                id="btn-ocr-screenshot"
                onClick={handleSendToOcr}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold transition-all hover:scale-105"
                title="Extraire le texte et traduire la capture"
              >
                <Scan className="w-4 h-4 text-cyan-400" />
                <span>Traduire le texte (OCR)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-share-screenshot"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl theme-card border theme-text-primary text-xs font-bold transition-all hover:border-cyan-500/40"
              title="Partager ou copier"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">Partager</span>
            </button>

            <button
              id="btn-copy-screenshot"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'theme-card theme-text-primary hover:border-indigo-500/40'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-indigo-400" />
                  <span>Copier</span>
                </>
              )}
            </button>

            <button
              id="btn-download-screenshot"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
