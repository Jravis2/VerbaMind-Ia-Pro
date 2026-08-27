import React, { useState, useMemo } from 'react';
import { Search, X, Check, Globe, Sparkles, History, MapPin, Feather } from 'lucide-react';
import { Language, LanguageCategory } from '../types';
import { LANGUAGES_DATABASE, POPULAR_LANGUAGES_CODES } from '../data/languages';

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lang: Language | { code: 'auto'; name: string; nativeName: string; category: 'living' }) => void;
  currentCode: string;
  isSourceSelector?: boolean;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentCode,
  isSourceSelector = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LanguageCategory | 'all'>('all');

  const popularLanguages = useMemo(() => {
    return LANGUAGES_DATABASE.filter((lang) => POPULAR_LANGUAGES_CODES.includes(lang.code));
  }, []);

  const filteredLanguages = useMemo(() => {
    return LANGUAGES_DATABASE.filter((lang) => {
      const matchesCategory = selectedCategory === 'all' || lang.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q) ||
        (lang.eraOrRegion && lang.eraOrRegion.toLowerCase().includes(q)) ||
        (lang.script && lang.script.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const categories: { id: LanguageCategory | 'all'; label: string; icon: any; count: number }[] = [
    { id: 'all', label: 'Toutes les langues', icon: Globe, count: LANGUAGES_DATABASE.length + (isSourceSelector ? 1 : 0) },
    { id: 'living', label: 'Langues Vivantes', icon: Sparkles, count: LANGUAGES_DATABASE.filter((l) => l.category === 'living').length },
    { id: 'ancient', label: 'Anciennes & Mortes', icon: History, count: LANGUAGES_DATABASE.filter((l) => l.category === 'ancient').length },
    { id: 'regional', label: 'Régionales & Minoritaires', icon: MapPin, count: LANGUAGES_DATABASE.filter((l) => l.category === 'regional').length },
    { id: 'constructed', label: 'Construites & Fiction', icon: Feather, count: LANGUAGES_DATABASE.filter((l) => l.category === 'constructed').length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0b1329] border border-indigo-500/20 rounded-2xl shadow-2xl shadow-indigo-950/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-[#0d1733]">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-indigo-400" />
              <span>{isSourceSelector ? 'Sélectionner la langue source' : 'Sélectionner la langue cible'}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
                +200 Langues
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Prise en charge universelle : langues vivantes mondiales, dialectes anciens, langues régionales et univers construits.
            </p>
          </div>
          <button
            id="btn-close-lang-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar & Categories filter */}
        <div className="p-5 border-b border-slate-800/80 bg-[#080e21] space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="input-search-languages"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une langue, un pays, un dialecte, un script (ex: Latin, Wolof, Klingon, Hiéroglyphes)..."
              className="w-full pl-11 pr-4 py-3 bg-[#0f1b38] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Categories Tab Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  id={`tab-category-${cat.id}`}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-700/60 text-slate-400'}`}>
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Popular Access Badges */}
          {!searchQuery && selectedCategory === 'all' && (
            <div className="pt-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Accès Rapide & Fréquents
              </div>
              <div className="flex flex-wrap gap-1.5">
                {isSourceSelector && (
                  <button
                    onClick={() => {
                      onSelect({ code: 'auto', name: 'Détection Automatique', nativeName: 'Auto Detect', category: 'living' });
                      onClose();
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-all ${
                      currentCode === 'auto'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Détection Automatique</span>
                  </button>
                )}
                {popularLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onSelect(lang);
                      onClose();
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-all ${
                      currentCode === lang.code
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{lang.flag || '🌐'}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Language Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[50vh]">
          {isSourceSelector && selectedCategory === 'all' && !searchQuery && (
            <button
              onClick={() => {
                onSelect({ code: 'auto', name: 'Détection Automatique', nativeName: 'Auto Detect', category: 'living' });
                onClose();
              }}
              className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
                currentCode === 'auto'
                  ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500'
                  : 'bg-[#0f1b38]/60 border-slate-800 hover:bg-[#142347] hover:border-slate-700 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                    Détection Automatique
                  </div>
                  <div className="text-xs text-slate-400">Identifie instantanément le texte</div>
                </div>
              </div>
              {currentCode === 'auto' && <Check className="w-4 h-4 text-indigo-400 mt-1" />}
            </button>
          )}

          {filteredLanguages.map((lang) => {
            const isSelected = currentCode === lang.code;
            return (
              <button
                key={lang.code}
                id={`btn-lang-${lang.code}`}
                onClick={() => {
                  onSelect(lang);
                  onClose();
                }}
                className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all group ${
                  isSelected
                    ? 'bg-indigo-950/80 border-indigo-500 text-white ring-1 ring-indigo-500 shadow-md shadow-indigo-950/60'
                    : 'bg-[#0f1b38]/40 border-slate-800/80 hover:bg-[#152349] hover:border-indigo-500/40 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="text-2xl select-none leading-none pt-0.5">{lang.flag || '🌐'}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                      <span className="text-white group-hover:text-indigo-200 transition-colors">{lang.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                        {lang.code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">{lang.nativeName}</div>
                    {(lang.eraOrRegion || lang.script) && (
                      <div className="text-[11px] text-indigo-400/80 truncate mt-1 flex items-center gap-1">
                        <span>{lang.eraOrRegion || lang.script}</span>
                      </div>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2 mt-1" />}
              </button>
            );
          })}

          {filteredLanguages.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
              <Globe className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <p className="text-base font-medium text-slate-300">Aucune langue trouvée pour &quot;{searchQuery}&quot;</p>
              <p className="text-xs text-slate-500 mt-1">Essayez avec un nom de région, d&apos;époque ou de dialecte.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080e21] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Moteur Linguistique VerbaMind AI Pro v2.5 Flash activé</span>
          </div>
          <div>{LANGUAGES_DATABASE.length} langues indexées</div>
        </div>
      </div>
    </div>
  );
};
