"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTimeCapsuleUnlocks = exports.checkLegacyGuardianHeartbeats = exports.onJournalEntryWritten = exports.translateParallelPersona = exports.extractSemanticGraph = exports.generateTrends = exports.chatWithGemini = void 0;
const app_1 = require("firebase-admin/app");
const https_1 = require("firebase-functions/v2/https");
const geminiEngine_1 = require("./geminiEngine");
const journalTriggers_1 = require("./triggers/journalTriggers");
Object.defineProperty(exports, "onJournalEntryWritten", { enumerable: true, get: function () { return journalTriggers_1.onJournalEntryWritten; } });
const guardianScheduler_1 = require("./schedulers/guardianScheduler");
Object.defineProperty(exports, "checkLegacyGuardianHeartbeats", { enumerable: true, get: function () { return guardianScheduler_1.checkLegacyGuardianHeartbeats; } });
const capsuleScheduler_1 = require("./schedulers/capsuleScheduler");
Object.defineProperty(exports, "checkTimeCapsuleUnlocks", { enumerable: true, get: function () { return capsuleScheduler_1.checkTimeCapsuleUnlocks; } });
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
function getSystemInstruction(mode) {
    switch (mode) {
        case 'summarize':
            return "You are an executive journaling cognitive assistant for the Nexus Mind Vault. Summarize the user's entries into clear, structured, actionable bullet points, key breakthroughs, and emotional themes.";
        case 'brainstorm':
            return "You are an exploratory thought-partner for the Nexus Mind Vault. Help the user brainstorm creative angles, solutions, and philosophical perspectives.";
        case 'insights':
        case 'reflect':
        default:
            return "You are the Nexus Mind Cognitive Partner — an advanced personal AI reflection mirror. Provide insightful, empathetic, Socratic, and deeply relevant answers.";
    }
}
// 🔒 ITEM 1: AI Cognitive Microservices
exports.chatWithGemini = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY'],
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { prompt, mode = 'reflect', userContext = [] } = req.body;
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        const systemInstruction = getSystemInstruction(mode);
        const contents = [
            ...userContext.map((c) => ({ role: 'user', parts: [{ text: c }] })),
            { role: 'user', parts: [{ text: prompt }] },
        ];
        const result = await (0, geminiEngine_1.generateWithFallback)({
            contents,
            systemInstruction,
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'AI inference failure' });
    }
});
exports.generateTrends = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY'],
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { entries = [] } = req.body;
        const prompt = `Analyze the emotional, psychological, and productivity trends across these journal entries: ${JSON.stringify(entries)}`;
        const result = await (0, geminiEngine_1.generateWithFallback)({
            contents: prompt,
            systemInstruction: "You are an analytical cognitive intelligence engine. Extract key breakthroughs, cognitive velocity, and mood trajectories.",
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Trend generation failure' });
    }
});
exports.extractSemanticGraph = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY'],
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { text } = req.body;
        const prompt = `Extract concepts, people, topics, and sentiment links as JSON graph nodes/edges from: ${text}`;
        const result = await (0, geminiEngine_1.generateWithFallback)({
            contents: prompt,
            systemInstruction: "Return pure JSON containing nodes and links for a D3 force-directed semantic mind graph.",
            responseMimeType: "application/json",
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Graph extraction failure' });
    }
});
exports.translateParallelPersona = (0, https_1.onRequest)({
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY'],
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { text, persona = 'stoic' } = req.body;
        const prompt = `Reframe this reflection from the perspective of a ${persona} philosopher:

${text}`;
        const result = await (0, geminiEngine_1.generateWithFallback)({
            contents: prompt,
            systemInstruction: "You are a master cognitive reframer. Offer constructive philosophical perspectives.",
        });
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Persona translation failure' });
    }
});
//# sourceMappingURL=index.js.map