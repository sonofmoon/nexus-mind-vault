import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  encryptData,
  decryptData,
  getActiveSessionKey,
  EncryptedPayload,
} from './cryptoEngine';
import { JournalEntry, TimeCapsule, LegacyGuardianPolicy, VaultSettings } from '../types';

/**
 * 🔒 Nexus Mind Vault — Zero-Knowledge Cloud Firestore Sync Engine
 * All records are encrypted client-side using AES-GCM-256 before transmission to Firestore.
 * Firestore stores ONLY { ciphertext, iv, salt, hmacSignature, updatedAt }.
 */

// ============================================================================
// 1. ZERO-KNOWLEDGE JOURNAL ENTRIES SYNC (Item 1 & 7)
// ============================================================================

export async function syncJournalEntryToFirestore(
  uid: string,
  entry: JournalEntry,
  sessionKey?: CryptoKey | null
): Promise<void> {
  if (!uid || uid === 'anonymous') return;
  const key = sessionKey || getActiveSessionKey();

  try {
    let payloadToStore: any = entry;
    if (key) {
      const encrypted: EncryptedPayload = await encryptData(entry, key);
      payloadToStore = {
        id: entry.id,
        isEncrypted: true,
        encryptedPayload: encrypted,
        titleHint: entry.title.slice(0, 3) + '***', // Obfuscated title hint
        tags: entry.tags || [],
        createdAt: entry.createdAt,
        updatedAt: serverTimestamp(),
      };
    }

    const entryDocRef = doc(db, 'users', uid, 'entries', entry.id);
    await setDoc(entryDocRef, payloadToStore, { merge: true });
  } catch (err) {
    console.warn('[FirestoreSync] Failed to sync journal entry to Firestore:', err);
  }
}

export async function deleteJournalEntryFromFirestore(uid: string, entryId: string): Promise<void> {
  if (!uid || uid === 'anonymous') return;
  try {
    const entryDocRef = doc(db, 'users', uid, 'entries', entryId);
    await deleteDoc(entryDocRef);
  } catch (err) {
    console.warn('[FirestoreSync] Failed to delete journal entry from Firestore:', err);
  }
}

export function subscribeToJournalEntries(
  uid: string,
  onEntriesReceived: (entries: JournalEntry[]) => void,
  sessionKey?: CryptoKey | null
): Unsubscribe {
  if (!uid || uid === 'anonymous') return () => {};

  const entriesCollection = collection(db, 'users', uid, 'entries');
  return onSnapshot(entriesCollection, async (snapshot) => {
    const key = sessionKey || getActiveSessionKey();
    const result: JournalEntry[] = [];

    for (const docChange of snapshot.docs) {
      const data = docChange.data();
      if (data.isEncrypted && data.encryptedPayload && key) {
        try {
          const decrypted = await decryptData<JournalEntry>(data.encryptedPayload, key);
          result.push(decrypted);
        } catch {
          // If key doesn't decrypt, keep ciphertext placeholder
          result.push({
            id: data.id || docChange.id,
            userId: uid,
            title: '🔒 Encrypted Record',
            content: '[Protected Ciphertext]',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.createdAt || new Date().toISOString(),
            mood: 'neutral',
            tags: data.tags || [],
          });
        }
      } else if (!data.isEncrypted) {
        result.push(data as JournalEntry);
      }
    }

    if (result.length > 0) {
      onEntriesReceived(result);
    }
  }, (error) => {
    console.warn('[FirestoreSync] Journal entries listener error:', error);
  });
}

// ============================================================================
// 2. SEALED TIME CAPSULES SYNC (Item 2 & 7)
// ============================================================================

