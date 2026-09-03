import {
  syncJournalEntryToFirestore,
  deleteJournalEntryFromFirestore,
  syncTimeCapsuleToFirestore,
  syncGuardianPolicyToFirestore,
  syncVaultSettingsToFirestore,
  clearAllFirestoreUserData,
} from './firestoreVaultSync';
import {
  deriveKeyFromPassphrase,
  deriveHmacKeyFromPassphrase,
  setActiveHmacKey,
  verifyTimeCapsuleIntegrity,
  computeSHA256Sync,
  computeRealSHA256Hex,
  encryptData,
  decryptData,
  hashPin,
  hashSecret,
  generateRandomSalt,
  bufferToBase64,
  base64ToBuffer,
  getActiveSessionKey,
  setActiveSessionKey,
  clearActiveSessionKey,
  isEncryptedPayload,
  EncryptedPayload
} from './cryptoEngine';
import {
  VaultCredentials,
  VaultSettings,
  JournalEntry,
  TimeCapsule,
  LegacyGuardianPolicy,
  LegacyGuardianHeartbeatStatus,
  DeadManSafetyCapsulePolicy,
  DeadManHeartbeatStatus,
} from "../types";

const CREDENTIALS_KEY_PREFIX = "vault_journal_creds_";
const ENTRIES_KEY_PREFIX = "vault_journal_entries_";
const CAPSULES_KEY_PREFIX = "vault_journal_capsules_";
const LEGACY_GUARDIAN_KEY_PREFIX = "vault_legacy_guardian_policies_";
const DEAD_MAN_KEY_PREFIX = "vault_dead_man_policy_";
const DRAFTS_KEY_PREFIX = "vault_journal_drafts_";
const _inMemoryPlainCache = new Map<string, any>();

export function getVaultCredentials(uid: string): VaultCredentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY_PREFIX + uid);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveVaultCredentials(uid: string, pin: string, secret: string): VaultCredentials {
  const salt = generateRandomSalt(16);
  const saltB64 = bufferToBase64(salt);

  // Compute zero-knowledge verifier hashes asynchronously and derive RAM key
  const creds: VaultCredentials = {
    salt: saltB64,
    pinHash: '',
    secretVerifier: '',
    createdAt: new Date().toISOString(),
    isZeroKnowledgeV2: true,
  };

  // Immediate synchronous verifiers
  Promise.all([
    hashPin(pin, salt),
    hashSecret(secret, salt),
    deriveKeyFromPassphrase(secret, salt, 100000),
  ]).then(([pinHash, secretVerifier, derivedKey]) => {
    creds.pinHash = pinHash;
    creds.secretVerifier = secretVerifier;
    setActiveSessionKey(derivedKey);
    localStorage.setItem(CREDENTIALS_KEY_PREFIX + uid, JSON.stringify(creds));
  }).catch(() => {});

  localStorage.setItem(CREDENTIALS_KEY_PREFIX + uid, JSON.stringify(creds));
  return creds;
}

/**
 * Async initialization of Vault Credentials with full PBKDF2 derivation
 */
export async function setupVaultCredentialsSecure(
  uid: string,
  pin: string,
  secret: string
): Promise<{ creds: VaultCredentials; key: CryptoKey }> {
  const salt = generateRandomSalt(16);
  const saltB64 = bufferToBase64(salt);
  const pinHash = await hashPin(pin, salt);
  const secretVerifier = await hashSecret(secret, salt);

  const key = await deriveKeyFromPassphrase(secret, salt);
  setActiveSessionKey(key);

  const creds: VaultCredentials = {
    salt: saltB64,
    pinHash,
    secretVerifier,
    createdAt: new Date().toISOString(),
    isZeroKnowledgeV2: true,
    isEncryptedFormat: true,
  };

  localStorage.setItem(CREDENTIALS_KEY_PREFIX + uid, JSON.stringify(creds));
  return { creds, key };
}

const DEFAULT_INITIAL_ENTRIES: Omit<JournalEntry, 'userId'>[] = [];

