import { GoogleGenAI } from '@google/genai';

const MODEL_FALLBACK_LADDER = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

let aiClient: GoogleGenAI | null = null;
export function getGenAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in Cloud Functions environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
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
  if (!apiKey) {
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
