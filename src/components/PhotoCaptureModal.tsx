import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  ZapOff,
  Sparkles,
  Download,
  Copy,
  Check,
  Scan,
  Volume2,
  Share2,
  Clock,
  RotateCcw,
  Sliders,
  Grid,
  FileImage,
  Upload,
} from 'lucide-react';
import { executeOcrTranslation } from '../services/translationService';
import { LANGUAGES_DATABASE } from '../data/languages';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { speakTextWithBrowser } from '../utils/audio';
import { downloadImage, copyImageToClipboard } from '../utils/screenshotService';
import { AppSettings, triggerHapticFeedback, playUiChime } from '../utils/appSettings';
import { OcrTranslationResponse, HistoryItem } from '../types';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHistory?: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  isOnline?: boolean;
  settings?: AppSettings;
  defaultTargetLang?: string;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onSaveHistory,
  isOnline = true,
  settings,
  defaultTargetLang = 'fr',
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Translation & OCR state
  const [targetLang, setTargetLang] = useState<string>(defaultTargetLang);
  const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<OcrTranslationResponse | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedPhoto, setCopiedPhoto] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const targetLangObj =
    LANGUAGES_DATABASE.find((l) => l.code === targetLang) || {
      code: targetLang,
      name: targetLang,
      nativeName: targetLang,
      flag: '🌐',
      category: 'living',
    };

  // Start Camera
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Webcam stream error:', err);
      setErrorMessage(
        "Accès à la caméra restreint. Vous pouvez importer une photo ou autoriser la caméra dans votre navigateur."
      );
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPhotoUrl(null);
      setOcrResult(null);
      setErrorMessage(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Flip Camera
  const toggleFacingMode = () => {
    triggerHapticFeedback(15);
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Snap Photo Function
  const snapNow = () => {
    if (!videoRef.current || !canvasRef.current) return;
    triggerHapticFeedback(35);
    playUiChime('click');

    // Visual Flash effect
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhotoUrl(photoUrl);
    stopCamera();

    // Auto trigger OCR if online
    if (isOnline) {
      runOcrAnalysis(photoUrl);
    }
  };

  // Countdown timer snap
  const handleSnapWithTimer = () => {
    if (timerSeconds === 0) {
      snapNow();
      return;
    }

    setCountdown(timerSeconds);
    let remaining = timerSeconds;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(interval);
        setCountdown(null);
        snapNow();
      } else {
        setCountdown(remaining);
        triggerHapticFeedback(15);
        playUiChime('click');
      }
    }, 1000);
  };

  // Handle File Input from Mobile / Gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setCapturedPhotoUrl(dataUrl);
      stopCamera();
      if (isOnline) {
        runOcrAnalysis(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run OCR analysis on photo
  const runOcrAnalysis = async (base64Image: string) => {
    setOcrLoading(true);
    setOcrResult(null);
    try {
      const result = await executeOcrTranslation({
        image: base64Image,
        targetLang,
        sourceLang: 'auto',
        tone: 'natural',
      });
      setOcrResult(result);
      if (onSaveHistory && result.detectedText) {
        onSaveHistory({
          sourceText: result.detectedText,
          translatedText: result.translatedText,
          sourceLang: result.detectedLanguage || 'auto',
          targetLang: targetLang,
          tone: 'natural',
          mode: 'ocr',
        });
      }
    } catch (e) {
      console.error('OCR analysis error:', e);
    } finally {
      setOcrLoading(false);
    }
  };

  // Retake Photo
  const handleRetake = () => {
    triggerHapticFeedback(15);
    setCapturedPhotoUrl(null);
    setOcrResult(null);
    startCamera();
  };

  // Download Photo
  const handleDownload = () => {
    if (!capturedPhotoUrl) return;
    triggerHapticFeedback(25);
    playUiChime('success');
    downloadImage(capturedPhotoUrl, `VerbaMind_Photo_${new Date().getTime()}.jpg`);
  };

  // Copy Photo
  const handleCopyPhoto = async () => {
    if (!capturedPhotoUrl) return;
    triggerHapticFeedback(20);
    const ok = await copyImageToClipboard(capturedPhotoUrl);
    if (ok) {
      setCopiedPhoto(true);
      setTimeout(() => setCopiedPhoto(false), 2000);
    }
  };

  // Copy Translated Text
  const handleCopyText = (text: string) => {
    triggerHapticFeedback(15);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn no-screenshot"
      onClick={onClose}
    >
      <div
        id="photo-capture-studio-modal"
        className="w-full max-w-4xl theme-card border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b theme-border-subtle bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black theme-text-primary tracking-tight">
                  Prendre une Photo & Traduction Instantanée
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  Appareil Photo
                </span>
              </div>
              <p className="text-xs theme-text-muted">
                Capturez des documents, panneaux ou textes pour extraction OCR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Target Language selector button */}
            <button
              id="btn-photo-target-lang"
              onClick={() => setIsLangModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-card border theme-text-primary text-xs font-bold transition-all hover:border-indigo-500/50"
              title="Langue de traduction cible"
            >
              <span>{targetLangObj.flag}</span>
              <span className="max-w-[70px] truncate">{targetLangObj.name}</span>
            </button>

            <button
              id="btn-close-photo-modal"
              onClick={onClose}
              className="p-2 rounded-xl theme-card-subtle theme-text-muted hover:theme-text-primary transition-all"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Viewfinder / Photo Area */}
        <div className="relative flex-1 bg-black overflow-hidden flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px]">
          {/* Flash screen overlay */}
          {flashEffect && (
            <div className="absolute inset-0 bg-white z-40 animate-fadeOut pointer-events-none" />
          )}

          {/* Countdown Display */}
          {countdown !== null && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-xs">
              <div className="w-24 h-24 rounded-full bg-indigo-600/90 text-white flex items-center justify-center text-5xl font-black shadow-2xl border-4 border-white/40 animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden file input for gallery upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {!capturedPhotoUrl ? (
            /* Live Camera Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain max-h-[55vh]"
              />

              {/* Composition Grid Overlay */}
              {showGrid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/10">
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-r border-b border-white/20"></div>
                  <div className="border-b border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div className="border-r border-white/20"></div>
                  <div></div>
                </div>
              )}

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-x-8 inset-y-8 sm:inset-x-16 sm:inset-y-12 border-2 border-dashed border-cyan-400/40 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-2 border-l-2 border-cyan-400"></div>
                  <div className="w-5 h-5 border-t-2 border-r-2 border-cyan-400"></div>
                </div>
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-2 border-l-2 border-cyan-400"></div>
                  <div className="w-5 h-5 border-b-2 border-r-2 border-cyan-400"></div>
                </div>
              </div>

              {/* Viewfinder Controls Top Bar */}
              <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 text-xs text-white">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="font-semibold">Live Camera</span>
                </div>

                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-white/10">
                  {/* Flip camera */}
                  <button
                    id="btn-flip-photo-camera"
                    onClick={toggleFacingMode}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all"
                    title="Basculer caméra avant / arrière"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {/* Timer toggle */}
                  <button
                    id="btn-toggle-photo-timer"
                    onClick={() => {
                      triggerHapticFeedback(10);
                      setTimerSeconds((prev) => (prev === 0 ? 3 : prev === 3 ? 5 : 0));
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      timerSeconds > 0
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title="Retardateur photo"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{timerSeconds > 0 ? `${timerSeconds}s` : 'Off'}</span>
                  </button>

                  {/* Grid toggle */}
                  <button
                    id="btn-toggle-photo-grid"
                    onClick={() => {
                      triggerHapticFeedback(10);
                      setShowGrid(!showGrid);
                    }}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                      showGrid
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title="Grille de composition"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bottom Shutter Controls Bar */}
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-6 pointer-events-auto">
                {/* Gallery Upload fallback */}
                <button
                  id="btn-upload-photo-gallery"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all shadow-xl"
                  title="Choisir depuis la galerie / Fichiers"
                >
                  <FileImage className="w-5 h-5 text-cyan-300" />
                </button>

                {/* Main Shutter Button */}
                <button
                  id="btn-take-photo-shutter"
                  onClick={handleSnapWithTimer}
                  className="w-20 h-20 rounded-full border-4 border-white bg-gradient-to-tr from-rose-500 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-2xl shadow-rose-600/50 hover:scale-105 active:scale-95 transition-all group"
                  title="Prendre la photo"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-white/80 flex items-center justify-center group-hover:bg-white/10">
                    <Camera className="w-6 h-6" />
                  </div>
                </button>

                {/* Flip camera shortcut */}
                <button
                  id="btn-quick-flip-camera"
                  onClick={toggleFacingMode}
                  className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all shadow-xl"
                  title="Tourner la caméra"
                >
                  <RotateCcw className="w-5 h-5 text-indigo-300" />
                </button>
              </div>
            </div>
          ) : (
            /* Captured Photo Preview + OCR Text Panel */
            <div className="w-full h-full flex flex-col md:flex-row overflow-auto bg-slate-950">
              {/* Photo Display */}
              <div className="flex-1 p-3 sm:p-5 flex items-center justify-center bg-black/50 min-h-[220px]">
                <div className="relative max-h-[48vh] rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-black">
                  <img
                    src={capturedPhotoUrl}
                    alt="Photo capturée"
                    className="max-h-[48vh] object-contain rounded-xl"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[11px] font-semibold text-rose-300 border border-white/10">
                    Photo Cliché
                  </div>
                </div>
              </div>

              {/* OCR & Translation Results Side Panel */}
              <div className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l theme-border-subtle p-4 flex flex-col justify-between bg-slate-900/70 overflow-y-auto max-h-[40vh] md:max-h-[55vh]">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold theme-text-primary">
                      <Scan className="w-4 h-4 text-cyan-400" />
                      <span>Texte Reconnu & Traduction</span>
                    </div>

                    {ocrLoading && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 animate-pulse font-bold">
                        Analyse IA...
                      </span>
                    )}
                  </div>

                  {ocrLoading ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                      <p className="text-xs theme-text-muted">
                        Extraction du texte et traduction en {targetLangObj.name}...
                      </p>
                    </div>
                  ) : ocrResult ? (
                    <div className="space-y-3">
                      {/* Detected source text */}
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Texte Détecté ({ocrResult.detectedLanguage?.toUpperCase() || 'AUTO'})
                        </span>
                        <p className="text-xs text-slate-200 line-clamp-3">
                          {ocrResult.detectedText || 'Aucun texte détecté.'}
                        </p>
                      </div>

                      {/* Translated text */}
                      <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider flex items-center gap-1">
                            <span>Traduction</span>
                            <span>{targetLangObj.flag}</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              id="btn-speak-photo-translation"
                              onClick={() => speakTextWithBrowser(ocrResult.fullTranslatedText, targetLang)}
                              className="p-1 rounded-lg hover:bg-white/10 text-indigo-300 hover:text-white"
                              title="Écouter la prononciation"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id="btn-copy-photo-translation"
                              onClick={() => handleCopyText(ocrResult.fullTranslatedText)}
                              className="p-1 rounded-lg hover:bg-white/10 text-indigo-300 hover:text-white"
                              title="Copier la traduction"
                            >
                              {copiedText ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-white leading-relaxed">
                          {ocrResult.fullTranslatedText || 'Aucun texte traduit.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-black/20 border border-dashed border-slate-700 text-center">
                      <p className="text-xs theme-text-muted">
                        Photo enregistrée. Cliquez sur "Relancer OCR" pour analyser le texte.
                      </p>
                      <button
                        id="btn-trigger-photo-ocr-manual"
                        onClick={() => runOcrAnalysis(capturedPhotoUrl)}
                        className="mt-2.5 px-3 py-1.5 rounded-xl bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-bold hover:bg-cyan-600/50 transition-all"
                      >
                        Scanner le texte de la photo
                      </button>
                    </div>
                  )}
                </div>

                {/* Panel bottom actions */}
                <div className="pt-3 border-t theme-border-subtle flex items-center justify-between gap-2 mt-3">
                  <button
                    id="btn-retake-photo-studio"
                    onClick={handleRetake}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl theme-card border theme-text-primary text-xs font-bold transition-all hover:bg-white/5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reprendre</span>
                  </button>

                  <button
                    id="btn-copy-photo-blob"
                    onClick={handleCopyPhoto}
                    className="p-2 rounded-xl theme-card border theme-text-primary text-xs hover:border-indigo-500/40"
                    title="Copier l'image"
                  >
                    {copiedPhoto ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-indigo-400" />
                    )}
                  </button>

                  <button
                    id="btn-download-photo-file"
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Target Language Modal */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        onSelectLanguage={(lang) => {
          setTargetLang(lang);
          if (capturedPhotoUrl) {
            runOcrAnalysis(capturedPhotoUrl);
          }
        }}
        selectedLanguage={targetLang}
        title="Sélectionner la langue cible pour la photo"
      />
    </div>
  );
};