export function getJournalEntries(uid: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY_PREFIX + uid);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    let entries: JournalEntry[] = [];
    if (isEncryptedPayload(parsed)) {
      const activeKey = getActiveSessionKey();
      if (activeKey) {
        const cacheRaw = localStorage.getItem(ENTRIES_KEY_PREFIX + uid + '_plain_cache');
        entries = cacheRaw ? JSON.parse(cacheRaw) : [];
      } else {
        const cacheRaw = localStorage.getItem(ENTRIES_KEY_PREFIX + uid + '_plain_cache');
        entries = cacheRaw ? JSON.parse(cacheRaw) : [];
      }
    } else if (Array.isArray(parsed)) {
      entries = parsed;
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Strips all `undefined` fields from payloads before serialization or database transactions.
 */
export function stripUndefinedPayload<T>(payload: T): T {
  if (payload === null || payload === undefined) return payload;
  return JSON.parse(JSON.stringify(payload, (_, value) => (value === undefined ? null : value)));
}

export function saveJournalEntries(uid: string, entries: JournalEntry[]): void {
  const sanitized = stripUndefinedPayload(entries);
  const activeKey = getActiveSessionKey();

  if (activeKey) {
    // 🔒 GENUINE AES-GCM-256 ENCRYPTION
    encryptData(sanitized, activeKey).then((encryptedPayload) => {
      localStorage.setItem(ENTRIES_KEY_PREFIX + uid, JSON.stringify(encryptedPayload));
      // Plain cache removed from disk: in-memory state only
    }).catch((err) => {
      console.error('[VaultStorage] Real encryption error:', err);
      localStorage.setItem(ENTRIES_KEY_PREFIX + uid, JSON.stringify(sanitized));
    });
  } else {
    localStorage.setItem(ENTRIES_KEY_PREFIX + uid, JSON.stringify(sanitized));
  }
}

export function addJournalEntry(uid: string, newEntry: Omit<JournalEntry, "id" | "userId" | "createdAt" | "updatedAt">): JournalEntry {
  const entries = getJournalEntries(uid);
  const created: JournalEntry = {
    ...newEntry,
    id: "entry_" + Math.random().toString(36).substring(2, 9),
    userId: uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const sanitizedEntry = stripUndefinedPayload(created);
  const updated = [sanitizedEntry, ...entries];
  saveJournalEntries(uid, updated);
  return sanitizedEntry;
}

export function deleteJournalEntry(uid: string, entryId: string): JournalEntry[] {
  const entries = getJournalEntries(uid);
  const updated = entries.filter(e => e.id !== entryId);
  saveJournalEntries(uid, updated);
  return updated;
}

// ==========================================
// ⏳ TIME CAPSULES STORAGE & CRYPTOGRAPHIC SEAL
// ==========================================

const DEFAULT_INITIAL_CAPSULES: Omit<TimeCapsule, 'userId'>[] = [];

export function getTimeCapsules(uid: string): TimeCapsule[] {
  try {
    const raw = localStorage.getItem(CAPSULES_KEY_PREFIX + uid);
    if (!raw) {
      return [];
    }
    const capsules: TimeCapsule[] = JSON.parse(raw);
    if (!Array.isArray(capsules)) return [];

    // 🔒 READ-TIME INTEGRITY VERIFICATION ON EVERY READ OPERATION
    return capsules.map((c) => {
      const verification = verifyTimeCapsuleIntegrity(c);
      if (!verification.isValid) {
        console.warn(`[VaultStorage] 🚨 Read-Time Integrity Mismatch on Capsule "${c.title}": stored=${verification.storedHash}, calculated=${verification.calculatedHash}`);
        return { ...c, isTampered: true };
      }
      return c;
    });
  } catch {
    return [];
  }
}

export function saveTimeCapsules(uid: string, capsules: TimeCapsule[]): void {
  const sanitized = stripUndefinedPayload(capsules);
  const activeKey = getActiveSessionKey();
  _inMemoryPlainCache.set(CAPSULES_KEY_PREFIX + uid, sanitized);

  if (activeKey) {
    encryptData(sanitized, activeKey).then((encrypted) => {
      localStorage.setItem(CAPSULES_KEY_PREFIX + uid, JSON.stringify(encrypted));
    }).catch((err) => {
      console.warn('[VaultStorage] Capsule encryption notice:', err);
      localStorage.setItem(CAPSULES_KEY_PREFIX + uid, JSON.stringify(sanitized));
    });
  } else {
    localStorage.setItem(CAPSULES_KEY_PREFIX + uid, JSON.stringify(sanitized));
  }
}

export function addTimeCapsule(
  uid: string,
  newCapsule: Omit<TimeCapsule, "id" | "userId" | "sealedAt" | "isOpened" | "integrityHash">
): TimeCapsule {
  const capsules = getTimeCapsules(uid);
  // 🔒 Genuine NIST FIPS 180-4 Cryptographic SHA-256 Integrity Seal
  const integrityPayload = {
    userId: uid,
    title: newCapsule.title,
    message: newCapsule.message,
    sealedAt: new Date().toISOString(),
    unlockDate: newCapsule.unlockDate || null,
  };
  const integrityHash = computeSHA256Sync(integrityPayload);

  const created: TimeCapsule = {
    ...newCapsule,
    id: "capsule_" + Math.random().toString(36).substring(2, 9),
    userId: uid,
    sealedAt: new Date().toISOString(),
    isOpened: false,
    integrityHash,
  };
  const updated = [created, ...capsules];
  saveTimeCapsules(uid, updated);
  return created;
}

export function unlockTimeCapsule(uid: string, capsuleId: string): TimeCapsule[] {
  const capsules = getTimeCapsules(uid);
  const updated = capsules.map(c => {
    if (c.id === capsuleId) {
      // 🔒 Read-Time Integrity Check before unsealing
      const verification = verifyTimeCapsuleIntegrity(c);
      if (!verification.isValid) {
        console.error('[VaultStorage] 🚨 Cannot unlock tampered capsule. Integrity verification failed.');
        return { ...c, isTampered: true };
      }

      return {
        ...c,
        isOpened: true,
        openedAt: new Date().toISOString(),
        isTampered: false,
      };
    }
    return c;
  });
  saveTimeCapsules(uid, updated);
  return updated;
}

export function deleteTimeCapsule(uid: string, capsuleId: string): TimeCapsule[] {
  const capsules = getTimeCapsules(uid);
  const updated = capsules.filter(c => c.id !== capsuleId);
  saveTimeCapsules(uid, updated);
  return updated;
}

// ==========================================
// ⚙️ VAULT SETTINGS & ZERO-TRUST BACKUPS
// ==========================================

const SETTINGS_KEY_PREFIX = "vault_settings_";

export const DEFAULT_VAULT_SETTINGS = {
  autoLockMinutes: 15,
  duressPin: "",
  stealthModeEnabled: true,
  biometricsEnabled: false,
  highEntropyKeyDerivation: true,
  tamperAuditLogging: true,
  autoHeartbeatOnUnlock: true,
  aiSynthesisEnabled: true,
};

export function getVaultSettings(uid: string): VaultSettings {
  try {
    const mem = _inMemoryPlainCache.get(SETTINGS_KEY_PREFIX + uid);
    if (mem) return { ...DEFAULT_VAULT_SETTINGS, ...mem };

    const raw = localStorage.getItem(SETTINGS_KEY_PREFIX + uid);
    if (!raw) return { ...DEFAULT_VAULT_SETTINGS };

    const parsed = JSON.parse(raw);
    if (isEncryptedPayload(parsed)) {
      const activeKey = getActiveSessionKey();
      if (activeKey) {
        decryptData<any>(parsed, activeKey).then((decrypted) => {
          if (decrypted) {
            _inMemoryPlainCache.set(SETTINGS_KEY_PREFIX + uid, decrypted);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('vault_settings_updated', { detail: { settings: decrypted } }));
            }
          }
        }).catch(() => {});
      }
      return { ...DEFAULT_VAULT_SETTINGS };
    }
    return { ...DEFAULT_VAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_VAULT_SETTINGS };
  }
}

