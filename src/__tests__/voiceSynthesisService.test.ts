import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanTextForSpeech,
  getBestConversationalVoice,
  cancelAllSpeech,
  StreamingSentenceSpeaker,
} from '../services/voiceSynthesisService';

describe('🎙️ Voice Synthesis Service & Sentence Streaming Engine', () => {
  describe('cleanTextForSpeech', () => {
    it('returns empty string for empty or null input', () => {
      expect(cleanTextForSpeech('')).toBe('');
      expect(cleanTextForSpeech(null as any)).toBe('');
    });

    it('strips markdown headers, bold, italics, and blockquotes', () => {
      const input = '# Heading 1\n> This is a quote.\nHere is **bold** text and *italic* reflection.';
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).not.toContain('#');
      expect(cleaned).not.toContain('>');
      expect(cleaned).not.toContain('*');
      expect(cleaned).toContain('Heading 1');
      expect(cleaned).toContain('This is a quote.');
      expect(cleaned).toContain('Here is bold text and italic reflection.');
    });

    it('removes code blocks and extracts inline code', () => {
      const input = 'Check out this snippet: ```const secret = 42;``` and execute `npm run start` for details.';
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).not.toContain('const secret = 42;');
      expect(cleaned).not.toContain('```');
      expect(cleaned).not.toContain('`');
      expect(cleaned).toContain('execute npm run start for details.');
    });

    it('replaces links with their readable label', () => {
      const input = 'Visit [Nexus Mind Vault Docs](https://vault.local/docs) for information.';
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).toBe('Visit Nexus Mind Vault Docs for information.');
    });

    it('strips list bullet markers and numbering', () => {
      const input = '- First reflection\n* Second thought\n1. Third discovery';
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).toBe('First reflection Second thought Third discovery');
    });

    it('replaces symbols with conversational equivalents (& -> and, @ -> at)', () => {
      const input = 'Mind & Soul @ 9pm #goals';
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).toBe('Mind and Soul at 9pm goals');
    });

    it('strips emojis and pictographs for clean conversational audio', () => {
      const input = '🧠 Neural vault synced! ✨ You completed your goal 🎯.';
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).toBe('Neural vault synced! You completed your goal .');
    });
  });

  describe('getBestConversationalVoice', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('returns null if window.speechSynthesis is undefined', () => {
      vi.stubGlobal('window', {});
      expect(getBestConversationalVoice()).toBeNull();
    });

    it('selects preferred natural conversational voice if available', () => {
      const mockVoices = [
        { name: 'Generic Voice', lang: 'en-US', default: true },
        { name: 'Google US English Natural', lang: 'en-US', default: false },
        { name: 'Microsoft Jenny Natural (Online)', lang: 'en-US', default: false },
      ] as SpeechSynthesisVoice[];

      vi.stubGlobal('window', {
        speechSynthesis: {
          getVoices: () => mockVoices,
        },
      });

      const selected = getBestConversationalVoice();
      expect(selected).not.toBeNull();
      expect(selected?.name).toContain('Google US English');
    });

    it('falls back to any English voice or default voice if preferred is not in list', () => {
      const mockVoices = [
        { name: 'Standard EN Voice', lang: 'en-GB', default: false },
        { name: 'Other Voice', lang: 'es-ES', default: true },
      ] as SpeechSynthesisVoice[];

      vi.stubGlobal('window', {
        speechSynthesis: {
          getVoices: () => mockVoices,
        },
      });

      const selected = getBestConversationalVoice();
      expect(selected?.name).toBe('Standard EN Voice');
    });
  });

  describe('cancelAllSpeech', () => {
    it('invokes window.speechSynthesis.cancel() without error', () => {
      const cancelMock = vi.fn();
      vi.stubGlobal('window', {
        speechSynthesis: {
          cancel: cancelMock,
        },
      });

      cancelAllSpeech();
      expect(cancelMock).toHaveBeenCalledTimes(1);
    });

    it('handles environments where window.speechSynthesis is missing', () => {
      vi.stubGlobal('window', {});
      expect(() => cancelAllSpeech()).not.toThrow();
    });
  });

  describe('StreamingSentenceSpeaker', () => {
    let mockSpokenUtterances: any[] = [];
    let cancelMock: any;

    beforeEach(() => {
      mockSpokenUtterances = [];
      cancelMock = vi.fn();

      class MockSpeechSynthesisUtterance {
        text: string;
        voice: any = null;
        rate = 1;
        pitch = 1;
        onstart: (() => void) | null = null;
        onend: (() => void) | null = null;
        onerror: ((err: any) => void) | null = null;

        constructor(text: string) {
          this.text = text;
        }
      }

      vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
      vi.stubGlobal('window', {
        speechSynthesis: {
          getVoices: () => [{ name: 'Samantha', lang: 'en-US', default: true }],
          speak: (utterance: any) => {
            mockSpokenUtterances.push(utterance);
            // Simulate start
            if (utterance.onstart) utterance.onstart();
          },
          cancel: cancelMock,
        },
      });
    });

    it('extracts sentences on punctuation boundaries and begins speaking immediately', () => {
      const onSentenceStart = vi.fn();
      const speaker = new StreamingSentenceSpeaker({ onSentenceStart });

      // Push incomplete chunk
      speaker.pushChunk('Hello there');
      expect(mockSpokenUtterances.length).toBe(0);

      // Complete sentence with punctuation
      speaker.pushChunk('! How are you doing today?');
      expect(mockSpokenUtterances.length).toBe(1);
      expect(mockSpokenUtterances[0].text).toBe('Hello there!');
      expect(onSentenceStart).toHaveBeenCalledWith('Hello there!');

      // Simulate completion of first sentence -> should play second sentence
      mockSpokenUtterances[0].onend();
      expect(mockSpokenUtterances.length).toBe(2);
      expect(mockSpokenUtterances[1].text).toBe('How are you doing today?');
    });

    it('flushes remaining buffer on finishStream and triggers onComplete', () => {
      const onComplete = vi.fn();
      const speaker = new StreamingSentenceSpeaker({ onComplete });

      speaker.pushChunk('I understand completely');
      expect(mockSpokenUtterances.length).toBe(0);

      speaker.finishStream();
      expect(mockSpokenUtterances.length).toBe(1);
      expect(mockSpokenUtterances[0].text).toBe('I understand completely');

      mockSpokenUtterances[0].onend();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('immediately aborts and stops processing upon cancel() (Barge-in)', () => {
      const speaker = new StreamingSentenceSpeaker();

      speaker.pushChunk('This is a thought that should be interrupted.');
      expect(mockSpokenUtterances.length).toBe(1);

      speaker.cancel();
      expect(cancelMock).toHaveBeenCalled();
      expect(speaker.getQueueLength()).toBe(0);

      // Pushing additional chunks after cancellation should do nothing
      speaker.pushChunk('Another thought.');
      expect(mockSpokenUtterances.length).toBe(1);
    });
  });
});
