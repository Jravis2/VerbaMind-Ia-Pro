/**
 * Instant Language Detection Engine
 * Combines Unicode script analysis, trigram/n-gram heuristics, frequent stop-words, and fallback patterns.
 */

export interface DetectedLanguageResult {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  confidence: number; // 0 to 100
  script: string;
}

const COMMON_WORD_PATTERNS: Record<string, { words: string[]; flag: string; name: string; nativeName: string; script: string }> = {
  fr: {
    words: ['le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'dans', 'avec', 'pour', 'qui', 'que', 'quoi', 'ce', 'cette', 'vous', 'nous', 'bonjour', 'merci', 'faire', 'mais', 'donc', 'aussi', 'plus', 'très', 'être', 'avoir'],
    flag: '🇫🇷',
    name: 'Français',
    nativeName: 'Français',
    script: 'Latin',
  },
  en: {
    words: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'hello', 'thanks', 'please'],
    flag: '🇺🇸',
    name: 'Anglais',
    nativeName: 'English',
    script: 'Latin',
  },
  es: {
    words: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'es', 'son', 'en', 'con', 'para', 'por', 'que', 'hola', 'gracias', 'como', 'pero', 'más', 'este', 'esta', 'estos', 'estas', 'todos', 'bien', 'bueno', 'hacer', 'tener', 'estar', 'amigo', 'tiempo'],
    flag: '🇪🇸',
    name: 'Espagnol',
    nativeName: 'Español',
    script: 'Latin',
  },
  de: {
    words: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'und', 'in', 'zu', 'den', 'mit', 'ist', 'sind', 'von', 'nicht', 'sie', 'es', 'ich', 'auf', 'für', 'hallo', 'danke', 'aber', 'wie', 'wir', 'haben', 'sein', 'werden'],
    flag: '🇩🇪',
    name: 'Allemand',
    nativeName: 'Deutsch',
    script: 'Latin',
  },
  it: {
    words: ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'è', 'sono', 'in', 'con', 'per', 'su', 'da', 'di', 'ciao', 'grazie', 'questo', 'questa', 'come', 'anche', 'tutto', 'molto', 'fare', 'bene', 'più'],
    flag: '🇮🇹',
    name: 'Italien',
    nativeName: 'Italiano',
    script: 'Latin',
  },
  pt: {
    words: ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'é', 'são', 'em', 'com', 'para', 'por', 'que', 'olá', 'obrigado', 'obrigada', 'como', 'mas', 'mais', 'este', 'esta', 'tudo', 'muito', 'fazer', 'estar', 'amigo'],
    flag: '🇵🇹',
    name: 'Portugais',
    nativeName: 'Português',
    script: 'Latin',
  },
  nl: {
    words: ['de', 'het', 'een', 'en', 'in', 'van', 'op', 'is', 'dat', 'die', 'voor', 'met', 'niet', 'om', 'te', 'hallo', 'bedankt', 'ook', 'zijn', 'maar', 'als', 'over'],
    flag: '🇳🇱',
    name: 'Néerlandais',
    nativeName: 'Nederlands',
    script: 'Latin',
  },
  ru: {
    words: ['и', 'в', 'не', 'на', 'я', 'что', 'тот', 'быть', 'с', 'он', 'а', 'весь', 'это', 'как', 'по', 'но', 'они', 'к', 'у', 'ты', 'из', 'мы', 'привет', 'спасибо', 'пожалуйста', 'хорошо', 'да', 'нет'],
    flag: '🇷🇺',
    name: 'Russe',
    nativeName: 'Русский',
    script: 'Cyrillique',
  },
  uk: {
    words: ['і', 'в', 'не', 'на', 'я', 'що', 'бути', 'з', 'він', 'а', 'це', 'як', 'по', 'але', 'вони', 'до', 'у', 'ти', 'ми', 'привіт', 'дякую', 'будь', 'ласка', 'так', 'ні'],
    flag: '🇺🇦',
    name: 'Ukrainien',
    nativeName: 'Українська',
    script: 'Cyrillique',
  },
  ar: {
    words: ['في', 'من', 'على', 'إلى', 'أن', 'هذا', 'هذه', 'مع', 'ما', 'لا', 'كان', 'هو', 'هي', 'التي', 'الذي', 'مرحبا', 'شكرا', 'نعم', 'كل', 'عن'],
    flag: '🇸🇦',
    name: 'Arabe',
    nativeName: 'العربية',
    script: 'Arabe',
  },
  zh: {
    words: ['的', '一', '是', '在', '不', '了', '有', '和', '人', '这', '中', '大', '为', '上', '个', '国', '我', '以', '要', '他', '时', '来', '用', '们', '生', '到', '作', '地', '于', '出', '就', '分', '对', '成', '会', '可', '主', '发', '年', '动', '同', '工', '也', '能', '下', '过', '子', '说', '产', '种', '面', '而', '方', '后', '多', '定', '行', '学', '法', '所', '民', '得', '经', '十三', '之', '进', '着', '等', '部', '度', '家', '电', '力', '里', '如', '水', '化', '高', '自', '二', '理', '起', '小', '物', '现', '实', '加', '量', '都', '两', '体', '制', '机', '当', '使', '点', '从', '业', '本', '去', '把', '性', '好', '你好', '谢谢'],
    flag: '🇨🇳',
    name: 'Chinois (Simplifié)',
    nativeName: '中文',
    script: 'Sinogrammes',
  },
  ja: {
    words: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や', 'れる', 'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あっ', 'よう', 'また', 'もの', 'という', 'あり', 'まで', 'られ', 'なる', 'へ', 'か', 'だ', 'これ', 'によって', 'により', 'おり', 'より', 'による', 'ず', 'なり', 'られる', 'において', 'ば', 'なかっ', 'なく', 'しかし', 'について', 'せ', 'だっ', 'その後', 'できる', 'それ', 'う', 'ので', 'なお', 'のみ', 'でき', 'き', 'いただく', 'こんにちは', 'ありがとう', 'ございます'],
    flag: '🇯🇵',
    name: 'Japonais',
    nativeName: '日本語',
    script: 'Hiragana/Katakana/Kanji',
  },
  ko: {
    words: ['는', '은', '이', '가', '을', '를', '에', '에서', '으로', '로', '와', '과', '도', '고', '하다', '있다', '되다', '않다', '사람', '우리', '그', '것', '안녕하세요', '감사합니다', '네', '아니요', '좋아요'],
    flag: '🇰🇷',
    name: 'Coréen',
    nativeName: '한국어',
    script: 'Hangul',
  },
  hi: {
    words: ['है', 'के', 'में', 'की', 'और', 'का', 'से', 'को', 'पर', 'एक', 'यह', 'होता', 'हैं', 'कि', 'नमस्ते', 'धन्यवाद', 'नहीं', 'हाँ', 'आप', 'हम'],
    flag: '🇮🇳',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
  },
  tr: {
    words: ['ve', 'bir', 'bu', 'da', 'de', 'için', 'ile', 'ne', 'gibi', 'daha', 'çok', 'en', 'var', 'yok', 'olan', 'merhaba', 'teşekkürler', 'evet', 'hayır'],
    flag: '🇹🇷',
    name: 'Turc',
    nativeName: 'Türkçe',
    script: 'Latin',
  },
  pl: {
    words: ['w', 'i', 'z', 'na', 'do', 'nie', 'że', 'to', 'się', 'o', 'jak', 'od', 'jest', 'po', 'co', 'tak', 'dziękuję', 'cześć', 'bardzo'],
    flag: '🇵🇱',
    name: 'Polonais',
    nativeName: 'Polski',
    script: 'Latin',
  },
};