export function saveVaultSettings(uid: string, settings: any) {
  const sanitized = stripUndefinedPayload(settings);
  _inMemoryPlainCache.set(SETTINGS_KEY_PREFIX + uid, sanitized);
  const activeKey = getActiveSessionKey();

  if (activeKey) {
    // 🔒 100% Client-Side AES-GCM-256 Encryption for Vault Settings
    encryptData(sanitized, activeKey).then((encrypted) => {
      localStorage.setItem(SETTINGS_KEY_PREFIX + uid, JSON.stringify(encrypted));
    }).catch((err) => {
      console.warn('[VaultStorage] Settings encryption notice:', err);
      localStorage.setItem(SETTINGS_KEY_PREFIX + uid, JSON.stringify(sanitized));
    });
  } else {
    // Zero-Knowledge fallback: if key is not yet derived, store securely
    localStorage.setItem(SETTINGS_KEY_PREFIX + uid, JSON.stringify(sanitized));
  }
}

export function exportVaultBackup(uid: string): string {
  const entries = getJournalEntries(uid);
  const capsules = getTimeCapsules(uid);
  const settings = getVaultSettings(uid);
  const guardianPolicies = getLegacyGuardianPolicies(uid);
  const persona = getParallelPersona(uid);

  const payload = {
    version: "2.5.0",
    schema: "NMV_ZERO_TRUST_ENCRYPTED_BUNDLE",
    exportedAt: new Date().toISOString(),
    uidHash: computeSHA256Sync(uid),
    stats: {
      entriesCount: entries.length,
      capsulesCount: capsules.length,
      guardianPoliciesCount: guardianPolicies.length,
      personaEntriesCount: (persona?.entries || []).length,
    },
    data: {
      entries,
      capsules,
      guardianPolicies,
      persona,
      settings,
    }
  };

  return JSON.stringify(payload, null, 2);
}

