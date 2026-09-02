import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 🛡️ Cloud Scheduler: checkLegacyGuardianHeartbeats
 * Runs every hour to check Proof-of-Life check-ins and evaluate emergency grace periods.
 */
export const checkLegacyGuardianHeartbeats = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    region: 'us-central1',
  },
  async () => {
    const db = getFirestore();
    const nowMs = Date.now();
    console.log('[GuardianScheduler] Starting Proof-of-Life heartbeat evaluation run at', new Date().toISOString());

    try {
      const usersSnapshot = await db.collection('users').get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const guardiansSnapshot = await db.collection(`users/${userId}/guardians`).where('policyEnabled', '==', true).get();

        for (const guardianDoc of guardiansSnapshot.docs) {
          const policy = guardianDoc.data();
          if (policy.status === 'released') continue;

          const lastCheckInMs = new Date(policy.lastCheckInAt || policy.createdAt).getTime();
          const windowMs = (policy.checkInWindowHours || 72) * 60 * 60 * 1000;
          const graceMs = (policy.graceWindowHours || 24) * 60 * 60 * 1000;

          const elapsedMs = nowMs - lastCheckInMs;

          if (elapsedMs > (windowMs + graceMs)) {
            console.warn(`[GuardianScheduler] 🚨 Policy "${policy.title}" for user ${userId} ELAPSED. Setting status to pending_release!`);
            await guardianDoc.ref.update({
              status: 'pending_release',
              lastEvaluatedAt: FieldValue.serverTimestamp(),
            });
          } else if (elapsedMs > windowMs) {
            if (policy.status !== 'grace') {
              console.log(`[GuardianScheduler] ⚠️ Policy "${policy.title}" entering GRACE period.`);
              await guardianDoc.ref.update({
                status: 'grace',
                lastEvaluatedAt: FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }
      console.log('[GuardianScheduler] Proof-of-Life evaluation completed successfully.');
    } catch (err) {
      console.error('[GuardianScheduler] Error executing guardian heartbeat check:', err);
    }
  }
);
