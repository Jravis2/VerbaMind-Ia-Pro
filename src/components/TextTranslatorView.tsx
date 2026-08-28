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
  Trash2,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { ToneStyle, HistoryItem, SyntaxAnalysisResponse } from '../types';
import { LANGUAGES_DATABASE } from '../data/languages';
import { ToneSelector } from './ToneSelector';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { LanguageDropdown } from './LanguageDropdown';
import { SyntaxInspectorModal } from './SyntaxInspectorModal';
import { AIRollerShutter } from './AIRollerShutter';
import {
  speakTextWithBrowser,
  stopBrowserSpeech,
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
} from '../utils/audio';
import { executeTranslation, executeSyntaxInspection } from '../services/translationService';
import { AppSettings, triggerHapticFeedback, playUiChime } from '../utils/appSettings';
import { I18N_TRANSLATIONS } from '../data/i18n';

interface TextTranslatorViewProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  initialSourceText?: string;
  initialTone?: ToneStyle;
  isOnline?: boolean;
  settings?: AppSettings;
}

const QUICK_SOURCE_LANGS = [
  { code: 'auto', label: 'Détection auto', flag: '✨' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'Anglais', flag: '🇺🇸' },
  { code: 'es', label: 'Espagnol', flag: '🇪🇸' },
  { code: 'de', label: 'Allemand', flag: '🇩🇪' },
];