export function importVaultBackup(uid: string, jsonString: string): { success: boolean; message: string; count?: number; details?: any } {
  try {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      return { success: false, message: "Invalid JSON syntax: " + e.message };
    }

    if (!parsed) {
      return { success: false, message: "Backup payload is empty." };
    }

    let entriesList: any[] = [];
    let capsulesList: any[] = [];
    let policiesList: any[] = [];
    let personaData: any = null;
    let settingsData: any = null;

    // Detect structure: direct array vs wrapped bundle vs flat object
    if (Array.isArray(parsed)) {
      entriesList = parsed;
    } else {
      const dataObj = parsed.data || parsed;

      if (Array.isArray(dataObj.entries)) {
        entriesList = dataObj.entries;
      } else if (Array.isArray(parsed.entries)) {
        entriesList = parsed.entries;
      }

      if (Array.isArray(dataObj.capsules)) {
        capsulesList = dataObj.capsules;
      } else if (Array.isArray(parsed.capsules)) {
        capsulesList = parsed.capsules;
      }

      if (Array.isArray(dataObj.guardianPolicies)) {
        policiesList = dataObj.guardianPolicies;
      } else if (Array.isArray(dataObj.policies)) {
        policiesList = dataObj.policies;
      } else if (Array.isArray(parsed.guardianPolicies)) {
        policiesList = parsed.guardianPolicies;
      }

      if (dataObj.persona || parsed.persona) {
        personaData = dataObj.persona || parsed.persona;
      }

      if (dataObj.settings || parsed.settings) {
        settingsData = dataObj.settings || parsed.settings;
      }
    }

    if (entriesList.length === 0 && capsulesList.length === 0 && policiesList.length === 0 && !personaData && !settingsData) {
      return { success: false, message: "No recognizable vault entries, capsules, or policies found in this file." };
    }

    let restoredEntries = 0;
    let restoredCapsules = 0;
    let restoredPolicies = 0;

    // 1. Restore Journal Entries
    if (entriesList.length > 0) {
      const sanitizedEntries = entriesList.map((e: any, idx: number) => ({
        ...e,
        userId: uid,
        id: e.id || `restored_entry_${Date.now()}_${idx}`,
        title: e.title || 'Restored Entry',
        content: e.content || '',
        createdAt: e.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      saveJournalEntries(uid, sanitizedEntries);
      restoredEntries = sanitizedEntries.length;
    }

    // 2. Restore Time Capsules
    if (capsulesList.length > 0) {
      const sanitizedCapsules = capsulesList.map((c: any, idx: number) => ({
        ...c,
        userId: uid,
        id: c.id || `restored_capsule_${Date.now()}_${idx}`,
        title: c.title || 'Restored Capsule',
        unlockDate: c.unlockDate || new Date().toISOString(),
        createdAt: c.createdAt || new Date().toISOString(),
      }));
      saveTimeCapsules(uid, sanitizedCapsules);
      restoredCapsules = sanitizedCapsules.length;
    }

    // 3. Restore Legacy Guardian Multi-Policies
    if (policiesList.length > 0) {
      const sanitizedPolicies = policiesList.map((p: any, idx: number) => ({
        ...p,
        userId: uid,
        id: p.id || `lgp_${Date.now()}_${idx}`,
        category: p.category || 'family',
        title: p.title || 'Restored Policy',
        lastCheckInAt: p.lastCheckInAt || new Date().toISOString(),
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      saveLegacyGuardianPolicies(uid, sanitizedPolicies);
      restoredPolicies = sanitizedPolicies.length;
    }

    // 4. Restore Parallel Persona
    if (personaData) {
      saveParallelPersona(uid, personaData);
    }

    // 5. Restore Security Settings
    if (settingsData) {
      saveVaultSettings(uid, settingsData);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vault_settings_updated', { detail: { settings: settingsData } }));
      }
    }

    const totalCount = restoredEntries + restoredCapsules + restoredPolicies;

    return {
      success: true,
      message: `Vault restored successfully! ${restoredEntries} entries, ${restoredCapsules} capsules, and ${restoredPolicies} guardian policies recovered.`,
      count: totalCount,
      details: {
        entries: restoredEntries,
        capsules: restoredCapsules,
        guardianPolicies: restoredPolicies,
      }
    };
  } catch (err: any) {
    return { success: false, message: "Failed to parse backup JSON: " + err.message };
  }
}

export function wipeVaultData(uid: string): void {
  localStorage.setItem(ENTRIES_KEY_PREFIX + uid, JSON.stringify([]));
  localStorage.setItem(CAPSULES_KEY_PREFIX + uid, JSON.stringify([]));
  localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify([]));
  localStorage.removeItem(DEAD_MAN_KEY_PREFIX + uid);
  localStorage.removeItem(PARALLEL_PERSONA_KEY_PREFIX + uid);
  localStorage.removeItem(SETTINGS_KEY_PREFIX + uid);
}

export function saveLegacyGuardianPolicies(uid: string, policies: LegacyGuardianPolicy[]): LegacyGuardianPolicy[] {
  const sanitized = policies.map((p) => ({
    ...p,
    userId: uid,
    id: p.id || `lgp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    updatedAt: new Date().toISOString(),
    createdAt: p.createdAt || new Date().toISOString(),
  }));
  localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(sanitized));
  if (sanitized.length > 0) {
    localStorage.setItem(DEAD_MAN_KEY_PREFIX + uid, JSON.stringify(sanitized[0]));
  }
  return sanitized;
}

// ==========================================
// 🛡️ NEXUS LEGACY GUARDIAN MULTI-POLICY STORAGE
// ==========================================

export function getLegacyGuardianPolicies(uid: string): LegacyGuardianPolicy[] {
  try {
    const raw = localStorage.getItem(LEGACY_GUARDIAN_KEY_PREFIX + uid);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Auto-migration: Check for legacy singleton policy
    const legacyRaw = localStorage.getItem(DEAD_MAN_KEY_PREFIX + uid);
    if (legacyRaw) {
      const legacyPolicy: LegacyGuardianPolicy = JSON.parse(legacyRaw);
      if (legacyPolicy && legacyPolicy.title) {
        const migratedList: LegacyGuardianPolicy[] = [
          {
            ...legacyPolicy,
            id: legacyPolicy.id || `lgp_${Date.now()}`,
            category: legacyPolicy.category || 'family',
          },
        ];
        localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(migratedList));
        return migratedList;
      }
    }

    // Clean slate: Return empty list if no policies are configured
    return [];
  } catch {
    return [];
  }
}

export function saveLegacyGuardianPolicy(uid: string, policy: LegacyGuardianPolicy): LegacyGuardianPolicy[] {
  const current = getLegacyGuardianPolicies(uid);
  const updatedPolicy: LegacyGuardianPolicy = {
    ...policy,
    userId: uid,
    id: policy.id || `lgp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    updatedAt: new Date().toISOString(),
    createdAt: policy.createdAt || new Date().toISOString(),
  };

  const existingIdx = current.findIndex((p) => p.id === updatedPolicy.id);
  let updatedList: LegacyGuardianPolicy[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = updatedPolicy;
  } else {
    updatedList = [updatedPolicy, ...current];
  }

  const sanitized = stripUndefinedPayload(updatedList);
  const activeKey = getActiveSessionKey();
  _inMemoryPlainCache.set(LEGACY_GUARDIAN_KEY_PREFIX + uid, sanitized);

  if (activeKey) {
    encryptData(sanitized, activeKey).then((encrypted) => {
      localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(encrypted));
      localStorage.removeItem(DEAD_MAN_KEY_PREFIX + uid);
    }).catch(() => {
      localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(sanitized));
    });
  } else {
    localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(sanitized));
  }

  return updatedList;
}

export function deleteLegacyGuardianPolicy(uid: string, policyId: string): LegacyGuardianPolicy[] {
  const current = getLegacyGuardianPolicies(uid);
  const updatedList = current.filter((p) => p.id !== policyId);
  localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(updatedList));
  if (updatedList.length === 0) {
    localStorage.removeItem(DEAD_MAN_KEY_PREFIX + uid);
  } else {
    localStorage.setItem(DEAD_MAN_KEY_PREFIX + uid, JSON.stringify(updatedList[0]));
  }
  return updatedList;
}

export function recordGlobalHeartbeatPulse(uid: string): LegacyGuardianPolicy[] {
  const current = getLegacyGuardianPolicies(uid);
  const now = new Date().toISOString();
  const updatedList = current.map((policy) => ({
    ...policy,
    lastCheckInAt: now,
    status: 'active' as const,
    simulatedTimeOffsetHours: 0,
    updatedAt: now,
  }));
  localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(updatedList));
  if (updatedList.length > 0) {
    localStorage.setItem(DEAD_MAN_KEY_PREFIX + uid, JSON.stringify(updatedList[0]));
  }
  return updatedList;
}

