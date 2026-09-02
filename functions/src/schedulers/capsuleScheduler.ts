import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * 🔒 Cloud Scheduler: checkTimeCapsuleUnlocks
 * Runs every hour to check Time Capsules eligible for unlocking.
 */
export const checkTimeCapsuleUnlocks = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    region: 'us-central1',
  },
  async () => {
    const db = getFirestore();
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
              unlockEligibleAt: FieldValue.serverTimestamp(),
            });
          }
        }
      }
      console.log('[CapsuleScheduler] Time Capsule evaluation completed successfully.');
    } catch (err) {
      console.error('[CapsuleScheduler] Error during capsule schedule scan:', err);
    }
  }
);
