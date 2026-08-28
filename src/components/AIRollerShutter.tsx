import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Bot,
  UserCheck,
  ShieldAlert,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ArrowDownToLine,
  ArrowUpFromLine,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
  Gauge,
  Flame,
  Wand2,
  Sparkle,
  Zap,
  BookOpen,
  ArrowRight,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  AIToolId,
  AIDetectionResponse,
  AIHumanizerResponse,
  AIPlagiarismResponse,
  AISummaryResponse,
  AIParaphraseResponse,
  AIGrammarResponse,
} from '../types';
import {
  detectAIContent,
  humanizeText,
  checkPlagiarism,
  summarizeText,
  paraphraseText,
  checkGrammarAndSpelling,
} from '../services/aiToolsService';

interface AIRollerShutterProps {
  isOpen: boolean;
  onToggle: () => void;
  editorText: string;
  onApplyToEditor: (text: string) => void;
}

export const AIRollerShutter: React.FC<AIRollerShutterProps> = ({
  isOpen,
  onToggle,
  editorText,
  onApplyToEditor,
}) => {
  const [activeTab, setActiveTab] = useState<AIToolId>('detector');
  const [inputText, setInputText] = useState(editorText || '');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Tool Specific Options
  const [humanizeIntensity, setHumanizeIntensity] = useState<'light' | 'balanced' | 'ultra'>('balanced');
  const [humanizeTone, setHumanizeTone] = useState<string>('naturel');
  const [summaryFormat, setSummaryFormat] = useState<'bullets' | 'executive' | 'one_sentence' | 'action_items'>('bullets');
  const [summaryLength, setSummaryLength] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [paraphraseStyle, setParaphraseStyle] = useState<'fluent' | 'professional' | 'creative' | 'concise' | 'expanded' | 'anti_repetition'>('fluent');

  // Tool Results
  const [detectionResult, setDetectionResult] = useState<AIDetectionResponse | null>(null);
  const [humanizerResult, setHumanizerResult] = useState<AIHumanizerResponse | null>(null);
  const [plagiarismResult, setPlagiarismResult] = useState<AIPlagiarismResponse | null>(null);
  const [summaryResult, setSummaryResult] = useState<AISummaryResponse | null>(null);
  const [paraphraseResult, setParaphraseResult] = useState<AIParaphraseResponse | null>(null);
  const [grammarResult, setGrammarResult] = useState<AIGrammarResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync editorText when shutter opens or changes if empty
  useEffect(() => {
    if (editorText && !inputText) {
      setInputText(editorText);
    }
  }, [editorText, isOpen]);

  const handleImportFromEditor = () => {
    if (editorText) {
      setInputText(editorText);
    }
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = (text: string) => {
    if (!text) return;
    onApplyToEditor(text);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  // Run the currently active tool
  const handleRunTool = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Veuillez saisir ou importer un texte à traiter.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (activeTab === 'detector') {
        const res = await detectAIContent(inputText);
        setDetectionResult(res);
      } else if (activeTab === 'humanizer') {
        const res = await humanizeText(inputText, humanizeIntensity, humanizeTone);
        setHumanizerResult(res);
      } else if (activeTab === 'plagiarism') {
        const res = await checkPlagiarism(inputText);
        setPlagiarismResult(res);
      } else if (activeTab === 'summarizer') {
        const res = await summarizeText(inputText, summaryFormat, summaryLength);
        setSummaryResult(res);
      } else if (activeTab === 'paraphraser') {
        const res = await paraphraseText(inputText, paraphraseStyle);
        setParaphraseResult(res);
      } else if (activeTab === 'grammar') {
        const res = await checkGrammarAndSpelling(inputText);
        setGrammarResult(res);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue lors du traitement.');
    } finally {
      setIsLoading(false);
    }
  };

  // Tool Definitions
  const tools = [
    {
      id: 'detector' as AIToolId,
      name: 'Détection IA',
      short: 'Détecteur IA',
      icon: Bot,
      color: 'from-amber-500 to-orange-600',
      badge: 'Audit & Perplexité',
    },
    {
      id: 'humanizer' as AIToolId,
      name: 'Humaniseur IA',
      short: 'Humaniseur',
      icon: Wand2,
      color: 'from-emerald-500 to-teal-600',
      badge: 'Indétectable 100%',
    },
    {
      id: 'plagiarism' as AIToolId,
      name: 'Vérificateur de Plagiat',
      short: 'Anti-Plagiat',
      icon: ShieldAlert,
      color: 'from-rose-500 to-pink-600',
      badge: 'Originalité Web',
    },
    {
      id: 'summarizer' as AIToolId,
      name: 'Résumeur IA',
      short: 'Résumeur',
      icon: FileText,
      color: 'from-blue-500 to-cyan-600',
      badge: 'TL;DR & Points Clés',
    },
    {
      id: 'paraphraser' as AIToolId,
      name: 'Paraphraseur Multi-Styles',
      short: 'Paraphraseur',
      icon: RefreshCw,
      color: 'from-violet-500 to-purple-600',
      badge: '6 Registres',
    },
    {
      id: 'grammar' as AIToolId,
      name: 'Orthographe & Grammaire',
      short: 'Grammaire & Fautes',
      icon: CheckCircle2,
      color: 'from-indigo-500 to-blue-600',
      badge: 'Audit & Accords',
    },
  ];

  return (
    <div className="w-full mb-4">
      {/* Mechanical Roller Shutter Header Bar / Shutter Handle */}
      <div className="relative z-20">
        <button
          onClick={onToggle}
          id="btn-toggle-roller-shutter"
          className={`w-full py-2.5 px-4 rounded-2xl border transition-all flex items-center justify-between shadow-lg group select-none relative overflow-hidden ${
            isOpen
              ? 'theme-card border-indigo-500/50 shadow-indigo-500/10'
              : 'theme-card-subtle border-indigo-500/30 hover:border-indigo-500/60'
          }`}
        >
          {/* Shutter Slats Visual Texture effect */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_4px]" />

          <div className="flex items-center gap-3 relative z-10">
            {/* LED Status Light */}
            <div className="relative flex items-center justify-center">
              <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
              {isOpen && <span className="absolute w-4 h-4 rounded-full bg-emerald-400/30 animate-ping" />}
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold theme-text-primary tracking-wide flex items-center gap-1.5">
                    <span>Volet Roulant IA Pro</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold uppercase">
                      6 Outils Avancés
                    </span>
                  </span>
                </div>
                <p className="text-[11px] theme-text-muted hidden xs:block">
                  Détection IA, Humaniseur, Anti-Plagiat, Résumeur, Paraphraseur & Correcteur
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <span className="text-xs font-semibold theme-text-muted group-hover:theme-text-primary transition-colors hidden sm:inline">
              {isOpen ? 'Enrouler le volet' : 'Dérouler le volet'}
            </span>
            <div className={`p-1 rounded-lg border theme-card-subtle transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400'}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>

      {/* Roller Shutter Sliding Panel (Curtain Animation) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, scaleY: 0.95 }}
            animate={{ height: 'auto', opacity: 1, scaleY: 1 }}
            exit={{ height: 0, opacity: 0, scaleY: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden relative z-10"
          >
            {/* Shutter Body Container */}
            <div className={`mt-2 rounded-2xl border theme-card shadow-2xl p-3 sm:p-5 relative transition-all ${
              isMaximized ? 'fixed inset-4 z-50 overflow-y-auto max-h-[95vh]' : ''
            }`}>
              {/* Slats visual background watermark */}
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Shutter Header Tools Navigation Tab Pills */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b theme-card-subtle mb-4">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
                  {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isActive = activeTab === tool.id;
                    return (
                      <button
                        key={tool.id}
                        id={`shutter-tab-${tool.id}`}
                        onClick={() => {
                          setActiveTab(tool.id);
                          setErrorMessage(null);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                          isActive
                            ? 'theme-accent-btn shadow-md ring-1 ring-white/20'
                            : 'theme-card-subtle theme-text-muted hover:theme-text-primary border'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                        <span>{tool.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                          isActive ? 'bg-white/20 text-white' : 'theme-card-subtle opacity-75'
                        }`}>
                          {tool.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1 shrink-0 pl-2">
                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-1.5 rounded-lg theme-card-subtle border theme-text-muted hover:theme-text-primary transition-colors"
                    title={isMaximized ? 'Réduire' : 'Plein écran'}
                  >
                    {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={onToggle}
                    className="p-1.5 rounded-lg theme-card-subtle border theme-text-muted hover:theme-text-primary transition-colors"
                    title="Fermer le volet"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Shutter Workspace: 2-Column Grid on Large Screens */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Column: Input text and Tool Controls (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                      <span>Texte source à analyser / traiter</span>
                      <span className="text-[10px] theme-text-muted font-normal">
                        ({inputText.trim() ? inputText.trim().split(/\s+/).length : 0} mots)
                      </span>
                    </label>

                    <button
                      onClick={handleImportFromEditor}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                      title="Importer le texte actuel de l'éditeur principal"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                      <span>Importer de l'éditeur</span>
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <textarea
                      id="shutter-input-text"
                      rows={7}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Collez ou rédigez ici votre texte pour lancer l'audit IA, l'humanisation, le résumé ou le correcteur..."
                      className="w-full h-full min-h-[160px] p-3.5 rounded-xl theme-input text-xs sm:text-sm theme-text-primary placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 resize-y"
                    />
                    {inputText && (
                      <button
                        onClick={() => setInputText('')}
                        className="absolute right-2.5 top-2.5 p-1 rounded-md theme-card-subtle theme-text-muted hover:theme-text-primary text-[10px]"
                      >
                        Effacer
                      </button>
                    )}
                  </div>

                  {/* Contextual Options based on selected tool */}
                  {activeTab === 'humanizer' && (
                    <div className="p-3 rounded-xl theme-card-subtle border space-y-2 text-xs">
                      <div className="font-semibold theme-text-primary flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Paramètres d'Humanisation</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['light', 'balanced', 'ultra'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setHumanizeIntensity(lvl)}
                            className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all ${
                              humanizeIntensity === lvl
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'theme-card border theme-text-muted hover:theme-text-primary'
                            }`}
                          >
                            {lvl === 'light' ? 'Léger' : lvl === 'balanced' ? 'Équilibré' : 'Ultra-Humain'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="theme-text-muted text-[11px]">Ton souhaité :</span>
                        <select
                          value={humanizeTone}
                          onChange={(e) => setHumanizeTone(e.target.value)}
                          className="theme-input py-1 px-2 rounded-lg text-xs theme-text-primary focus:outline-none"
                        >
                          <option value="naturel">Naturel & Fluide</option>
                          <option value="professionnel">Professionnel & Posé</option>
                          <option value="expressif">Expressif & Captivant</option>
                          <option value="academique">Académique & Rigoureux</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 'summarizer' && (
                    <div className="p-3 rounded-xl theme-card-subtle border space-y-2 text-xs">
                      <div className="font-semibold theme-text-primary flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Format de Synthèse</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'bullets', label: 'Points Clés' },
                          { id: 'executive', label: 'Résumé Exécutif' },
                          { id: 'one_sentence', label: '1 Phrase Choc' },
                          { id: 'action_items', label: 'Plan d\'action' },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            onClick={() => setSummaryFormat(fmt.id as any)}
                            className={`py-1.5 px-2 rounded-lg text-left font-medium transition-all ${
                              summaryFormat === fmt.id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'theme-card border theme-text-muted hover:theme-text-primary'
                            }`}
                          >
                            {fmt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'paraphraser' && (
                    <div className="p-3 rounded-xl theme-card-subtle border space-y-2 text-xs">
                      <div className="font-semibold theme-text-primary flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                        <span>Style de Paraphrase</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'fluent', label: 'Fluide' },
                          { id: 'professional', label: 'Pro' },
                          { id: 'creative', label: 'Créatif' },
                          { id: 'concise', label: 'Concis' },
                          { id: 'expanded', label: 'Enrichi' },
                          { id: 'anti_repetition', label: 'Anti-Répétition' },
                        ].map((st) => (
                          <button
                            key={st.id}
                            onClick={() => setParaphraseStyle(st.id as any)}
                            className={`py-1 px-1.5 rounded-lg text-center font-medium transition-all text-[11px] ${
                              paraphraseStyle === st.id
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'theme-card border theme-text-muted hover:theme-text-primary'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Primary Action Trigger Button */}
                  <button
                    id="btn-execute-shutter-tool"
                    onClick={handleRunTool}
                    disabled={isLoading || !inputText.trim()}
                    className="w-full py-3 px-4 rounded-xl theme-accent-btn font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Traitement IA en cours...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>
                          {activeTab === 'detector' && 'Lancer l\'Audit Détection IA'}
                          {activeTab === 'humanizer' && 'Humaniser & Rendre Naturel'}
                          {activeTab === 'plagiarism' && 'Vérifier l\'Originalité & Plagiat'}
                          {activeTab === 'summarizer' && 'Générer le Résumé IA'}
                          {activeTab === 'paraphraser' && 'Paraphraser le Texte'}
                          {activeTab === 'grammar' && 'Corriger Orthographe & Grammaire'}
                        </span>
                      </>
                    )}
                  </button>

                  {errorMessage && (
                    <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                {/* Right Column: Dynamic Interactive Results (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Résultat de l'analyse & actions</span>
                    </label>
                  </div>

                  {/* Dynamic Output Cards according to selected tool */}
                  <div className="flex-1 min-h-[300px] p-4 rounded-xl theme-card-subtle border flex flex-col justify-between space-y-4">
                    {/* === 1. RESULT DETECTOR === */}
                    {activeTab === 'detector' && (
                      <div className="space-y-4 flex-1">
                        {detectionResult ? (
                          <div className="space-y-4 animate-fade-in">
                            {/* Score Meters */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div className="p-3 rounded-xl theme-card border text-center space-y-1">
                                <div className="text-[10px] theme-text-muted uppercase font-semibold">Probabilité IA</div>
                                <div className={`text-2xl font-black ${
                                  detectionResult.aiScore >= 60 ? 'text-rose-400' : detectionResult.aiScore >= 35 ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                  {detectionResult.aiScore}%
                                </div>
                              </div>
                              <div className="p-3 rounded-xl theme-card border text-center space-y-1">
                                <div className="text-[10px] theme-text-muted uppercase font-semibold">Score Humain</div>
                                <div className="text-2xl font-black text-emerald-400">
                                  {detectionResult.humanScore}%
                                </div>
                              </div>
                              <div className="p-3 rounded-xl theme-card border text-center space-y-1">
                                <div className="text-[10px] theme-text-muted uppercase font-semibold">Perplexité</div>
                                <div className="text-base font-bold theme-text-primary">
                                  {detectionResult.perplexityLevel}
                                </div>
                              </div>
                              <div className="p-3 rounded-xl theme-card border text-center space-y-1">
                                <div className="text-[10px] theme-text-muted uppercase font-semibold">Burstiness</div>
                                <div className="text-base font-bold theme-text-primary">
                                  {detectionResult.burstinessLevel}
                                </div>
                              </div>
                            </div>

                            {/* Verdict Banner */}
                            <div className="p-3 rounded-xl theme-card border flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-indigo-400" />
                                <div>
                                  <div className="text-xs font-bold theme-text-primary">{detectionResult.verdictLabel}</div>
                                  <div className="text-[11px] theme-text-muted">{detectionResult.analysisSummary}</div>
                                </div>
                              </div>
                            </div>

                            {/* Sentence-by-Sentence Heatmap breakdown */}
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                              <div className="text-[11px] font-semibold uppercase theme-text-muted">Décomposition par phrase :</div>
                              {detectionResult.sentences.map((sent, idx) => (
                                <div
                                  key={idx}
                                  className={`p-2 rounded-lg text-xs border transition-colors ${
                                    sent.flagged
                                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                                      : 'theme-card border text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="flex-1">{sent.text}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                      sent.flagged ? 'bg-rose-900/60 text-rose-200' : 'theme-card-subtle theme-text-muted'
                                    }`}>
                                      {sent.aiProbability}% IA
                                    </span>
                                  </div>
                                  {sent.reason && (
                                    <div className="text-[10px] theme-text-muted mt-1 italic">
                                      {sent.reason}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="py-12 text-center theme-text-muted space-y-2">
                            <Bot className="w-8 h-8 mx-auto text-indigo-400 opacity-60" />
                            <p className="text-xs font-medium theme-text-primary">Détecteur de texte IA & Contenu Synthétique</p>
                            <p className="text-[11px]">Identifie les empreintes statistiques (perplexité, burstiness, répétitions) laissées par ChatGPT, Claude, Gemini et autres LLMs.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* === 2. RESULT HUMANIZER === */}
                    {activeTab === 'humanizer' && (
                      <div className="space-y-4 flex-1">
                        {humanizerResult ? (
                          <div className="space-y-3 animate-fade-in">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl theme-card border">
                                <span className="theme-text-muted text-[10px] uppercase font-semibold">Score Humain Prédit</span>
                                <div className="text-xl font-bold text-emerald-400 mt-0.5">
                                  {humanizerResult.predictedHumanScore}% Indétectable
                                </div>
                              </div>
                              <div className="p-2.5 rounded-xl theme-card border">
                                <span className="theme-text-muted text-[10px] uppercase font-semibold">Niveau de Lisibilité</span>
                                <div className="text-sm font-bold theme-text-primary mt-0.5">
                                  {humanizerResult.readabilityLevel}
                                </div>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl theme-card border space-y-2">
                              <div className="text-[11px] font-semibold uppercase text-emerald-400">Version Humanisée :</div>
                              <p className="text-xs sm:text-sm theme-text-primary whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                                {humanizerResult.humanizedText}
                              </p>
                            </div>

                            {humanizerResult.improvementsMade.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[10px] font-semibold uppercase theme-text-muted">Améliorations appliquées :</div>
                                <div className="flex flex-wrap gap-1">
                                  {humanizerResult.improvementsMade.map((imp, i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-md theme-accent-badge">
                                      ✓ {imp}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-12 text-center theme-text-muted space-y-2">
                            <Wand2 className="w-8 h-8 mx-auto text-emerald-400 opacity-60" />
                            <p className="text-xs font-medium theme-text-primary">Humaniseur de Texte & Éliminateur de Tics IA</p>
                            <p className="text-[11px]">Transforme les phrases mécaniques en prose vivante, fluide et organique sans perdre aucune information.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* === 3. RESULT PLAGIARISM === */}
                    {activeTab === 'plagiarism' && (
                      <div className="space-y-4 flex-1">
                        {plagiarismResult ? (
                          <div className="space-y-3 animate-fade-in">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 rounded-xl theme-card border text-center">
                                <div className="text-[10px] theme-text-muted uppercase font-semibold">Taux d'Originalité</div>
                                <div className="text-2xl font-black text-emerald-400">
                                  {plagiarismResult.originalityScore}%
                                </div>
                              </div>
                              <div className="p-3 rounded-xl theme-card border text-center">
                                <div className="text-[10px] theme-text-muted uppercase font-semibold">Évaluation</div>
                                <div className="text-base font-bold theme-text-primary">
                                  {plagiarismResult.uniquenessRating}
                                </div>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl theme-card border space-y-2">
                              <div className="text-[11px] font-semibold uppercase theme-text-primary">Conseils d'authenticité :</div>
                              <ul className="text-xs space-y-1 theme-text-muted">
                                {plagiarismResult.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-center gap-1.5">
                                    <span className="text-emerald-400">•</span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                              <div className="text-[11px] theme-text-muted italic border-t theme-card-subtle pt-2">
                                {plagiarismResult.citationAdvice}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-12 text-center theme-text-muted space-y-2">
                            <ShieldAlert className="w-8 h-8 mx-auto text-rose-400 opacity-60" />
                            <p className="text-xs font-medium theme-text-primary">Vérificateur d'Originalité & Anti-Plagiat</p>
                            <p className="text-[11px]">Détecte les clichés, formules génériques du web et vous assure un contenu 100% singulier et authentique.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* === 4. RESULT SUMMARIZER === */}
                    {activeTab === 'summarizer' && (
                      <div className="space-y-4 flex-1">
                        {summaryResult ? (
                          <div className="space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between text-xs p-2 rounded-xl theme-card border">
                              <span className="theme-text-muted">Gain de temps de lecture :</span>
                              <span className="font-bold text-blue-400">{summaryResult.readingTimeReduction}</span>
                            </div>

                            <div className="p-3 rounded-xl theme-card border space-y-2">
                              <div className="text-[11px] font-semibold uppercase text-blue-400">Synthèse générée :</div>
                              <p className="text-xs sm:text-sm theme-text-primary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                {summaryResult.summary}
                              </p>
                            </div>

                            {summaryResult.keyPoints.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[10px] font-semibold uppercase theme-text-muted">Points clés à retenir :</div>
                                <ul className="text-xs space-y-1">
                                  {summaryResult.keyPoints.map((pt, i) => (
                                    <li key={i} className="flex items-start gap-1.5 theme-text-primary">
                                      <span className="text-blue-400 shrink-0">→</span>
                                      <span>{pt}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-12 text-center theme-text-muted space-y-2">
                            <FileText className="w-8 h-8 mx-auto text-blue-400 opacity-60" />
                            <p className="text-xs font-medium theme-text-primary">Résumeur Exécutif & Points Clés IA</p>
                            <p className="text-[11px]">Synthétise les longs articles, emails, rapports ou comptes-rendus en secondes avec extraction d'enjeux majeurs.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* === 5. RESULT PARAPHRASER === */}
                    {activeTab === 'paraphraser' && (
                      <div className="space-y-4 flex-1">
                        {paraphraseResult ? (
                          <div className="space-y-3 animate-fade-in">
                            <div className="p-3 rounded-xl theme-card border space-y-2">
                              <div className="text-[11px] font-semibold uppercase text-purple-400">Version Paraphrasée :</div>
                              <p className="text-xs sm:text-sm theme-text-primary whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                {paraphraseResult.paraphrasedText}
                              </p>
                            </div>

                            {paraphraseResult.alternatives.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[10px] font-semibold uppercase theme-text-muted">Autres formulations :</div>
                                {paraphraseResult.alternatives.map((alt, i) => (
                                  <div
                                    key={i}
                                    onClick={() => handleApply(alt.text)}
                                    className="p-2 rounded-lg theme-card border hover:border-purple-500/50 cursor-pointer text-xs space-y-0.5 transition-colors"
                                  >
                                    <div className="text-[10px] text-purple-400 font-semibold">{alt.nuance}</div>
                                    <p className="theme-text-primary">{alt.text}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-12 text-center theme-text-muted space-y-2">
                            <RefreshCw className="w-8 h-8 mx-auto text-purple-400 opacity-60" />
                            <p className="text-xs font-medium theme-text-primary">Paraphraseur Multi-Registres</p>
                            <p className="text-[11px]">Reformulez vos textes pour varier le vocabulaire, adapter le ton (cadre, littéraire, percutant) et perfectionner l'éloquence.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* === 6. RESULT GRAMMAR === */}
                    {activeTab === 'grammar' && (
                      <div className="space-y-4 flex-1">
                        {grammarResult ? (
                          <div className="space-y-3 animate-fade-in">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2.5 rounded-xl theme-card border text-center">
                                <div className="text-[10px] theme-text-muted uppercase font-semibold">Score de Pureté</div>
                                <div className="text-xl font-bold text-emerald-400">{grammarResult.score}/100</div>
                              </div>
                              <div className="p-2.5 rounded-xl theme-card border text-center">
                                <div className="text-[10px] theme-text-muted uppercase font-semibold">Anomalies Détectées</div>
                                <div className={`text-xl font-bold ${grammarResult.errorCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {grammarResult.errorCount}
                                </div>
                              </div>
                            </div>

                            <div className="p-3 rounded-xl theme-card border space-y-2">
                              <div className="text-[11px] font-semibold uppercase text-emerald-400">Texte Entièrement Corrigé :</div>
                              <p className="text-xs sm:text-sm theme-text-primary whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                                {grammarResult.correctedText}
                              </p>
                            </div>

                            {grammarResult.issues.length > 0 && (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                <div className="text-[10px] font-semibold uppercase theme-text-muted">Détail des corrections :</div>
                                {grammarResult.issues.map((iss, i) => (
                                  <div key={i} className="p-2 rounded-lg theme-card border text-xs flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="line-through text-rose-400">{iss.original}</span>
                                        <ArrowRight className="w-3 h-3 theme-text-muted" />
                                        <span className="font-bold text-emerald-400">{iss.replacement}</span>
                                        <span className="text-[9px] px-1 py-0.2 rounded theme-card-subtle theme-text-muted uppercase">
                                          {iss.category}
                                        </span>
                                      </div>
                                      <div className="text-[10px] theme-text-muted mt-0.5">{iss.explanation}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-12 text-center theme-text-muted space-y-2">
                            <CheckCircle2 className="w-8 h-8 mx-auto text-indigo-400 opacity-60" />
                            <p className="text-xs font-medium theme-text-primary">Correcteur Orthographique & Grammatical Ultime</p>
                            <p className="text-[11px]">Corrige les accords complexes, participes passés, ponctuation typographique et coquilles instantanément.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Action Bar for Results */}
                    {((activeTab === 'humanizer' && humanizerResult) ||
                      (activeTab === 'summarizer' && summaryResult) ||
                      (activeTab === 'paraphraser' && paraphraseResult) ||
                      (activeTab === 'grammar' && grammarResult)) && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t theme-card-subtle">
                        <button
                          onClick={() => {
                            const text =
                              (activeTab === 'humanizer' && humanizerResult?.humanizedText) ||
                              (activeTab === 'summarizer' && summaryResult?.summary) ||
                              (activeTab === 'paraphraser' && paraphraseResult?.paraphrasedText) ||
                              (activeTab === 'grammar' && grammarResult?.correctedText) ||
                              '';
                            handleCopy(text);
                          }}
                          className="py-1.5 px-3 rounded-lg theme-card border theme-text-muted hover:theme-text-primary text-xs font-medium flex items-center gap-1.5 transition-all"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Copié !' : 'Copier'}</span>
                        </button>

                        <button
                          onClick={() => {
                            const text =
                              (activeTab === 'humanizer' && humanizerResult?.humanizedText) ||
                              (activeTab === 'summarizer' && summaryResult?.summary) ||
                              (activeTab === 'paraphraser' && paraphraseResult?.paraphrasedText) ||
                              (activeTab === 'grammar' && grammarResult?.correctedText) ||
                              '';
                            handleApply(text);
                          }}
                          className="py-1.5 px-3 rounded-lg theme-accent-btn text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:brightness-110 transition-all"
                        >
                          {applied ? <Check className="w-3.5 h-3.5" /> : <ArrowUpFromLine className="w-3.5 h-3.5" />}
                          <span>{applied ? 'Appliqué à l\'éditeur !' : 'Appliquer à l\'Éditeur'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