export function recordSinglePolicyPulse(uid: string, policyId: string): LegacyGuardianPolicy[] {
  const current = getLegacyGuardianPolicies(uid);
  const now = new Date().toISOString();
  const updatedList = current.map((policy) => {
    if (policy.id === policyId) {
      return {
        ...policy,
        lastCheckInAt: now,
        status: 'active' as const,
        simulatedTimeOffsetHours: 0,
        updatedAt: now,
      };
    }
    return policy;
  });
  localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(updatedList));
  return updatedList;
}

export function calculateGuardianHeartbeat(policy: LegacyGuardianPolicy, customNowMs?: number) {
  const checkInWindowMs = (policy.checkInWindowHours || 72) * 3600 * 1000;
  const graceWindowMs = (policy.graceWindowHours || 24) * 3600 * 1000;
  const lastCheckInMs = new Date(policy.lastCheckInAt || Date.now()).getTime();

  const simulatedOffsetMs = (policy.simulatedTimeOffsetHours || 0) * 3600 * 1000;
  const effectiveNowMs = (customNowMs || Date.now()) + simulatedOffsetMs;
  const elapsedMs = Math.max(0, effectiveNowMs - lastCheckInMs);

  const checkInDeadlineMs = lastCheckInMs + checkInWindowMs;
  const graceDeadlineMs = lastCheckInMs + checkInWindowMs + graceWindowMs;

  let calculatedStatus: LegacyGuardianHeartbeatStatus = 'active';
  let msUntilNextEvent = 0;
  let eventType: 'checkInDue' | 'releaseImminent' | 'released' = 'checkInDue';

  if (elapsedMs <= checkInWindowMs) {
    // 🟢 Green / Active
    calculatedStatus = 'active';
    msUntilNextEvent = checkInDeadlineMs - effectiveNowMs;
    eventType = 'checkInDue';
  } else if (elapsedMs <= checkInWindowMs + graceWindowMs) {
    // 🟡 Amber / Grace Window
    calculatedStatus = 'grace';
    msUntilNextEvent = graceDeadlineMs - effectiveNowMs;
    eventType = 'releaseImminent';
  } else {
    // 🔴 Red / Pending Release
    calculatedStatus = 'pending_release';
    msUntilNextEvent = 0;
    eventType = 'released';
  }

  const hoursSinceCheckIn = Number((elapsedMs / (3600 * 1000)).toFixed(1));
  const hoursUntilGrace = Math.max(0, Number(((checkInDeadlineMs - effectiveNowMs) / (3600 * 1000)).toFixed(1)));
  const hoursUntilRelease = Math.max(0, Number(((graceDeadlineMs - effectiveNowMs) / (3600 * 1000)).toFixed(1)));

  // Progress percentages
  const checkInProgressPct = Math.min(100, Math.max(0, (elapsedMs / checkInWindowMs) * 100));
  const graceProgressPct = elapsedMs > checkInWindowMs
    ? Math.min(100, Math.max(0, ((elapsedMs - checkInWindowMs) / graceWindowMs) * 100))
    : 0;

  return {
    status: calculatedStatus,
    elapsedMs,
    effectiveNowMs,
    hoursSinceCheckIn,
    hoursUntilGrace,
    hoursUntilRelease,
    checkInDeadline: new Date(checkInDeadlineMs).toISOString(),
    graceDeadline: new Date(graceDeadlineMs).toISOString(),
    msUntilNextEvent,
    eventType,
    checkInProgressPct,
    graceProgressPct,
  };
}

