/**
 * 🛡️ Nexus Mind Vault — W3C WebAuthn Hardware Biometrics Engine
 * Supports Touch ID, Face ID, Windows Hello, and FIDO2 Platform Authenticators.
 * Wraps and re-exports core functionality from src/services/biometricAuth.ts
 */

import {
  isBiometricAvailable,
  registerBiometric,
  authenticateBiometric,
  hasLocalBiometricCredential,
} from '../services/biometricAuth';

export {
  isBiometricAvailable,
  registerBiometric,
  authenticateBiometric,
  hasLocalBiometricCredential,
};

export async function isWebAuthnSupported(): Promise<boolean> {
  return await isBiometricAvailable();
}

export async function registerBiometricCredential(userId: string, _email?: string): Promise<boolean> {
  try {
    const cred = await registerBiometric(userId);
    return !!cred;
  } catch (err: any) {
    console.warn('[WebAuthn] Registration error:', err);
    throw new Error(err.message || 'Biometric enrollment was cancelled or failed.');
  }
}

export async function verifyBiometricCredential(userId: string): Promise<boolean> {
  return await authenticateBiometric(userId);
}
