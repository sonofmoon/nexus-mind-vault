import { getApps, initializeApp } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';
import { generateWithFallback } from './geminiEngine';
import { onJournalEntryWritten } from './triggers/journalTriggers';
import { checkLegacyGuardianHeartbeats } from './schedulers/guardianScheduler';
import { checkTimeCapsuleUnlocks } from './schedulers/capsuleScheduler';

if (!getApps().length) {
  initializeApp();
}

function getSystemInstruction(mode: string): string {
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
export const chatWithGemini = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY'],
  },
  async (req, res) => {
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
        ...userContext.map((c: string) => ({ role: 'user', parts: [{ text: c }] })),
        { role: 'user', parts: [{ text: prompt }] },
      ];

      const result = await generateWithFallback({
        contents,
        systemInstruction,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI inference failure' });
    }
  }
);

export const generateTrends = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { entries = [] } = req.body;
      const prompt = `Analyze the emotional, psychological, and productivity trends across these journal entries: ${JSON.stringify(entries)}`;

      const result = await generateWithFallback({
        contents: prompt,
        systemInstruction: "You are an analytical cognitive intelligence engine. Extract key breakthroughs, cognitive velocity, and mood trajectories.",
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Trend generation failure' });
    }
  }
);

export const extractSemanticGraph = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { text } = req.body;
      const prompt = `Extract concepts, people, topics, and sentiment links as JSON graph nodes/edges from: ${text}`;

      const result = await generateWithFallback({
        contents: prompt,
        systemInstruction: "Return pure JSON containing nodes and links for a D3 force-directed semantic mind graph.",
        responseMimeType: "application/json",
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Graph extraction failure' });
    }
  }
);

export const translateParallelPersona = onRequest(
  {
    cors: true,
    region: 'us-central1',
    maxInstances: 10,
    secrets: ['GEMINI_API_KEY'],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const { text, persona = 'stoic' } = req.body;
      const prompt = `Reframe this reflection from the perspective of a ${persona} philosopher:

${text}`;

      const result = await generateWithFallback({
        contents: prompt,
        systemInstruction: "You are a master cognitive reframer. Offer constructive philosophical perspectives.",
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Persona translation failure' });
    }
  }
);

// 🔒 ITEM 2: Firestore Triggers
export { onJournalEntryWritten };

// 🔒 ITEM 3 & 4: Cloud Schedulers
export { checkLegacyGuardianHeartbeats };
export { checkTimeCapsuleUnlocks };