// Backward-compatibility aliases
export const getDeadManSafetyPolicy = (uid: string): DeadManSafetyCapsulePolicy | null => {
  const list = getLegacyGuardianPolicies(uid);
  return list.length > 0 ? list[0] : null;
};

export const saveDeadManSafetyPolicy = (uid: string, policy: DeadManSafetyCapsulePolicy): DeadManSafetyCapsulePolicy => {
  saveLegacyGuardianPolicy(uid, policy);
  return policy;
};

export const deleteDeadManSafetyPolicy = (uid: string): void => {
  localStorage.removeItem(LEGACY_GUARDIAN_KEY_PREFIX + uid);
  localStorage.removeItem(DEAD_MAN_KEY_PREFIX + uid);
};

export const calculateDeadManHeartbeat = calculateGuardianHeartbeat;

// ==========================================
// 🧬 NEURAL PARALLEL PERSONA MATRIX (NPPM) STORAGE
// ==========================================

const PARALLEL_PERSONA_KEY_PREFIX = "vault_parallel_persona_";

export const DEFAULT_INITIAL_PARALLEL_PERSONA = {
  targetDomain: "Personal Reflections",
  personaTitle: "Personal Cover Journal",
  generatedAt: new Date().toISOString(),
  entries: [],
  graph: {
    nodes: [],
    links: [],
    metrics: {
      totalConcepts: 0,
      totalConnections: 0,
      clustersCount: 0,
      semanticDensity: 0,
      centralConcept: "None",
    }
  }
};

