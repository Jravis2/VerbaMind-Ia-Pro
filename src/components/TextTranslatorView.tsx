import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRightLeft,
  Copy,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  BookOpen,
  Check,
  Zap,
  Clock,
  Share2,
  Trash2,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Language, ToneStyle, HistoryItem, SyntaxAnalysisResponse } from '../types';
import { LANGUAGES_DATABASE } from '../data/languages';
import { ToneSelector } from './ToneSelector';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { SyntaxInspectorModal } from './SyntaxInspectorModal';
import {
  fetchWithExponentialBackoff,
  playRawPcmAudio,
  speakTextWithBrowser,
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
} from '../utils/audio';

interface TextTranslatorViewProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  initialSourceText?: string;
  initialTone?: ToneStyle;
}

export const TextTranslatorView: React.FC<TextTranslatorViewProps> = ({
  onSaveHistory,
  initialSourceText = '',
  initialTone = 'natural',
}) => {
  const [sourceText, setSourceText] = useState(initialSourceText);
  const [translatedText, setTranslatedText] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('en');
  const [detectedLangCode, setDetectedLangCode] = useState<string>('');
  const [tone, setTone] = useState<ToneStyle>(initialTone);
  const [isLoading, setIsLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [withPhonetics, setWithPhonetics] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Prêt');

  // Modals state
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isSyntaxModalOpen, setIsSyntaxModalOpen] = useState(false);
  const [syntaxAnalysis, setSyntaxAnalysis] = useState<SyntaxAnalysisResponse | null>(null);
  const [isAnalyzingSyntax, setIsAnalyzingSyntax] = useState(false);

  // Active in-flight AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechRecognizerRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Language info helpers
  const sourceLangObj = sourceLang === 'auto'
    ? { code: 'auto', name: 'Détection Automatique', nativeName: 'Auto Detect', flag: '✨', category: 'living' }
    : LANGUAGES_DATABASE.find((l) => l.code === sourceLang) || {
        code: sourceLang,
        name: sourceLang,
        nativeName: sourceLang,
        flag: '🌐',
        category: 'living',
      };

  const targetLangObj =
    LANGUAGES_DATABASE.find((l) => l.code === targetLang) || {
      code: targetLang,
      name: targetLang,
      nativeName: targetLang,
      flag: '🌐',
      category: 'living',
    };

  // Perform Translation with AbortController and Exponential Backoff
  const performTranslation = useCallback(
    async (text: string, currentTone: ToneStyle, sLang: string, tLang: string, phoneticsFlag: boolean) => {
      if (!text || text.trim() === '') {
        setTranslatedText('');
        setPhonetic('');
        setLatencyMs(null);
        setIsLoading(false);
        setStatusMessage('Prêt');
        return;
      }

      // Abort previous in-flight request if user is still typing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setStatusMessage('Traduction en cours...');

      try {
        const response = await fetchWithExponentialBackoff(
          '/api/translate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: text.trim(),
              sourceLang: sLang,
              targetLang: tLang,
              tone: currentTone,
              withPhonetic: phoneticsFlag,
            }),
          },
          3,
          1000,
          controller.signal
        );

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();

        setTranslatedText(data.translatedText || '');
        setPhonetic(data.phonetic || '');
        setLatencyMs(data.latencyMs || null);
        if (data.detectedSourceLang) {
          setDetectedLangCode(data.detectedSourceLang);
        }
        setStatusMessage(`Traduit en ${data.latencyMs}ms`);

        // Save to recent history silently
        if (data.translatedText) {
          onSaveHistory({
            sourceText: text.trim(),
            translatedText: data.translatedText,
            sourceLang: sLang,
            targetLang: tLang,
            tone: currentTone,
            mode: 'text',
          });
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          // Normal cancellation due to active typing, ignore
          return;
        }
        console.error('Translation error:', error);
        setStatusMessage('Erreur de réseau (nouvel essai automatique)');
      } finally {
        setIsLoading(false);
      }
    },
    [onSaveHistory]
  );

  // 200ms Debounced trigger on typing
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!sourceText.trim()) {
      setTranslatedText('');
      setPhonetic('');
      setLatencyMs(null);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performTranslation(sourceText, tone, sourceLang, targetLang, withPhonetics);
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sourceText, tone, sourceLang, targetLang, withPhonetics, performTranslation]);

  // Swap Languages
  const handleSwapLanguages = () => {
    if (sourceLang === 'auto') {
      if (detectedLangCode) {
        const temp = targetLang;
        setTargetLang(detectedLangCode);
        setSourceLang(temp);
      } else {
        const temp = targetLang;
        setTargetLang('fr');
        setSourceLang(temp);
      }
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
    // Swap texts
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  };

  // Reverse Translation verification (verify accuracy)
  const handleReverseTranslation = async () => {
    if (!translatedText) return;
    setSourceText(translatedText);
    const prevSource = sourceLang === 'auto' ? 'fr' : sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prevSource);
  };

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Audio Text-To-Speech Playback
  const handlePlayAudio = async (text: string, langCode: string) => {
    if (!text || isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      // First try Gemini high-fidelity TTS
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'Kore' }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        await playRawPcmAudio(data.audioBase64, data.sampleRate || 24000);
      } else {
        // Fallback to browser Web Speech API
        await speakTextWithBrowser(text, langCode);
      }
    } catch (e) {
      console.warn('TTS error, using browser fallback:', e);
      await speakTextWithBrowser(text, langCode);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  // Speech Recognition (Dictation)
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!isSpeechRecognitionSupported()) {
        alert("La reconnaissance vocale directe n'est pas supportée par ce navigateur.");
        return;
      }
      const recognizer = createSpeechRecognizer(
        sourceLang === 'auto' ? 'fr-FR' : sourceLang,
        (transcript) => {
          setSourceText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        },
        (err) => {
          console.warn('Speech recognition notice:', err);
          setIsRecording(false);
        }
      );
      if (recognizer) {
        speechRecognizerRef.current = recognizer;
        recognizer.start();
        setIsRecording(true);
      }
    }
  };

  // Inspect syntax
  const handleOpenSyntaxInspector = async () => {
    if (!sourceText || !translatedText) return;
    setIsSyntaxModalOpen(true);
    setIsAnalyzingSyntax(true);
    try {
      const res = await fetch('/api/explain-syntax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText,
          targetText: translatedText,
          sourceLang: sourceLangObj.name,
          targetLang: targetLangObj.name,
          tone,
        }),
      });
      const data = await res.json();
      setSyntaxAnalysis(data);
    } catch (err) {
      console.error('Syntax analysis error:', err);
    } finally {
      setIsAnalyzingSyntax(false);
    }
  };

  // Sample prompt test presets
  const sampleSentences = [
    {
      label: 'Phrase désordonnée avec fautes',
      text: 'Je voulai savoire si le rdv avec le client il est tjr bon pr demain matin 9h ou si on decale ?',
      target: 'en',
    },
    {
      label: 'Latin Ancien (Cicéron / Philosophie)',
      text: 'La sagesse commence par la reconnaissance de sa propre ignorance et la recherche de la vérité suprême.',
      target: 'la',
    },
    {
      label: 'Grec Ancien Polytonique',
      text: 'Connais-toi toi-même et tu connaîtras l\'univers et les dieux.',
      target: 'grc',
    },
    {
      label: 'Hiéroglyphes & Égyptien Pharaonique',
      text: 'Que la vie, la prospérité et la santé soient accordées au souverain des deux terres.',
      target: 'egy',
    },
    {
      label: 'Breton Régional',
      text: 'Bienvenue en Bretagne, terre de légendes, d\'océan et de traditions vivantes.',
      target: 'br',
    },
    {
      label: 'Klingon (Construit)',
      text: 'Aujourd\'hui est un jour glorieux pour remporter la victoire avec honneur.',
      target: 'tlh',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Tone & Style Toolbar */}
      <ToneSelector currentTone={tone} onChangeTone={(t) => setTone(t)} />

      {/* Main Dual Translation Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source Text Card */}
        <div className="flex flex-col bg-[#0b142c]/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden transition-all focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/20">
          {/* Card Header: Source Language Picker */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-[#0d1838]">
            <div className="flex items-center gap-2">
              <button
                id="btn-select-source-lang"
                onClick={() => setIsSourceModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14234b] border border-indigo-500/30 text-white hover:bg-indigo-600/30 hover:border-indigo-400 text-xs font-semibold transition-all group"
              >
                <span className="text-base leading-none">{sourceLangObj.flag || '🌐'}</span>
                <span>{sourceLangObj.name}</span>
                <span className="text-[10px] text-indigo-300 group-hover:text-white">▼</span>
              </button>

              {detectedLangCode && sourceLang === 'auto' && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-fade-in">
                  Détecté : {detectedLangCode}
                </span>
              )}
            </div>

            {/* Quick action toolbar */}
            <div className="flex items-center gap-1.5">
              <button
                id="btn-toggle-mic-source"
                onClick={toggleSpeechRecognition}
                title={isRecording ? 'Arrêter la dictée' : 'Activer la dictée vocale'}
                className={`p-2 rounded-xl transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {sourceText && (
                <button
                  id="btn-clear-source"
                  onClick={() => setSourceText('')}
                  title="Effacer le texte"
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Text Area Source */}
          <div className="flex-1 p-5 min-h-[260px] flex flex-col">
            <textarea
              id="textarea-source-text"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Saisissez ou collez votre texte ici (même désordonné ou avec des fautes d'orthographe)..."
              className="w-full flex-1 bg-transparent text-white placeholder-slate-500 text-base leading-relaxed resize-none focus:outline-none font-sans"
              rows={8}
            />

            {/* Source Footer Stats & Shortcuts */}
            <div className="flex flex-wrap items-center justify-between pt-4 mt-2 border-t border-slate-800/60 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span>{sourceText.length} caractères</span>
                <span>•</span>
                <span>{sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0} mots</span>
              </div>

              {/* Sample sentences dropdown/chips */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 hidden sm:inline">Exemples :</span>
                <select
                  aria-label="Charger un exemple de phrase"
                  onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (idx >= 0 && sampleSentences[idx]) {
                      setSourceText(sampleSentences[idx].text);
                      setTargetLang(sampleSentences[idx].target);
                    }
                  }}
                  defaultValue=""
                  className="bg-[#121f44] border border-slate-700/80 text-slate-300 text-[11px] rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                >
                  <option value="" disabled>
                    Charger un exemple...
                  </option>
                  {sampleSentences.map((s, idx) => (
                    <option key={idx} value={idx}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Target Text Card (Output) */}
        <div className="flex flex-col bg-[#0b142c]/90 border border-indigo-500/30 rounded-2xl shadow-xl shadow-indigo-950/40 backdrop-blur-md overflow-hidden transition-all">
          {/* Card Header: Target Language Picker + Swap Button */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-[#0e193c]">
            <div className="flex items-center gap-2">
              <button
                id="btn-swap-languages"
                onClick={handleSwapLanguages}
                title="Inverser les langues"
                className="p-1.5 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-indigo-600/40 border border-slate-700 transition-all active:rotate-180 duration-200"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>

              <button
                id="btn-select-target-lang"
                onClick={() => setIsTargetModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#172856] border border-indigo-400/40 text-white hover:bg-indigo-600/40 text-xs font-semibold transition-all group"
              >
                <span className="text-base leading-none">{targetLangObj.flag || '🌐'}</span>
                <span>{targetLangObj.name}</span>
                <span className="text-[10px] text-indigo-300 group-hover:text-white">▼</span>
              </button>
            </div>

            {/* Performance Latency & Status Badge */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse">
                  <Zap className="w-3 h-3 text-indigo-400 animate-spin" />
                  <span>&lt;300ms IA</span>
                </span>
              ) : latencyMs !== null ? (
                <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>{latencyMs} ms</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Text Area Target Output */}
          <div className="flex-1 p-5 min-h-[260px] flex flex-col justify-between">
            <div className="space-y-3">
              {translatedText ? (
                <div className="text-white text-base leading-relaxed font-sans select-text whitespace-pre-wrap">
                  {translatedText}
                </div>
              ) : (
                <div className="text-slate-500 text-sm italic pt-2">
                  La traduction contextuelle et restructurée s&apos;affiche instantanément dès votre saisie...
                </div>
              )}

              {/* Phonetic / Romanization transcript if available */}
              {phonetic && (
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-300 font-mono">
                  <span className="font-semibold text-indigo-400 mr-2">Transcription phonétique :</span>
                  <span>{phonetic}</span>
                </div>
              )}
            </div>

            {/* Target Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between pt-4 mt-4 border-t border-slate-800/60">
              <div className="flex items-center gap-2">
                {/* Audio TTS button */}
                <button
                  id="btn-play-target-audio"
                  onClick={() => handlePlayAudio(translatedText, targetLang)}
                  disabled={!translatedText || isPlayingAudio}
                  title="Écouter la prononciation"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="w-4 h-4 text-indigo-400 animate-pulse" />
                      <span className="hidden sm:inline text-indigo-300">Lecture...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-indigo-400" />
                      <span className="hidden sm:inline">Écouter</span>
                    </>
                  )}
                </button>

                {/* Copy button */}
                <button
                  id="btn-copy-target-text"
                  onClick={() => handleCopy(translatedText)}
                  disabled={!translatedText}
                  title="Copier le texte"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="hidden sm:inline">Copier</span>
                    </>
                  )}
                </button>

                {/* Reverse translation check */}
                <button
                  id="btn-reverse-translate"
                  onClick={handleReverseTranslation}
                  disabled={!translatedText}
                  title="Vérifier par traduction inverse"
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Inverser</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Phonetics */}
                <button
                  id="btn-toggle-phonetics"
                  onClick={() => setWithPhonetics(!withPhonetics)}
                  title="Activer la transcription phonétique (IPA / Romaji / Pinyin)"
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    withPhonetics
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Phonétique</span>
                </button>

                {/* Syntax Inspector Button */}
                <button
                  id="btn-open-syntax-inspector"
                  onClick={handleOpenSyntaxInspector}
                  disabled={!sourceText || !translatedText}
                  title="Ouvrir l'inspecteur de syntaxe et grammaire"
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Inspecteur Syntaxique</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LanguageSelectorModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onSelect={(lang) => setSourceLang(lang.code)}
        currentCode={sourceLang}
        isSourceSelector={true}
      />

      <LanguageSelectorModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        onSelect={(lang) => setTargetLang(lang.code)}
        currentCode={targetLang}
        isSourceSelector={false}
      />

      <SyntaxInspectorModal
        isOpen={isSyntaxModalOpen}
        onClose={() => setIsSyntaxModalOpen(false)}
        analysis={syntaxAnalysis}
        isLoading={isAnalyzingSyntax}
        sourceText={sourceText}
        targetText={translatedText}
        sourceLangName={sourceLangObj.name}
        targetLangName={targetLangObj.name}
      />
    </div>
  );
};
