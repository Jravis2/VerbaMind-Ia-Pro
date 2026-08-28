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
  detectedSourceLangName?: string;
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

// === NOUVELLES OPTIONS VOLET ROULANT IA PRO ===

export type AIToolId =
  | 'detector'
  | 'humanizer'
  | 'plagiarism'
  | 'summarizer'
  | 'paraphraser'
  | 'grammar';

export interface AIDetectionResponse {
  aiScore: number; // 0-100%
  humanScore: number; // 0-100%
  verdict: 'likely_ai' | 'likely_human' | 'mixed';
  verdictLabel: string;
  perplexityLevel: 'Faible' | 'Modérée' | 'Élevée';
  burstinessLevel: 'Faible' | 'Modérée' | 'Élevée';
  sentences: {
    text: string;
    aiProbability: number;
    flagged: boolean;
    reason?: string;
  }[];
  analysisSummary: string;
  keyIndicators: string[];
}

export interface AIHumanizerResponse {
  humanizedText: string;
  originalAiScore: number;
  predictedHumanScore: number;
  readabilityLevel: string;
  improvementsMade: string[];
  toneApplied: string;
}

export interface AIPlagiarismResponse {
  originalityScore: number; // 0-100%
  uniquenessRating: 'Excellente' | 'Bonne' | 'Modérée' | 'Faible';
  matchesFound: {
    phrase: string;
    potentialSourceType: string;
    similarity: number;
    suggestion: string;
  }[];
  clichesDetected: string[];
  recommendations: string[];
  citationAdvice: string;
}

export interface AISummaryResponse {
  summary: string;
  keyPoints: string[];
  readingTimeReduction: string;
  wordCountOriginal: number;
  wordCountSummary: number;
  sentiment: string;
}

export interface AIParaphraseResponse {
  paraphrasedText: string;
  styleApplied: string;
  alternatives: {
    text: string;
    nuance: string;
  }[];
  vocabularyEnhancements: {
    original: string;
    replacement: string;
  }[];
}

export interface AIGrammarIssue {
  original: string;
  replacement: string;
  category: 'orthographe' | 'grammaire' | 'accord' | 'conjugaison' | 'ponctuation' | 'style';
  explanation: string;
}

export interface AIGrammarResponse {
  correctedText: string;
  errorCount: number;
  issues: AIGrammarIssue[];
  score: number; // 0-100
  summary: string;
}
