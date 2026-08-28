import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined in environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Resilient helper to call Gemini with multi-model fallback cascade
async function generateContentWithFallback(
  options: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
) {
  const ai = getGeminiClient();
  const models = [
    options.preferredModel || 'gemini-3.6-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-flash-latest',
  ];

  // Remove duplicates while preserving priority order
  const uniqueModels = Array.from(new Set(models));
  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      const thinkingConfig = model === 'gemini-3.1-flash-lite'
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } }
        : model.startsWith('gemini-3')
        ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        : {};

      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: {
          ...options.config,
          ...thinkingConfig,
        },
      });

      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      // Log clean diagnostic line and continue to next model in cascade
      console.warn(`[VerbaMind AI] Model "${model}" hit transient condition (${err?.status || err?.code || 'error'}), failing over to next model.`);
      continue;
    }
  }

  throw lastError || new Error('All model fallback attempts failed');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON body with large payload limit for base64 images/audio
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'VerbaMind AI Pro Engine',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Fast Contextual Translation & Restructuring Engine
  app.post('/api/translate', async (req, res) => {
    const startTime = Date.now();
    try {
      const {
        text,
        sourceLang = 'auto',
        targetLang = 'fr',
        tone = 'natural',
        useCase = 'general',
        withPhonetic = false,
      } = req.body;

      if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: 'Text parameter is required' });
      }

      const ai = getGeminiClient();

      const toneGuidelines: Record<string, string> = {
        natural: 'Naturel & Fluide: Everyday natural language, smooth idiomatic phrasing, zero stiffness.',
        literal: 'Littéral & Exact: Scrupulously faithful to original meaning while fixing all grammar and syntax.',
        formal: 'Formel / Soutenu: Chiseled, polite, professional, diplomatic, respectful register.',
        academic: 'Académique / Historique: Strict historical/classical grammar rules (for Latin, Ancient Greek, Sanskrit, Old Norse, etc.), precise philological terms.',
        simplified: 'Simplifié: Short sentences, universally accessible vocabulary, direct syntax.',
      };

      const systemInstruction = `You are VerbaMind AI Pro, an ultra-fast real-time contextual translation and grammatical restructuring engine.
Core Directives:
1. Contextual Intent Understanding: Do NOT do word-for-word translation. Understand the speaker's true intent even if the source contains typos, missing accents, inverted word order, bad slang, or poor grammar. Reconstruct the phrase into the target language (${targetLang}) following exact natural syntax rules.
2. Output Format: If withPhonetic is false, return DIRECTLY AND ONLY the translated and restructured text. No introduction, no markdown code block, no quotation marks, no explanations.
3. Tone Style: ${toneGuidelines[tone] || toneGuidelines.natural}
4. Use-case context: ${useCase}
5. Language Coverage: You have master-level fluency across 200+ living languages (French, English, Arabic, Chinese, Japanese, Wolof, Swahili, etc.), ancient/dead languages (Classical Latin, Ancient Greek, Sanskrit, Ancient Egyptian hieroglyphs phonetic, Sumerian, Akkadian, Old Norse, Gothic, etc.), regional languages (Breton, Occitan, Basque, Catalan, Welsh, Gaelic, etc.), and constructed languages (Esperanto, Klingon, Interlingua, Lojban, Quenya, Sindarin, High Valyrian, etc.).`;

      if (sourceLang === 'auto' || withPhonetic) {
        // Structured response for auto-detection and/or phonetics/transliteration
        const response = await generateContentWithFallback({
          preferredModel: 'gemini-3.6-flash',
          contents: `Translate and restructure this source text to target language "${targetLang}".
Source language setting: "${sourceLang}" (detect automatically if set to "auto").
Source text:
"""${text}"""`,
          config: {
            systemInstruction,
            temperature: 0.15,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translatedText: { type: Type.STRING, description: 'The translated and grammatically restructured text' },
                detectedSourceLang: { type: Type.STRING, description: 'Detected language code (e.g., "fr", "en", "es", "de", "ja", "zh", "la")' },
                detectedSourceLangName: { type: Type.STRING, description: 'Full human-readable name of the detected language in French (e.g., "Espagnol", "Anglais", "Latin", "Japonais")' },
                phonetic: { type: Type.STRING, description: 'Phonetic transcription, Romanization, Romaji, Pinyin, or IPA if applicable' },
                detectedGrammarIssues: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Brief list of grammatical/typo fixes made from the source text',
                },
              },
              required: ['translatedText', 'detectedSourceLang'],
            },
          },
        });

        const latencyMs = Date.now() - startTime;
        let parsedResult: any = {};
        try {
          parsedResult = JSON.parse(response.text || '{}');
        } catch {
          parsedResult = { translatedText: response.text || '' };
        }

        return res.json({
          translatedText: parsedResult.translatedText || '',
          detectedSourceLang: parsedResult.detectedSourceLang || 'fr',
          detectedSourceLangName: parsedResult.detectedSourceLangName || '',
          phonetic: parsedResult.phonetic || '',
          detectedGrammarIssues: parsedResult.detectedGrammarIssues || [],
          latencyMs,
        });
      } else {
        // Ultra-low latency raw text mode (< 250ms)
        const response = await generateContentWithFallback({
          preferredModel: 'gemini-3.6-flash',
          contents: `Source text to translate and restructure into target language "${targetLang}" (Source language: ${sourceLang}):
${text}`,
          config: {
            systemInstruction,
            temperature: 0.15,
          },
        });

        const latencyMs = Date.now() - startTime;
        const translatedText = (response.text || '').trim();

        return res.json({
          translatedText,
          detectedSourceLang: sourceLang,
          latencyMs,
        });
      }
    } catch (error: any) {
      console.error('Error in /api/translate:', error);
      res.status(500).json({
        error: error.message || 'Translation engine error',
        latencyMs: Date.now() - startTime,
      });
    }
  });

  // Multimodal OCR Image & AR Live Camera Frame Extraction + Translation
  app.post('/api/ocr-translate', async (req, res) => {
    const startTime = Date.now();
    try {
      const { image, targetLang = 'fr', sourceLang = 'auto', tone = 'natural' } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Image data (base64) is required' });
      }

      // Extract mime type and base64 data
      let mimeType = 'image/jpeg';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const matches = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const response = await generateContentWithFallback({
        preferredModel: 'gemini-3.6-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: `Perform high-precision Optical Character Recognition (OCR) and instant contextual translation.
1. Detect and extract all visible text in this image/video frame (signs, documents, screens, handwritten notes, inscriptions, labels, ancient tablets, etc.).
2. Identify the source language.
3. Translate and grammatically restructure all detected text into the target language "${targetLang}" with a "${tone}" tone.
4. If there are distinct text blocks/zones, provide their bounding box coordinates [ymin, xmin, ymax, xmax] scaled 0 to 1000, along with the original and translated text for AR overlay.`,
            },
          ],
        },
        config: {
          systemInstruction: 'You are the AR Live Camera & OCR Visual Translator module of VerbaMind AI Pro. Deliver fast, structured OCR text detection and contextual translation.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedText: { type: Type.STRING, description: 'All detected text concatenated cleanly' },
              translatedText: { type: Type.STRING, description: 'Full translated and restructured text in target language' },
              detectedLanguage: { type: Type.STRING, description: 'Detected language name or ISO code' },
              confidence: { type: Type.NUMBER, description: 'Detection confidence from 0 to 1' },
              detectedBlocks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    translated: { type: Type.STRING },
                    boundingBox: {
                      type: Type.ARRAY,
                      items: { type: Type.INTEGER },
                      description: '[ymin, xmin, ymax, xmax] coordinates from 0 to 1000',
                    },
                  },
                  required: ['original', 'translated'],
                },
              },
            },
            required: ['detectedText', 'translatedText'],
          },
        },
      });

      const latencyMs = Date.now() - startTime;
      let data: any = {};
      try {
        data = JSON.parse(response.text || '{}');
      } catch {
        data = {
          detectedText: 'Texte détecté dans l\'image',
          translatedText: response.text || '',
          detectedLanguage: 'auto',
          detectedBlocks: [],
        };
      }

      return res.json({
        detectedText: data.detectedText || '',
        translatedText: data.translatedText || '',
        detectedLanguage: data.detectedLanguage || 'Indéterminé',
        confidence: data.confidence ?? 0.95,
        detectedBlocks: data.detectedBlocks || [],
        latencyMs,
      });
    } catch (error: any) {
      console.error('Error in /api/ocr-translate:', error);
      res.status(500).json({
        error: error.message || 'Visual OCR translation failed',
        latencyMs: Date.now() - startTime,
      });
    }
  });

  // Audio Speech Transcription via Gemini Transcribe
  app.post('/api/transcribe', async (req, res) => {
    const startTime = Date.now();
    try {
      const { audio, mimeType = 'audio/webm' } = req.body;

      if (!audio || typeof audio !== 'string') {
        return res.status(400).json({ error: 'Audio data (base64) is required' });
      }

      let base64Audio = audio;
      let cleanMime = mimeType;
      if (audio.startsWith('data:')) {
        const matches = audio.match(/^data:(audio\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (matches) {
          cleanMime = matches[1];
          base64Audio = matches[2];
        }
      }

      const response = await generateContentWithFallback({
        preferredModel: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Audio,
              },
            },
            {
              text: 'Transcribe the spoken words in this audio accurately. Fix stuttering and add proper punctuation. Return only the transcription.',
            },
          ],
        },
      });

      const latencyMs = Date.now() - startTime;
      const transcription = (response.text || '').trim();

      return res.json({
        transcription,
        latencyMs,
      });
    } catch (error: any) {
      console.error('Error in /api/transcribe:', error);
      res.status(500).json({
        error: error.message || 'Audio transcription failed',
        latencyMs: Date.now() - startTime,
      });
    }
  });

  // Text-To-Speech Generation via Gemini TTS
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voice = 'Kore' } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text parameter is required for TTS' });
      }

      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [
          {
            parts: [
              {
                text: `Speak clearly and naturally in the text language: ${text}`,
              },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice || 'Kore',
              },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (audioData) {
        return res.json({
          audioBase64: audioData,
          sampleRate: 24000,
          format: 'pcm',
        });
      } else {
        return res.json({
          audioBase64: null,
          useBrowserFallback: true,
        });
      }
    } catch (error: any) {
      console.warn('TTS API notice (falling back to browser speech synthesis):', error.message);
      return res.json({
        audioBase64: null,
        useBrowserFallback: true,
        notice: error.message,
      });
    }
  });

  // Deep Linguistic & Syntactic Explanation Engine
  app.post('/api/explain-syntax', async (req, res) => {
    try {
      const { sourceText, targetText, sourceLang, targetLang, tone } = req.body;

      const response = await generateContentWithFallback({
        preferredModel: 'gemini-3.6-flash',
        contents: `Provide a detailed linguistic, grammatical, and syntactical analysis comparing the source text and translated target text.
Source (${sourceLang}): "${sourceText}"
Target (${targetLang}, Tone: ${tone}): "${targetText}"`,
        config: {
          systemInstruction: 'You are the Master Linguist and Philologist module of VerbaMind AI Pro. Break down grammatical syntax, errors detected in source, nuance adaptations, and alternative phrasing.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sourceAnalysis: {
                type: Type.OBJECT,
                properties: {
                  intent: { type: Type.STRING, description: 'Underlying intent and tone of source' },
                  identifiedErrors: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        original: { type: Type.STRING },
                        corrected: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                      },
                      required: ['original', 'corrected', 'explanation'],
                    },
                  },
                  register: { type: Type.STRING, description: 'Language register (slang, colloquial, standard, elevated)' },
                },
                required: ['intent', 'identifiedErrors', 'register'],
              },
              targetAnalysis: {
                type: Type.OBJECT,
                properties: {
                  syntaxStructure: { type: Type.STRING, description: 'Grammatical construction applied in target' },
                  keyVocabulary: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        source: { type: Type.STRING },
                        target: { type: Type.STRING },
                        nuance: { type: Type.STRING },
                      },
                      required: ['source', 'target', 'nuance'],
                    },
                  },
                  stylisticNotes: { type: Type.STRING },
                },
                required: ['syntaxStructure', 'keyVocabulary', 'stylisticNotes'],
              },
              alternativePhrasings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    nuance: { type: Type.STRING },
                  },
                  required: ['text', 'nuance'],
                },
              },
            },
            required: ['sourceAnalysis', 'targetAnalysis', 'alternativePhrasings'],
          },
        },
      });

      let analysis: any = {};
      try {
        analysis = JSON.parse(response.text || '{}');
      } catch {
        analysis = {
          sourceAnalysis: { intent: 'Expression directe', identifiedErrors: [], register: 'Standard' },
          targetAnalysis: { syntaxStructure: 'Syntaxe standard', keyVocabulary: [], stylisticNotes: '' },
          alternativePhrasings: [],
        };
      }

      return res.json(analysis);
    } catch (error: any) {
      console.error('Error in /api/explain-syntax:', error);
      res.status(500).json({ error: error.message || 'Syntax analysis failed' });
    }
  });

  // Vite middleware for development or Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VerbaMind AI Pro server running on http://localhost:${PORT}`);
  });
}

startServer();
