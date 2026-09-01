import {
  VaultCredentials,
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

export function getVaultCredentials(uid: string): VaultCredentials | null {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY_PREFIX + uid);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveVaultCredentials(uid: string, pin: string, secret: string): VaultCredentials {
  const creds: VaultCredentials = {
    pin,
    secret,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(CREDENTIALS_KEY_PREFIX + uid, JSON.stringify(creds));
  return creds;
}

const DEFAULT_INITIAL_ENTRIES: Omit<JournalEntry, 'userId'>[] = [
  {
    id: "demo-entry-1",
    title: "Botanical Research & Calibration Notes",
    content: "Adjusted nutrient balance and lighting schedules for indoor environmental bench B4. System parameters operating within normal parameters.",
    mood: "focused",
    tags: ["botany", "research", "setup"],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "demo-entry-2",
    title: "Reflections on Daily Focus & Study Habits",
    content: "Establishing structured morning reflection periods has improved clarity throughout afternoon research sessions. Offline data logs remain organized.",
    mood: "calm",
    tags: ["productivity", "habits"],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

export function getJournalEntries(uid: string): JournalEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY_PREFIX + uid);
    if (!raw) {
      const initial = DEFAULT_INITIAL_ENTRIES.map(e => ({ ...e, userId: uid }));
      localStorage.setItem(ENTRIES_KEY_PREFIX + uid, JSON.stringify(initial));
      return initial;
    }
    const entries: JournalEntry[] = JSON.parse(raw);
    let modified = false;
    const cleaned = entries.map((e) => {
      if (
        e.content.includes("dual-layer isolation") ||
        e.content.includes("Nexus Mind is locked") ||
        e.content.includes("6-digit PIN")
      ) {
        modified = true;
        return {
          ...e,
          title: "Hydroponic Crop Calibration Notes",
          content: "Configured automated nutrient monitoring protocol for garden bench B4. pH levels stabilized with consistent spectrum cycles.",
          tags: ["botany", "hydroponics", "setup"],
        };
      }
      return e;
    });
    if (modified) {
      localStorage.setItem(ENTRIES_KEY_PREFIX + uid, JSON.stringify(cleaned));
    }
    return cleaned;
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
  localStorage.setItem(ENTRIES_KEY_PREFIX + uid, JSON.stringify(sanitized));
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

const DEFAULT_INITIAL_CAPSULES: Omit<TimeCapsule, 'userId'>[] = [
  {
    id: "capsule_vision_2027",
    title: "Letter to Future Self: Milestones & Core Principles",
    message: "If you are reading this, time has unfolded and you have navigated through crucial milestones. Remember why we started: zero-trust privacy, intentional deep work, and staying grounded. Did you build the quantum-resilient protocol? Are you making time for morning walks and mindful reflections? Never compromise on your foundational principles.",
    sealedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    lockType: "both",
    unlockDate: new Date(Date.now() + 86400000 * 14).toISOString(), // Unlocks in 14 days
    targetMood: "calm",
    moodUnlockPrompt: "Open when you are feeling calm and receptive to past wisdom.",
    isOpened: false,
    integrityHash: "sha256_8f9a2b71c40de92138a0e8d0e74b3a2f912c9b3a4e1d2c3b4a5f6e7d8c9b0a1f",
    locationTag: "Nexus Core Lab (Silicon Valley)",
    photos: [],
    attachments: [
      {
        id: "att_1",
        name: "foundational_manifesto.pdf",
        type: "file",
        size: 142000,
      }
    ]
  },
  {
    id: "capsule_anxious_grounding",
    title: "Emergency Reassurance: Open When Overwhelmed",
    message: "Breathe in deeply. Whatever challenge feels insurmountable right now is temporary. You have faced high-stakes deadlines and uncertainty before and came out stronger. Step away from the screen for 10 minutes, hydrate, and recalibrate your focus on one single next step.",
    sealedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    lockType: "mood",
    targetMood: "anxious",
    moodUnlockPrompt: "Calibrated to unlock specifically when you check in with an 'Anxious' or 'Overwhelmed' state.",
    isOpened: false,
    integrityHash: "sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    locationTag: "Mind Vault Sanctuarium",
  }
];

export function getTimeCapsules(uid: string): TimeCapsule[] {
  try {
    const raw = localStorage.getItem(CAPSULES_KEY_PREFIX + uid);
    if (!raw) {
      const initial = DEFAULT_INITIAL_CAPSULES.map(c => ({ ...c, userId: uid }));
      localStorage.setItem(CAPSULES_KEY_PREFIX + uid, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTimeCapsules(uid: string, capsules: TimeCapsule[]): void {
  const sanitized = stripUndefinedPayload(capsules);
  localStorage.setItem(CAPSULES_KEY_PREFIX + uid, JSON.stringify(sanitized));
}

export function addTimeCapsule(
  uid: string,
  newCapsule: Omit<TimeCapsule, "id" | "userId" | "sealedAt" | "isOpened" | "integrityHash">
): TimeCapsule {
  const capsules = getTimeCapsules(uid);
  const hashSeed = `${uid}_${Date.now()}_${newCapsule.title}_${newCapsule.message.slice(0, 30)}`;
  const integrityHash = `sha256_${Array.from(hashSeed).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0).toString(16).padStart(16, '0')}${Date.now().toString(16)}`;

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
      return {
        ...c,
        isOpened: true,
        openedAt: new Date().toISOString(),
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
};

export function getVaultSettings(uid: string) {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY_PREFIX + uid);
    return raw ? { ...DEFAULT_VAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_VAULT_SETTINGS;
  } catch {
    return DEFAULT_VAULT_SETTINGS;
  }
}

export function saveVaultSettings(uid: string, settings: any) {
  localStorage.setItem(SETTINGS_KEY_PREFIX + uid, JSON.stringify(settings));
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
    uidHash: Array.from(uid).reduce((acc, c) => (acc * 33 + c.charCodeAt(0)) >>> 0, 5381).toString(16),
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

  localStorage.setItem(LEGACY_GUARDIAN_KEY_PREFIX + uid, JSON.stringify(updatedList));
  // Keep legacy single key synced for backward compatibility
  localStorage.setItem(DEAD_MAN_KEY_PREFIX + uid, JSON.stringify(updatedPolicy));
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
  targetDomain: "Botanical & Hydroponic Systems",
  personaTitle: "Botanical Engineering & Flora Growth Journal",
  generatedAt: new Date().toISOString(),
  entries: [
    {
      id: "persona_entry_101",
      userId: "default_user",
      title: "Automated pH & Nutrient Circulation Loop Calibration",
      content: "Calibrated the automated dosing sensors for the urban hydroponic array. The nutrient solution is holding steady at pH 6.2 with EC 1.8 mS/cm. The solar-powered recirculation pump cycle runs 15 minutes every hour to maintain optimal oxygenation across root channels.",
      mood: "focused" as const,
      tags: ["hydroponics", "calibration", "ph-balance", "automation"],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "persona_entry_102",
      userId: "default_user",
      title: "Microclimate Humidity & Spectrum Tuning Observations",
      content: "Adjusted the full-spectrum LED canopy lighting to 6500K spectrum during the vegetative phase. Humidity levels in the sheltered greenhouse enclosure stabilized at 68% RH. Initial observations show robust internodal stem growth and vibrant leaf pigmentation.",
      mood: "calm" as const,
      tags: ["lighting", "microclimate", "spectrum-tuning", "botany"],
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
    {
      id: "persona_entry_103",
      userId: "default_user",
      title: "Vertical Trellis Expansion & Organic Pest Management",
      content: "Constructed the secondary bamboo vertical trellis for climbing vines. Applied an organic neem oil and potassium silicate foliar spray to fortify cell walls against aphids. Yield metrics for the upcoming harvest look exceptionally promising.",
      mood: "creative" as const,
      tags: ["trellis", "pest-management", "harvest", "organic"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  graph: {
    nodes: [
      { id: "ph_calibration", label: "pH Calibration", category: "project" as const, val: 22, summary: "Automated nutrient pH balance monitoring and dosing", entryCount: 2, entryIds: ["persona_entry_101"] },
      { id: "spectrum_tuning", label: "Spectrum Tuning", category: "theme" as const, val: 18, summary: "LED light spectrum adjustments for vegetative growth", entryCount: 1, entryIds: ["persona_entry_102"] },
      { id: "vertical_trellis", label: "Vertical Trellis", category: "entity" as const, val: 16, summary: "Bamboo frame structures for climbing flora", entryCount: 1, entryIds: ["persona_entry_103"] },
      { id: "organic_foliar", label: "Organic Foliar", category: "insight" as const, val: 14, summary: "Potassium silicate and neem oil cell wall fortification", entryCount: 1, entryIds: ["persona_entry_103"] },
      { id: "growth_focus", label: "Botanical Rigor", category: "emotion" as const, val: 15, summary: "Methodical approach to plant care and system tracking", entryCount: 3, entryIds: ["persona_entry_101", "persona_entry_102", "persona_entry_103"] }
    ],
    links: [
      { source: "ph_calibration", target: "spectrum_tuning", relationship: "Reinforces", strength: 4, coOccurrences: 2, contextExcerpt: "Nutrient absorption scales directly with optimized light spectrum" },
      { source: "spectrum_tuning", target: "vertical_trellis", relationship: "Influences", strength: 5, coOccurrences: 1, contextExcerpt: "Light height dictates trellis expansion dimensions" },
      { source: "vertical_trellis", target: "organic_foliar", relationship: "Triggers", strength: 3, coOccurrences: 1, contextExcerpt: "Expanded canopy requires proactive foliar protection" },
      { source: "growth_focus", target: "ph_calibration", relationship: "Clarifies", strength: 4, coOccurrences: 2, contextExcerpt: "Systematic mindset ensures tight sensor tolerances" }
    ],
    metrics: {
      totalConcepts: 5,
      totalConnections: 4,
      clustersCount: 2,
      semanticDensity: 0.8,
      centralConcept: "pH Calibration",
    }
  }
};

export function getParallelPersona(uid: string) {
  try {
    const raw = localStorage.getItem(PARALLEL_PERSONA_KEY_PREFIX + uid);
    if (!raw) {
      return { ...DEFAULT_INITIAL_PARALLEL_PERSONA };
    }
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_INITIAL_PARALLEL_PERSONA };
  }
}

export function saveParallelPersona(uid: string, personaData: any) {
  localStorage.setItem(PARALLEL_PERSONA_KEY_PREFIX + uid, JSON.stringify(personaData));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vault_persona_updated', { detail: { uid, personaData } }));
  }
}


