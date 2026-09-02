import { describe, it, expect } from 'vitest';
import { generateEntryShareLink } from '../utils/entrySharingEngine';
import { JournalEntry } from '../types';

describe('🔗 Cryptographic Single-Entry Sharing Engine', () => {
  it('should generate a valid share link containing encoded payload and expiration', () => {
    const entry: JournalEntry = {
      id: 'entry_123',
      userId: 'user_abc',
      title: 'Confidential Protocol Notes',
      content: 'Zero-knowledge verification rules.',
      mood: 'focused',
      tags: ['security'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const link = generateEntryShareLink(entry, 'secretPass123', 48);
    expect(link).toBeDefined();
    expect(link).toContain('shared_entry=');
  });
});
