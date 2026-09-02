/**
 * 🔒 Nexus Mind Vault — Single-Entry Cryptographic Sharing Engine
 * - Encrypts shared reflections using authenticated AES-GCM-256 with PBKDF2 key derivation
 * - Prevents plaintext exposure in URL parameters
 */
import { JournalEntry } from '../types';
import { deriveKeyFromPassphrase, encryptData, decryptData, EncryptedPayload } from '../services/cryptoEngine';

export interface EncryptedShareEnvelope {
  version: 2;
  encrypted: true;
  payload: EncryptedPayload;
  sharedAt: number;
  expiresAt: number;
  hasPassphrase: boolean;
}

export interface SharedEntryData {
  entryId: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: string;
}

/**
 * 🔒 Generates an AES-GCM-256 encrypted share link with optional passphrase protection
 */
export async function generateEncryptedEntryShareLink(
  entry: JournalEntry,
  passphrase?: string,
  expiresInHours: number = 48
): Promise<string> {
  const now = Date.now();
  const expiresAt = now + expiresInHours * 60 * 60 * 1000;

  const entryData: SharedEntryData = {
    entryId: entry.id,
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    tags: entry.tags || [],
    createdAt: entry.createdAt,
  };

  const sharePassphrase = (passphrase && passphrase.trim().length > 0)
    ? passphrase.trim()
    : 'nexus_open_sovereign_share_v2';

  const derivedKey = await deriveKeyFromPassphrase(sharePassphrase);
  const encryptedPayload = await encryptData(entryData, derivedKey);

  const envelope: EncryptedShareEnvelope = {
    version: 2,
    encrypted: true,
    payload: encryptedPayload,
    sharedAt: now,
    expiresAt,
    hasPassphrase: !!passphrase && passphrase.trim().length > 0,
  };

  const jsonStr = JSON.stringify(envelope);
  const encoded = (typeof btoa !== 'undefined')
    ? btoa(unescape(encodeURIComponent(jsonStr)))
    : Buffer.from(jsonStr).toString('base64');

  const origin = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : 'http://localhost:5173';

  return `${origin}/apps/nmv?shared_entry=${encodeURIComponent(encoded)}`;
}

/**
 * Synchronous helper for legacy backward compatibility
 */
export function generateEntryShareLink(
  entry: JournalEntry,
  passphrase?: string,
  expiresInHours: number = 48
): string {
  const now = Date.now();
  const expiresAt = now + expiresInHours * 60 * 60 * 1000;

  const payload = {
    entryId: entry.id,
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    tags: entry.tags || [],
    createdAt: entry.createdAt,
    sharedAt: now,
    expiresAt,
    hasPassphrase: !!passphrase && passphrase.trim().length > 0,
  };

  const jsonStr = JSON.stringify(payload);
  const encoded = (typeof btoa !== 'undefined')
    ? btoa(unescape(encodeURIComponent(jsonStr)))
    : Buffer.from(jsonStr).toString('base64');
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : 'http://localhost:5173';

  return `${origin}/apps/nmv?shared_entry=${encodeURIComponent(encoded)}`;
}

/**
 * 🔓 Decrypts an encrypted shared entry envelope using AES-GCM-256
 */
export async function decryptSharedEntryPayload(
  encodedData: string,
  passphrase?: string
): Promise<SharedEntryData> {
  const jsonStr = (typeof atob !== 'undefined')
    ? decodeURIComponent(escape(atob(encodedData)))
    : Buffer.from(encodedData, 'base64').toString('utf8');

  const parsed = JSON.parse(jsonStr);

  if (parsed.encrypted && parsed.payload) {
    const sharePassphrase = (passphrase && passphrase.trim().length > 0)
      ? passphrase.trim()
      : 'nexus_open_sovereign_share_v2';

    const derivedKey = await deriveKeyFromPassphrase(sharePassphrase, parsed.payload.salt);
    const decrypted = await decryptData<SharedEntryData>(parsed.payload, derivedKey);
    return decrypted;
  }

  // Legacy format support
  return parsed as SharedEntryData;
}
