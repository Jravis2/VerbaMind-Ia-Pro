import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const LOCAL_STORAGE_KEY = 'verbamind_gemini_key';

export function getStoredApiKey(): string {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {
    console.warn('Cannot read apiKey from localStorage:', e);
  }
  // Vite env variable if provided at build time
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return '';
}

export function saveStoredApiKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(LOCAL_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Cannot save apiKey to localStorage:', e);
  }
}

let cachedGenAI: GoogleGenAI | null = null;
let lastUsedKey = '';

export function getClientGemini(): GoogleGenAI | null {
  const apiKey = getStoredApiKey();
  if (!apiKey) return null;

  if (cachedGenAI && lastUsedKey === apiKey) {
    return cachedGenAI;
  }

  try {
    cachedGenAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-client',
        },
      },
    });
    lastUsedKey = apiKey;
    return cachedGenAI;
  } catch (e) {
    console.error('Failed to initialize client GoogleGenAI:', e);
    return null;
  }
}

export async function testGeminiApiKey(keyToTest: string): Promise<{ ok: boolean; message: string }> {
  if (!keyToTest || !keyToTest.trim()) {
    return { ok: false, message: 'La clé API ne peut pas être vide.' };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: keyToTest.trim() });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Dis "OK" en un seul mot.',
    });
    if (response && response.text) {
      return { ok: true, message: 'Clé API Gemini validée avec succès !' };
    }
    return { ok: false, message: 'Aucune réponse reçue du modèle.' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Erreur lors de la validation de la clé API.' };
  }
}
