import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Database,
  Search,
  Plus,
  Trash2,
  Star,
  Download,
  Upload,
  Volume2,
  Check,
  Copy,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  HardDrive,
  BookOpen,
  WifiOff,
  Zap,
} from 'lucide-react';
import { OfflineLexiconEntry, OfflinePack } from '../types';
import {
  getOfflineLexicon,
  saveToOfflineLexicon,
  deleteOfflineEntry,
  toggleStarOfflineEntry,
  clearOfflineLexicon,
  installOfflinePack,
  getInstalledPackIds,
  exportOfflineLexicon,
  importOfflineLexicon,
  getOfflineStats,
  translateOffline,
} from '../services/offlineStorageService';
import { PRELOADED_OFFLINE_PACKS } from '../data/offlineDictionary';
import { speakTextWithBrowser } from '../utils/audio';
import { LANGUAGES_DATABASE } from '../data/languages';
import { playUiChime, triggerHapticFeedback } from '../utils/appSettings';

interface OfflineLexiconModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline?: boolean;
}

export const OfflineLexiconModal: React.FC<OfflineLexiconModalProps> = ({
  isOpen,
  onClose,
  isOnline = true,
}) => {
  const [entries, setEntries] = useState<OfflineLexiconEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLangPair, setFilterLangPair] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'words' | 'add' | 'packs' | 'test'>('words');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [installedPacks, setInstalledPacks] = useState<string[]>([]);

  // Add form states
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newSourceLang, setNewSourceLang] = useState('fr');
  const [newTargetLang, setNewTargetLang] = useState('en');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newCategory, setNewCategory] = useState('Vocabulaire');

  // Test Simulator state
  const [testInput, setTestInput] = useState('bonjour mon ami');
  const [testSourceLang, setTestSourceLang] = useState('fr');
  const [testTargetLang, setTestTargetLang] = useState('en');

  // Load entries and installed packs
  const refreshData = () => {
    const list = getOfflineLexicon();
    setEntries([...list]);
    setInstalledPacks(getInstalledPackIds());
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  // Listen to cross-app updates
  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('verbamind-offline-lexicon-updated', handleUpdate);
    return () => window.removeEventListener('verbamind-offline-lexicon-updated', handleUpdate);
  }, []);

  const stats = useMemo(() => getOfflineStats(), [entries]);

  // Distinct language pairs for filter
  const langPairs = useMemo(() => {
    const pairs = new Set<string>();
    entries.forEach((e) => pairs.add(`${e.sourceLang}->${e.targetLang}`));
    return Array.from(pairs);
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesSearch =
        !searchQuery ||
        e.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.translatedText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.category && e.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLang =
        filterLangPair === 'all' || `${e.sourceLang}->${e.targetLang}` === filterLangPair;

      const matchesTag =
        selectedTag === 'all'
          ? true
          : selectedTag === 'starred'
          ? Boolean(e.isStarred)
          : selectedTag === 'custom'
          ? Boolean(e.isCustom)
          : e.category === selectedTag || (e.tags && e.tags.includes(selectedTag));

      return matchesSearch && matchesLang && matchesTag;
    });
  }, [entries, searchQuery, filterLangPair, selectedTag]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Add custom word
  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) return;

    saveToOfflineLexicon(
      newSource.trim(),
      newTarget.trim(),
      newSourceLang,
      newTargetLang,
      newPhonetic.trim() || undefined,
      true,
      newCategory.trim() || 'Vocabulaire',
      ['Ajout Manuel', newCategory.trim() || 'Vocabulaire']
    );

    setNewSource('');
    setNewTarget('');
    setNewPhonetic('');
    refreshData();
    playUiChime('success');
    triggerHapticFeedback(15);
    showToast('Mot enregistré avec succès dans la mémoire hors ligne !');
    setActiveTab('words');
  };

  // Install pack
  const handleInstallPack = (pack: OfflinePack) => {
    const added = installOfflinePack(pack.id);
    refreshData();
    playUiChime('success');
    triggerHapticFeedback(20);
    showToast(`Pack "${pack.name}" installé (${added} nouveaux mots ajoutés) !`);
  };

  // Toggle star
  const handleToggleStar = (id: string) => {
    toggleStarOfflineEntry(id);
    refreshData();
    triggerHapticFeedback(10);
  };

  // Delete
  const handleDelete = (id: string) => {
    deleteOfflineEntry(id);
    refreshData();
    playUiChime('delete');
  };

  // Copy
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copié dans le presse-papier');
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Clear all
  const handleClearAll = () => {
    if (confirm('Voulez-vous vraiment effacer tous les mots enregistrés dans la mémoire hors ligne ?')) {
      clearOfflineLexicon();
      refreshData();
      showToast('Mémoire hors ligne réinitialisée.');
    }
  };

  // File import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const count = importOfflineLexicon(content);
        refreshData();
        showToast(`${count} mots importés avec succès !`);
      } catch (err) {
        alert('Format de fichier invalide. Veuillez importer un fichier JSON valide.');
      }
    };
    reader.readAsText(file);
  };

  // Offline test simulation
  const testResult = useMemo(() => {
    if (!testInput.trim()) return null;
    return translateOffline(testInput, testSourceLang, testTargetLang);
  }, [testInput, testSourceLang, testTargetLang, entries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm shadow-2xl flex items-center gap-2 border border-emerald-400"
          >
            <Check className="w-4 h-4 text-white" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400/40">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Dictionnaire & Mémoire Hors Ligne
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Auto-Enregistrement Actif
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tous les mots et phrases traduits sont instantanément mémorisés pour une disponibilité totale sans Internet.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Quick Metrics Bar */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span><strong>{stats.totalEntries}</strong> mots & expressions mémorisés</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>{stats.storageKb} Ko local</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 font-medium">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>{stats.starredCount} favoris</span>
            </div>
          </div>

          {/* Export / Import & Clear buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportOfflineLexicon('json')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-all"
              title="Exporter la mémoire en JSON"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => exportOfflineLexicon('csv')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 border border-slate-700 transition-all"
              title="Exporter au format tableur CSV"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>CSV</span>
            </button>

            <label className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer transition-all">
              <Upload className="w-3 h-3 text-amber-400" />
              <span>Importer</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-900">
          <button
            onClick={() => setActiveTab('words')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'words'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mots Enregistrés ({filteredEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('packs')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'packs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Packs Thématiques Hors Ligne</span>
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un Mot Manuel</span>
          </button>

          <button
            onClick={() => setActiveTab('test')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'test'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulateur Hors Ligne</span>
          </button>
        </div>

        {/* Tab 1: Words & Search Table */}
        {activeTab === 'words' && (
          <div className="flex-1 flex flex-col p-5 overflow-hidden gap-4">
            {/* Search & Quick Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un mot source ou une traduction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Language Pair Selector */}
              {langPairs.length > 0 && (
                <select
                  aria-label="Filtrer par paire de langues"
                  value={filterLangPair}
                  onChange={(e) => setFilterLangPair(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-700/80 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="all">Toutes les langues ({entries.length})</option>
                  {langPairs.map((pair) => (
                    <option key={pair} value={pair}>
                      {pair.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}

              {/* Tag / Category Filter */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedTag('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedTag === 'all'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setSelectedTag('starred')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    selectedTag === 'starred'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Star className="w-3 h-3" />
                  <span>Favoris</span>
                </button>
                <button
                  onClick={() => setSelectedTag('custom')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedTag === 'custom'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Manuels
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[300px]">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Database className="w-10 h-10 mx-auto text-slate-600" />
                  <div className="text-sm font-semibold">Aucun mot trouvé</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Traduisez du texte dans l&apos;application pour l&apos;enregistrer automatiquement, ou installez un pack ci-dessus.
                  </p>
                </div>
              ) : (
                filteredEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{item.sourceText}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-bold text-cyan-300 text-sm">{item.translatedText}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 uppercase font-mono font-bold text-[10px]">
                          {item.sourceLang} → {item.targetLang}
                        </span>
                        {item.phonetic && (
                          <span className="font-mono text-indigo-300">[{item.phonetic}]</span>
                        )}
                        {item.category && (
                          <span className="text-slate-500">• {item.category}</span>
                        )}
                        <span className="text-slate-600 text-[10px]">
                          (utilisé {item.usageCount} fois)
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => speakTextWithBrowser(item.translatedText, item.targetLang)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                        title="Écouter la prononciation"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleCopy(item.translatedText, item.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copier la traduction"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleStar(item.id)}
                        className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${
                          item.isStarred ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'
                        }`}
                        title={item.isStarred ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Star className={`w-4 h-4 ${item.isStarred ? 'fill-amber-400' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                        title="Supprimer ce mot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>{filteredEntries.length} mots affichés sur {entries.length} au total</span>
              {entries.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-red-400 hover:text-red-300 underline text-[11px]"
                >
                  Vider toute la mémoire hors ligne
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Preloaded Linguistic Packs */}
        {activeTab === 'packs' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                <span>Packs de Vocabulaire Clé en Main</span>
              </h3>
              <p className="text-xs text-slate-400">
                Téléchargez des ensembles complets de vocabulaire pour garantir une traduction 100% autonome sans connexion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {PRELOADED_OFFLINE_PACKS.map((pack) => {
                const isInstalled = installedPacks.includes(pack.id);
                return (
                  <div
                    key={pack.id}
                    className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white text-sm">{pack.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                          {pack.sourceLang.toUpperCase()} ⇄ {pack.targetLang.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{pack.description}</p>
                      <div className="text-[11px] text-cyan-400 mt-2 font-medium">
                        ✦ {pack.entries.length} expressions pré-chargées
                      </div>
                    </div>

                    <button
                      onClick={() => handleInstallPack(pack)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        isInstalled
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      }`}
                    >
                      {isInstalled ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Réinstaller / Mettre à jour ({pack.entries.length} mots)</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Installer le Pack ({pack.entries.length} mots)</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Manual Word Addition */}
        {activeTab === 'add' && (
          <form onSubmit={handleAddWord} className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Ajouter une Entrée Manuelle au Dictionnaire Hors Ligne</span>
              </h3>
              <p className="text-xs text-slate-400">
                Enrichissez votre base lexicale personnelle avec vos propres termes techniques ou formules favorites.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Langue Source
                </label>
                <select
                  value={newSourceLang}
                  onChange={(e) => setNewSourceLang(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {LANGUAGES_DATABASE.slice(0, 20).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Langue Cible
                </label>
                <select
                  value={newTargetLang}
                  onChange={(e) => setNewTargetLang(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {LANGUAGES_DATABASE.slice(0, 20).map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Texte / Mot Source *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex. Réunion d'équipe"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Traduction Cible *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex. Team meeting"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Transcription Phonétique (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="ex. tiːm ˈmiːtɪŋ"
                  value={newPhonetic}
                  onChange={(e) => setNewPhonetic(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Catégorie / Thème
                </label>
                <input
                  type="text"
                  placeholder="ex. Affaires, Voyage, Médical"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer dans la mémoire locale</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Offline Translation Simulator */}
        {activeTab === 'test' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4 custom-scrollbar">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Simulateur de Traduction 100% Hors Ligne</span>
              </h3>
              <p className="text-xs text-slate-400">
                Testez comment le moteur linguistique résout les phrases complètes et les mots inconnus uniquement via votre mémoire locale.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Langue Source</label>
                <select
                  value={testSourceLang}
                  onChange={(e) => setTestSourceLang(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="fr">🇫🇷 Français</option>
                  <option value="en">🇺🇸 Anglais</option>
                  <option value="es">🇪🇸 Espagnol</option>
                  <option value="de">🇩🇪 Allemand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Langue Cible</label>
                <select
                  value={testTargetLang}
                  onChange={(e) => setTestTargetLang(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="en">🇺🇸 Anglais</option>
                  <option value="fr">🇫🇷 Français</option>
                  <option value="es">🇪🇸 Espagnol</option>
                  <option value="de">🇩🇪 Allemand</option>
                  <option value="ja">🇯🇵 Japonais</option>
                  <option value="ar">🇸🇦 Arabe</option>
                  <option value="la">🏛️ Latin</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Saisissez une phrase pour tester la résolution hors ligne :
              </label>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Tapez n'importe quel mot ou phrase..."
                className="w-full p-3 bg-slate-950/60 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                rows={3}
              />
            </div>

            {/* Test result output */}
            {testResult && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Résultat Hors Ligne Résolu :</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      testResult.matchType === 'exact'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : testResult.matchType === 'word_by_word'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : testResult.matchType === 'partial'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {testResult.matchType === 'exact'
                      ? '✦ Correspondance Exacte'
                      : testResult.matchType === 'word_by_word'
                      ? '✦ Traduction Mot à Mot Intégrale'
                      : testResult.matchType === 'partial'
                      ? `✦ Partiel (${testResult.matchedWordsCount}/${testResult.totalWordsCount} mots reconnus)`
                      : 'Non répertorié'}
                  </span>
                </div>

                <div className="text-base font-bold text-cyan-300 font-sans">
                  {testResult.translatedText || testInput}
                </div>

                {testResult.phonetic && (
                  <div className="text-xs text-indigo-300 font-mono">
                    Transcription : [{testResult.phonetic}]
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
