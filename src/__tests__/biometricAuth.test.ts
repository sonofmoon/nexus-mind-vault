import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  safeBase64ToUint8Array,
  isBiometricAvailable,
  hasLocalBiometricCredential,
  registerBiometric,
  authenticateBiometric,
} from '../services/biometricAuth';

// In-memory mock for localStorage in Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const mockStorage = new MockLocalStorage();

// Mock Firebase Firestore doc/setDoc/getDoc
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, ...pathSegments) => ({ path: pathSegments.join('/') })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => true,
    data: () => ({ credentialId: 'mock-bio-credential-id-123' }),
  }),
}));

vi.mock('../services/firebaseConfig', () => ({
  db: {},
  auth: { currentUser: { uid: 'test_user_456' } },
}));

describe('🛡️ W3C Web Authentication API (WebAuthn) Biometric Service', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
      PublicKeyCredential: {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn().mockResolvedValue(true),
      },
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('safeBase64ToUint8Array', () => {
    it('should decode standard Base64 strings accurately', () => {
      const original = 'Hello World';
      const b64 = Buffer.from(original).toString('base64');
      const decodedBytes = safeBase64ToUint8Array(b64);
      const reconstructed = new TextDecoder().decode(decodedBytes);
      expect(reconstructed).toBe(original);
    });

    it('should safely decode Base64URL strings containing "-" and "_" without padding', () => {
      const testBytes = new Uint8Array([251, 239, 255]);
      let b64 = Buffer.from(testBytes).toString('base64');
      let b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      const decodedBytes = safeBase64ToUint8Array(b64url);
      expect(Array.from(decodedBytes)).toEqual(Array.from(testBytes));
    });
  });

  describe('isBiometricAvailable', () => {
    it('should return false when PublicKeyCredential is not defined', async () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
        PublicKeyCredential: undefined,
      });
      const available = await isBiometricAvailable();
      expect(available).toBe(false);
    });

    it('should return true when PublicKeyCredential platform authenticator is available', async () => {
      const available = await isBiometricAvailable();
      expect(available).toBe(true);
    });
  });

  describe('hasLocalBiometricCredential', () => {
    it('should return true only when local cache contains credential for the user', () => {
      expect(hasLocalBiometricCredential('user_alpha')).toBe(false);
      mockStorage.setItem('vault_biometric_cred_user_alpha', 'cred_id_abc');
      expect(hasLocalBiometricCredential('user_alpha')).toBe(true);
    });
  });

  describe('registerBiometric', () => {
    it('should create WebAuthn platform credential and cache to LocalStorage and Firestore', async () => {
      const mockCred = {
        id: 'mock_registered_credential_id',
        rawId: new Uint8Array([1, 2, 3, 4]).buffer,
        type: 'public-key',
      };

      const mockCreate = vi.fn().mockResolvedValue(mockCred);
      vi.stubGlobal('navigator', {
        credentials: {
          create: mockCreate,
        },
      });

      const result = await registerBiometric('user_test_99');

      expect(result).toBeDefined();
      expect(result.id).toBe('mock_registered_credential_id');
      expect(mockCreate).toHaveBeenCalled();

      // Verify cached to localStorage
      expect(mockStorage.getItem('vault_biometric_cred_user_test_99')).toBe('mock_registered_credential_id');
    });
  });

  describe('authenticateBiometric', () => {
    it('should successfully authenticate via navigator.credentials.get()', async () => {
      const mockAssertion = {
        id: 'mock-bio-credential-id-123',
        type: 'public-key',
      };

      const mockGet = vi.fn().mockResolvedValue(mockAssertion);
      vi.stubGlobal('navigator', {
        credentials: {
          get: mockGet,
        },
      });

      const verified = await authenticateBiometric('test_user_456');
      expect(verified).toBe(true);
      expect(mockGet).toHaveBeenCalled();
    });

    it('should return false if biometric prompt is cancelled by user', async () => {
      vi.stubGlobal('navigator', {
        credentials: {
          get: vi.fn().mockRejectedValue(new Error('User verification cancelled')),
        },
      });

      const verified = await authenticateBiometric('test_user_456');
      expect(verified).toBe(false);
    });
  });
});