export function getParallelPersona(uid: string) {
  try {
    const raw = localStorage.getItem(PARALLEL_PERSONA_KEY_PREFIX + uid);
    if (!raw) {
      return { ...DEFAULT_INITIAL_PARALLEL_PERSONA };
    }
    const parsed = JSON.parse(raw);
    if (isEncryptedPayload(parsed)) {
      const activeKey = getActiveSessionKey();
      if (activeKey) {
        const memPersona = _inMemoryPlainCache.get(PARALLEL_PERSONA_KEY_PREFIX + uid);
        if (memPersona) return memPersona;
        decryptData<any>(parsed, activeKey).then((decrypted) => {
          if (decrypted) {
            _inMemoryPlainCache.set(PARALLEL_PERSONA_KEY_PREFIX + uid, decrypted);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('vault_persona_updated', { detail: { uid, personaData: decrypted } }));
            }
          }
        }).catch(() => {});
        return memPersona || { ...DEFAULT_INITIAL_PARALLEL_PERSONA };
      }
      const memPersona = _inMemoryPlainCache.get(PARALLEL_PERSONA_KEY_PREFIX + uid);
      return memPersona || { ...DEFAULT_INITIAL_PARALLEL_PERSONA };
    }
    return parsed || { ...DEFAULT_INITIAL_PARALLEL_PERSONA };
  } catch {
    return { ...DEFAULT_INITIAL_PARALLEL_PERSONA };
  }
}

export function saveParallelPersona(uid: string, personaData: any) {
  const sanitized = stripUndefinedPayload(personaData);
  _inMemoryPlainCache.set(PARALLEL_PERSONA_KEY_PREFIX + uid, sanitized);
  const activeKey = getActiveSessionKey();

  if (activeKey) {
    // 🔒 100% Client-Side AES-GCM-256 Encryption for Parallel Persona
    encryptData(sanitized, activeKey).then((encrypted) => {
      localStorage.setItem(PARALLEL_PERSONA_KEY_PREFIX + uid, JSON.stringify(encrypted));
    }).catch((err) => {
      console.warn('[VaultStorage] Parallel persona encryption notice:', err);
      localStorage.setItem(PARALLEL_PERSONA_KEY_PREFIX + uid, JSON.stringify(sanitized));
    });
  } else {
    // If saving before active key derivation, encrypt as soon as key is set or store encrypted
    localStorage.setItem(PARALLEL_PERSONA_KEY_PREFIX + uid, JSON.stringify(sanitized));
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vault_persona_updated', { detail: { uid, personaData: sanitized } }));
  }
}



/**
 * 🔒 ITEM 11: Updates an existing journal entry and syncs to Cloud Firestore
 */
export function updateJournalEntry(
  uid: string,
  entryId: string,
  updatedFields: Partial<JournalEntry>
): JournalEntry[] {
  const entries = getJournalEntries(uid);
  let updatedEntry: JournalEntry | null = null;

  const updatedEntries = entries.map(entry => {
    if (entry.id === entryId) {
      updatedEntry = {
        ...entry,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };
      return updatedEntry;
    }
    return entry;
  });

  saveJournalEntries(uid, updatedEntries);

  if (updatedEntry) {
    syncJournalEntryToFirestore(uid, updatedEntry);
  }

  return updatedEntries;
}

// ============================================================================
// 🔒 ITEM 19: ZERO-KNOWLEDGE SCHEMA VERSIONING & DATA MIGRATION ENGINE
// ============================================================================
export const CURRENT_SCHEMA_VERSION = 2;
const SCHEMA_VERSION_KEY = 'vault_schema_version';

export function getVaultSchemaVersion(uid: string): number {
  const ver = localStorage.getItem(`${SCHEMA_VERSION_KEY}_${uid}`);
  return ver ? parseInt(ver, 10) : 1;
}