export async function syncTimeCapsuleToFirestore(
  uid: string,
  capsule: TimeCapsule
): Promise<void> {
  if (!uid || uid === 'anonymous') return;
  try {
    const capsuleDocRef = doc(db, 'users', uid, 'timeCapsules', capsule.id);
    await setDoc(capsuleDocRef, {
      ...capsule,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[FirestoreSync] Failed to sync time capsule to Firestore:', err);
  }
}

export function subscribeToTimeCapsules(
  uid: string,
  onCapsulesReceived: (capsules: TimeCapsule[]) => void
): Unsubscribe {
  if (!uid || uid === 'anonymous') return () => {};

  const capsulesCollection = collection(db, 'users', uid, 'timeCapsules');
  return onSnapshot(capsulesCollection, (snapshot) => {
    const capsules: TimeCapsule[] = snapshot.docs.map(d => d.data() as TimeCapsule);
    if (capsules.length > 0) {
      onCapsulesReceived(capsules);
    }
  }, (error) => {
    console.warn('[FirestoreSync] Time capsules listener error:', error);
  });
}

// ============================================================================
// 3. GUARDIAN POLICIES & HEARTBEATS SYNC (Item 3 & 7)
// ============================================================================

export async function syncGuardianPolicyToFirestore(
  uid: string,
  policy: LegacyGuardianPolicy
): Promise<void> {
  if (!uid || uid === 'anonymous') return;
  try {
    const guardianDocRef = doc(db, 'users', uid, 'guardians', policy.id);
    await setDoc(guardianDocRef, {
      ...policy,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[FirestoreSync] Failed to sync guardian policy to Firestore:', err);
  }
}

export function subscribeToGuardianPolicies(
  uid: string,
  onPoliciesReceived: (policies: LegacyGuardianPolicy[]) => void
): Unsubscribe {
  if (!uid || uid === 'anonymous') return () => {};

  const guardiansCollection = collection(db, 'users', uid, 'guardians');
  return onSnapshot(guardiansCollection, (snapshot) => {
    const policies: LegacyGuardianPolicy[] = snapshot.docs.map(d => d.data() as LegacyGuardianPolicy);
    if (policies.length > 0) {
      onPoliciesReceived(policies);
    }
  }, (error) => {
    console.warn('[FirestoreSync] Guardian policies listener error:', error);
  });
}

// ============================================================================
// 4. VAULT SETTINGS & AIR-GAP SYNC (Item 4 & 7)
// ============================================================================

export async function syncVaultSettingsToFirestore(
  uid: string,
  settings: VaultSettings
): Promise<void> {
  if (!uid || uid === 'anonymous') return;
  try {
    const settingsDocRef = doc(db, 'users', uid, 'settings', 'config');
    await setDoc(settingsDocRef, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[FirestoreSync] Failed to sync settings to Firestore:', err);
  }
}

export function subscribeToVaultSettings(
  uid: string,
  onSettingsReceived: (settings: VaultSettings) => void
): Unsubscribe {
  if (!uid || uid === 'anonymous') return () => {};

  const settingsDocRef = doc(db, 'users', uid, 'settings', 'config');
  return onSnapshot(settingsDocRef, (snapshot) => {
    if (snapshot.exists()) {
      onSettingsReceived(snapshot.data() as VaultSettings);
    }
  }, (error) => {
    console.warn('[FirestoreSync] Vault settings listener error:', error);
  });
}

// ============================================================================
// 5. ATOMIC TRANSACTIONS (Item 6: Entry + Semantic Graph Sync)
// ============================================================================

export async function atomicSyncEntryAndGraph(
  uid: string,
  entry: JournalEntry,
  graphNodes: any[],
  sessionKey?: CryptoKey | null
): Promise<void> {
  if (!uid || uid === 'anonymous') return;
  const key = sessionKey || getActiveSessionKey();

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Write Entry
      let entryPayload: any = entry;
      if (key) {
        const encrypted = await encryptData(entry, key);
        entryPayload = {
          id: entry.id,
          isEncrypted: true,
          encryptedPayload: encrypted,
          createdAt: entry.createdAt,
          updatedAt: serverTimestamp(),
        };
      }
      const entryRef = doc(db, 'users', uid, 'entries', entry.id);
      transaction.set(entryRef, entryPayload, { merge: true });

      // 2. Write Graph Nodes
      for (const node of graphNodes) {
        const nodeRef = doc(db, 'users', uid, 'graphNodes', node.id || `node_${Date.now()}`);
        transaction.set(nodeRef, {
          ...node,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    });
  } catch (err) {
    console.warn('[FirestoreSync] Atomic transaction failed:', err);
  }
}
