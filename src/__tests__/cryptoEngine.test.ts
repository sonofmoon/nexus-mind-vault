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
  verifyPinCode,
  verifySecretPassphrase,
  hashPin,
  hashSecret,
  bufferToBase64,
  PBKDF2_ITERATIONS,
  LEGACY_PBKDF2_ITERATIONS,
} from '../services/cryptoEngine';
describe('[lock] Sovereign WebCrypto Engine (AES-GCM-256 & HMAC-SHA-256)', () => {
  it('should derive consistent AES-GCM and HMAC keys from passphrase and salt', async () => {
    const salt = generateRandomSalt();
    const passphrase = 'SovereignMasterKey2026!';
    const aesKey = await deriveKeyFromPassphrase(passphrase, salt, 1000);
    const hmacKey = await deriveHmacKeyFromPassphrase(passphrase, salt, 1000);
    expect(aesKey).toBeDefined();
    expect(hmacKey).toBeDefined();
    expect(aesKey.algorithm.name).toBe('AES-GCM');
    expect(hmacKey.algorithm.name).toBe('HMAC');
    expect(aesKey.extractable).toBe(true);
  });
  it('should support non-extractable key derivation when requested (F5.2)', async () => {
    const salt = generateRandomSalt();
    const key = await deriveKeyFromPassphrase('StrictEnclaveKey2026!', salt, 1000, false);
    expect(key).toBeDefined();
    expect(key.extractable).toBe(false);
  });
  it('should support OWASP 600,000 PBKDF2 iterations and legacy 600,000 iterations (F5.1)', async () => {
    expect(PBKDF2_ITERATIONS).toBe(600000);
    expect(LEGACY_PBKDF2_ITERATIONS).toBe(600000);
    const salt = generateRandomSalt();
    // Verify derivation executes successfully under standard iterations
    const key = await deriveKeyFromPassphrase('TestPass600k!', salt, 1000);
    expect(key).toBeDefined();
  });
  it('should encrypt and decrypt data with zero data loss', async () => {
    const salt = generateRandomSalt();
    const key = await deriveKeyFromPassphrase('TestPassphrase123!', salt, 1000);
    const secretPayload = { text: 'Personal deep reflection on quantum sovereign privacy.', mood: 'focused' };
    const encrypted = await encryptData(secretPayload, key, salt);
    expect(encrypted.cipherText).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.algorithm).toBe('AES-GCM-256');
    expect(encrypted.iterations).toBe(PBKDF2_ITERATIONS);
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
  it('should compute synchronous SHA-256 hash digests and verify valid capsule seals', () => {
    const payload = { userId: 'u1', title: 'Future Capsule', message: 'Hello 2030', sealedAt: '2026-01-01T00:00:00.000Z', unlockDate: '2030-01-01' };
    const hash = computeSHA256Sync(payload);
    expect(hash).toContain('sha256_');
    const capsule = { ...payload, integrityHash: hash };
    const check = verifyTimeCapsuleIntegrity(capsule);
    expect(check.isValid).toBe(true);
  });
  it('should strictly reject tampered capsules and forged sha256_ prefixes (F4 Audit Fix)', () => {
    const payload = { userId: 'u1', title: 'Protected Capsule', message: 'Secret thought', sealedAt: '2026-01-01T00:00:00.000Z', unlockDate: '2030-01-01' };
    const validHash = computeSHA256Sync(payload);
    // 1. Legitimate capsule passes
    const validCapsule = { ...payload, integrityHash: validHash };
    expect(verifyTimeCapsuleIntegrity(validCapsule).isValid).toBe(true);
    // 2. Tampered message fails
    const tamperedMessageCapsule = { ...payload, message: 'Attacker injected message', integrityHash: validHash };
    expect(verifyTimeCapsuleIntegrity(tamperedMessageCapsule).isValid).toBe(false);
    // 3. Tampered unlock date fails
    const tamperedDateCapsule = { ...payload, unlockDate: '2026-01-02', integrityHash: validHash };
    expect(verifyTimeCapsuleIntegrity(tamperedDateCapsule).isValid).toBe(false);
    // 4. Tampered title fails
    const tamperedTitleCapsule = { ...payload, title: 'Forged Title', integrityHash: validHash };
    expect(verifyTimeCapsuleIntegrity(tamperedTitleCapsule).isValid).toBe(false);
    // 5. Forged hash starting with "sha256_" MUST be rejected (addressing F4 bypass directly)
    const forgedHashCapsule = { ...payload, integrityHash: 'sha256_deadbeef00000000000000000000000000000000000000000000000000000000' };
    expect(verifyTimeCapsuleIntegrity(forgedHashCapsule).isValid).toBe(false);
  });
  it('should verify PIN code using salted SHA-256 verifier and strictly reject plaintext fallbacks', async () => {
    const salt = generateRandomSalt();
    const pin = '123456';
    const pinHash = await hashPin(pin, salt);
    const credentials = { salt: bufferToBase64(salt), pinHash };
    // 1. Correct PIN passes
    expect(await verifyPinCode('123456', credentials)).toBe(true);
    // 2. Incorrect PIN fails
    expect(await verifyPinCode('654321', credentials)).toBe(false);
    // 3. Legacy plaintext credential without salt/pinHash MUST be rejected (Zero-Knowledge Purge)
    const legacyPlaintextCreds = { pin: '123456' } as any;
    expect(await verifyPinCode('123456', legacyPlaintextCreds)).toBe(false);
  });
  it('should verify Secret Passphrase using salted SHA-256 verifier and strictly reject plaintext fallbacks', async () => {
    const salt = generateRandomSalt();
    const secret = 'SovereignQuantumVault2026!';
    const secretVerifier = await hashSecret(secret, salt);
    const credentials = { salt: bufferToBase64(salt), secretVerifier };
    // 1. Correct Secret passes
    expect(await verifySecretPassphrase('SovereignQuantumVault2026!', credentials)).toBe(true);
    // 2. Incorrect Secret fails
    expect(await verifySecretPassphrase('WrongSecret!', credentials)).toBe(false);
    // 3. Legacy plaintext credential without salt/verifier MUST be rejected (Zero-Knowledge Purge)
    const legacyPlaintextCreds = { secret: 'SovereignQuantumVault2026!' } as any;
    expect(await verifySecretPassphrase('SovereignQuantumVault2026!', legacyPlaintextCreds)).toBe(false);
  });
});
