import { describe, it, expect } from 'vitest';
import { JOURNAL_TEMPLATES, calculateJournalStreak } from '../utils/journalTemplates';
import { JournalEntry } from '../types';

describe('📖 Journal Templates & Streak Engine', () => {
  it('should contain all 4 essential structured journaling templates', () => {
    expect(JOURNAL_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    const ids = JOURNAL_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('morning_clarity');
    expect(ids).toContain('stoic_evening');
    expect(ids).toContain('deep_work');
    expect(ids).toContain('emotional_reframe');
  });

  it('should accurately calculate consecutive daily streaks', () => {
    const now = new Date();
    const yesterday = new Date(Date.now() - 86400000);

    const mockEntries: Partial<JournalEntry>[] = [
      { createdAt: now.toISOString() },
      { createdAt: yesterday.toISOString() },
    ];

    const streak = calculateJournalStreak(mockEntries as JournalEntry[]);
    expect(streak.currentStreak).toBe(2);
    expect(streak.maxStreak).toBe(2);
  });

  it('should return 0 streak for empty entry lists', () => {
    const streak = calculateJournalStreak([]);
    expect(streak.currentStreak).toBe(0);
    expect(streak.maxStreak).toBe(0);
  });
});
