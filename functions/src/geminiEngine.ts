import { GoogleGenAI } from '@google/genai';

const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',          // Primary
  'gemini-3.1-flash-lite',      // High-Availability Fallback
  'gemini-flash-latest',        // Dynamic Alias
  'gemini-3.7-flash',           // Deep Reasoning Fallback
];

let aiClient: GoogleGenAI | null = null;
export function getGenAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    aiClient = new GoogleGenAI({
      apiKey: apiKey || 'dummy-key-for-init',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-cloud-functions',
        },
      },
    });
  }
  return aiClient;
}

export async function generateWithFallback({
  contents,
  systemInstruction,
  responseMimeType,
}: {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'dummy-key-for-init') {
    throw new Error('GEMINI_API_KEY is not configured in Cloud Functions environment.');
  }

  const ai = getGenAIClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          ...(responseMimeType ? { responseMimeType } : {}),
        },
      });

      const responseText = response.text ? response.text.trim() : '';
      if (responseText) {
        return {
          text: responseText,
          modelUsed: model,
          usageMetadata: response.usageMetadata || null,
        };
      }
    } catch (err: any) {
      console.warn(`[Cloud Functions Gemini Fallback] Model ${model} failed (${err.message}). Cascading...`);
      lastError = err;
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed: ${lastError?.message || 'Unknown'}`);
}
