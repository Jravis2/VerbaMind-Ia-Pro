import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Upload,
  Scan,
  Volume2,
  Copy,
  Check,
  Layers,
  Pause,
  Play,
  Eye,
} from 'lucide-react';
import { ToneStyle, HistoryItem, OcrTranslationResponse } from '../types';
import { LANGUAGES_DATABASE } from '../data/languages';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { ToneSelector } from './ToneSelector';
import { speakTextWithBrowser } from '../utils/audio';
import { executeOcrTranslation } from '../services/translationService';
import { AppSettings, triggerHapticFeedback, playUiChime } from '../utils/appSettings';
import { I18N_TRANSLATIONS } from '../data/i18n';

interface ARLiveCameraViewProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  isOnline?: boolean;
  settings?: AppSettings;
}

export const ARLiveCameraView: React.FC<ARLiveCameraViewProps> = ({
  onSaveHistory,
  isOnline = true,
  settings,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLiveStreamScanning, setIsLiveStreamScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [targetLang, setTargetLang] = useState<string>('fr');
  const [tone, setTone] = useState<ToneStyle>('natural');
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  const [ocrResult, setOcrResult] = useState<OcrTranslationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImagePreview, setCapturedImagePreview] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef(false);
  const lastScanTimeRef = useRef<number>(0);

  const t = I18N_TRANSLATIONS[settings?.appLanguage || 'fr'] || I18N_TRANSLATIONS.fr;

  const targetLangObj =
    LANGUAGES_DATABASE.find((l) => l.code === targetLang) || {
      code: targetLang,
      name: targetLang,
      nativeName: targetLang,
      flag: '🌐',
      category: 'living',
    };

  // Compute camera resolution from settings
  const getIdealDimensions = () => {
    switch (settings?.cameraResolution) {
      case '4k':
        return { width: 3840, height: 2160 };
      case '1080p':
        return { width: 1920, height: 1080 };
      case '720p':
      default:
        return { width: 1280, height: 720 };
    }
  };

  // Start Camera
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((tk) => tk.stop());
      }
      const dims = getIdealDimensions();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: dims.width },
          height: { ideal: dims.height },
          frameRate: { ideal: settings?.cameraFpsLimit || 30 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setCapturedImagePreview(null);
      if (settings?.hapticFeedback) triggerHapticFeedback(15);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMessage(
        "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur ou utilisez l'importation de photo."
      );
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((tk) => tk.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsLiveStreamScanning(false);
  };

  // Switch between front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(startCamera, 300);
    }
  };

  // Process a frame or image with Gemini OCR
  const analyzeImageFrame = useCallback(
    async (base64Image: string, isFromLiveStream = false) => {
      if (!isOnline) {
        if (!isFromLiveStream) {
          setErrorMessage('⚠️ Mode hors ligne actif. Une connexion Internet est requise pour analyser les images.');
        }
        return;
      }

      const scanInterval = settings?.arScanInterval || 1500;
      const now = Date.now();
      if (isAnalyzingRef.current && isFromLiveStream) return;
      if (isFromLiveStream && now - lastScanTimeRef.current < scanInterval) return;

      lastScanTimeRef.current = now;
      isAnalyzingRef.current = true;
      setIsLoading(true);

      try {
        const data: OcrTranslationResponse = await executeOcrTranslation({
          image: base64Image,
          targetLang,
          tone,
        });

        setOcrResult(data);
        setErrorMessage(null);

        if (settings?.uiSoundEffects && data.translatedText) {
          playUiChime('success');
        }

        if (data.translatedText && !isFromLiveStream) {
          onSaveHistory({
            sourceText: data.detectedText || 'Texte image OCR',
            translatedText: data.translatedText,
            sourceLang: data.detectedLanguage || 'auto',
            targetLang,
            tone,
            mode: 'ocr',
          });
        }
      } catch (err: any) {
        console.error('OCR analysis error:', err);
        if (!isFromLiveStream) {
          setErrorMessage("Échec temporaire de l'analyse OCR. Veuillez réessayer.");
        }
      } finally {
        isAnalyzingRef.current = false;
        setIsLoading(false);
      }
    },
    [targetLang, tone, onSaveHistory, isOnline, settings]
  );

  // Capture current video frame
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (settings?.cameraMirrorMode) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, [settings?.cameraMirrorMode]);

  // Single Frame Snapshot
  const handleTakeSnapshot = () => {
    const frame = captureFrame();
    if (frame) {
      if (settings?.hapticFeedback) triggerHapticFeedback(25);
      setCapturedImagePreview(frame);
      stopCamera();
      analyzeImageFrame(frame, false);
    }
  };

  // Toggle Live AR Stream scanning
  const toggleLiveScanning = () => {
    if (settings?.hapticFeedback) triggerHapticFeedback(15);
    if (isLiveStreamScanning) {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      setIsLiveStreamScanning(false);
    } else {
      if (!isCameraActive) {
        startCamera().then(() => {
          setIsLiveStreamScanning(true);
        });
      } else {
        setIsLiveStreamScanning(true);
      }
    }
  };

  // Live Stream loop effect respecting settings.arScanInterval
  useEffect(() => {
    if (isLiveStreamScanning && isCameraActive) {
      const intervalMs = settings?.arScanInterval || 1500;
      const initialFrame = captureFrame();
      if (initialFrame) {
        analyzeImageFrame(initialFrame, true);
      }

      liveIntervalRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame) {
          analyzeImageFrame(frame, true);
        }
      }, intervalMs);
    } else {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    }

    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    };
  }, [isLiveStreamScanning, isCameraActive, analyzeImageFrame, captureFrame, settings?.arScanInterval]);

  // Clean up media streams on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Handle image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        stopCamera();
        setCapturedImagePreview(base64);
        analyzeImageFrame(base64, false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          stopCamera();
          setCapturedImagePreview(base64);
          analyzeImageFrame(base64, false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    if (settings?.hapticFeedback) triggerHapticFeedback(10);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const boxThickness = settings?.arBoxThickness || 2;
  const overlayStyle = settings?.arOverlayStyle || 'neon-boxes';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Top Tone & Target Language Control */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1">
          <ToneSelector currentTone={tone} onChangeTone={(t) => setTone(t)} />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold theme-text-muted">Langue Cible :</div>
          <button
            id="btn-ocr-target-lang"
            onClick={() => setIsTargetModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl theme-card-subtle border theme-text-primary hover:theme-accent-btn text-xs font-bold transition-all shadow-md"
          >
            <span className="text-base leading-none">{targetLangObj.flag || '🌐'}</span>
            <span>{targetLangObj.name}</span>
            <span className="text-[10px] theme-text-muted">▼</span>
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

      {/* Main AR Camera / Scanner Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Viewport */}
        <div className="lg:col-span-7 flex flex-col theme-card rounded-2xl overflow-hidden shadow-2xl">
          {/* Top Video Header Controls */}
          <div className="flex items-center justify-between px-5 py-3 theme-card-subtle border-b">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isLiveStreamScanning
                    ? 'bg-emerald-400 animate-ping'
                    : isCameraActive
                    ? 'bg-amber-400'
                    : 'bg-slate-500'
                }`}
              ></span>
              <span className="text-xs font-bold theme-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Scan className="w-4 h-4 text-indigo-400" />
                <span>
                  {isLiveStreamScanning
                    ? `Flux AR Live (${settings?.arScanInterval || 1500}ms)`
                    : isCameraActive
                    ? 'Caméra Prête'
                    : capturedImagePreview
                    ? 'Image Fixe Capturée'
                    : 'Viseur AR & Scanner'}
                </span>
              </span>
            </div>

            {/* Camera Actions */}
            <div className="flex items-center gap-2">
              {isCameraActive && (
                <button
                  id="btn-flip-camera"
                  onClick={toggleFacingMode}
                  title="Changer de caméra (Avant / Arrière)"
                  className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:bg-slate-800/40 border theme-card-subtle transition-all text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}

              {isCameraActive && (
                <button
                  id="btn-stop-camera"
                  onClick={stopCamera}
                  title="Couper la caméra"
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-950/60 border border-red-500/30 transition-all text-xs"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Viewport Canvas Frame */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group select-none"
          >
            {/* Realtime Video element */}
            <video
              ref={videoRef}
              playsInline
              muted
              style={settings?.cameraMirrorMode ? { transform: 'scaleX(-1)' } : undefined}
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {/* Static Image Preview */}
            {!isCameraActive && capturedImagePreview && (
              <img
                src={capturedImagePreview}
                alt="Captured visual source"
                className="w-full h-full object-contain bg-slate-950"
              />
            )}

            {/* Placeholder state when idle */}
            {!isCameraActive && !capturedImagePreview && (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold theme-text-primary">Reconnaissance Visuelle AR & OCR</h3>
                  <p className="text-xs theme-text-muted max-w-sm">
                    Détectez et traduisez instantanément les textes, panneaux, étiquettes, manuscrits ou tablettes anciennes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    id="btn-start-camera-main"
                    onClick={startCamera}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl theme-accent-btn text-xs font-bold transition-all shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Démarrer la Caméra</span>
                  </button>

                  <label
                    htmlFor="input-upload-image"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl theme-card-subtle theme-text-primary border text-xs font-semibold cursor-pointer transition-all hover:opacity-80"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Importer une Photo</span>
                    <input
                      type="file"
                      id="input-upload-image"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Hidden canvas for taking snapshot frame */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Real-time AR Bounding Box Overlays */}
            {ocrResult?.detectedBlocks && ocrResult.detectedBlocks.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {ocrResult.detectedBlocks.map((block, idx) => {
                  if (!block.boundingBox) return null;
                  const [ymin, xmin, ymax, xmax] = block.boundingBox;
                  const top = `${ymin / 10}%`;
                  const left = `${xmin / 10}%`;
                  const width = `${(xmax - xmin) / 10}%`;
                  const height = `${(ymax - ymin) / 10}%`;

                  return (
                    <div
                      key={idx}
                      style={{
                        top,
                        left,
                        width,
                        height,
                        borderWidth: `${boxThickness}px`,
                      }}
                      className={`absolute rounded flex flex-col justify-end p-1 animate-fade-in shadow-lg ${
                        overlayStyle === 'neon-boxes'
                          ? 'border-indigo-400 bg-indigo-950/70 shadow-indigo-500/30'
                          : overlayStyle === 'translucent-pills'
                          ? 'border-cyan-400 bg-cyan-950/50 backdrop-blur-xs'
                          : overlayStyle === 'solid-cards'
                          ? 'border-white bg-slate-900/90'
                          : 'border-transparent bg-black/60'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-white bg-indigo-600/90 px-1 py-0.5 rounded truncate">
                        {block.translated}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live Superimposed Subtitle Banner (AR Overlay) */}
            {ocrResult?.translatedText && (
              <div
                style={{ opacity: overlayOpacity }}
                className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl theme-card border backdrop-blur-md theme-text-primary shadow-2xl transition-opacity animate-slide-up"
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold theme-text-muted mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>Overlay AR ({targetLangObj.name})</span>
                  </div>
                  {ocrResult.detectedLanguage && (
                    <span>Source détectée : {ocrResult.detectedLanguage}</span>
                  )}
                </div>
                <div className="text-sm font-semibold leading-relaxed line-clamp-3">
                  {ocrResult.translatedText}
                </div>
              </div>
            )}

            {/* Scanning radar sweep animation */}
            {isLiveStreamScanning && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse shadow-lg shadow-indigo-500"></div>
              </div>
            )}

            {/* Loading Indicator Spinner */}
            {isLoading && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-slate-950/80 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-2 backdrop-blur-md">
                <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Analyse OCR...</span>
              </div>
            )}
          </div>

          {/* Viewport Control Bar */}
          <div className="p-4 theme-card-subtle border-t flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                id="btn-toggle-live-scan"
                onClick={toggleLiveScanning}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isLiveStreamScanning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30'
                    : 'theme-accent-btn shadow-lg'
                }`}
              >
                {isLiveStreamScanning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Mettre en Pause le Live</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Démarrer le Flux AR Live</span>
                  </>
                )}
              </button>

              {isCameraActive && !isLiveStreamScanning && (
                <button
                  id="btn-take-snapshot"
                  onClick={handleTakeSnapshot}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl theme-card-subtle theme-text-primary text-xs font-semibold border"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capturer une Photo</span>
                </button>
              )}
            </div>

            {/* Overlay opacity slider */}
            <div className="flex items-center gap-2 text-xs theme-text-muted">
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Transparence :</span>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-20 accent-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Detailed OCR Extraction & Translated Text */}
        <div className="lg:col-span-5 flex flex-col theme-card rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 theme-card-subtle border-b flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Résultats d&apos;Extraction & Traduction</span>
            </div>
            {ocrResult?.confidence && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Confiance : {Math.round(ocrResult.confidence * 100)}%
              </span>
            )}
          </div>

          <div className="flex-1 p-5 space-y-5 overflow-y-auto max-h-[500px]">
            {/* Detected Source Text */}
            <div className="p-4 rounded-xl theme-card-subtle border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold theme-text-muted">
                <span>Texte Détecté Optiquement (OCR)</span>
                {ocrResult?.detectedLanguage && (
                  <span className="text-indigo-400 font-mono">[{ocrResult.detectedLanguage}]</span>
                )}
              </div>
              <p className="text-sm theme-text-primary leading-relaxed select-text whitespace-pre-wrap">
                {ocrResult?.detectedText || 'Aucun texte détecté pour le moment.'}
              </p>
            </div>

            {/* Translated & Restructured Result */}
            <div className="p-4 rounded-xl theme-card border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold theme-accent-badge">
                <span>Traduction Contextuelle ({targetLangObj.name})</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded border">
                  {tone}
                </span>
              </div>
              <p className="text-base theme-text-primary font-medium leading-relaxed select-text whitespace-pre-wrap">
                {ocrResult?.translatedText || 'La traduction apparaîtra ici après analyse.'}
              </p>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 theme-card-subtle border-t flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                id="btn-speak-ocr-result"
                disabled={!ocrResult?.translatedText}
                onClick={() =>
                  ocrResult &&
                  speakTextWithBrowser(ocrResult.translatedText, targetLang, {
                    rate: settings?.voiceSpeed,
                    pitch: settings?.voicePitch,
                    gender: settings?.voiceGender,
                  })
                }
                className="p-2 rounded-xl theme-text-muted hover:theme-text-primary theme-card-subtle disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
              >
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>Écouter</span>
              </button>

              <button
                id="btn-copy-ocr-result"
                disabled={!ocrResult?.translatedText}
                onClick={() => ocrResult && handleCopy(ocrResult.translatedText)}
                className="p-2 rounded-xl theme-text-muted hover:theme-text-primary theme-card-subtle disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
              >
                {copySuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>

            {ocrResult?.latencyMs && (
              <span className="text-xs theme-text-muted">Temps : {ocrResult.latencyMs} ms</span>
            )}
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
