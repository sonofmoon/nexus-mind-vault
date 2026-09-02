"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTimeCapsuleUnlocks = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
/**
 * 🔒 Cloud Scheduler: checkTimeCapsuleUnlocks
 * Runs every hour to check Time Capsules eligible for unlocking.
 */
exports.checkTimeCapsuleUnlocks = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    region: 'us-central1',
}, async () => {
    const db = (0, firestore_1.getFirestore)();
    const now = new Date();
    console.log('[CapsuleScheduler] Starting Time Capsule unlock schedule evaluation at', now.toISOString());
    try {
        const usersSnapshot = await db.collection('users').get();
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const capsulesSnapshot = await db.collection(`users/${userId}/timeCapsules`)
                .where('isOpened', '==', false)
                .where('lockType', 'in', ['time', 'both'])
                .get();
            for (const capsuleDoc of capsulesSnapshot.docs) {
                const capsule = capsuleDoc.data();
                if (capsule.unlockDate && new Date(capsule.unlockDate) <= now) {
                    console.log(`[CapsuleScheduler] 🔓 Time Capsule "${capsule.title}" reached unlock timestamp for user ${userId}!`);
                    await capsuleDoc.ref.update({
                        canBeUnlocked: true,
                        unlockEligibleAt: firestore_1.FieldValue.serverTimestamp(),
                    });
                }
            }
        }
        console.log('[CapsuleScheduler] Time Capsule evaluation completed successfully.');
    }
    catch (err) {
        console.error('[CapsuleScheduler] Error during capsule schedule scan:', err);
    }
});
//# sourceMappingURL=capsuleScheduler.js.map