/**
 * Audio and Network utilities for VerbaMind AI Pro
 */

// Exponential backoff fetcher for network resilience and rate-limit handling
export async function fetchWithExponentialBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelayMs = 1200,
  signal?: AbortSignal
): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const response = await fetch(url, { ...options, signal });
      
      // If rate limited (429) or temporary server high demand (503/500), retry with backoff
      if ((response.status === 429 || response.status === 503 || response.status >= 500) && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`[VerbaMind Network] Status ${response.status} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
        continue;
      }
      
      return response;
    } catch (error: any) {
      if (error?.name === 'AbortError' || signal?.aborted) {
        throw error;
      }
      if (attempt >= maxRetries) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      console.warn(`[VerbaMind Network] Request failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${Math.round(delay)}ms...`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
    }
  }
  throw new Error('Max retries exceeded');
}

// PCM Audio Player for Gemini TTS (24kHz 16-bit raw PCM)
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass({ sampleRate: 24000 });
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playRawPcmAudio(base64PcmData: string, sampleRate = 24000): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const ctx = getAudioContext();
      const binaryString = atob(base64PcmData);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit PCM little endian to Float32Array
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, sampleRate);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => resolve();
      source.start();
    } catch (err) {
      reject(err);
    }
  });
}

// Browser SpeechSynthesis utility with enhanced voice matching
export function stopBrowserSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function speakTextWithBrowser(text: string, langCode = 'fr'): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser environment.');
      return resolve();
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    if (!text || text.trim() === '') {
      return resolve();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Normalize language tag (e.g., 'en' -> 'en-US', 'fr' -> 'fr-FR', 'es' -> 'es-ES')
    const primaryLang = langCode.split('-')[0].toLowerCase();
    utterance.lang = langCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const findVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        // Priority 1: Exact code match (e.g., 'es-ES' or 'en-US')
        let matchedVoice = voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase());
        
        // Priority 2: Matching primary language prefix (e.g., 'es' matches 'es-MX' or 'es-ES')
        if (!matchedVoice) {
          matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(primaryLang));
        }

        // Priority 3: Contains language code
        if (!matchedVoice) {
          matchedVoice = voices.find((v) => v.lang.toLowerCase().includes(primaryLang));
        }

        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis utterance event error:', e);
        resolve();
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis speak failed:', err);
        resolve();
      }
    };

    // If voices are already loaded
    if (window.speechSynthesis.getVoices().length > 0) {
      findVoiceAndSpeak();
    } else {
      // Voices load asynchronously in some browsers (Chrome / Safari)
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        findVoiceAndSpeak();
      };
      // Fallback timeout in case onvoiceschanged does not fire
      setTimeout(() => {
        findVoiceAndSpeak();
      }, 150);
    }
  });
}

// Check SpeechRecognition support
export function isSpeechRecognitionSupported(): boolean {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export function createSpeechRecognizer(langCode: string, onResult: (transcript: string) => void, onError?: (err: any) => void) {
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    return null;
  }
  const recognition = new SpeechRecognitionClass();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = langCode || 'fr-FR';

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    const current = finalTranscript || interimTranscript;
    if (current) {
      onResult(current);
    }
  };

  if (onError) {
    recognition.onerror = onError;
  }

  return recognition;
}
