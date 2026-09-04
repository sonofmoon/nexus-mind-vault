/**
 * 🎙️ Nexus Mind Vault — Human-Like Streaming Voice Synthesis Engine
 * Provides low-latency, sentence-chunked Text-to-Speech (TTS)
 * for natural, conversational human-to-human flow.
 */

/**
 * Strips markdown, emojis, bullet points, and code syntax so spoken audio
 * sounds like a natural, warm, human conversation instead of reading formatting.
 */
export function cleanTextForSpeech(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, ' ')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove headers (# Header)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes (> Quote)
    .replace(/^>\s+/gm, '')
    // Remove bold and italic markers
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove list bullets (e.g. * item, - item, 1. item)
    .replace(/^[\s*+-]+\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Replace symbol shorthands
    .replace(/&/g, ' and ')
    .replace(/@/g, ' at ')
    .replace(/#/g, '')
    .replace(/\//g, ' ')
    // Remove emojis & special pictographs
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Collapse extra whitespace and linebreaks
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Discovers and returns the highest quality natural human-like voice available
 * in the current browser environment (Chrome Natural, Edge Online, Apple Siri/Samantha).
 */
export function getBestConversationalVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Preferred high-quality natural/online voices
  const priorityPatterns = [
    /Google.*US.*English/i,
    /Google.*UK.*English.*Female/i,
    /Microsoft.*(Jenny|Aria|Guy).*Natural/i,
    /Microsoft.*(Aria|Jenny).*Online/i,
    /Samantha/i,
    /Karen/i,
    /Daniel/i,
    /Serena/i,
    /Victoria/i,
    /Natural.*English/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.startsWith('en'));
    if (match) return match;
  }

  // 2. Any English natural or primary voice
  const englishVoice = voices.find((v) => v.lang.startsWith('en-US')) ||
    voices.find((v) => v.lang.startsWith('en'));
  if (englishVoice) return englishVoice;

  // 3. Fallback default
  return voices.find((v) => v.default) || voices[0] || null;
}

/**
 * Cancels all active and queued speech utterances immediately (Barge-in).
 */
export function cancelAllSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('[VoiceSynthesis] Cancel speech error:', err);
    }
  }
}

export interface StreamingSpeakerOptions {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  onSentenceStart?: (sentence: string) => void;
  onSentenceEnd?: (sentence: string) => void;
  onComplete?: () => void;
}

/**
 * StreamingSentenceSpeaker buffers incoming streaming text tokens from the LLM,
 * cuts them into complete spoken sentences on punctuation boundaries, and immediately
 * begins speaking the first sentence while subsequent sentences are still generating.
 */
export class StreamingSentenceSpeaker {
  private buffer = '';
  private sentenceQueue: string[] = [];
  private isPlaying = false;
  private isCancelled = false;
  private isStreamDone = false;
  private options: StreamingSpeakerOptions;

  constructor(options?: StreamingSpeakerOptions) {
    this.options = {
      rate: 1.04, // Slightly brisk, natural conversational tempo
      pitch: 1.0,
      ...options,
    };
  }

  /**
   * Ingests a new incoming token or chunk from the LLM stream.
   */
  public pushChunk(chunk: string): void {
    if (this.isCancelled) return;
    this.buffer += chunk;
    this.extractAndQueueSentences();
  }

  /**
   * Signals that the LLM stream has finished generating all tokens.
   */
  public finishStream(): void {
    if (this.isCancelled) return;
    this.isStreamDone = true;

    // Flush any remaining text in the buffer
    const remaining = cleanTextForSpeech(this.buffer);
    if (remaining) {
      this.sentenceQueue.push(remaining);
      this.buffer = '';
    }

    if (!this.isPlaying) {
      this.playNextSentence();
    }
  }

  /**
   * Extracts complete sentences from the buffer using standard sentence terminators.
   */
  private extractAndQueueSentences(): void {
    // Look for sentence terminators followed by whitespace or linebreak (. ! ? \n)
    const sentenceRegex = /([^.!?\n]+[.!?]+)(\s+|$)/;
    let match: RegExpExecArray | null;

    while ((match = sentenceRegex.exec(this.buffer)) !== null) {
      const sentence = cleanTextForSpeech(match[1]);
      this.buffer = this.buffer.slice(match.index + match[0].length);

      if (sentence && sentence.length > 2) {
        this.sentenceQueue.push(sentence);
        if (!this.isPlaying) {
          this.playNextSentence();
        }
      }
    }
  }

  /**
   * Plays the next sentence in the queue via window.speechSynthesis.
   */
  private playNextSentence(): void {
    if (this.isCancelled || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    if (this.sentenceQueue.length === 0) {
      this.isPlaying = false;
      if (this.isStreamDone && this.options.onComplete) {
        this.options.onComplete();
      }
      return;
    }

    this.isPlaying = true;
    const sentence = this.sentenceQueue.shift()!;
    const utterance = new SpeechSynthesisUtterance(sentence);

    const voice = this.options.voice || getBestConversationalVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = this.options.rate || 1.04;
    utterance.pitch = this.options.pitch || 1.0;

    utterance.onstart = () => {
      if (this.isCancelled) return;
      if (this.options.onSentenceStart) {
        this.options.onSentenceStart(sentence);
      }
    };

    utterance.onend = () => {
      if (this.isCancelled) return;
      if (this.options.onSentenceEnd) {
        this.options.onSentenceEnd(sentence);
      }
      this.playNextSentence();
    };

    utterance.onerror = (err) => {
      console.warn('[VoiceSynthesis] Utterance error:', err);
      if (!this.isCancelled) {
        this.playNextSentence();
      }
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[VoiceSynthesis] speak error:', err);
      this.playNextSentence();
    }
  }

  /**
   * Aborts active speech synthesis and clears any pending sentence chunks.
   */
  public cancel(): void {
    this.isCancelled = true;
    this.isPlaying = false;
    this.sentenceQueue = [];
    this.buffer = '';
    cancelAllSpeech();
  }

  public getQueueLength(): number {
    return this.sentenceQueue.length;
  }
}
