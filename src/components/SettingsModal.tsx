import React, { useState, useEffect } from 'react';
import {
  X,
  Palette,
  Globe,
  Sparkles,
  Camera,
  Volume2,
  Type as TypeIcon,
  Sliders,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Zap,
  RotateCcw,
  Download,
  Upload,
  Key,
  Shield,
  Eye,
  SlidersHorizontal,
  Smartphone,
  Flame,
  Sun,
  Moon,
  Github,
  Trash2,
  Languages,
  Check,
} from 'lucide-react';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  ThemePreset,
  loadStoredSettings,
  saveStoredSettings,
  triggerHapticFeedback,
  playUiChime,
} from '../utils/appSettings';
import { I18N_TRANSLATIONS, UILanguage } from '../data/i18n';
import { testGeminiApiKey } from '../services/clientGemini';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: (newSettings: AppSettings) => void;
  onOpenGitHubGuide?: () => void;
}

type SettingsTab =
  | 'themes'
  | 'language'
  | 'ai'
  | 'camera'
  | 'audio'
  | 'typography'
  | 'ergonomics'
  | 'data';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged,
  onOpenGitHubGuide,
}) => {
  const [settings, setSettings] = useState<AppSettings>(loadStoredSettings());
  const [activeTab, setActiveTab] = useState<SettingsTab>('themes');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = loadStoredSettings();
      setSettings(current);
      setApiKeyTestResult(null);
      setImportStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const t = I18N_TRANSLATIONS[settings.appLanguage] || I18N_TRANSLATIONS.fr;

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveStoredSettings(updated);
    if (updated.hapticFeedback) triggerHapticFeedback(10);
    if (updated.uiSoundEffects) playUiChime('toggle');
    if (onSettingsChanged) onSettingsChanged(updated);
  };

  const handleResetDefaults = () => {
    if (confirm(t.resetDefaults + ' ?')) {
      setSettings(DEFAULT_SETTINGS);
      saveStoredSettings(DEFAULT_SETTINGS);
      if (settings.uiSoundEffects) playUiChime('delete');
      if (onSettingsChanged) onSettingsChanged(DEFAULT_SETTINGS);
    }
  };

  const handleTestApiKey = async () => {
    if (!settings.geminiApiKey.trim()) {
      setApiKeyTestResult({ ok: false, message: 'Veuillez saisir une clé API avant de tester.' });
      return;
    }
    setIsTestingApiKey(true);
    setApiKeyTestResult(null);
    const res = await testGeminiApiKey(settings.geminiApiKey);
    setIsTestingApiKey(false);
    setApiKeyTestResult(res);
    if (res.ok && settings.uiSoundEffects) {
      playUiChime('success');
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `verbamind_settings_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    if (settings.uiSoundEffects) playUiChime('click');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          setSettings(merged);
          saveStoredSettings(merged);
          setImportStatus('Configuration importée avec succès !');
          if (settings.uiSoundEffects) playUiChime('success');
          if (onSettingsChanged) onSettingsChanged(merged);
        } catch (err) {
          setImportStatus('Erreur: Fichier JSON invalide.');
        }
      };
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any; count: number }[] = [
    { id: 'themes', label: t.themeCategory, icon: Palette, count: 7 },
    { id: 'language', label: t.languageCategory, icon: Globe, count: 6 },
    { id: 'ai', label: t.aiCategory, icon: Sparkles, count: 7 },
    { id: 'camera', label: t.cameraCategory, icon: Camera, count: 7 },
    { id: 'audio', label: t.voiceCategory, icon: Volume2, count: 7 },
    { id: 'typography', label: t.typographyCategory, icon: TypeIcon, count: 6 },
    { id: 'ergonomics', label: t.ergonomicsCategory, icon: Sliders, count: 6 },
    { id: 'data', label: t.dataCategory, icon: Database, count: 6 },
  ];

  const themePresetsList: { id: ThemePreset; name: string; bg: string; border: string; accent: string }[] = [
    { id: 'cyber-midnight', name: 'Cyber Midnight', bg: '#030712', border: '#1e293b', accent: '#6366f1' },
    { id: 'deep-sapphire', name: 'Deep Sapphire', bg: '#040d21', border: '#1e3a8a', accent: '#3b82f6' },
    { id: 'obsidian-gold', name: 'Obsidian & Or', bg: '#0d0b06', border: '#78350f', accent: '#f59e0b' },
    { id: 'emerald-neon', name: 'Émeraude Néon', bg: '#03140c', border: '#064e3b', accent: '#10b981' },
    { id: 'crimson-ruby', name: 'Rubis Carmin', bg: '#140307', border: '#881337', accent: '#f43f5e' },
    { id: 'amethyst-purple', name: 'Améthyste Violet', bg: '#0e041c', border: '#581c87', accent: '#a855f7' },
    { id: 'sunset-amber', name: 'Sunset Amber', bg: '#1a0b02', border: '#7c2d12', accent: '#ea580c' },
    { id: 'nordic-frost', name: 'Nordic Frost', bg: '#06111e', border: '#0369a1', accent: '#06b6d4' },
    { id: 'clean-light', name: 'Mode Clair Épuré', bg: '#f8fafc', border: '#cbd5e1', accent: '#4f46e5' },
  ];

  const accentColorsList = [
    { name: 'Indigo Pro', hex: '#6366f1' },
    { name: 'Cyan Néon', hex: '#06b6d4' },
    { name: 'Émeraude', hex: '#10b981' },
    { name: 'Ambre Chaud', hex: '#f59e0b' },
    { name: 'Rose Fushia', hex: '#ec4899' },
    { name: 'Pourpre Royal', hex: '#8b5cf6' },
    { name: 'Rouge Écarlate', hex: '#ef4444' },
  ];

  const languagesList: { code: UILanguage; name: string; native: string; flag: string }[] = [
    { code: 'fr', name: 'Français', native: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'Anglais', native: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Espagnol', native: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Allemand', native: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italien', native: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Portugais', native: 'Português', flag: '🇵🇹' },
    { code: 'ja', name: 'Japonais', native: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: 'Chinois', native: '中文', flag: '🇨🇳' },
    { code: 'ar', name: 'Arabe', native: 'العربية', flag: '🇸🇦' },
    { code: 'ru', name: 'Russe', native: 'Русский', flag: '🇷🇺' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[820px] bg-[#070e24] border border-indigo-500/40 rounded-3xl shadow-2xl shadow-indigo-950/90 overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-[#0a1330]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  {t.settingsModalTitle}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  52 Options
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {t.settingsModalSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-reset-all-settings"
              onClick={handleResetDefaults}
              title="Réinitialiser"
              className="p-2 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              id="btn-close-settings-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Layout: Sidebar Tabs + Scrollable Options Panel */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar Tabs */}
          <div className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-800/80 bg-[#060c20] p-2 md:p-3 overflow-x-auto md:overflow-y-auto flex md:flex-col gap-1.5 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-settings-${tab.id}`}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (settings.uiSoundEffects) playUiChime('click');
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 md:w-full ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono hidden md:inline-block ${
                      isActive ? 'bg-indigo-700/50 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Options Content Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#08102a]/60 space-y-6">
            {/* TAB 1: THEMES & COLORS (7 options) */}
            {activeTab === 'themes' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-indigo-400" />
                    <span>Thèmes d&apos;Ambiance (Option 1)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Sélectionnez un style visuel complet avec palette de contraste adaptée
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {themePresetsList.map((preset) => (
                      <button
                        key={preset.id}
                        id={`theme-select-${preset.id}`}
                        onClick={() => updateSetting('themePreset', preset.id)}
                        className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex items-center justify-between ${
                          settings.themePreset === preset.id
                            ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-indigo-950/40'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: preset.bg, boxShadow: `0 0 8px ${preset.accent}` }}
                          />
                          <span className="text-xs font-semibold text-white">{preset.name}</span>
                        </div>
                        {settings.themePreset === preset.id && (
                          <Check className="w-4 h-4 text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Option 2: Accent Color */}
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Couleur d&apos;Accent Principale (Option 2)
                  </h4>
                  <p className="text-[11px] text-slate-400 mb-2.5">
                    Personnalise la teinte des boutons, bordures et lueurs actives
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {accentColorsList.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => updateSetting('accentColor', color.hex)}
                        title={color.name}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          settings.accentColor === color.hex
                            ? 'border-white text-white bg-slate-800 ring-2 ring-indigo-500/50'
                            : 'border-slate-800 text-slate-400 hover:text-white bg-slate-900/60'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span>{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Option 3: Glow Intensity */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Intensité des Lueurs Néon (Option 3)
                    </label>
                    <select
                      value={settings.glowIntensity}
                      onChange={(e) => updateSetting('glowIntensity', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="none">Désactivée (Minimaliste)</option>
                      <option value="subtle">Subtile & Douce</option>
                      <option value="vibrant">Vibrante Pro (Recommandé)</option>
                      <option value="ultra">Ultra Cyberpunk</option>
                    </select>
                  </div>

                  {/* Option 4: Glassmorphism */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Effet Verre & Flou Backdrop (Option 4)
                    </label>
                    <select
                      value={settings.glassmorphism}
                      onChange={(e) => updateSetting('glassmorphism', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="none">Opaque Brut</option>
                      <option value="subtle">Flou Léger</option>
                      <option value="medium">Verre Givré Équilibré</option>
                      <option value="high">Verre Haute Réfraction</option>
                    </select>
                  </div>

                  {/* Option 5: High Contrast */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Mode Contraste Renforcé (Option 5)</div>
                      <div className="text-[11px] text-slate-400">Améliore la lisibilité sous plein soleil</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.highContrast}
                      onChange={(e) => updateSetting('highContrast', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 6: Border Width */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Épaisseur des Bordures UI (Option 6)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['thin', 'normal', 'thick'] as const).map((b) => (
                        <button
                          key={b}
                          onClick={() => updateSetting('borderWidth', b)}
                          className={`py-1.5 text-xs rounded-xl border capitalize ${
                            settings.borderWidth === b
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {b === 'thin' ? 'Fine' : b === 'normal' ? 'Normale' : 'Épaisse'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Option 7: Ambient Background Particles */}
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Particules & Lueurs Ambiantes (Option 7)</div>
                    <div className="text-[11px] text-slate-400">Animations visuelles douces d&apos;arrière-plan</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.backgroundParticles}
                    onChange={(e) => updateSetting('backgroundParticles', e.target.checked)}
                    className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: LANGUAGE & REGION (6 options) */}
            {activeTab === 'language' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-indigo-400" />
                    <span>Langue Globale de l&apos;Interface (Option 8)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Traduit l&apos;intégralité des menus, onglets, boutons et descriptions
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {languagesList.map((lang) => (
                      <button
                        key={lang.code}
                        id={`lang-ui-${lang.code}`}
                        onClick={() => updateSetting('appLanguage', lang.code)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          settings.appLanguage === lang.code
                            ? 'border-indigo-400 ring-2 ring-indigo-500/40 bg-indigo-950/50 text-white'
                            : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{lang.flag}</span>
                          <div>
                            <div className="text-xs font-bold">{lang.name}</div>
                            <div className="text-[10px] text-slate-400">{lang.native}</div>
                          </div>
                        </div>
                        {settings.appLanguage === lang.code && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 9: RTL Mode */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Mode Lecture Droite-à-Gauche (RTL) (Option 9)</div>
                      <div className="text-[11px] text-slate-400">Pour l&apos;arabe, hébreu, farsi</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.rtlDirection}
                      onChange={(e) => updateSetting('rtlDirection', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 10: Time Format */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Format de l&apos;Heure dans l&apos;Historique (Option 10)
                    </label>
                    <select
                      value={settings.timeFormat}
                      onChange={(e) => updateSetting('timeFormat', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="24h">Format 24 Heures (14:35)</option>
                      <option value="12h">Format 12 Heures AM/PM (2:35 PM)</option>
                    </select>
                  </div>

                  {/* Option 11: Number Formatting */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Séparateur Décimal & Nombres (Option 11)
                    </label>
                    <select
                      value={settings.numberFormat}
                      onChange={(e) => updateSetting('numberFormat', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="eu">Standard Européen (1 234,56)</option>
                      <option value="us">Standard International (1,234.56)</option>
                    </select>
                  </div>

                  {/* Option 12: Auto Translate System Clipboard */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Traduire Presse-papier Automatique (Option 12)</div>
                      <div className="text-[11px] text-slate-400">Détecte le texte copié au focus</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoTranslateSystemClipboard}
                      onChange={(e) => updateSetting('autoTranslateSystemClipboard', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 13: Spellcheck */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between sm:col-span-2">
                    <div>
                      <div className="text-xs font-bold text-white">Correcteur Orthographique Navigateur (Option 13)</div>
                      <div className="text-[11px] text-slate-400">Souligne les fautes de frappe dans la zone source</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.spellCheckInput}
                      onChange={(e) => updateSetting('spellCheckInput', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AI & GEMINI (7 options) */}
            {activeTab === 'ai' && (
              <div className="space-y-6 animate-fade-in">
                {/* Option 14: Gemini API Key */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 to-slate-900/90 border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">
                        Clé API Google Gemini Personnalisée (Option 14)
                      </span>
                    </div>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      <span>Obtenir une clé gratuite</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={settings.geminiApiKey}
                      onChange={(e) => updateSetting('geminiApiKey', e.target.value)}
                      placeholder="AIzaSy... (Optionnelle, fonctionne aussi sans clé)"
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleTestApiKey}
                      disabled={isTestingApiKey || !settings.geminiApiKey.trim()}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      {isTestingApiKey ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Tester</span>
                    </button>
                  </div>

                  {apiKeyTestResult && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        apiKeyTestResult.ok
                          ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-950/50 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {apiKeyTestResult.ok ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{apiKeyTestResult.message}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 15: AI Model Selection */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Modèle IA Préféré (Option 15)
                    </label>
                    <select
                      value={settings.aiModel}
                      onChange={(e) => updateSetting('aiModel', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra-rapide & Réactif)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Haute Précision Littéraire)</option>
                      <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (Éco bande passante)</option>
                    </select>
                  </div>

                  {/* Option 16: Thinking Mode */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Niveau de Réflexion Approfondie (Option 16)
                    </label>
                    <select
                      value={settings.thinkingMode}
                      onChange={(e) => updateSetting('thinkingMode', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="auto">Automatique (Équilibré)</option>
                      <option value="deep">Approfondi (Analyse philologique & nuances)</option>
                      <option value="off">Désactivé (Vitesse brute maximale)</option>
                    </select>
                  </div>

                  {/* Option 17: Temperature Slider */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white">
                        Température & Créativité (Option 17)
                      </label>
                      <span className="text-xs font-mono text-cyan-300">{settings.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.temperature}
                      onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Précis & Littéral (0.0)</span>
                      <span>Équilibré (0.3)</span>
                      <span>Créatif (1.0)</span>
                    </div>
                  </div>

                  {/* Option 18: Grammar Strictness */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Rigueur Grammaticale (Option 18)
                    </label>
                    <select
                      value={settings.grammarStrictness}
                      onChange={(e) => updateSetting('grammarStrictness', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="natural">Naturel & Fluide</option>
                      <option value="strict">Strict & Académique</option>
                      <option value="creative">Poétique & Littéraire</option>
                    </select>
                  </div>

                  {/* Option 19: Auto Language Detection Mode */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Moteur Détection Automatique (Option 19)
                    </label>
                    <select
                      value={settings.autoLanguageDetection}
                      onChange={(e) => updateSetting('autoLanguageDetection', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="deep-learning">Détection Neuronale & Idiomes</option>
                      <option value="standard">Détection Lexicale Rapide</option>
                    </select>
                  </div>

                  {/* Option 20: Smart Restructuring */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Restructuration Syntaxique IA (Option 20)</div>
                      <div className="text-[11px] text-slate-400">Corrige l&apos;ordre des mots et la concordance</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.smartRestructuring}
                      onChange={(e) => updateSetting('smartRestructuring', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: AR CAMERA & OCR (7 options) */}
            {activeTab === 'camera' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 21: Camera Resolution */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Résolution du Flux Vidéo (Option 21)
                    </label>
                    <select
                      value={settings.cameraResolution}
                      onChange={(e) => updateSetting('cameraResolution', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="720p">720p HD (Fluide & Éco-batterie)</option>
                      <option value="1080p">1080p Full HD (Recommandé)</option>
                      <option value="4k">4K Ultra HD (Haute Précision Petits Textes)</option>
                    </select>
                  </div>

                  {/* Option 22: Camera FPS */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Limite de Fréquence FPS (Option 22)
                    </label>
                    <select
                      value={settings.cameraFpsLimit}
                      onChange={(e) => updateSetting('cameraFpsLimit', parseInt(e.target.value) as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value={15}>15 FPS (Basse consommation)</option>
                      <option value={30}>30 FPS (Standard naturel)</option>
                      <option value={60}>60 FPS (Ultra fluide)</option>
                    </select>
                  </div>

                  {/* Option 23: AR Overlay Style */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Style de Superposition AR (Option 23)
                    </label>
                    <select
                      value={settings.arOverlayStyle}
                      onChange={(e) => updateSetting('arOverlayStyle', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="neon-boxes">Boîtes Néon Cyberpunk</option>
                      <option value="translucent-pills">Pilules Translucides Modernes</option>
                      <option value="minimal-subtitles">Sous-titres Minimalistes</option>
                      <option value="solid-cards">Cartouches Opaques Haute Visibilité</option>
                    </select>
                  </div>

                  {/* Option 24: Box Thickness */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Épaisseur des Boîtes de Détection (Option 24)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((th) => (
                        <button
                          key={th}
                          onClick={() => updateSetting('arBoxThickness', th as any)}
                          className={`py-1.5 text-xs rounded-xl border ${
                            settings.arBoxThickness === th
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {th}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 25: Camera Mirror Mode */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Inversion Miroir Caméra Avant (Option 25)</div>
                      <div className="text-[11px] text-slate-400">Corrige l&apos;effet miroir des selfies</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.cameraMirrorMode}
                      onChange={(e) => updateSetting('cameraMirrorMode', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 26: Camera Flash Torch */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Support Flash / Torche Caméra (Option 26)</div>
                      <div className="text-[11px] text-slate-400">Améliore la numérisation dans l&apos;obscurité</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.cameraTorchFlash}
                      onChange={(e) => updateSetting('cameraTorchFlash', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 27: AR Scan Interval */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 sm:col-span-2">
                    <label className="text-xs font-bold text-white block">
                      Intervalle de Scan AR Live Continu (Option 27)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { val: 800, label: '0.8s (Rapide)' },
                        { val: 1500, label: '1.5s (Équilibré)' },
                        { val: 2500, label: '2.5s (Éco)' },
                        { val: 4000, label: '4.0s (Statique)' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          onClick={() => updateSetting('arScanInterval', item.val as any)}
                          className={`py-2 text-xs rounded-xl border ${
                            settings.arScanInterval === item.val
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: AUDIO & TTS (7 options) */}
            {activeTab === 'audio' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 28: Voice Speed */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white">
                        Vitesse de Prononciation Vocale (Option 28)
                      </label>
                      <span className="text-xs font-mono text-cyan-300">{settings.voiceSpeed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={settings.voiceSpeed}
                      onChange={(e) => updateSetting('voiceSpeed', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Lent (0.5x)</span>
                      <span>Normal (1.0x)</span>
                      <span>Rapide (2.0x)</span>
                    </div>
                  </div>

                  {/* Option 29: Voice Pitch */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white">
                        Hauteur de la Voix (Pitch) (Option 29)
                      </label>
                      <span className="text-xs font-mono text-cyan-300">{settings.voicePitch}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={settings.voicePitch}
                      onChange={(e) => updateSetting('voicePitch', parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Grave (0.5)</span>
                      <span>Naturel (1.0)</span>
                      <span>Aigu (1.5)</span>
                    </div>
                  </div>

                  {/* Option 30: Auto-play TTS */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Lecture Vocale Automatique (Option 30)</div>
                      <div className="text-[11px] text-slate-400">Prononce le texte dès la traduction finie</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoPlayTts}
                      onChange={(e) => updateSetting('autoPlayTts', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 31: Preferred Gender */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Voix Préférée (Option 31)
                    </label>
                    <select
                      value={settings.voiceGender}
                      onChange={(e) => updateSetting('voiceGender', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="auto">Automatique (Système par défaut)</option>
                      <option value="female">Voix Féminine</option>
                      <option value="male">Voix Masculine</option>
                    </select>
                  </div>

                  {/* Option 32: UI Sound Effects */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Effets Sonores de l&apos;Interface (Option 32)</div>
                      <div className="text-[11px] text-slate-400">Bips doux lors des clics et réussites</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.uiSoundEffects}
                      onChange={(e) => updateSetting('uiSoundEffects', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 33: Noise Suppression */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Réduction Bruit de Fond Micro (Option 33)</div>
                      <div className="text-[11px] text-slate-400">Filtre acoustique pour la dictée vocale</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.noiseSuppression}
                      onChange={(e) => updateSetting('noiseSuppression', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 34: Continuous Speech */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between sm:col-span-2">
                    <div>
                      <div className="text-xs font-bold text-white">Dictée Vocale Continue (Option 34)</div>
                      <div className="text-[11px] text-slate-400">Ne s&apos;arrête pas après chaque phrase</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.speechContinuous}
                      onChange={(e) => updateSetting('speechContinuous', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: TYPOGRAPHY & ACCESSIBILITY (6 options) */}
            {activeTab === 'typography' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 35: Font Size Scale */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Échelle de Taille de Police (Option 35)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => updateSetting('fontSizeScale', sz)}
                          className={`py-1.5 text-xs rounded-xl border capitalize ${
                            settings.fontSizeScale === sz
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {sz === 'small' ? 'Compact' : sz === 'medium' ? 'Standard' : sz === 'large' ? 'Grand' : 'XXL'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 36: Dyslexic Font */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Police Adaptée Dyslexie (Option 36)</div>
                      <div className="text-[11px] text-slate-400">Formes de lettres distinctes et lisibles</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.dyslexicFont}
                      onChange={(e) => updateSetting('dyslexicFont', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 37: Line Spacing */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Espacement Interligne (Option 37)
                    </label>
                    <select
                      value={settings.lineSpacing}
                      onChange={(e) => updateSetting('lineSpacing', e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value="compact">Compact (Dense)</option>
                      <option value="normal">Normal (1.6)</option>
                      <option value="relaxed">Aéré & Spacieux (1.9)</option>
                    </select>
                  </div>

                  {/* Option 38: Always Show Phonetics */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Afficher Systématiquement Phonétique (Option 38)</div>
                      <div className="text-[11px] text-slate-400">Pinyin, Romaji, translitération arabe</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.alwaysShowPhonetics}
                      onChange={(e) => updateSetting('alwaysShowPhonetics', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 39: Reduced Motion */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Réduire les Animations (Option 39)</div>
                      <div className="text-[11px] text-slate-400">Pour le confort visuel et la fluidité</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.reducedMotion}
                      onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 40: Zen Focus Mode */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Mode Focus Zen Minimaliste (Option 40)</div>
                      <div className="text-[11px] text-slate-400">Masque les badges superflus</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.zenFocusMode}
                      onChange={(e) => updateSetting('zenFocusMode', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: ERGONOMICS & TRANSLATION (6 options) */}
            {activeTab === 'ergonomics' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 41: Debounce Delay */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Délai de Frappe Live (Debounce) (Option 41)
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { val: 150, label: '150ms' },
                        { val: 300, label: '300ms' },
                        { val: 500, label: '500ms' },
                        { val: 800, label: '800ms' },
                      ].map((item) => (
                        <button
                          key={item.val}
                          onClick={() => updateSetting('debounceDelay', item.val as any)}
                          className={`py-1.5 text-xs rounded-xl border ${
                            settings.debounceDelay === item.val
                              ? 'bg-indigo-600 text-white border-indigo-400'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option 42: Auto-copy on finish */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Copie Automatique Presse-papier (Option 42)</div>
                      <div className="text-[11px] text-slate-400">Copie dès que la traduction est terminée</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoCopyOnFinish}
                      onChange={(e) => updateSetting('autoCopyOnFinish', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 43: Auto-translate on paste */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Traduire Immédiatement au Collage (Option 43)</div>
                      <div className="text-[11px] text-slate-400">Lance la traduction dès l&apos;action Coller</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoTranslateOnPaste}
                      onChange={(e) => updateSetting('autoTranslateOnPaste', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 44: Confirm before clear */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Confirmer Avant d&apos;Effacer (Option 44)</div>
                      <div className="text-[11px] text-slate-400">Évite les suppressions accidentelles</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.confirmBeforeClear}
                      onChange={(e) => updateSetting('confirmBeforeClear', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 45: Keep Screen Awake */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Maintenir l&apos;Écran Allumé (Option 45)</div>
                      <div className="text-[11px] text-slate-400">Prévient la mise en veille (Wake Lock)</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.keepScreenAwake}
                      onChange={(e) => updateSetting('keepScreenAwake', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 46: Haptic feedback */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Vibrations Haptiques Mobile (Option 46)</div>
                      <div className="text-[11px] text-slate-400">Micro-retour tactile sur les boutons</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.hapticFeedback}
                      onChange={(e) => updateSetting('hapticFeedback', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 47: Button Animations Toggle */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Animations & Micro-interactions Boutons</div>
                      <div className="text-[11px] text-slate-400">Effets d'échelle, de rebond et de survol interactifs</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.buttonAnimations !== false}
                      onChange={(e) => updateSetting('buttonAnimations', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 48: Reading Progress Bar */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Barre de Progression de Lecture Subtile</div>
                      <div className="text-[11px] text-slate-400">Indicateur lumineux en haut d'écran en cours de traitement</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.readingProgressBar !== false}
                      onChange={(e) => updateSetting('readingProgressBar', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 49: Instant Language Detection */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between sm:col-span-2">
                    <div>
                      <div className="text-xs font-bold text-white">Détection Automatique Instantanée de la Langue</div>
                      <div className="text-[11px] text-slate-400">Analyse le texte saisi en temps réel avant la traduction</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.instantLanguageDetection !== false}
                      onChange={(e) => updateSetting('instantLanguageDetection', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 8: GITHUB PAGES & DATA (6 options) */}
            {activeTab === 'data' && (
              <div className="space-y-6 animate-fade-in">
                {/* GitHub Pages Direct Box */}
                <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold text-white">
                        Déploiement GitHub Pages Actif & Branche gh-pages
                      </span>
                    </div>
                    {onOpenGitHubGuide && (
                      <button
                        onClick={onOpenGitHubGuide}
                        className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>Voir le Guide</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Votre application est configurée pour fonctionner à 100% sans serveur backend sur GitHub Pages.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 47: History Auto Save Limit */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Limite Historique Local (Option 47)
                    </label>
                    <select
                      value={settings.historyAutoSaveLimit}
                      onChange={(e) => updateSetting('historyAutoSaveLimit', parseInt(e.target.value) as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value={20}>20 Traductions</option>
                      <option value={50}>50 Traductions</option>
                      <option value={100}>100 Traductions (Recommandé)</option>
                      <option value={500}>500 Traductions</option>
                    </select>
                  </div>

                  {/* Option 48: Auto Save Favorites */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Sauvegarde Auto des Favoris (Option 48)</div>
                      <div className="text-[11px] text-slate-400">Ne supprime jamais les éléments étoilés</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoSaveFavorites}
                      onChange={(e) => updateSetting('autoSaveFavorites', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 49: Offline Cache Limit */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="text-xs font-bold text-white block">
                      Taille du Cache Hors-Ligne (Option 49)
                    </label>
                    <select
                      value={settings.offlineCacheLimitMb}
                      onChange={(e) => updateSetting('offlineCacheLimitMb', parseInt(e.target.value) as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none"
                    >
                      <option value={10}>10 Mo (Léger)</option>
                      <option value={50}>50 Mo (Standard)</option>
                      <option value={100}>100 Mo (Maximal)</option>
                    </select>
                  </div>

                  {/* Option 50: Telemetry Logs */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Journalisation Console & Logs (Option 50)</div>
                      <div className="text-[11px] text-slate-400">Affiche les latences et diagnostics</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.telemetryAndLogs}
                      onChange={(e) => updateSetting('telemetryAndLogs', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 51: Notification on translate */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Notification Fin de Traduction (Option 51)</div>
                      <div className="text-[11px] text-slate-400">Bannière discrète lors des longs textes</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notificationOnTranslate}
                      onChange={(e) => updateSetting('notificationOnTranslate', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Option 52: Max char warning */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Alerte Limite de Caractères (Option 52)</div>
                      <div className="text-[11px] text-slate-400">Avertit si le texte dépasse 5000 caractères</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.maxCharWarning}
                      onChange={(e) => updateSetting('maxCharWarning', e.target.checked)}
                      className="w-5 h-5 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Import / Export JSON Bar */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportJson}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.exportJson}</span>
                    </button>
                    <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{t.importJson}</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportJson}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {importStatus && (
                    <span className="text-xs font-medium text-emerald-400">
                      {importStatus}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800/80 bg-[#0a1330]">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Modifications appliquées en temps réel</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
            >
              {t.resetDefaults}
            </button>
            <button
              id="btn-save-and-close-settings"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
            >
              {t.saveAndClose}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
