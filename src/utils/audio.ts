/**
 * Audio and Network utilities for VerbaMind AI Pro
 */

// Exponential backoff fetcher for network resilience
export async function fetchWithExponentialBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 4,
  baseDelayMs = 1000,
  signal?: AbortSignal
): Promise<Response> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const response = await fetch(url, { ...options, signal });
      if (!response.ok && attempt < maxRetries && response.status >= 500) {
        throw new Error(`Server error HTTP ${response.status}`);
      }
      return response;
    } catch (error: any) {
      if (error?.name === 'AbortError' || signal?.aborted) {
        throw error;
      }
      if (attempt >= maxRetries) {
        throw error;
      }
      // Calculate delay: 1s, 2s, 4s, 8s, 16s...
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`[VerbaMind Network] Request failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`);
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

// Browser SpeechSynthesis fallback with language mapping
export function speakTextWithBrowser(text: string, langCode = 'fr'): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis is not supported in this browser.');
      return resolve();
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try to find matching voice
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(langCode) || v.lang.includes(langCode));
    if (match) {
      utterance.voice = match;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
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
