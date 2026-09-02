"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkLegacyGuardianHeartbeats = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
/**
 * 🛡️ Cloud Scheduler: checkLegacyGuardianHeartbeats
 * Runs every hour to check Proof-of-Life check-ins and evaluate emergency grace periods.
 */
exports.checkLegacyGuardianHeartbeats = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    region: 'us-central1',
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const nowMs = Date.now();
    console.log('[GuardianScheduler] Starting Proof-of-Life heartbeat evaluation run at', new Date().toISOString());
    try {
        const usersSnapshot = await db.collection('users').get();
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const guardiansSnapshot = await db.collection(`users/${userId}/guardians`).where('policyEnabled', '==', true).get();
            for (const guardianDoc of guardiansSnapshot.docs) {
                const policy = guardianDoc.data();
                if (policy.status === 'released')
                    continue;
                const lastCheckInMs = new Date(policy.lastCheckInAt || policy.createdAt).getTime();
                const windowMs = (policy.checkInWindowHours || 72) * 60 * 60 * 1000;
                const graceMs = (policy.graceWindowHours || 24) * 60 * 60 * 1000;
                const elapsedMs = nowMs - lastCheckInMs;
                if (elapsedMs > (windowMs + graceMs)) {
                    console.warn(`[GuardianScheduler] 🚨 Policy "${policy.title}" for user ${userId} ELAPSED. Setting status to pending_release!`);
                    await guardianDoc.ref.update({
                        status: 'pending_release',
                        lastEvaluatedAt: firestore_1.FieldValue.serverTimestamp(),
                    });
                }
                else if (elapsedMs > windowMs) {
                    if (policy.status !== 'grace') {
                        console.log(`[GuardianScheduler] ⚠️ Policy "${policy.title}" entering GRACE period.`);
                        await guardianDoc.ref.update({
                            status: 'grace',
                            lastEvaluatedAt: firestore_1.FieldValue.serverTimestamp(),
                        });
                    }
                }
            }
        }
        console.log('[GuardianScheduler] Proof-of-Life evaluation completed successfully.');
    }
    catch (err) {
        console.error('[GuardianScheduler] Error executing guardian heartbeat check:', err);
    }
});
//# sourceMappingURL=guardianScheduler.js.map