import { auth } from './firebaseConfig';
import { getVaultSettings } from './vaultStorage';

/**
 * 🛡️ Zero-Trust Authenticated API Client for Nexus Mind Vault
 * - Cryptographically retrieves & attaches active Firebase Auth RS256 Bearer ID Token
 * - Enforces client-side Air-Gap Opt-Out (Zero network egress when disabled)
 * - Intercepts Rate-Limit (429) & Auth (401) responses
 */

export async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid || 'anonymous';

  // 🔒 Client-Side Air-Gap Check: Zero bytes sent when AI features disabled
  const settings = getVaultSettings(uid);
  if (
    settings.aiSynthesisEnabled === false &&
    (endpoint.includes('/api/functions/') || endpoint.includes('/api/chat') || endpoint.includes('/api/trends'))
  ) {
    throw new Error('AI Cognitive Synthesis is disabled in Vault Settings. Air-gapped mode active (0 bytes sent to server).');
  }

  // 🔒 Cryptographic Token Acquisition
  let idToken = '';
  if (currentUser) {
    try {
      idToken = await currentUser.getIdToken(false);
    } catch (e) {
      console.error('[ApiClient] Failed to acquire Firebase ID token:', e);
      throw new Error('Session validation failed: Unable to refresh Firebase authentication token.');
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  } else {
    // Unauthenticated state: If user is not logged in, reject calls to protected API endpoints
    const isPublicEndpoint = endpoint.includes('/health') || endpoint.includes('/docs') || endpoint.includes('/openapi.json');
    if (!isPublicEndpoint) {
      throw new Error('Authentication required: Please sign in with your sovereign credentials to access cloud services.');
    }
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 429) {
    throw new Error('Rate limit exceeded: You have sent too many requests. Please wait a moment before trying again.');
  }

  if (response.status === 401) {
    throw new Error('Authentication required: Invalid or expired Firebase session token.');
  }

  return response;
}
