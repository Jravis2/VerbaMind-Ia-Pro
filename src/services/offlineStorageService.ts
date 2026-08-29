import { OfflineLexiconEntry, OfflinePack } from '../types';
import { PRELOADED_OFFLINE_PACKS } from '../data/offlineDictionary';

const STORAGE_KEY = 'verbamind_offline_lexicon_v2';
const INSTALLED_PACKS_KEY = 'verbamind_installed_offline_packs';

// In-memory cache for ultra-fast lookups
let inMemoryLexicon: OfflineLexiconEntry[] | null = null;

// Normalize string for fuzzy lookup
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '');
}

/**
 * Load all offline lexicon entries from localStorage and preload default packs
 */
export function getOfflineLexicon(): OfflineLexiconEntry[] {
  if (inMemoryLexicon) {
    return inMemoryLexicon;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let entries: OfflineLexiconEntry[] = raw ? JSON.parse(raw) : [];

    // If first time, automatically preload essentials
    const installedPacksRaw = localStorage.getItem(INSTALLED_PACKS_KEY);
    if (!installedPacksRaw || entries.length === 0) {
      const defaultPack = PRELOADED_OFFLINE_PACKS[0]; // fr_en_essentials
      if (defaultPack) {
        defaultPack.entries.forEach((item) => {
          const id = `preload_${defaultPack.sourceLang}_${defaultPack.targetLang}_${normalizeText(item.source)}`;
          if (!entries.some((e) => e.id === id)) {
            entries.push({
              id,
              sourceText: item.source,
              sourceNormalized: normalizeText(item.source),
              translatedText: item.target,
              sourceLang: defaultPack.sourceLang,
              targetLang: defaultPack.targetLang,
              phonetic: item.phonetic,
              timestamp: Date.now(),
              usageCount: 1,
              isCustom: false,
              isStarred: false,
              category: item.category || 'Essentiel',
              tags: ['Pack Initial', item.category || 'Général'],
            });
          }
        });
        localStorage.setItem(INSTALLED_PACKS_KEY, JSON.stringify([defaultPack.id]));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      }
    }

    inMemoryLexicon = entries;
    return entries;
  } catch (e) {
    console.warn('Failed to read offline lexicon from localStorage:', e);
    return [];
  }
}

/**
 * Persist entries to localStorage and trigger real-time event
 */
function persistLexicon(entries: OfflineLexiconEntry[]): void {
  try {
    inMemoryLexicon = entries;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('verbamind-offline-lexicon-updated', { detail: { count: entries.length } }));
  } catch (e) {
    console.error('Failed to write offline lexicon to localStorage:', e);
  }
}

/**
 * Automatically record and save a translated word or phrase into the offline database.
 * Every word/sentence processed by the application is safely stored for offline use!
 */
export function saveToOfflineLexicon(
  sourceText: string,
  translatedText: string,
  sourceLang: string,
  targetLang: string,
  phonetic?: string,
  isCustom = false,
  category = 'Auto-enregistré',
  tags: string[] = ['Auto-enregistré']
): OfflineLexiconEntry {
  const cleanSource = sourceText.trim();
  const cleanTarget = translatedText.trim();
  if (!cleanSource || !cleanTarget) {
    throw new Error('Source and target texts cannot be empty');
  }

  const sLang = sourceLang === 'auto' ? 'fr' : sourceLang;
  const tLang = targetLang;
  const normalized = normalizeText(cleanSource);
  const id = `entry_${sLang}_${tLang}_${normalized.substring(0, 30)}_${Date.now()}`;

  const current = getOfflineLexicon();
  const existingIndex = current.findIndex(
    (e) => e.sourceNormalized === normalized && e.sourceLang === sLang && e.targetLang === tLang
  );

  let updatedEntry: OfflineLexiconEntry;

  if (existingIndex >= 0) {
    // Update existing entry
    const existing = current[existingIndex];
    updatedEntry = {
      ...existing,
      translatedText: cleanTarget,
      phonetic: phonetic || existing.phonetic,
      timestamp: Date.now(),
      usageCount: existing.usageCount + 1,
      isCustom: isCustom || existing.isCustom,
    };
    current[existingIndex] = updatedEntry;
  } else {
    // Create new entry
    updatedEntry = {
      id,
      sourceText: cleanSource,
      sourceNormalized: normalized,
      translatedText: cleanTarget,
      sourceLang: sLang,
      targetLang: tLang,
      phonetic,
      timestamp: Date.now(),
      usageCount: 1,
      isCustom,
      isStarred: false,
      category,
      tags,
    };
    current.unshift(updatedEntry);
  }

  // Also auto-record reverse translation if high quality
  if (cleanSource.split(/\s+/).length <= 4 && !current.some((e) => e.sourceNormalized === normalizeText(cleanTarget) && e.sourceLang === tLang && e.targetLang === sLang)) {
    current.push({
      id: `rev_${tLang}_${sLang}_${normalizeText(cleanTarget).substring(0, 30)}_${Date.now()}`,
      sourceText: cleanTarget,
      sourceNormalized: normalizeText(cleanTarget),
      translatedText: cleanSource,
      sourceLang: tLang,
      targetLang: sLang,
      timestamp: Date.now(),
      usageCount: 1,
      isCustom: false,
      isStarred: false,
      category: 'Auto-Inversé',
      tags: ['Inversion Automatique'],
    });
  }

  persistLexicon(current);
  return updatedEntry;
}

