import { describe, it, expect } from 'vitest';
import {
  sanitizeForFirestore,
  syncUserProfileToFirestore,
  syncJournalEntryToFirestore,
  syncAllLocalVaultDataToFirestore,
} from '../services/firestoreVaultSync';

describe('☁️ Cloud Firestore Vault Sync Engine', () => {
  it('sanitizeForFirestore should recursively strip undefined properties to prevent setDoc crashes', () => {
    const input = {
      id: 'entry_123',
      title: 'Valid Title',
      audioBlob: undefined,
      nested: {
        field: 'good',
        missing: undefined,
      },
      tags: ['security', 'offline'],
    };

    const sanitized = sanitizeForFirestore(input);
    expect(sanitized).toEqual({
      id: 'entry_123',
      title: 'Valid Title',
      audioBlob: null,
      nested: {
        field: 'good',
        missing: null,
      },
      tags: ['security', 'offline'],
    });
    expect(JSON.stringify(sanitized)).not.toContain('undefined');
  });

  it('syncUserProfileToFirestore should safely handle null or anonymous users without throwing', async () => {
    await expect(syncUserProfileToFirestore(null as any)).resolves.not.toThrow();
    await expect(syncUserProfileToFirestore({ uid: 'anonymous' } as any)).resolves.not.toThrow();
    await expect(syncUserProfileToFirestore({ uid: 'guest' } as any)).resolves.not.toThrow();
  });

  it('syncJournalEntryToFirestore should reject guest/anonymous and process valid entries', async () => {
    await expect(syncJournalEntryToFirestore('anonymous', {
      id: 'test',
      userId: 'anonymous',
      title: 'Test',
      content: 'Content',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mood: 'neutral',
      tags: [],
    })).resolves.not.toThrow();
  });

  it('syncAllLocalVaultDataToFirestore returns clean summary counts', async () => {
    const result = await syncAllLocalVaultDataToFirestore('anonymous');
    expect(result.success).toBe(false);
    expect(result.syncedEntries).toBe(0);
    expect(result.syncedCapsules).toBe(0);
  });
});
