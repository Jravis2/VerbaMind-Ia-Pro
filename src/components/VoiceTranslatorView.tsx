import React, { useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  ArrowRightLeft,
  Sparkles,
  Layers,
  Copy,
  Check,
  Radio,
} from 'lucide-react';
import { ToneStyle, HistoryItem } from '../types';
import { LANGUAGES_DATABASE } from '../data/languages';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { ToneSelector } from './ToneSelector';
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  speakTextWithBrowser,
  playRawPcmAudio,
  fetchWithExponentialBackoff,
} from '../utils/audio';
import { executeTranslation } from '../services/translationService';
import { AppSettings, triggerHapticFeedback, playUiChime } from '../utils/appSettings';
import { I18N_TRANSLATIONS } from '../data/i18n';

interface VoiceTranslatorViewProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  isOnline?: boolean;
  settings?: AppSettings;
}

export const VoiceTranslatorView: React.FC<VoiceTranslatorViewProps> = ({
  onSaveHistory,
  isOnline = true,
  settings,
}) => {
  const [sourceLang, setSourceLang] = useState('fr');
  const [targetLang, setTargetLang] = useState('en');
  const [tone, setTone] = useState<ToneStyle>('natural');

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translatedVoiceText, setTranslatedVoiceText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<
    { sender: 'source' | 'target'; text: string; translated: string; timestamp: Date }[]
  >([]);

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  const recognizerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const t = I18N_TRANSLATIONS[settings?.appLanguage || 'fr'] || I18N_TRANSLATIONS.fr;

  const sourceLangObj =
    LANGUAGES_DATABASE.find((l) => l.code === sourceLang) || {
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

  // Translate transcribed text and speak
  const translateAndSpeak = async (textToTranslate: string, sLang = sourceLang, tLang = targetLang) => {
    if (!textToTranslate.trim()) return;
    if (!isOnline) {
      setErrorMessage('⚠️ Mode hors ligne : Une connexion Internet est requise pour la traduction vocale.');
      return;
    }
    setErrorMessage(null);
    setIsTranslating(true);
    try {
      const data = await executeTranslation({
        text: textToTranslate,
        sourceLang: sLang,
        targetLang: tLang,
        tone,
        withPhonetic: false,
        options: {
          aiModel: settings?.aiModel,
          temperature: settings?.temperature,
          thinkingMode: settings?.thinkingMode,
          grammarStrictness: settings?.grammarStrictness,
          smartRestructuring: settings?.smartRestructuring,
        },
      });

      const translated = data.translatedText || '';
      setTranslatedVoiceText(translated);

      setConversationHistory((prev) => [
        ...prev,
        {
          sender: 'source',
          text: textToTranslate,
          translated,
          timestamp: new Date(),
        },
      ]);

      if (settings?.autoCopyOnFinish && translated) {
        try {
          navigator.clipboard.writeText(translated);
        } catch (e) {}
      }

      if (settings?.uiSoundEffects) {
        playUiChime('success');
      }

      onSaveHistory({
        sourceText: textToTranslate,
        translatedText: translated,
        sourceLang: sLang,
        targetLang: tLang,
        tone,
        mode: 'voice',
      });

      // Auto play target translation if setting enabled (default true)
      if (settings?.autoPlayTts !== false) {
        handlePlayTts(translated, tLang);
      }
    } catch (err) {
      console.error('Voice translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // TTS playback
  const handlePlayTts = async (text: string, langCode: string) => {
    if (!text) return;
    setIsPlayingAudio(true);
    const voiceOpts = {
      rate: settings?.voiceSpeed ?? 1.0,
      pitch: settings?.voicePitch ?? 1.0,
      gender: settings?.voiceGender ?? 'auto',
    };
    try {
      const res = await fetchWithExponentialBackoff(
        '/api/tts',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice: 'Kore' }),
        },
        1,
        500
      );
      if (res && res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          await playRawPcmAudio(data.audioBase64, data.sampleRate || 24000);
        } else {
          await speakTextWithBrowser(text, langCode, voiceOpts);
        }
      } else {
        await speakTextWithBrowser(text, langCode, voiceOpts);
      }
    } catch {
      await speakTextWithBrowser(text, langCode, voiceOpts);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  // Toggle Speech Recognition
  const toggleRecording = async () => {
    if (settings?.hapticFeedback) triggerHapticFeedback(20);

    if (isRecording) {
      // Stop
      if (recognizerRef.current) {
        recognizerRef.current.stop();
      }
      setIsRecording(false);
      if (transcript) {
        translateAndSpeak(transcript);
      }
    } else {
      // Start
      setTranscript('');
      setTranslatedVoiceText('');

      if (isSpeechRecognitionSupported()) {
        const recognizer = createSpeechRecognizer(
          sourceLang === 'auto' ? 'fr-FR' : sourceLang,
          (text) => {
            setTranscript(text);
          },
          (err) => {
            console.warn('Speech recognition notice:', err);
            setIsRecording(false);
          }
        );
        if (recognizer) {
          recognizer.continuous = Boolean(settings?.speechContinuous);
          recognizerRef.current = recognizer;
          recognizer.start();
          setIsRecording(true);
        }
      } else {
        // Fallback to MediaRecorder
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              noiseSuppression: settings?.noiseSuppression !== false,
              echoCancellation: true,
            },
          });
          const mediaRecorder = new MediaRecorder(stream);
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onload = async (event) => {
              const base64Audio = (event.target?.result as string).split(',')[1];
              try {
                const res = await fetch('/api/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ audioBase64: base64Audio, mimeType: 'audio/webm' }),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.transcript) {
                    setTranscript(data.transcript);
                    translateAndSpeak(data.transcript);
                  }
                }
              } catch (e) {
                console.error('Transcribe error:', e);
              }
            };
            reader.readAsDataURL(audioBlob);
          };

          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.start();
          setIsRecording(true);
        } catch (e) {
          console.error('Mic access error:', e);
          setErrorMessage("Impossible d'accéder au microphone. Veuillez autoriser l'accès.");
        }
      }
    }
  };

  // Swap Languages
  const handleSwap = () => {
    if (settings?.hapticFeedback) triggerHapticFeedback(10);
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setTranscript('');
    setTranslatedVoiceText('');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    if (settings?.hapticFeedback) triggerHapticFeedback(10);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1">
          <ToneSelector currentTone={tone} onChangeTone={(t) => setTone(t)} />
        </div>

        {/* Language Pair Selector */}
        <div className="flex items-center gap-2 theme-card p-1.5 rounded-2xl">
          <button
            id="btn-voice-source-lang"
            onClick={() => setIsSourceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl theme-card-subtle theme-text-primary text-xs font-bold transition-all"
          >
            <span>{sourceLangObj.flag}</span>
            <span>{sourceLangObj.name}</span>
          </button>

          <button
            id="btn-swap-voice-langs"
            onClick={handleSwap}
            title="Inverser les langues"
            className="p-2 rounded-xl theme-card-subtle theme-text-muted hover:theme-text-primary transition-all active:rotate-180 duration-200"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-voice-target-lang"
            onClick={() => setIsTargetModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl theme-card-subtle theme-text-primary text-xs font-bold transition-all"
          >
            <span>{targetLangObj.flag}</span>
            <span>{targetLangObj.name}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Main Microphone Action Card */}
      <div className="theme-card rounded-2xl p-8 sm:p-12 shadow-2xl flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
        {/* Pulsing Aura Rings */}
        <div className="relative">
          {isRecording && (
            <>
              <span className="animate-ping absolute -inset-4 rounded-full bg-red-500/40 opacity-75"></span>
              <span className="animate-pulse absolute -inset-8 rounded-full bg-red-500/20"></span>
            </>
          )}

          <button
            id="btn-toggle-voice-record"
            onClick={toggleRecording}
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all duration-300 transform active:scale-95 ${
              isRecording
                ? 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-red-600/50 scale-105'
                : 'theme-accent-btn shadow-lg'
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-10 h-10 animate-pulse" />
                <span className="text-[11px] font-extrabold uppercase mt-1 tracking-wider">Arrêter</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10" />
                <span className="text-[11px] font-extrabold uppercase mt-1 tracking-wider">Parler</span>
              </>
            )}
          </button>
        </div>

        {/* Live Audio Status */}
        <div className="space-y-2 max-w-md">
          <div className="flex items-center justify-center gap-2">
            <Radio
              className={`w-4 h-4 ${
                isRecording ? 'text-red-400 animate-pulse' : isTranslating ? 'text-indigo-400 animate-spin' : 'theme-text-muted'
              }`}
            />
            <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider">
              {isRecording
                ? 'Écoute active en cours...'
                : isTranslating
                ? 'Traduction par Gemini AI...'
                : 'Appuyez pour dicter une phrase'}
            </h3>
          </div>

          <p className="text-xs theme-text-muted">
            {isRecording
              ? `Langue source : ${sourceLangObj.name} • Parlez naturellement`
              : 'La traduction sera instantanément lue à voix haute avec la voix IA naturelle.'}
          </p>
        </div>

        {/* Realtime Transcript & Output Cards */}
        {(transcript || translatedVoiceText) && (
          <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4 text-left pt-4 animate-fade-in">
            {/* User transcript */}
            <div className="p-4 rounded-xl theme-card-subtle border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold theme-text-muted">
                <span>{sourceLangObj.name} (Original)</span>
                <span className="text-base">{sourceLangObj.flag}</span>
              </div>
              <p className="text-sm theme-text-primary leading-relaxed select-text">
                {transcript || 'En attente de dictée...'}
              </p>
            </div>

            {/* AI Translation output */}
            <div className="p-4 rounded-xl theme-card border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold theme-accent-badge">
                <span>{targetLangObj.name} (Traduction)</span>
                <span className="text-base">{targetLangObj.flag}</span>
              </div>
              <p className="text-sm theme-text-primary font-medium leading-relaxed select-text">
                {translatedVoiceText || 'Traduction en attente...'}
              </p>

              {translatedVoiceText && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t theme-card-subtle">
                  <button
                    id="btn-play-voice-tts"
                    onClick={() => handlePlayTts(translatedVoiceText, targetLang)}
                    className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary text-xs flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isPlayingAudio ? 'Lecture...' : 'Écouter'}</span>
                  </button>

                  <button
                    id="btn-copy-voice-text"
                    onClick={() => handleCopy(translatedVoiceText)}
                    className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary text-xs flex items-center gap-1"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copySuccess ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conversation Thread History */}
      {conversationHistory.length > 0 && (
        <div className="theme-card rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b theme-card-subtle pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Historique de la conversation vocale</span>
            </h4>
            <span className="text-xs theme-text-muted">{conversationHistory.length} échanges</span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {conversationHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl theme-card-subtle border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 theme-text-muted font-medium">
                    <span>{sourceLangObj.name} :</span>
                    <span className="theme-text-primary">{item.text}</span>
                  </div>
                  <div className="flex items-center gap-2 theme-text-primary font-bold">
                    <span className="theme-text-muted font-medium">{targetLangObj.name} :</span>
                    <span>{item.translated}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => handlePlayTts(item.translated, targetLang)}
                    className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary"
                    title="Écouter"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Language Modals */}
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
    </div>
  );
};
