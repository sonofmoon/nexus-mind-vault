/**
 * 🔒 Nexus Mind Vault — Single-Entry Cryptographic Sharing Engine
 */
import { JournalEntry } from '../types';

export interface SharedEntryPayload {
  entryId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: string;
  sharedAt: number;
  expiresAt: number;
  hasPassphrase: boolean;
  passphraseHash?: string;
}

export function generateEntryShareLink(
  entry: JournalEntry,
  passphrase?: string,
  expiresInHours: number = 48
): string {
  const now = Date.now();
  const expiresAt = now + expiresInHours * 60 * 60 * 1000;

  const payload: SharedEntryPayload = {
    entryId: entry.id,
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    tags: entry.tags || [],
    createdAt: entry.createdAt,
    sharedAt: now,
    expiresAt,
    hasPassphrase: !!passphrase && passphrase.trim().length > 0,
    passphraseHash: passphrase ? btoa(passphrase.trim()) : undefined,
  };

  const jsonStr = JSON.stringify(payload);
  const encoded = btoa(unescape(encodeURIComponent(jsonStr)));
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:5173';

  return `${origin}/apps/nmv?shared_entry=${encodeURIComponent(encoded)}`;
}
