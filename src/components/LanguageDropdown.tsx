import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Globe, Sparkles, Check, ChevronDown, X } from 'lucide-react';
import { Language, LanguageCategory } from '../types';
import { LANGUAGES_DATABASE, POPULAR_LANGUAGES_CODES } from '../data/languages';

interface LanguageDropdownProps {
  idPrefix: string;
  selectedCode: string;
  onSelect: (langCode: string) => void;
  onOpenFullModal: () => void;
  isSource?: boolean;
  detectedLangName?: string;
  detectedLangCode?: string;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  idPrefix,
  selectedCode,
  onSelect,
  onOpenFullModal,
  isSource = false,
  detectedLangName,
  detectedLangCode,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LanguageCategory | 'all'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Current selected object
  const currentObj = useMemo(() => {
    if (selectedCode === 'auto') {
      return {
        code: 'auto',
        name: 'Détection Automatique',
        nativeName: 'Auto Detect',
        flag: '✨',
      };
    }
    const found = LANGUAGES_DATABASE.find((l) => l.code === selectedCode);
    return found || {
      code: selectedCode,
      name: selectedCode,
      nativeName: selectedCode,
      flag: '🌐',
    };
  }, [selectedCode]);

  // Filtered languages based on search query and category
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return LANGUAGES_DATABASE.filter((lang) => {
      const matchesCategory = selectedCategory === 'all' || lang.category === selectedCategory;
      if (!q) return matchesCategory;

      const matches =
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q) ||
        (lang.eraOrRegion && lang.eraOrRegion.toLowerCase().includes(q)) ||
        (lang.script && lang.script.toLowerCase().includes(q));

      return matchesCategory && matches;
    });
  }, [searchQuery, selectedCategory]);

  const handleSelectLanguage = (code: string) => {
    onSelect(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Main Trigger Button */}
      <button
        id={`${idPrefix}-trigger`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14234b] hover:bg-[#1a2d5e] border border-indigo-500/30 hover:border-indigo-400 text-white text-xs font-semibold transition-all shadow-sm group"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none select-none">{currentObj.flag || '🌐'}</span>
        <span className="truncate max-w-[140px] sm:max-w-[180px] text-left">{currentObj.name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-indigo-300 group-hover:text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu with Search Input */}
      {isOpen && (
        <div
          id={`${idPrefix}-menu`}
          className="absolute left-0 mt-2 w-80 sm:w-96 max-w-[90vw] bg-[#0b1329] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-950/80 z-50 overflow-hidden animate-fade-in backdrop-blur-xl"
        >
          {/* Search Header */}
          <div className="p-3 border-b border-slate-800 bg-[#0d1838]/90 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
              <input
                ref={searchInputRef}
                id={`${idPrefix}-search-input`}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer parmi les +200 langues..."
                className="w-full pl-9 pr-8 py-2 bg-[#080e21] border border-slate-700/80 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Category Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Toutes ({LANGUAGES_DATABASE.length + (isSource ? 1 : 0)})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('living')}
                className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === 'living'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Vivantes
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('ancient')}
                className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === 'ancient'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Anciennes
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('regional')}
                className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === 'regional'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Régionales
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('constructed')}
                className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === 'constructed'
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                Construites
              </button>
            </div>
          </div>

          {/* Languages List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
            {/* Auto-detect option for source language */}
            {isSource && selectedCategory === 'all' && (!searchQuery || 'auto detect détection automatique'.includes(searchQuery.toLowerCase())) && (
              <button
                type="button"
                id={`${idPrefix}-opt-auto`}
                onClick={() => handleSelectLanguage('auto')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                  selectedCode === 'auto'
                    ? 'bg-indigo-600/30 text-white border border-indigo-500/40 font-medium'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-white">Détection Automatique</span>
                    {detectedLangName && (
                      <span className="ml-1.5 text-[11px] text-indigo-300">
                        ({detectedLangName})
                      </span>
                    )}
                  </div>
                </div>
                {selectedCode === 'auto' && <Check className="w-4 h-4 text-indigo-400" />}
              </button>
            )}

            {filteredLanguages.map((lang) => {
              const isSelected = selectedCode === lang.code;
              return (
                <button
                  type="button"
                  key={lang.code}
                  id={`${idPrefix}-opt-${lang.code}`}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/30 text-white border border-indigo-500/40 font-medium'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-lg select-none leading-none">{lang.flag || '🌐'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-white">{lang.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-800/80 px-1 py-0.2 rounded">
                          {lang.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{lang.nativeName}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />}
                </button>
              );
            })}

            {filteredLanguages.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                <Globe className="w-6 h-6 mx-auto text-slate-600 mb-1.5" />
                Aucune langue trouvée pour &quot;{searchQuery}&quot;
              </div>
            )}
          </div>

          {/* Footer with modal expander button */}
          <div className="p-2 border-t border-slate-800 bg-[#080e21] flex items-center justify-between text-[11px]">
            <span className="text-slate-400 pl-2">
              {filteredLanguages.length} langues trouvées
            </span>
            <button
              type="button"
              id={`${idPrefix}-btn-open-full-modal`}
              onClick={() => {
                setIsOpen(false);
                onOpenFullModal();
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 hover:text-white transition-colors font-medium flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              <span>Voir tout en grand</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
