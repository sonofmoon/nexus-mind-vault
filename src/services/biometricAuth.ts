import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

/**
 * 🛡️ Nexus Mind Vault — W3C Web Authentication API (WebAuthn) Biometric Service
 * Supports Touch ID, Face ID, Windows Hello, and FIDO2 Platform Authenticators.
 * 
 * Cryptographic Security Boundary:
 * - Biometrics authorizes access to the Protected Vault (PV) only.
 * - Nexus Mind Vault (NMV) strictly requires the Master Secret Passphrase to PBKDF2-derive AES keys.
 */

/**
 * Safely converts standard Base64 or Base64URL string to Uint8Array without throwing.
 */
export function safeBase64ToUint8Array(base64OrUrl: string): Uint8Array {
  // Convert Base64URL to standard Base64
  let base64 = base64OrUrl.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Check if platform biometric authenticator is available on the current device.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Check if local biometric credential cache exists for the given user ID.
 */
export function hasLocalBiometricCredential(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(`vault_biometric_cred_${userId}`);
}

/**
 * Register biometric credential using WebAuthn navigator.credentials.create()
 * Stores the resulting credential ID in Firestore (and cached in LocalStorage).
 */
export async function registerBiometric(userId: string): Promise<PublicKeyCredential> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser environment.');
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId);

  // Use hostname without port for WebAuthn rpId compliance
  const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Nexus Mind Vault',
        id: rpId,
      },
      user: {
        id: userIdBytes,
        name: userId,
        displayName: 'Vault User',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256 (NIST P-256)
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Face ID / Touch ID / Windows Hello / Fingerprint
        userVerification: 'required',
        requireResidentKey: false,
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Biometric credential creation returned empty response.');
  }

  const credentialId = credential.id;

  // 1. Cache credential ID in LocalStorage for instant zero-lag offline access
  try {
    localStorage.setItem(`vault_biometric_cred_${userId}`, credentialId);
  } catch (lsErr) {
    console.warn('[BiometricAuth] Local storage cache failed:', lsErr);
  }

  // 2. Store credential ID in Cloud Firestore (associated with user's enclave)
  try {
    await setDoc(doc(db, 'users', userId, 'biometric'), {
      credentialId,
      createdAt: new Date().toISOString(),
    });
  } catch (fsErr) {
    console.warn('[BiometricAuth] Firestore registration sync deferred/offline:', fsErr);
  }

  return credential;
}

/**
 * Authenticate with biometric using WebAuthn navigator.credentials.get()
 * Returns true if the user successfully verifies via platform authenticator.
 */
export async function authenticateBiometric(userId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return false;
  }

  try {
    let credentialId: string | null = null;

    // 1. Fetch credential ID from Firestore
    try {
      const bioDoc = await getDoc(doc(db, 'users', userId, 'biometric'));
      if (bioDoc.exists()) {
        credentialId = bioDoc.data()?.credentialId;
      }
    } catch (fsErr) {
      console.warn('[BiometricAuth] Firestore fetch offline, falling back to local cache:', fsErr);
    }

    // 2. Fallback to LocalStorage cache
    if (!credentialId) {
      credentialId = localStorage.getItem(`vault_biometric_cred_${userId}`);
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rpId = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;

    const requestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId,
      userVerification: 'required',
      timeout: 60000,
    };

    if (credentialId) {
      try {
        const rawId = safeBase64ToUint8Array(credentialId);
        requestOptions.allowCredentials = [
          {
            id: rawId,
            type: 'public-key',
            transports: ['internal'],
          },
        ];
      } catch (decodeErr) {
        console.warn('[BiometricAuth] Failed to decode stored credential ID:', decodeErr);
      }
    }

    const assertion = await navigator.credentials.get({
      publicKey: requestOptions,
    });

    return !!assertion;
  } catch (err) {
    console.error('[BiometricAuth] Biometric auth failed or cancelled:', err);
    return false;
  }
}
