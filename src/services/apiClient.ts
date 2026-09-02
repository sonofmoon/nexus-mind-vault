import { auth } from './firebaseConfig';
import { getVaultSettings } from './vaultStorage';

/**
 * 🛡️ Authenticated API Client for Nexus Mind Vault
 * - Automatically injects Firebase Auth Bearer ID Token
 * - Enforces client-side Air-Gap Opt-Out (Item 4)
 * - Intercepts Rate-Limit (429) & Auth (401) responses
 */

export async function authenticatedFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid || 'anonymous';

  // 🔒 ITEM 4: Client-Side Air-Gap Check
  const settings = getVaultSettings(uid);
  if (settings.aiSynthesisEnabled === false && endpoint.includes('/api/functions/')) {
    throw new Error('AI Cognitive Synthesis is disabled in Vault Settings. Air-gapped mode active (0 bytes sent to server).');
  }

  // 🔒 ITEM 6: Attach Firebase ID Token
  let idToken = '';
  if (currentUser) {
    try {
      idToken = await currentUser.getIdToken(false);
    } catch (e) {
      console.warn('[ApiClient] Failed to acquire Firebase ID token:', e);
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  } else {
    headers['Authorization'] = 'Bearer demo_session_token';
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
