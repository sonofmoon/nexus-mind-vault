import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildZeroKnowledgeDescription,
  getEventDateRange,
  generateGoogleCalendarUrl,
  createCalendarEvent,
} from '../services/calendarIntegration';
import { JournalEntry } from '../types';

// Mock Firebase Config and Auth
vi.mock('../services/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test_user_777' } },
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({
    addScope: vi.fn(),
    setCustomParameters: vi.fn(),
  })),
  signInWithPopup: vi.fn(),
}));

describe('📅 Google Calendar Integration (Strict Option A: Zero-Knowledge Privacy)', () => {
  const sampleEntry: JournalEntry = {
    id: 'entry_crypto_secure_1',
    userId: 'user_sovereign_1',
    title: 'Post-Quantum Vault Architecture Discussion',
    content: 'DEEPLY PRIVATE PERSONAL THOUGHT: I am feeling anxious about quantum decryption attacks in 2030.',
    mood: 'focused',
    tags: ['quantum', 'architecture', 'privacy'],
    folder: 'Research',
    reminderDate: '2026-09-10',
    reminderTime: '14:30',
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('buildZeroKnowledgeDescription (Option A Contract)', () => {
    it('MUST NEVER include the entry reflection content in description', () => {
      const desc = buildZeroKnowledgeDescription(sampleEntry);

      // Verify ZERO plaintext reflection egress
      expect(desc).not.toContain('DEEPLY PRIVATE PERSONAL THOUGHT');
      expect(desc).not.toContain('quantum decryption attacks');

      // Verify safe metadata inclusion
      expect(desc).toContain('Mood: Focused');
      expect(desc).toContain('Folder: Research');
      expect(desc).toContain('#quantum #architecture #privacy');
      expect(desc).toContain('Zero-Knowledge Privacy');
    });
  });

  describe('getEventDateRange', () => {
    it('should correctly schedule event from entry.reminderDate and entry.reminderTime', () => {
      const { startIso, endIso } = getEventDateRange(sampleEntry);
      const start = new Date(startIso);
      const end = new Date(endIso);

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(8); // September is 8 (0-indexed)
      expect(start.getDate()).toBe(10);
      expect(start.getHours()).toBe(14);
      expect(start.getMinutes()).toBe(30);

      // End time is exactly 30 minutes later
      expect(end.getTime() - start.getTime()).toBe(30 * 60 * 1000);
    });

    it('should fall back gracefully when no reminder is configured', () => {
      const entryWithoutReminder: JournalEntry = {
        ...sampleEntry,
        reminderDate: undefined,
        reminderTime: undefined,
        createdAt: new Date().toISOString(),
      };

      const { startIso, endIso } = getEventDateRange(entryWithoutReminder);
      expect(startIso).toBeDefined();
      expect(endIso).toBeDefined();
      expect(new Date(endIso).getTime()).toBeGreaterThan(new Date(startIso).getTime());
    });
  });

  describe('generateGoogleCalendarUrl (Web Intent Fallback)', () => {
    it('should generate a valid Google Calendar web intent without reflection content', () => {
      const url = generateGoogleCalendarUrl(sampleEntry);

      expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE');
      expect(url).toContain(encodeURIComponent('🧠 Journal: Post-Quantum Vault Architecture Discussion'));

      // Verify ZERO plaintext reflection text is encoded in URL
      expect(url).not.toContain('DEEPLY%20PRIVATE');
      expect(url).not.toContain('quantum%20decryption%20attacks');
    });
  });

  describe('createCalendarEvent (Dual-Mode Execution)', () => {
    it('should fall back to Google Calendar Web Intent when REST API fails or cancels', async () => {
      vi.stubGlobal('window', {
        location: { origin: 'https://nexus-mind-vault.web.app' },
        open: vi.fn(),
      });

      // Simulating cancelled popup or unavailable token
      const result = await createCalendarEvent(sampleEntry);

      expect(result.success).toBe(true);
      expect(result.mode).toBe('intent');
      expect(result.eventUrl).toContain('https://calendar.google.com/calendar/render');
      expect(window.open).toHaveBeenCalledWith(result.eventUrl, '_blank', 'noopener,noreferrer');
    });
  });
});