/**
 * Toggle favorite / star on an offline entry
 */
export function toggleStarOfflineEntry(id: string): boolean {
  const current = getOfflineLexicon();
  const index = current.findIndex((e) => e.id === id);
  if (index >= 0) {
    current[index].isStarred = !current[index].isStarred;
    persistLexicon(current);
    return Boolean(current[index].isStarred);
  }
  return false;
}

/**
 * Delete a single entry from offline database
 */
export function deleteOfflineEntry(id: string): void {
  const current = getOfflineLexicon();
  const filtered = current.filter((e) => e.id !== id);
  persistLexicon(filtered);
}

/**
 * Update an existing offline entry
 */
export function updateOfflineEntry(id: string, newTranslation: string, newPhonetic?: string, category?: string): void {
  const current = getOfflineLexicon();
  const index = current.findIndex((e) => e.id === id);
  if (index >= 0) {
    current[index].translatedText = newTranslation.trim();
    if (newPhonetic !== undefined) current[index].phonetic = newPhonetic.trim();
    if (category) current[index].category = category;
    current[index].timestamp = Date.now();
    persistLexicon(current);
  }
}

/**
 * Clear all offline entries
 */
export function clearOfflineLexicon(): void {
  inMemoryLexicon = [];
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(INSTALLED_PACKS_KEY);
  window.dispatchEvent(new CustomEvent('verbamind-offline-lexicon-updated', { detail: { count: 0 } }));
}

/**
 * Install a preloaded linguistic pack into the offline database
 */