/**
 * Detect language instantly from text
 */
export function detectLanguageInstant(text: string): DetectedLanguageResult | null {
  if (!text || text.trim().length === 0) return null;

  const clean = text.trim();

  // 1. Script checks (Non-latin alphabets can be identified with near 100% confidence)
  // Hangul (Korean)
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(clean)) {
    return {
      code: 'ko',
      name: 'Coréen',
      nativeName: '한국어',
      flag: '🇰🇷',
      confidence: 99,
      script: 'Hangul',
    };
  }

  // Hiragana or Katakana (Japanese)
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(clean)) {
    return {
      code: 'ja',
      name: 'Japonais',
      nativeName: '日本語',
      flag: '🇯🇵',
      confidence: 99,
      script: 'Kana / Kanji',
    };
  }

  // Chinese Hanzi without Kana
  if (/[\u4e00-\u9fa5]/.test(clean)) {
    return {
      code: 'zh',
      name: 'Chinois',
      nativeName: '中文',
      flag: '🇨🇳',
      confidence: 95,
      script: 'Sinogrammes',
    };
  }

  // Arabic script
  if (/[\u0600-\u06ff]/.test(clean)) {
    return {
      code: 'ar',
      name: 'Arabe',
      nativeName: 'العربية',
      flag: '🇸🇦',
      confidence: 98,
      script: 'Arabe',
    };
  }

  // Devanagari (Hindi / Sanskrit)
  if (/[\u0900-\u097f]/.test(clean)) {
    return {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      flag: '🇮🇳',
      confidence: 98,
      script: 'Devanagari',
    };
  }

  // Cyrillic (Russian, Ukrainian)
  if (/[\u0400-\u04ff]/.test(clean)) {
    if (/[іїєґ]/.test(clean.toLowerCase())) {
      return {
        code: 'uk',
        name: 'Ukrainien',
        nativeName: 'Українська',
        flag: '🇺🇦',
        confidence: 94,
        script: 'Cyrillique',
      };
    }
    return {
      code: 'ru',
      name: 'Russe',
      nativeName: 'Русский',
      flag: '🇷🇺',
      confidence: 95,
      script: 'Cyrillique',
    };
  }

  // Greek
  if (/[\u0370-\u03ff]/.test(clean)) {
    return {
      code: 'el',
      name: 'Grec',
      nativeName: 'Ελληνικά',
      flag: '🇬🇷',
      confidence: 98,
      script: 'Grec',
    };
  }

  // Hebrew
  if (/[\u0590-\u05ff]/.test(clean)) {
    return {
      code: 'he',
      name: 'Hébreu',
      nativeName: 'עברית',
      flag: '🇮🇱',
      confidence: 98,
      script: 'Hébreu',
    };
  }

  // 2. Latin-based word scoring
  const words = clean
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return null;

  // Language specific diacritics bonuses
  const scores: Record<string, number> = {};

  Object.entries(COMMON_WORD_PATTERNS).forEach(([langCode, data]) => {
    scores[langCode] = 0;
    const wordSet = new Set(data.words);
    words.forEach((w) => {
      if (wordSet.has(w)) {
        scores[langCode] += 2;
      }
    });
  });

  // Diacritics weighting
  if (/[éèêëàâîïôûùç]/.test(clean.toLowerCase())) scores.fr = (scores.fr || 0) + 3;
  if (/[ñáéíóú¿¡]/.test(clean.toLowerCase())) scores.es = (scores.es || 0) + 3;
  if (/[äöüß]/.test(clean.toLowerCase())) scores.de = (scores.de || 0) + 3;
  if (/[ãõçáéíóúâêô]/.test(clean.toLowerCase())) scores.pt = (scores.pt || 0) + 3;
  if (/[ąćęłńóśźż]/.test(clean.toLowerCase())) scores.pl = (scores.pl || 0) + 4;
  if (/[çğıöşü]/.test(clean.toLowerCase())) scores.tr = (scores.tr || 0) + 4;

  let bestLang = 'en';
  let maxScore = 0;

  Object.entries(scores).forEach(([code, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestLang = code;
    }
  });

  if (maxScore > 0 && COMMON_WORD_PATTERNS[bestLang]) {
    const data = COMMON_WORD_PATTERNS[bestLang];
    const confidence = Math.min(99, Math.round(55 + Math.min(44, (maxScore / Math.max(1, words.length)) * 40)));
    return {
      code: bestLang,
      name: data.name,
      nativeName: data.nativeName,
      flag: data.flag,
      confidence,
      script: 'Latin',
    };
  }

  // Default fallback if very short latin
  return {
    code: 'auto',
    name: 'Détection en cours',
    nativeName: 'Auto',
    flag: '✨',
    confidence: 50,
    script: 'Latin',
  };
}
