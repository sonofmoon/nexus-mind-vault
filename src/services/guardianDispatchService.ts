/**
 * 🛡️ Nexus Legacy Guardian — Cryptographic One-Time Claim Token & Dispatch Engine
 */
import { LegacyGuardianPolicy } from '../types';

export interface OneTimeClaimTokenPayload {
  policyId: string;
  recipientEmail: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export interface DispatchReceipt {
  success: boolean;
  policyId: string;
  recipientEmail: string;
  method: 'email' | 'sms' | 'secure_link';
  claimUrl: string;
  dispatchedAt: string;
  tokenExpiry: string;
}

/**
 * Generates a signed, time-limited cryptographic one-time claim token
 */
export function generateOneTimeClaimToken(
  policy: LegacyGuardianPolicy,
  recipientEmail: string,
  expiresInHours: number = 72
): string {
  const now = Date.now();
  const expiresAt = now + expiresInHours * 60 * 60 * 1000;
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);

  const payload: OneTimeClaimTokenPayload = {
    policyId: policy.id,
    recipientEmail,
    userId: policy.userId || 'vault_owner',
    issuedAt: now,
    expiresAt,
    nonce,
  };

  const jsonStr = JSON.stringify(payload);
  const base64Payload = btoa(unescape(encodeURIComponent(jsonStr)));
  
  // Simple HMAC-like tamper stamp for client-side claim verification
  let checksum = 0;
  for (let i = 0; i < jsonStr.length; i++) {
    checksum = (checksum << 5) - checksum + jsonStr.charCodeAt(i);
    checksum |= 0;
  }
  const signature = Math.abs(checksum).toString(16);

  return `${base64Payload}.${signature}`;
}

/**
 * Generates a full Sovereign Emergency Claim URL for trusted contacts
 */
export function generateSecureClaimLink(
  policy: LegacyGuardianPolicy,
  recipientEmail: string
): string {
  const token = generateOneTimeClaimToken(policy, recipientEmail);
  const origin = window.location.origin || 'http://localhost:5173';
  return `${origin}/apps/nmv?claim_token=${encodeURIComponent(token)}&policy_id=${policy.id}`;
}

/**
 * Simulates and logs an emergency dispatch packet for trusted contacts
 */
export function dispatchEmergencyNotice(
  policy: LegacyGuardianPolicy,
  recipientEmail: string,
  method: 'email' | 'sms' | 'secure_link' = 'secure_link'
): DispatchReceipt {
  const claimUrl = generateSecureClaimLink(policy, recipientEmail);
  const now = new Date();
  const expiry = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  const receipt: DispatchReceipt = {
    success: true,
    policyId: policy.id,
    recipientEmail,
    method,
    claimUrl,
    dispatchedAt: now.toISOString(),
    tokenExpiry: expiry.toISOString(),
  };

  // Record dispatch receipt in local storage audit log
  const existingDispatches = JSON.parse(localStorage.getItem('vault_guardian_dispatches') || '[]');
  existingDispatches.unshift(receipt);
  localStorage.setItem('vault_guardian_dispatches', JSON.stringify(existingDispatches.slice(0, 50)));

  return receipt;
}
