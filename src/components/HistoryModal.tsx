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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-[#0b1329] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-950/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0e1838]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Historique des Traductions</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                  {history.length} entrées
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Consultez, filtrez vos favoris et restaurez vos traductions passées.
              </p>
            </div>
          </div>
          <button
            id="btn-close-history-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Filter */}
        <div className="p-4 border-b border-slate-800 bg-[#080e21] flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="input-search-history"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans l'historique..."
              className="w-full pl-10 pr-3 py-2 bg-[#0f1b38] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                favoritesOnly
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Favoris</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={history.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter JSON</span>
            </button>

            <button
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-red-950/30 hover:bg-red-900/50 text-red-300 border border-red-500/30 disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tout effacer</span>
            </button>
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[50vh]">
          {filteredHistory.map((item) => {
            const Icon = getModeIcon(item.mode);
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[#0e1838] border border-slate-800/80 hover:border-indigo-500/40 transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="p-1 rounded bg-slate-800 text-slate-300">
                      <Icon className="w-3 h-3" />
                    </span>
                    <span className="font-semibold text-white uppercase font-mono">
                      {item.sourceLang} → {item.targetLang}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                      {item.tone}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleFavorite(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleCopy(item.id, item.translatedText)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
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
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all shadow-sm"
                    >
                      Restaurer
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#091126] text-slate-300 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Source :</div>
                    <p className="line-clamp-3">{item.sourceText}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-950/30 text-indigo-100 border border-indigo-500/20 font-medium">
                    <div className="text-[10px] text-indigo-400 uppercase font-semibold mb-1">Traduction :</div>
                    <p className="line-clamp-3">{item.translatedText}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredHistory.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-300">Aucune traduction trouvée</p>
              <p className="text-xs text-slate-500">
                {favoritesOnly
                  ? "Vous n'avez pas encore marqué de favoris."
                  : 'Vos traductions s\'enregistreront automatiquement ici.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#080e21] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
