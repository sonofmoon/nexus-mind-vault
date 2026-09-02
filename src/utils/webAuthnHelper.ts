/**
 * 🛡️ Nexus Mind Vault — W3C WebAuthn Hardware Biometrics Engine
 * Supports Touch ID, Face ID, Windows Hello, and FIDO2 Platform Authenticators.
 */

export async function isWebAuthnSupported(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometricCredential(userId: string, email: string): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported on this browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdBytes = new TextEncoder().encode(userId);

  const creationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Nexus Mind Vault',
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    },
    user: {
      id: userIdBytes,
      name: email || 'vault_user',
      displayName: email ? email.split('@')[0] : 'Vault Sovereign',
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },   // ES256 (NIST P-256)
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      requireResidentKey: false,
    },
    timeout: 60000,
    attestation: 'none',
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: creationOptions,
    }) as PublicKeyCredential;

    if (credential) {
      const credIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(`vault_biometric_cred_${userId}`, credIdBase64);
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('[WebAuthn] Registration error:', err);
    throw new Error(err.message || 'Biometric enrollment was cancelled or failed.');
  }
}

export async function verifyBiometricCredential(userId: string): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;

  const storedCredId = localStorage.getItem(`vault_biometric_cred_${userId}`);
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const requestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    timeout: 60000,
    rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    userVerification: 'required',
  };

  if (storedCredId) {
    try {
      const rawId = Uint8Array.from(atob(storedCredId), c => c.charCodeAt(0));
      requestOptions.allowCredentials = [{
        id: rawId,
        type: 'public-key',
        transports: ['internal'],
      }];
    } catch {}
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: requestOptions,
    });
    return !!assertion;
  } catch (err) {
    console.warn('[WebAuthn] Verification cancelled or failed:', err);
    return false;
  }
}
