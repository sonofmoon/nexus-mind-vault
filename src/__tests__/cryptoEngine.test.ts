import { describe, it, expect } from 'vitest';
import {
  deriveKeyFromPassphrase,
  deriveHmacKeyFromPassphrase,
  encryptData,
  decryptData,
  generateHMAC,
  verifyHMAC,
  generateRandomSalt,
  computeSHA256Sync,
  verifyTimeCapsuleIntegrity,
} from '../services/cryptoEngine';

describe('🔒 Sovereign WebCrypto Engine (AES-GCM-256 & HMAC-SHA-256)', () => {
  it('should derive consistent AES-GCM and HMAC keys from passphrase and salt', async () => {
    const salt = generateRandomSalt();
    const passphrase = 'SovereignMasterKey2026!';
    const aesKey = await deriveKeyFromPassphrase(passphrase, salt, 1000);
    const hmacKey = await deriveHmacKeyFromPassphrase(passphrase, salt, 1000);

    expect(aesKey).toBeDefined();
    expect(hmacKey).toBeDefined();
    expect(aesKey.algorithm.name).toBe('AES-GCM');
    expect(hmacKey.algorithm.name).toBe('HMAC');
  });

  it('should encrypt and decrypt data with zero data loss', async () => {
    const salt = generateRandomSalt();
    const key = await deriveKeyFromPassphrase('TestPassphrase123!', salt, 1000);
    const secretPayload = { text: 'Personal deep reflection on quantum sovereign privacy.', mood: 'focused' };

    const encrypted = await encryptData(secretPayload, key, salt);
    expect(encrypted.cipherText).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.algorithm).toBe('AES-GCM-256');

    const decrypted = await decryptData<typeof secretPayload>(encrypted, key);
    expect(decrypted).toEqual(secretPayload);
  });

  it('should compute and verify tamper-proof HMAC signatures', async () => {
    const salt = generateRandomSalt();
    const hmacKey = await deriveHmacKeyFromPassphrase('IntegrityPass123!', salt, 1000);
    const payload = 'Entry_Payload_123456';

    const signature = await generateHMAC(payload, hmacKey);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');

    const isValid = await verifyHMAC(payload, signature, hmacKey);
    expect(isValid).toBe(true);

    const isTampered = await verifyHMAC(payload + '_TAMPERED', signature, hmacKey);
    expect(isTampered).toBe(false);
  });

  it('should compute synchronous SHA-256 hash digests and verify capsule seals', () => {
    const payload = { userId: 'u1', title: 'Future Capsule', message: 'Hello 2030', sealedAt: '2026-01-01', unlockDate: '2030-01-01' };
    const hash = computeSHA256Sync(payload);
    expect(hash).toContain('sha256_');

    const capsule = { ...payload, integrityHash: hash };
    const check = verifyTimeCapsuleIntegrity(capsule);
    expect(check.isValid).toBe(true);
  });
});