export function installOfflinePack(packId: string): number {
  const pack = PRELOADED_OFFLINE_PACKS.find((p) => p.id === packId);
  if (!pack) return 0;

  const current = getOfflineLexicon();
  let addedCount = 0;

  pack.entries.forEach((item) => {
    const norm = normalizeText(item.source);
    const existing = current.find(
      (e) => e.sourceNormalized === norm && e.sourceLang === pack.sourceLang && e.targetLang === pack.targetLang
    );

    if (!existing) {
      current.push({
        id: `pack_${pack.id}_${norm}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        sourceText: item.source,
        sourceNormalized: norm,
        translatedText: item.target,
        sourceLang: pack.sourceLang,
        targetLang: pack.targetLang,
        phonetic: item.phonetic,
        timestamp: Date.now(),
        usageCount: 1,
        isCustom: false,
        isStarred: false,
        category: item.category || pack.name,
        tags: [pack.name, item.category || 'Général'],
      });
      addedCount++;
    }
  });

  // Track installed pack
  try {
    const installedRaw = localStorage.getItem(INSTALLED_PACKS_KEY);
    const installed: string[] = installedRaw ? JSON.parse(installedRaw) : [];
    if (!installed.includes(packId)) {
      installed.push(packId);
      localStorage.setItem(INSTALLED_PACKS_KEY, JSON.stringify(installed));
    }
  } catch (e) {
    // Ignore
  }

  persistLexicon(current);
  return addedCount;
}

/**
 * Get IDs of installed offline packs
 */
export function getInstalledPackIds(): string[] {
  try {
    const raw = localStorage.getItem(INSTALLED_PACKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Full Offline Translation Engine:
 * 1. Exact sentence/phrase match
 * 2. Normalized fuzzy match (accents/punctuation insensitive)
 * 3. Smart Word-by-word tokenized translation preserving grammar & capitalization
 */
export interface OfflineTranslationResult {
  translatedText: string;
  matchType: 'exact' | 'normalized' | 'word_by_word' | 'partial' | 'none';
  matchedWordsCount: number;
  totalWordsCount: number;
  phonetic?: string;
  sourceLangFound?: string;
}

export function translateOffline(
  text: string,
  sourceLang: string,
  targetLang: string
): OfflineTranslationResult {
  const clean = text.trim();
  if (!clean) {
    return { translatedText: '', matchType: 'none', matchedWordsCount: 0, totalWordsCount: 0 };
  }

  const lexicon = getOfflineLexicon();
  const sLang = sourceLang === 'auto' ? null : sourceLang;
  const tLang = targetLang;
  const norm = normalizeText(clean);

  // 1. Exact phrase match
  const exactMatch = lexicon.find(
    (e) =>
      e.sourceText.toLowerCase() === clean.toLowerCase() &&
      (!sLang || e.sourceLang === sLang) &&
      e.targetLang === tLang
  );
  if (exactMatch) {
    return {
      translatedText: exactMatch.translatedText,
      matchType: 'exact',
      matchedWordsCount: clean.split(/\s+/).length,
      totalWordsCount: clean.split(/\s+/).length,
      phonetic: exactMatch.phonetic,
      sourceLangFound: exactMatch.sourceLang,
    };
  }

  // 2. Normalized phrase match (ignoring accents, punctuation, casing)
  const normMatch = lexicon.find(
    (e) =>
      e.sourceNormalized === norm &&
      (!sLang || e.sourceLang === sLang) &&
      e.targetLang === tLang
  );
  if (normMatch) {
    return {
      translatedText: normMatch.translatedText,
      matchType: 'normalized',
      matchedWordsCount: clean.split(/\s+/).length,
      totalWordsCount: clean.split(/\s+/).length,
      phonetic: normMatch.phonetic,
      sourceLangFound: normMatch.sourceLang,
    };
  }

  // 3. Multi-word phrases & Tokenized Word-by-Word Translation
  const tokens = clean.split(/(\s+|[.,!?;:()"])/);
  const wordsOnly = clean.split(/\s+/).filter(Boolean);
  let matchedWords = 0;

  const translatedTokens = tokens.map((token) => {
    if (!token.trim() || /^[.,!?;:()"]+$/.test(token)) {
      return token; // Keep whitespace and punctuation as-is
    }

    const tokenNorm = normalizeText(token);
    const wordMatch = lexicon.find(
      (e) =>
        e.sourceNormalized === tokenNorm &&
        (!sLang || e.sourceLang === sLang) &&
        e.targetLang === tLang
    );

    if (wordMatch) {
      matchedWords++;
      // Preserve uppercase if original token was capitalized
      const translation = wordMatch.translatedText;
      if (token[0] === token[0].toUpperCase() && token[0] !== token[0].toLowerCase()) {
        return translation.charAt(0).toUpperCase() + translation.slice(1);
      }
      return translation;
    }

    return token; // Return original token if untranslated
  });

  const assembled = translatedTokens.join('');
  const hasMatches = matchedWords > 0;

  return {
    translatedText: assembled,
    matchType: matchedWords === wordsOnly.length ? 'word_by_word' : hasMatches ? 'partial' : 'none',
    matchedWordsCount: matchedWords,
    totalWordsCount: wordsOnly.length,
    phonetic: '',
  };
}

/**
 * Statistics on offline database
 */
export function getOfflineStats() {
  const lexicon = getOfflineLexicon();
  const totalEntries = lexicon.length;
  const customCount = lexicon.filter((e) => e.isCustom).length;
  const starredCount = lexicon.filter((e) => e.isStarred).length;

  const pairs = new Set<string>();
  lexicon.forEach((e) => pairs.add(`${e.sourceLang}->${e.targetLang}`));

  const rawSize = JSON.stringify(lexicon).length;
  const storageKb = Math.round((rawSize / 1024) * 10) / 10;

  return {
    totalEntries,
    customCount,
    starredCount,
    languagePairsCount: pairs.size,
    storageKb,
  };
}

/**
 * Export offline lexicon to JSON or CSV file
 */
export function exportOfflineLexicon(format: 'json' | 'csv' = 'json'): void {
  const lexicon = getOfflineLexicon();
  let blob: Blob;
  let filename: string;

  if (format === 'csv') {
    const header = 'Source Text,Translated Text,Source Lang,Target Lang,Phonetic,Category,Usage Count,Starred\n';
    const rows = lexicon
      .map(
        (e) =>
          `"${e.sourceText.replace(/"/g, '""')}","${e.translatedText.replace(/"/g, '""')}","${e.sourceLang}","${
            e.targetLang
          }","${(e.phonetic || '').replace(/"/g, '""')}","${e.category || ''}",${e.usageCount},${e.isStarred ? 'Yes' : 'No'}`
      )
      .join('\n');
    blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' });
    filename = `verbamind_offline_lexicon_${Date.now()}.csv`;
  } else {
    const jsonStr = JSON.stringify(lexicon, null, 2);
    blob = new Blob([jsonStr], { type: 'application/json' });
    filename = `verbamind_offline_lexicon_${Date.now()}.json`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import offline lexicon from uploaded JSON
 */
export function importOfflineLexicon(jsonContent: string): number {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!Array.isArray(parsed)) {
      throw new Error('Imported data must be an array of entries');
    }

    const current = getOfflineLexicon();
    let imported = 0;

    parsed.forEach((item: any) => {
      if (item.sourceText && item.translatedText && item.sourceLang && item.targetLang) {
        const norm = normalizeText(item.sourceText);
        const existing = current.find(
          (e) => e.sourceNormalized === norm && e.sourceLang === item.sourceLang && e.targetLang === item.targetLang
        );
        if (!existing) {
          current.push({
            id: item.id || `imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sourceText: item.sourceText,
            sourceNormalized: norm,
            translatedText: item.translatedText,
            sourceLang: item.sourceLang,
            targetLang: item.targetLang,
            phonetic: item.phonetic,
            timestamp: item.timestamp || Date.now(),
            usageCount: item.usageCount || 1,
            isCustom: true,
            isStarred: Boolean(item.isStarred),
            category: item.category || 'Importé',
            tags: item.tags || ['Importé'],
          });
          imported++;
        }
      }
    });

    persistLexicon(current);
    return imported;
  } catch (e) {
    console.error('Failed to import lexicon:', e);
    throw e;
  }
}
