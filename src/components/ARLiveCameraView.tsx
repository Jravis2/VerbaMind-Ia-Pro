import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Scan,
  Volume2,
  Copy,
  Check,
  Zap,
  Globe,
  Layers,
  Pause,
  Play,
  Maximize2,
  Eye,
} from 'lucide-react';
import { ToneStyle, HistoryItem, OcrTranslationResponse } from '../types';
import { LANGUAGES_DATABASE } from '../data/languages';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import { ToneSelector } from './ToneSelector';
import { speakTextWithBrowser, fetchWithExponentialBackoff } from '../utils/audio';

interface ARLiveCameraViewProps {
  onSaveHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

export const ARLiveCameraView: React.FC<ARLiveCameraViewProps> = ({ onSaveHistory }) => {
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
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMessage(
        "Impossible d'accéder à la caméra. Vérifiez les permissions de votre navigateur ou utilisez l'importation de photo."
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
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
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
      const now = Date.now();
      if (isAnalyzingRef.current && isFromLiveStream) return;
      if (isFromLiveStream && now - lastScanTimeRef.current < 3500) return;

      lastScanTimeRef.current = now;
      isAnalyzingRef.current = true;
      setIsLoading(true);

      try {
        const res = await fetchWithExponentialBackoff(
          '/api/ocr-translate',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: base64Image,
              targetLang,
              tone,
            }),
          },
          2,
          1000
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: OcrTranslationResponse = await res.json();
        setOcrResult(data);
        setErrorMessage(null);

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
    [targetLang, tone, onSaveHistory]
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
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.80);
  }, []);

  // Single Frame Snapshot
  const handleTakeSnapshot = () => {
    const frame = captureFrame();
    if (frame) {
      setCapturedImagePreview(frame);
      stopCamera();
      analyzeImageFrame(frame, false);
    }
  };

  // Toggle Live AR Stream scanning (cadence optimisée à 4s)
  const toggleLiveScanning = () => {
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

  // Live Stream loop effect (4 seconds interval for high stability)
  useEffect(() => {
    if (isLiveStreamScanning && isCameraActive) {
      // Trigger first scan immediately
      const initialFrame = captureFrame();
      if (initialFrame) {
        analyzeImageFrame(initialFrame, true);
      }

      liveIntervalRef.current = setInterval(() => {
        const frame = captureFrame();
        if (frame) {
          analyzeImageFrame(frame, true);
        }
      }, 4000);
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
  }, [isLiveStreamScanning, isCameraActive, analyzeImageFrame, captureFrame]);

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
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Top Tone & Target Language Control */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1">
          <ToneSelector currentTone={tone} onChangeTone={(t) => setTone(t)} />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-300">Langue Cible :</div>
          <button
            id="btn-ocr-target-lang"
            onClick={() => setIsTargetModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#172856] border border-indigo-400/40 text-white hover:bg-indigo-600/40 text-xs font-bold transition-all shadow-md shadow-indigo-950/40"
          >
            <span className="text-base leading-none">{targetLangObj.flag || '🌐'}</span>
            <span>{targetLangObj.name}</span>
            <span className="text-[10px] text-indigo-300">▼</span>
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
        {/* Left Column: Viewport (Video Stream + AR Live Subtitles & Bounding Boxes) */}
        <div className="lg:col-span-7 flex flex-col bg-[#091024] border border-indigo-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/50">
          {/* Top Video Header Controls */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#0d1736] border-b border-slate-800">
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
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Scan className="w-4 h-4 text-indigo-400" />
                <span>
                  {isLiveStreamScanning
                    ? 'Flux AR Live Actif (Cadence 1.5s)'
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
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}

              {isCameraActive && (
                <button
                  id="btn-stop-camera"
                  onClick={stopCamera}
                  title="Couper la caméra"
                  className="p-1.5 rounded-lg text-red-300 hover:text-red-100 hover:bg-red-950/60 border border-red-500/30 transition-all text-xs"
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
                  <h3 className="text-base font-semibold text-white">Reconnaissance Visuelle AR & OCR</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Détectez et traduisez instantanément les textes, panneaux, étiquettes, manuscrits ou tablettes anciennes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    id="btn-start-camera-main"
                    onClick={startCamera}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Démarrer la Caméra</span>
                  </button>

                  <label
                    htmlFor="input-upload-image"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-all"
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
                      style={{ top, left, width, height }}
                      className="absolute border border-indigo-400 bg-indigo-950/70 backdrop-blur-xs rounded flex flex-col justify-end p-1 animate-fade-in shadow-lg shadow-indigo-500/20"
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
                className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl bg-[#0b142ecc]/95 border border-indigo-500/50 backdrop-blur-md text-white shadow-2xl transition-opacity animate-slide-up"
              >
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-indigo-300 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>Overlay AR ({targetLangObj.name})</span>
                  </div>
                  {ocrResult.detectedLanguage && (
                    <span className="text-slate-400">Source détectée : {ocrResult.detectedLanguage}</span>
                  )}
                </div>
                <div className="text-sm font-semibold leading-relaxed text-indigo-100 line-clamp-3">
                  {ocrResult.translatedText}
                </div>
              </div>
            )}

            {/* Scanning radar sweep animation when scanning live */}
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
          <div className="p-4 bg-[#0a1229] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                id="btn-toggle-live-scan"
                onClick={toggleLiveScanning}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isLiveStreamScanning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                }`}
              >
                {isLiveStreamScanning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Mettre en Pause le Live (1.5s)</span>
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capturer une Photo</span>
                </button>
              )}
            </div>

            {/* Overlay opacity slider */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
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

        {/* Right Column: Detailed OCR Extraction & Translated Text Breakdown */}
        <div className="lg:col-span-5 flex flex-col bg-[#0b142c] border border-indigo-500/20 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-[#0e193c] border-b border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
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
            <div className="p-4 rounded-xl bg-[#091126] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span>Texte Détecté Optiquement (OCR)</span>
                {ocrResult?.detectedLanguage && (
                  <span className="text-indigo-400 font-mono">[{ocrResult.detectedLanguage}]</span>
                )}
              </div>
              <p className="text-sm text-slate-200 leading-relaxed select-text whitespace-pre-wrap">
                {ocrResult?.detectedText || 'Aucun texte détecté pour le moment.'}
              </p>
            </div>

            {/* Translated & Restructured Result */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                <span>Traduction Contextuelle ({targetLangObj.name})</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {tone}
                </span>
              </div>
              <p className="text-base text-white font-medium leading-relaxed select-text whitespace-pre-wrap">
                {ocrResult?.translatedText || 'La traduction apparaîtra ici après analyse.'}
              </p>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 bg-[#080f22] border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                id="btn-speak-ocr-result"
                disabled={!ocrResult?.translatedText}
                onClick={() => ocrResult && speakTextWithBrowser(ocrResult.translatedText, targetLang)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
              >
                <Volume2 className="w-4 h-4 text-indigo-400" />
                <span>Écouter</span>
              </button>

              <button
                id="btn-copy-ocr-result"
                disabled={!ocrResult?.translatedText}
                onClick={() => ocrResult && handleCopy(ocrResult.translatedText)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-medium"
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
              <span className="text-xs text-slate-400">Temps de réponse : {ocrResult.latencyMs} ms</span>
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
