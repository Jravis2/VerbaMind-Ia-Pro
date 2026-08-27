import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  ArrowRightLeft,
  Sparkles,
  Layers,
  Copy,
  Check,
  RefreshCw,
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
} from '../utils/audio';

interface VoiceTranslatorViewProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

export const VoiceTranslatorView: React.FC<VoiceTranslatorViewProps> = ({ onSaveHistory }) => {
  const [sourceLang, setSourceLang] = useState('fr');
  const [targetLang, setTargetLang] = useState('en');
  const [tone, setTone] = useState<ToneStyle>('natural');

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [translatedVoiceText, setTranslatedVoiceText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    { sender: 'source' | 'target'; text: string; translated: string; timestamp: Date }[]
  >([]);

  // Modals
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  const recognizerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToTranslate,
          sourceLang: sLang,
          targetLang: tLang,
          tone,
          withPhonetic: false,
        }),
      });
      const data = await res.json();
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

      onSaveHistory({
        sourceText: textToTranslate,
        translatedText: translated,
        sourceLang: sLang,
        targetLang: tLang,
        tone,
        mode: 'voice',
      });

      // Auto play target translation
      handlePlayTts(translated, tLang);
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
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'Kore' }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        await playRawPcmAudio(data.audioBase64, data.sampleRate || 24000);
      } else {
        await speakTextWithBrowser(text, langCode);
      }
    } catch {
      await speakTextWithBrowser(text, langCode);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  // Toggle Speech Recognition
  const toggleRecording = async () => {
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
          recognizerRef.current = recognizer;
          recognizer.start();
          setIsRecording(true);
        }
      } else {
        // Fallback to MediaRecorder + Gemini 3.5 Transcribe
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
                  body: JSON.stringify({ audio: base64Audio, mimeType: 'audio/webm' }),
                });
                const data = await res.json();
                const text = data.transcription || '';
                setTranscript(text);
                if (text) {
                  translateAndSpeak(text);
                }
              } catch (e) {
                console.error('Transcription error:', e);
              }
            };
            reader.readAsDataURL(audioBlob);
          };

          mediaRecorderRef.current = mediaRecorder;
          mediaRecorder.start();
          setIsRecording(true);
        } catch (e) {
          alert("Accès microphone non autorisé ou non supporté.");
        }
      }
    }
  };

  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Tone selection */}
      <ToneSelector currentTone={tone} onChangeTone={(t) => setTone(t)} />

      {/* Language Header bar */}
      <div className="flex items-center justify-between p-4 bg-[#0c152e] border border-indigo-500/30 rounded-2xl shadow-xl">
        <button
          id="btn-voice-source-lang"
          onClick={() => setIsSourceModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14234b] border border-indigo-500/30 text-white hover:bg-indigo-600/30 text-sm font-semibold transition-all"
        >
          <span className="text-xl leading-none">{sourceLangObj.flag || '🌐'}</span>
          <span>{sourceLangObj.name}</span>
          <span className="text-xs text-indigo-300">▼</span>
        </button>

        <button
          id="btn-voice-swap-langs"
          onClick={handleSwapLanguages}
          className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600/40 border border-slate-700 transition-all"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <button
          id="btn-voice-target-lang"
          onClick={() => setIsTargetModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#172856] border border-indigo-400/40 text-white hover:bg-indigo-600/40 text-sm font-semibold transition-all"
        >
          <span className="text-xl leading-none">{targetLangObj.flag || '🌐'}</span>
          <span>{targetLangObj.name}</span>
          <span className="text-xs text-indigo-300">▼</span>
        </button>
      </div>

      {/* Interactive Microphone Central Stage */}
      <div className="flex flex-col items-center justify-center p-10 bg-gradient-to-b from-[#0e193c] to-[#070d1e] border border-indigo-500/20 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Glowing Background Circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-64 h-64 rounded-full bg-indigo-600/10 filter blur-3xl transition-all duration-500 ${
              isRecording ? 'scale-150 bg-indigo-500/20' : 'scale-100'
            }`}
          ></div>
        </div>

        {/* Status Pills */}
        <div className="mb-6 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14234d]/80 border border-indigo-500/30 text-xs font-semibold text-indigo-200">
          <Radio className={`w-3.5 h-3.5 ${isRecording ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`} />
          <span>
            {isRecording
              ? 'Écoute active en cours... Parlez naturellement'
              : isTranslating
              ? 'Traduction & Synthèse vocale...'
              : 'Appuyez sur le micro pour parler'}
          </span>
        </div>

        {/* Main Microphone Action Button */}
        <button
          id="btn-voice-mic-main"
          onClick={toggleRecording}
          className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 shadow-2xl ${
            isRecording
              ? 'bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-red-500/50 ring-8 ring-red-500/20 animate-pulse'
              : 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-indigo-600/50 hover:shadow-indigo-500/70 hover:scale-105'
          }`}
        >
          {isRecording ? <MicOff className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
        </button>

        {/* Live Transcript / Translation Preview */}
        <div className="w-full max-w-2xl mt-8 space-y-4">
          {transcript && (
            <div className="p-4 rounded-xl bg-[#0b142d] border border-slate-700/80 text-sm text-slate-200 animate-fade-in">
              <div className="text-xs text-slate-400 font-semibold mb-1">Transcription ({sourceLangObj.name}) :</div>
              <p className="font-medium text-white">{transcript}</p>
            </div>
          )}

          {translatedVoiceText && (
            <div className="p-5 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-base text-white shadow-lg animate-slide-up flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-indigo-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Traduction Restructurée ({targetLangObj.name}) :</span>
                </div>
                <p className="font-semibold text-lg text-indigo-50">{translatedVoiceText}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pt-2">
                <button
                  id="btn-replay-voice-audio"
                  onClick={() => handlePlayTts(translatedVoiceText, targetLang)}
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md"
                  title="Réécouter"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <button
                  id="btn-copy-voice-target"
                  onClick={() => handleCopy(translatedVoiceText)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700"
                  title="Copier"
                >
                  {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Thread History */}
      {conversationHistory.length > 0 && (
        <div className="p-5 bg-[#0b1329] border border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Échanges Récents</span>
            <button
              onClick={() => setConversationHistory([])}
              className="text-slate-500 hover:text-slate-300 text-[11px]"
            >
              Effacer la session
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {conversationHistory.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#0e193a] border border-slate-800/80 text-xs space-y-1">
                <div className="text-slate-400 font-medium">« {item.text} »</div>
                <div className="text-indigo-200 font-semibold text-sm flex items-center justify-between">
                  <span>→ {item.translated}</span>
                  <button
                    onClick={() => handlePlayTts(item.translated, targetLang)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
