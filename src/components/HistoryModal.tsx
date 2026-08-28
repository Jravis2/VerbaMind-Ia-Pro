import React, { useState, useMemo } from 'react';
import { X, History, Search, Star, Trash2, Download, Copy, Check, Sparkles, Camera, Mic, FileText } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onToggleFavorite: (id: string) => void;
  onClearHistory: () => void;
  onRestoreItem: (item: HistoryItem) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onToggleFavorite,
  onClearHistory,
  onRestoreItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesFav = !favoritesOnly || item.isFavorite;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.sourceText.toLowerCase().includes(q) ||
        item.translatedText.toLowerCase().includes(q) ||
        item.sourceLang.toLowerCase().includes(q) ||
        item.targetLang.toLowerCase().includes(q);

      return matchesFav && matchesQuery;
    });
  }, [history, favoritesOnly, searchQuery]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `verbamind_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getModeIcon = (mode: HistoryItem['mode']) => {
    switch (mode) {
      case 'ocr':
      case 'live_camera':
        return Camera;
      case 'voice':
        return Mic;
      default:
        return FileText;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92dvh] h-[750px] flex flex-col theme-card rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b theme-card-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl theme-card border flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight flex items-center gap-2">
                <span>Historique des Traductions</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full theme-accent-badge font-semibold">
                  {history.length} entrées
                </span>
              </h2>
              <p className="text-xs theme-text-muted hidden sm:block">
                Consultez, filtrez vos favoris et restaurez vos traductions passées.
              </p>
            </div>
          </div>
          <button
            id="btn-close-history-modal"
            onClick={onClose}
            className="p-2 rounded-xl theme-text-muted hover:theme-text-primary hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Filter */}
        <div className="p-3 sm:p-4 border-b theme-card-subtle flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted" />
            <input
              type="text"
              id="input-search-history"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans l'historique..."
              className="w-full pl-10 pr-3 py-2 theme-input rounded-xl theme-text-primary placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                favoritesOnly
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'theme-card-subtle border theme-text-muted hover:theme-text-primary'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Favoris</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={history.length === 0}
              className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold theme-card-subtle hover:theme-accent-btn border disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exporter JSON</span>
            </button>

            <button
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-red-950/30 hover:bg-red-900/50 text-red-300 border border-red-500/30 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Effacer</span>
            </button>
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {filteredHistory.map((item) => {
            const Icon = getModeIcon(item.mode);
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl theme-card border hover:border-indigo-500/40 transition-all space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs flex-wrap">
                    <span className="p-1 rounded theme-card-subtle theme-text-muted">
                      <Icon className="w-3 h-3" />
                    </span>
                    <span className="font-semibold theme-text-primary uppercase font-mono">
                      {item.sourceLang} → {item.targetLang}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded theme-accent-badge">
                      {item.tone}
                    </span>
                    <span className="theme-text-muted text-[11px]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleFavorite(item.id)}
                      className="p-1.5 rounded-lg theme-text-muted hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          item.isFavorite ? 'fill-amber-400 text-amber-400' : 'theme-text-muted'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleCopy(item.id, item.translatedText)}
                      className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary transition-colors"
                      title="Copier la traduction"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onRestoreItem(item);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold theme-accent-btn transition-all shadow-sm"
                    >
                      Restaurer
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg theme-card-subtle theme-text-muted border">
                    <div className="text-[10px] theme-text-muted uppercase font-semibold mb-1">Source :</div>
                    <p className="line-clamp-3">{item.sourceText}</p>
                  </div>
                  <div className="p-2.5 rounded-lg theme-card-subtle theme-text-primary border font-medium">
                    <div className="text-[10px] text-indigo-400 uppercase font-semibold mb-1">Traduction :</div>
                    <p className="line-clamp-3">{item.translatedText}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredHistory.length === 0 && (
            <div className="py-12 text-center theme-text-muted space-y-2">
              <History className="w-8 h-8 mx-auto theme-text-muted opacity-60" />
              <p className="text-sm font-medium theme-text-primary">Aucune traduction trouvée</p>
              <p className="text-xs theme-text-muted">
                {favoritesOnly
                  ? "Vous n'avez pas encore marqué de favoris."
                  : "Vos traductions s'enregistreront automatiquement ici."}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t theme-card-subtle flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 theme-card border hover:theme-accent-btn theme-text-primary rounded-xl text-xs font-semibold transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