const QUICK_TARGET_LANGS = [
  { code: 'en', label: 'Anglais', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Espagnol', flag: '🇪🇸' },
  { code: 'de', label: 'Allemand', flag: '🇩🇪' },
  { code: 'ja', label: 'Japonais', flag: '🇯🇵' },
];

export const TextTranslatorView: React.FC<TextTranslatorViewProps> = ({
  onSaveHistory,
  initialSourceText = '',
  initialTone = 'natural',
  isOnline = true,
  settings,
}) => {
  const [sourceText, setSourceText] = useState(initialSourceText);
  const [translatedText, setTranslatedText] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('auto');
  const [targetLang, setTargetLang] = useState<string>('en');
  const [detectedLangCode, setDetectedLangCode] = useState<string>('');
  const [detectedLangName, setDetectedLangName] = useState<string>('');
  const [tone, setTone] = useState<ToneStyle>(initialTone);
  const [isLoading, setIsLoading] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingSourceAudio, setIsPlayingSourceAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [withPhonetics, setWithPhonetics] = useState(Boolean(settings?.alwaysShowPhonetics));
  const [statusMessage, setStatusMessage] = useState<string>('Prêt');

  // Modals state
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isSyntaxModalOpen, setIsSyntaxModalOpen] = useState(false);
  const [syntaxAnalysis, setSyntaxAnalysis] = useState<SyntaxAnalysisResponse | null>(null);
  const [isAnalyzingSyntax, setIsAnalyzingSyntax] = useState(false);
  const [isRollerShutterOpen, setIsRollerShutterOpen] = useState(false);

  // Active in-flight AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechRecognizerRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const t = I18N_TRANSLATIONS[settings?.appLanguage || 'fr'] || I18N_TRANSLATIONS.fr;

  // Sync phonetics setting if changed externally
  useEffect(() => {
    if (settings?.alwaysShowPhonetics !== undefined) {
      setWithPhonetics(settings.alwaysShowPhonetics);
    }
  }, [settings?.alwaysShowPhonetics]);

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

  // Perform Translation with AbortController and exponential fallback
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

      if (!isOnline) {
        setIsLoading(false);
        setStatusMessage('⚠️ Hors ligne');
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
        const data = await executeTranslation({
          text: text.trim(),
          sourceLang: sLang,
          targetLang: tLang,
          tone: currentTone,
          withPhonetic: phoneticsFlag,
          options: {
            aiModel: settings?.aiModel,
            temperature: settings?.temperature,
            thinkingMode: settings?.thinkingMode,
            grammarStrictness: settings?.grammarStrictness,
            smartRestructuring: settings?.smartRestructuring,
            autoLanguageDetection: settings?.autoLanguageDetection,
          },
          signal: controller.signal,
        });

        setTranslatedText(data.translatedText || '');
        setPhonetic(data.phonetic || '');
        setLatencyMs(data.latencyMs || null);

        if (data.detectedSourceLang) {
          setDetectedLangCode(data.detectedSourceLang);
          const matchedLang = LANGUAGES_DATABASE.find((l) => l.code === data.detectedSourceLang);
          setDetectedLangName(data.detectedSourceLangName || matchedLang?.name || data.detectedSourceLang);
        }

        setStatusMessage(`Traduit en ${data.latencyMs}ms`);

        // Option: Auto-copy on finish
        if (settings?.autoCopyOnFinish && data.translatedText) {
          try {
            navigator.clipboard.writeText(data.translatedText);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
          } catch (e) {
            // Ignore clipboard permission issues
          }
        }

        // Option: Auto-play voice TTS
        if (settings?.autoPlayTts && data.translatedText) {
          speakTextWithBrowser(data.translatedText, tLang, {
            rate: settings.voiceSpeed,
            pitch: settings.voicePitch,
            gender: settings.voiceGender,
          });
        }

        // Option: Sound chime
        if (settings?.uiSoundEffects) {
          playUiChime('success');
        }

        // Option: Haptic vibration
        if (settings?.hapticFeedback) {
          triggerHapticFeedback(15);
        }

        // Save to recent history
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
          return;
        }
        console.error('[VerbaMind API] Translation error:', error);
        setStatusMessage('Erreur de traduction');
      } finally {
        setIsLoading(false);
      }
    },
    [onSaveHistory, isOnline, settings]
  );

  // Debounced trigger on typing respecting settings.debounceDelay
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

    const delay = settings?.debounceDelay || 300;
    debounceTimerRef.current = setTimeout(() => {
      performTranslation(sourceText, tone, sourceLang, targetLang, withPhonetics);
    }, delay);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sourceText, tone, sourceLang, targetLang, withPhonetics, performTranslation, settings?.debounceDelay]);

  // Option: Auto-translate on Paste
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (settings?.autoTranslateOnPaste) {
      const pasted = e.clipboardData.getData('text');
      if (pasted) {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        performTranslation(pasted, tone, sourceLang, targetLang, withPhonetics);
      }
    }
  };

  // Swap Languages
  const handleSwapLanguages = () => {
    if (settings?.uiSoundEffects) playUiChime('toggle');
    if (settings?.hapticFeedback) triggerHapticFeedback(10);

    if (sourceLang === 'auto') {
      const resolvedSource = detectedLangCode || 'fr';
      const temp = targetLang;
      setTargetLang(resolvedSource);
      setSourceLang(temp);
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

  // Reverse Translation verification
  const handleReverseTranslation = async () => {
    if (!translatedText) return;
    if (settings?.uiSoundEffects) playUiChime('click');
    setSourceText(translatedText);
    const prevSource = sourceLang === 'auto' ? (detectedLangCode || 'fr') : sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prevSource);
  };

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    if (settings?.uiSoundEffects) playUiChime('click');
    if (settings?.hapticFeedback) triggerHapticFeedback(10);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Clear text
  const handleClear = () => {
    if (settings?.confirmBeforeClear && sourceText.length > 20) {
      if (!confirm('Effacer le texte source ?')) return;
    }
    setSourceText('');
    setTranslatedText('');
    setPhonetic('');
    if (settings?.uiSoundEffects) playUiChime('delete');
  };

  // Browser SpeechSynthesis API to read text aloud
  const handleSpeakWithBrowser = async (text: string, langCode: string, isSource = false) => {
    if (!text || text.trim() === '') return;

    if (settings?.uiSoundEffects) playUiChime('click');

    const voiceOpts = {
      rate: settings?.voiceSpeed ?? 1.0,
      pitch: settings?.voicePitch ?? 1.0,
      gender: settings?.voiceGender ?? 'auto',
    };

    if (isSource) {
      if (isPlayingSourceAudio) {
        stopBrowserSpeech();
        setIsPlayingSourceAudio(false);
        return;
      }
      setIsPlayingSourceAudio(true);
      try {
        const resolvedLang = langCode === 'auto' ? (detectedLangCode || 'fr') : langCode;
        await speakTextWithBrowser(text, resolvedLang, voiceOpts);
      } finally {
        setIsPlayingSourceAudio(false);
      }
    } else {
      if (isPlayingAudio) {
        stopBrowserSpeech();
        setIsPlayingAudio(false);
        return;
      }
      setIsPlayingAudio(true);
      try {
        await speakTextWithBrowser(text, langCode, voiceOpts);
      } finally {
        setIsPlayingAudio(false);
      }
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
        if (settings?.hapticFeedback) triggerHapticFeedback(20);
      }
    }
  };

  // Inspect syntax
  const handleOpenSyntaxInspector = async () => {
    if (!sourceText || !translatedText) return;
    if (settings?.uiSoundEffects) playUiChime('click');
    setIsSyntaxModalOpen(true);
    setIsAnalyzingSyntax(true);

    try {
      const data = await executeSyntaxInspection({
        sourceText,
        targetText: translatedText,
        sourceLang: sourceLangObj.name,
        targetLang: targetLangObj.name,
        tone,
      });
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
      label: 'Email professionnel & négociation',
      text: 'Nous souhaiterions revoir les termes de la clause 4 avant la signature définitive du contrat de partenariat.',
      target: 'en',
    },
    {
      label: 'Phrase familière avec fautes',
      text: 'Je voulai savoire si le rdv avec le client il est tjr bon pr demain matin 9h ou si on decale ?',
      target: 'en',
    },
    {
      label: 'Latin Classique (Cicéron)',
      text: 'La sagesse commence par la reconnaissance de sa propre ignorance et la recherche de la vérité suprême.',
      target: 'la',
    },
    {
      label: 'Japonais poli des affaires',
      text: 'Je vous remercie pour votre accueil chaleureux et me réjouis de notre collaboration future.',
      target: 'ja',
    },
    {
      label: 'Arabe Littéraire',
      text: 'La paix, la justice et la fraternité sont les piliers fondamentaux de toute société prospère.',
      target: 'ar',
    },
  ];

  const lineSpacingClass =
    settings?.lineSpacing === 'compact'
      ? 'leading-normal'
      : settings?.lineSpacing === 'relaxed'
      ? 'leading-loose'
      : 'leading-relaxed';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Volet Roulant IA Pro (Curtain Shutter with 6 100% Functional AI tools) */}
      <AIRollerShutter
        isOpen={isRollerShutterOpen}
        onToggle={() => setIsRollerShutterOpen(!isRollerShutterOpen)}
        editorText={sourceText || translatedText}
        onApplyToEditor={(newText) => {
          setSourceText(newText);
          performTranslation(newText, tone, sourceLang, targetLang, withPhonetics);
        }}
      />

      {/* When Shutter is Closed: Display the Full Live Editor & Translation Workspace */}
      {!isRollerShutterOpen && (
        <div className="space-y-5 animate-fade-in">
          {/* Tone & Style Toolbar (hidden in Zen mode if requested) */}
          {!settings?.zenFocusMode && (
            <ToneSelector currentTone={tone} onChangeTone={(t) => setTone(t)} />
          )}

          {/* Main Dual Translation Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Source Text Card */}
        <div className="flex flex-col theme-card rounded-2xl shadow-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-indigo-500/40">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b theme-card-subtle">
            <div className="flex flex-wrap items-center gap-2">
              <LanguageDropdown
                idPrefix="source-lang-dropdown"
                selectedCode={sourceLang}
                onSelect={(code) => setSourceLang(code)}
                onOpenFullModal={() => setIsSourceModalOpen(true)}
                isSource={true}
                detectedLangName={detectedLangName}
                detectedLangCode={detectedLangCode}
              />

              {/* Quick Language Switcher Pills */}
              <div className="hidden sm:flex items-center gap-1">
                {QUICK_SOURCE_LANGS.map((item) => {
                  const isActive = sourceLang === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setSourceLang(item.code)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        isActive
                          ? 'theme-accent-btn'
                          : 'theme-text-muted hover:theme-text-primary hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-xs select-none">{item.flag}</span>
                      <span className="hidden md:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Auto-detect Status Pill with lock button */}
              {sourceLang === 'auto' && detectedLangCode && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg theme-accent-badge text-xs animate-fade-in">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>
                    Détecté : <strong className="font-bold">{detectedLangName || detectedLangCode}</strong>
                  </span>
                  <button
                    type="button"
                    title="Fixer cette langue"
                    onClick={() => setSourceLang(detectedLangCode)}
                    className="ml-1 text-[10px] underline hover:opacity-80"
                  >
                    Fixer
                  </button>
                </div>
              )}
            </div>

            {/* Quick action toolbar */}
            <div className="flex items-center gap-1.5 ml-auto">
              {sourceText && (
                <button
                  id="btn-speak-source-text"
                  type="button"
                  onClick={() => handleSpeakWithBrowser(sourceText, sourceLang, true)}
                  title={isPlayingSourceAudio ? 'Arrêter la lecture' : 'Écouter le texte source'}
                  className={`p-2 rounded-xl transition-all ${
                    isPlayingSourceAudio
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'theme-text-muted hover:theme-text-primary hover:bg-slate-800/40'
                  }`}
                >
                  {isPlayingSourceAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              {/* Dictation mic */}
              <button
                id="btn-toggle-mic-source"
                type="button"
                onClick={toggleSpeechRecognition}
                title={isRecording ? 'Arrêter la dictée' : 'Activer la dictée vocale'}
                className={`p-2 rounded-xl transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                    : 'theme-text-muted hover:theme-text-primary hover:bg-slate-800/40'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Clear button */}
              {sourceText && (
                <button
                  id="btn-clear-source"
                  type="button"
                  onClick={handleClear}
                  title="Effacer le texte"
                  className="p-2 rounded-xl theme-text-muted hover:text-red-400 hover:bg-slate-800/40 transition-all"
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
              onPaste={handlePaste}
              spellCheck={settings?.spellCheckInput !== false}
              placeholder={t.textPlaceholder}
              className={`w-full flex-1 bg-transparent theme-text-primary placeholder-slate-500 text-base ${lineSpacingClass} resize-none focus:outline-none font-sans`}
              rows={8}
            />

            {/* Source Footer Stats & Shortcuts */}
            <div className="flex flex-wrap items-center justify-between pt-4 mt-2 border-t theme-card-subtle text-xs theme-text-muted">
              <div className="flex items-center gap-3">
                <span className={settings?.maxCharWarning && sourceText.length > 4000 ? 'text-amber-400 font-bold flex items-center gap-1' : ''}>
                  {settings?.maxCharWarning && sourceText.length > 4000 && <AlertTriangle className="w-3.5 h-3.5" />}
                  {sourceText.length} caractères
                </span>
                <span>•</span>
                <span>{sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0} mots</span>
              </div>

              {/* Sample sentences */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] theme-text-muted hidden sm:inline">Exemples :</span>
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
                  className="theme-input text-[11px] rounded-lg px-2 py-1 focus:outline-none"
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
        <div className="flex flex-col theme-card rounded-2xl shadow-xl overflow-hidden transition-all">
          {/* Card Header: Target Language Picker + Swap Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b theme-card-subtle">
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-swap-languages"
                type="button"
                onClick={handleSwapLanguages}
                title="Inverser les langues"
                className="p-1.5 rounded-xl theme-card-subtle theme-text-muted hover:theme-text-primary transition-all active:rotate-180 duration-200"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>

              <LanguageDropdown
                idPrefix="target-lang-dropdown"
                selectedCode={targetLang}
                onSelect={(code) => setTargetLang(code)}
                onOpenFullModal={() => setIsTargetModalOpen(true)}
                isSource={false}
              />

              {/* Quick Target Language Switcher Pills */}
              <div className="hidden sm:flex items-center gap-1">
                {QUICK_TARGET_LANGS.map((item) => {
                  const isActive = targetLang === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setTargetLang(item.code)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                        isActive
                          ? 'theme-accent-btn'
                          : 'theme-text-muted hover:theme-text-primary hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="text-xs select-none">{item.flag}</span>
                      <span className="hidden md:inline">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Performance Latency & Status Badge */}
            <div className="flex items-center gap-2 ml-auto">
              {isLoading ? (
                <span className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse">
                  <Zap className="w-3 h-3 text-indigo-400 animate-spin" />
                  <span>{settings?.debounceDelay || 300}ms IA</span>
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
                <div
                  id="display-translated-text"
                  className={`theme-text-primary text-base ${lineSpacingClass} font-sans select-text whitespace-pre-wrap`}
                >
                  {translatedText}
                </div>
              ) : (
                <div className="theme-text-muted text-sm italic pt-2">
                  La traduction contextuelle et restructurée s&apos;affiche instantanément dès votre saisie...
                </div>
              )}

              {/* Phonetic / Romanization transcript if available */}
              {phonetic && (
                <div className="p-3 rounded-xl theme-card-subtle text-xs theme-accent-badge font-mono">
                  <span className="font-semibold mr-2">Transcription phonétique :</span>
                  <span>{phonetic}</span>
                </div>
              )}
            </div>

            {/* Target Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between pt-4 mt-4 border-t theme-card-subtle">
              <div className="flex items-center gap-2">
                <button
                  id="btn-play-target-audio"
                  type="button"
                  onClick={() => handleSpeakWithBrowser(translatedText, targetLang, false)}
                  disabled={!translatedText}
                  title={isPlayingAudio ? 'Arrêter la lecture' : 'Écouter la traduction'}
                  className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                    isPlayingAudio
                      ? 'theme-accent-btn animate-pulse'
                      : 'theme-card-subtle theme-text-primary hover:theme-accent-btn disabled:opacity-40'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Lecture...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Écouter</span>
                    </>
                  )}
                </button>

                {/* Copy button */}
                <button
                  id="btn-copy-target-text"
                  type="button"
                  onClick={() => handleCopy(translatedText)}
                  disabled={!translatedText}
                  title="Copier le texte"
                  className="p-2 rounded-xl theme-text-muted hover:theme-text-primary theme-card-subtle disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
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
                  type="button"
                  onClick={handleReverseTranslation}
                  disabled={!translatedText}
                  title="Vérifier par traduction inverse"
                  className="p-2 rounded-xl theme-text-muted hover:theme-text-primary theme-card-subtle disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Inverser</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle Phonetics */}
                <button
                  id="btn-toggle-phonetics"
                  type="button"
                  onClick={() => setWithPhonetics(!withPhonetics)}
                  title="Activer la transcription phonétique"
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    withPhonetics
                      ? 'theme-accent-badge'
                      : 'theme-card-subtle theme-text-muted hover:theme-text-primary'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Phonétique</span>
                </button>

                {/* Syntax Inspector Button */}
                {!settings?.zenFocusMode && (
                  <button
                    id="btn-open-syntax-inspector"
                    type="button"
                    onClick={handleOpenSyntaxInspector}
                    disabled={!sourceText || !translatedText}
                    title="Ouvrir l'inspecteur de syntaxe et grammaire"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-accent-btn disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Inspecteur Syntaxique</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

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
