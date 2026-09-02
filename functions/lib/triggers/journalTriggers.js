"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onJournalEntryWritten = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
/**
 * 🔒 Firestore Trigger: onJournalEntryWritten
 * Automatically updates user timeline metadata and semantic memory indices in background.
 */
exports.onJournalEntryWritten = (0, firestore_1.onDocumentWritten)({
    document: 'users/{userId}/entries/{entryId}',
    region: 'us-central1',
}, async (event) => {
    const { userId, entryId } = event.params;
    const db = (0, firestore_2.getFirestore)();
    // Check if document was deleted
    if (!event.data?.after.exists) {
        console.log(`[Trigger] Entry ${entryId} deleted for user ${userId}. Cleaning up search index...`);
        await db.doc(`users/${userId}/graphNodes/${entryId}`).delete().catch(() => { });
        return;
    }
    const data = event.data.after.data();
    console.log(`[Trigger] Entry ${entryId} written for user ${userId}. Updating user timeline stats...`);
    const userProfileRef = db.doc(`users/${userId}`);
    await userProfileRef.set({
        lastActiveAt: firestore_2.FieldValue.serverTimestamp(),
        lastEntryId: entryId,
        hasEncryptedRecords: data?.isEncrypted === true,
    }, { merge: true });
});
//# sourceMappingURL=journalTriggers.js.map