import React, { useState } from 'react';
import { Mail, FileText, Lightbulb, Subtitles, ArrowRight, Sparkles, Copy, Check, Volume2 } from 'lucide-react';
import { UseCaseType, ToneStyle, HistoryItem } from '../types';
import { USE_CASE_PRESETS, LANGUAGES_DATABASE } from '../data/languages';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { speakTextWithBrowser, fetchWithExponentialBackoff } from '../utils/audio';

interface UseCasesViewProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  onOpenTranslatorWithText: (text: string, tone: ToneStyle) => void;
}

export const UseCasesView: React.FC<UseCasesViewProps> = ({ onSaveHistory, onOpenTranslatorWithText }) => {
  const [selectedUseCase, setSelectedUseCase] = useState<UseCaseType>('email');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const currentPreset = USE_CASE_PRESETS.find((p) => p.id === selectedUseCase) || USE_CASE_PRESETS[0];

  const targetLangObj =
    LANGUAGES_DATABASE.find((l) => l.code === targetLang) || {
      code: targetLang,
      name: targetLang,
      nativeName: targetLang,
      flag: '🌐',
      category: 'living',
    };

  const getUseCaseIcon = (id: UseCaseType) => {
    switch (id) {
      case 'email':
        return Mail;
      case 'meeting':
        return FileText;
      case 'creative':
        return Lightbulb;
      case 'subtitles':
        return Subtitles;
      default:
        return Sparkles;
    }
  };

  const handleSelectPreset = (id: UseCaseType) => {
    setSelectedUseCase(id);
    const preset = USE_CASE_PRESETS.find((p) => p.id === id);
    if (preset) {
      setInputText(preset.samplePrompt);
      setOutputText('');
    }
  };

  const handleProcessUseCase = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetchWithExponentialBackoff('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          sourceLang: 'auto',
          targetLang,
          tone: currentPreset.defaultTone,
          useCase: selectedUseCase,
          withPhonetic: false,
        }),
      });
      const data = await res.json();
      setOutputText(data.translatedText || '');

      onSaveHistory({
        sourceText: inputText,
        translatedText: data.translatedText || '',
        sourceLang: 'auto',
        targetLang,
        tone: currentPreset.defaultTone,
        mode: 'text',
      });
    } catch (err) {
      console.error('Use case processing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header Description */}
      <div className="p-6 bg-gradient-to-r from-[#0c1633] via-[#0f1d44] to-[#0a122a] border border-indigo-500/30 rounded-3xl shadow-2xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/40">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cas d&apos;Usage Professionnels & Systèmes Spécialisés</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">
          Assistants Métiers & Scénarios d&apos;Interaction
        </h2>
        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Optimisez vos processus de communication : transformation d&apos;idées brutes en courriels diplomatiques, synthèse de réunions structurées, création de slogans percutants et sous-titrage direct.
        </p>
      </div>

      {/* Preset Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {USE_CASE_PRESETS.filter((p) => p.id !== 'general').map((preset) => {
          const Icon = getUseCaseIcon(preset.id);
          const isSelected = selectedUseCase === preset.id;
          return (
            <button
              key={preset.id}
              id={`btn-usecase-${preset.id}`}
              onClick={() => handleSelectPreset(preset.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-[#14234d] to-[#0d1838] border-indigo-500 text-white ring-1 ring-indigo-500 shadow-xl shadow-indigo-950/60'
                  : 'bg-[#091126]/80 border-slate-800 hover:bg-[#101c3d] hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                  {preset.defaultTone}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">{preset.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{preset.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Workspace for selected Use Case */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input Box */}
        <div className="flex flex-col bg-[#0b142c] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Texte Brut ou Brouillon
            </div>
            <button
              onClick={() => setInputText(currentPreset.samplePrompt)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Charger exemple
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={currentPreset.placeholder}
            rows={7}
            className="w-full bg-[#080e1f] border border-slate-700/80 rounded-xl p-4 text-white placeholder-slate-500 text-sm leading-relaxed focus:outline-none focus:border-indigo-500 font-sans resize-none"
          />

          <div className="flex items-center justify-between pt-2">
            <button
              id="btn-usecase-target-lang"
              onClick={() => setIsTargetModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14234b] border border-indigo-500/30 text-white text-xs font-semibold"
            >
              <span>Langue Cible :</span>
              <span className="text-base">{targetLangObj.flag || '🌐'}</span>
              <span>{targetLangObj.name}</span>
            </button>

            <button
              id="btn-process-usecase"
              onClick={handleProcessUseCase}
              disabled={isLoading || !inputText.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Générer & Traduire</span>
            </button>
          </div>
        </div>

        {/* Output Box */}
        <div className="flex flex-col bg-[#0b142c] border border-indigo-500/30 rounded-2xl p-5 shadow-xl justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Résultat Restructuré ({targetLangObj.name})
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Tonalité : {currentPreset.defaultTone}
              </span>
            </div>

            <div className="min-h-[160px] p-4 rounded-xl bg-[#080e1f] border border-indigo-500/20 text-white text-sm leading-relaxed whitespace-pre-wrap select-text">
              {outputText || (
                <span className="text-slate-500 italic">
                  Le texte optimisé et traduit apparaîtra ici.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <button
                disabled={!outputText}
                onClick={() => speakTextWithBrowser(outputText, targetLang)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all text-xs font-medium flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>Écouter</span>
              </button>

              <button
                disabled={!outputText}
                onClick={() => handleCopy(outputText)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all text-xs font-medium flex items-center gap-1.5"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => onOpenTranslatorWithText(inputText, currentPreset.defaultTone)}
              className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-semibold"
            >
              <span>Continuer dans l&apos;Éditeur</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <LanguageSelectorModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        onSelect={(lang) => setTargetLang(lang.code)}
        currentCode={targetLang}
        isSourceSelector={false}
      />
    </div>
  );
};
