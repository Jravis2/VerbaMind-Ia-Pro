export type LanguageCategory = 'living' | 'ancient' | 'regional' | 'constructed';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  category: LanguageCategory;
  flag?: string;
  eraOrRegion?: string;
  script?: string;
  sampleText?: string;
}

export type ToneStyle = 'natural' | 'literal' | 'formal' | 'academic' | 'simplified';

export interface ToneOption {
  id: ToneStyle;
  label: string;
  description: string;
  iconName: string;
}

export type UseCaseType = 'general' | 'email' | 'meeting' | 'creative' | 'subtitles';

export interface UseCasePreset {
  id: UseCaseType;
  title: string;
  description: string;
  defaultTone: ToneStyle;
  placeholder: string;
  samplePrompt: string;
}

export interface TranslationResponse {
  translatedText: string;
  detectedSourceLang?: string;
  phonetic?: string;
  detectedGrammarIssues?: string[];
  styleApplied?: string;
  latencyMs: number;
}

export interface SyntaxAnalysisResponse {
  sourceAnalysis: {
    intent: string;
    identifiedErrors: { original: string; corrected: string; explanation: string }[];
    register: string;
  };
  targetAnalysis: {
    syntaxStructure: string;
    keyVocabulary: { source: string; target: string; nuance: string }[];
    stylisticNotes: string;
  };
  alternativePhrasings: { text: string; nuance: string }[];
}

export interface OcrTranslationResponse {
  detectedText: string;
  translatedText: string;
  detectedLanguage?: string;
  confidence?: number;
  detectedBlocks?: {
    original: string;
    translated: string;
    boundingBox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0-1000
  }[];
  latencyMs: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  tone: ToneStyle;
  isFavorite?: boolean;
  mode: 'text' | 'ocr' | 'live_camera' | 'voice';
}