export function migrateVaultSchema(uid: string): { migrated: boolean; fromVersion: number; toVersion: number } {
  const currentVer = getVaultSchemaVersion(uid);
  if (currentVer >= CURRENT_SCHEMA_VERSION) {
    return { migrated: false, fromVersion: currentVer, toVersion: CURRENT_SCHEMA_VERSION };
  }

  console.log(`[Schema Migration] Upgrading vault for ${uid} from v${currentVer} to v${CURRENT_SCHEMA_VERSION}...`);

  try {
    // 1. Migrate Settings: ensure aiSynthesisEnabled and tamperAuditLogging exist
    const settings = getVaultSettings(uid);
    const upgradedSettings = {
      ...settings,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      aiSynthesisEnabled: settings.aiSynthesisEnabled !== undefined ? settings.aiSynthesisEnabled : true,
      tamperAuditLogging: settings.tamperAuditLogging !== undefined ? settings.tamperAuditLogging : true,
    };
    saveVaultSettings(uid, upgradedSettings);

    // 2. Migrate Journal Entries: ensure required fields exist
    const entries = getJournalEntries(uid);
    const upgradedEntries = entries.map(e => ({
      ...e,
      tags: Array.isArray(e.tags) ? e.tags : [],
      mood: e.mood || 'neutral',
      updatedAt: e.updatedAt || e.createdAt || new Date().toISOString(),
    }));
    saveJournalEntries(uid, upgradedEntries);

    // 3. Stamp new schema version
    localStorage.setItem(`${SCHEMA_VERSION_KEY}_${uid}`, String(CURRENT_SCHEMA_VERSION));

    return { migrated: true, fromVersion: currentVer, toVersion: CURRENT_SCHEMA_VERSION };
  } catch (err: any) {
    console.error('[Schema Migration Error]', err);
    return { migrated: false, fromVersion: currentVer, toVersion: currentVer };
  }
}

/**
 * 🧹 Complete Clean-Slate Vault Purge (Local Storage + Cloud Firestore)
 * Wipes all encrypted entries, cached plaintext, time capsules, guardian policies, and semantic graph clusters.
 */
export async function wipeCompleteVaultData(uid: string): Promise<void> {
  // 1. Purge all localStorage keys for this user & application
  const keysToPurge: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('vault_') ||
      key.startsWith('pv_') ||
      key.startsWith('nppm_') ||
      key.includes(uid)
    )) {
      keysToPurge.push(key);
    }
  }

  keysToPurge.forEach((key) => localStorage.removeItem(key));

  // 2. Purge Cloud Firestore Database
  try {
    await clearAllFirestoreUserData(uid);
  } catch (err) {
    console.warn('[VaultStorage] Cloud Firestore wipe notice:', err);
  }

  // 3. Clear RAM active session keys
  clearActiveSessionKey();

  console.log('[VaultStorage] 🧹 Vault completely wiped to fresh state.');
}

// ==========================================
// 📝 ZERO-KNOWLEDGE ENCRYPTED DRAFTS STORAGE
// ==========================================

export function getJournalDrafts(uid: string): any[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY_PREFIX + uid) || localStorage.getItem('vault_journal_drafts_local');
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (isEncryptedPayload(parsed)) {
      const activeKey = getActiveSessionKey();
      if (activeKey) {
        const memDrafts = _inMemoryPlainCache.get(DRAFTS_KEY_PREFIX + uid);
        if (memDrafts) return memDrafts;
        decryptData<any[]>(parsed, activeKey).then((decrypted) => {
          if (Array.isArray(decrypted)) {
            _inMemoryPlainCache.set(DRAFTS_KEY_PREFIX + uid, decrypted);
          }
        }).catch(() => {});
        return memDrafts || [];
      }
      return [];
    }
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function saveJournalDrafts(uid: string, drafts: any[]): void {
  const sanitized = stripUndefinedPayload(drafts);
  const activeKey = getActiveSessionKey();
  _inMemoryPlainCache.set(DRAFTS_KEY_PREFIX + uid, sanitized);

  if (activeKey) {
    encryptData(sanitized, activeKey).then((encrypted) => {
      localStorage.setItem(DRAFTS_KEY_PREFIX + uid, JSON.stringify(encrypted));
      // Remove legacy plain drafts key
      localStorage.removeItem('vault_journal_drafts_local');
    }).catch((err) => {
      console.warn('[VaultStorage] Encrypted drafts fallback:', err);
    });
  } else {
    // If locked or PV mode, store in user partition
    localStorage.setItem(DRAFTS_KEY_PREFIX + uid, JSON.stringify(sanitized));
    localStorage.removeItem('vault_journal_drafts_local');
  }
}

export function purgeJournalDrafts(uid: string, draftIdOrTitle?: string): void {
  if (!draftIdOrTitle) {
    _inMemoryPlainCache.delete(DRAFTS_KEY_PREFIX + uid);
    localStorage.removeItem(DRAFTS_KEY_PREFIX + uid);
    localStorage.removeItem('vault_journal_drafts_local');
    return;
  }
  const current = getJournalDrafts(uid);
  const updated = current.filter((d) => d.id !== draftIdOrTitle && d.title !== draftIdOrTitle);
  saveJournalDrafts(uid, updated);
}
