import { UILanguage } from '../data/i18n';
import { getStoredApiKey, saveStoredApiKey } from '../services/clientGemini';

export type ThemePreset =
  | 'cyber-midnight'
  | 'deep-sapphire'
  | 'obsidian-gold'
  | 'emerald-neon'
  | 'crimson-ruby'
  | 'amethyst-purple'
  | 'clean-light'
  | 'sunset-amber'
  | 'nordic-frost';

export interface AppSettings {
  // Category 1: Thèmes & Couleurs (7)
  themePreset: ThemePreset;
  accentColor: string;
  glowIntensity: 'none' | 'subtle' | 'vibrant' | 'ultra';
  glassmorphism: 'none' | 'subtle' | 'medium' | 'high';
  highContrast: boolean;
  borderWidth: 'thin' | 'normal' | 'thick';
  backgroundParticles: boolean;

  // Category 2: Langue & Région (6)
  appLanguage: UILanguage;
  rtlDirection: boolean;
  timeFormat: '24h' | '12h';
  numberFormat: 'eu' | 'us';
  autoTranslateSystemClipboard: boolean;
  spellCheckInput: boolean;

  // Category 3: IA & Gemini (7)
  geminiApiKey: string;
  aiModel: 'gemini-2.5-flash' | 'gemini-1.5-pro' | 'gemini-2.5-flash-lite';
  thinkingMode: 'auto' | 'off' | 'deep';
  temperature: number;
  grammarStrictness: 'natural' | 'strict' | 'creative';
  autoLanguageDetection: 'standard' | 'deep-learning';
  smartRestructuring: boolean;

  // Category 4: Caméra AR & OCR (7)
  cameraResolution: '720p' | '1080p' | '4k';
  cameraFpsLimit: 15 | 30 | 60;
  arOverlayStyle: 'neon-boxes' | 'translucent-pills' | 'minimal-subtitles' | 'solid-cards';
  arBoxThickness: 1 | 2 | 3 | 4;
  cameraMirrorMode: boolean;
  cameraTorchFlash: boolean;
  arScanInterval: 800 | 1500 | 2500 | 4000;

  // Category 5: Audio & Synthèse Vocale (7)
  voiceSpeed: number;
  voicePitch: number;
  autoPlayTts: boolean;
  voiceGender: 'auto' | 'female' | 'male';
  uiSoundEffects: boolean;
  noiseSuppression: boolean;
  speechContinuous: boolean;

  // Category 6: Typographie & Accessibilité (6)
  fontSizeScale: 'small' | 'medium' | 'large' | 'xlarge';
  dyslexicFont: boolean;
  lineSpacing: 'compact' | 'normal' | 'relaxed';
  alwaysShowPhonetics: boolean;
  reducedMotion: boolean;
  zenFocusMode: boolean;

  // Category 7: Ergonomie & Traduction (6)
  debounceDelay: 150 | 300 | 500 | 800;
  autoCopyOnFinish: boolean;
  autoTranslateOnPaste: boolean;
  confirmBeforeClear: boolean;
  keepScreenAwake: boolean;
  hapticFeedback: boolean;

  // Category 8: GitHub Pages & Données (6)
  historyAutoSaveLimit: 20 | 50 | 100 | 500;
  autoSaveFavorites: boolean;
  offlineCacheLimitMb: 10 | 50 | 100;
  telemetryAndLogs: boolean;
  notificationOnTranslate: boolean;
  maxCharWarning: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  // Themes & Colors
  themePreset: 'cyber-midnight',
  accentColor: '#6366f1',
  glowIntensity: 'vibrant',
  glassmorphism: 'medium',
  highContrast: false,
  borderWidth: 'normal',
  backgroundParticles: true,

  // Language & Region
  appLanguage: 'fr',
  rtlDirection: false,
  timeFormat: '24h',
  numberFormat: 'eu',
  autoTranslateSystemClipboard: false,
  spellCheckInput: true,

  // AI & Gemini
  geminiApiKey: '',
  aiModel: 'gemini-2.5-flash',
  thinkingMode: 'auto',
  temperature: 0.3,
  grammarStrictness: 'natural',
  autoLanguageDetection: 'deep-learning',
  smartRestructuring: true,

  // AR Camera & OCR
  cameraResolution: '1080p',
  cameraFpsLimit: 30,
  arOverlayStyle: 'neon-boxes',
  arBoxThickness: 2,
  cameraMirrorMode: false,
  cameraTorchFlash: false,
  arScanInterval: 1500,

  // Audio & TTS
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  autoPlayTts: false,
  voiceGender: 'auto',
  uiSoundEffects: true,
  noiseSuppression: true,
  speechContinuous: false,

  // Typography & Access
  fontSizeScale: 'medium',
  dyslexicFont: false,
  lineSpacing: 'normal',
  alwaysShowPhonetics: true,
  reducedMotion: false,
  zenFocusMode: false,

  // Ergonomics & Translation
  debounceDelay: 300,
  autoCopyOnFinish: false,
  autoTranslateOnPaste: true,
  confirmBeforeClear: false,
  keepScreenAwake: false,
  hapticFeedback: true,

  // GitHub Pages & Data
  historyAutoSaveLimit: 100,
  autoSaveFavorites: true,
  offlineCacheLimitMb: 50,
  telemetryAndLogs: false,
  notificationOnTranslate: false,
  maxCharWarning: true,
};

const SETTINGS_STORAGE_KEY = 'verbamind_pro_settings_v2';

export function loadStoredSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const apiKey = getStoredApiKey();
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        geminiApiKey: apiKey || parsed.geminiApiKey || '',
      };
    }
    return {
      ...DEFAULT_SETTINGS,
      geminiApiKey: apiKey || '',
    };
  } catch (e) {
    console.warn('Failed to parse stored settings, using defaults:', e);
    return {
      ...DEFAULT_SETTINGS,
      geminiApiKey: getStoredApiKey() || '',
    };
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    if (settings.geminiApiKey !== undefined) {
      saveStoredApiKey(settings.geminiApiKey);
    }
    applyThemeToDOM(settings);
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}

export function triggerHapticFeedback(pattern: number | number[] = 15): void {
  try {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    // Ignore if not supported
  }
}

export function playUiChime(type: 'click' | 'success' | 'toggle' | 'delete'): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'success') {
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'toggle') {
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'delete') {
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {
    // Audio context may be blocked by autoplay policies until gesture
  }
}

export function applyThemeToDOM(settings: AppSettings): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set Theme Preset class
  root.dataset.theme = settings.themePreset;
  root.dataset.fontScale = settings.fontSizeScale;
  root.dataset.glassmorphism = settings.glassmorphism;
  root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  root.dataset.dyslexic = settings.dyslexicFont ? 'true' : 'false';
  root.dir = settings.rtlDirection ? 'rtl' : 'ltr';

  // Apply accent color CSS variable
  root.style.setProperty('--verbamind-accent', settings.accentColor);
}
