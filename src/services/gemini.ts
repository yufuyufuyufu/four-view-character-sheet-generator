import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export type GeminiModel = 'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview';

export interface GenerationParams {
  apiKey: string;
  model: GeminiModel;
  prompt: string;
  images: string[]; // base64 strings
  isIterative?: boolean;
  isRaw?: boolean;
}

export async function generateFourView(params: GenerationParams): Promise<{ imageUrl: string; text?: string }> {
  // Use the injected API key for paid models
  const apiKey = params.apiKey;
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = params.isRaw 
    ? undefined 
    : `You are an expert game artist. 
  ALWAYS output a 1K resolution 2x2 grid character turnaround sheet.
  
  LAYOUT RULES:
  - Top-Left: FRONT view.
  - Top-Right: BACK view.
  - Bottom-Left: LEFT SIDE view.
  - Bottom-Right: RIGHT SIDE view.
  
  AESTHETICS:
  - Background MUST be PURE SOLID WHITE (#FFFFFF). No shadows, no gradients.
  - Ensure perfect character consistency across all four quadrants.
  - CRITICAL: DO NOT generate any text labels, annotations, or watermarks on the image (e.g., avoid writing "FRONT", "BACK", "LEFT", "RIGHT"). Keep the sheet completely clean.

  ${params.isIterative
      ? "MODE: ITERATIVE REFINEMENT. The FIRST image is your PREVIOUS GENERATION. Keep the layout and character identity EXACTLY the same, ONLY modify the specific parts mentioned in the User Prompt."
      : "MODE: NEW GENERATION. Create a new sheet based on the reference images provided."}`;

  const parts = [
    { text: params.isRaw ? params.prompt : `USER MODIFICATION REQUEST: ${params.prompt || "No specific changes, just generate/refine."}` },
    ...params.images.map(img => ({
      inlineData: {
        data: img.split(',')[1],
        mimeType: "image/png"
      }
    }))
  ];

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: params.model,
    contents: { parts },
    config: {
      systemInstruction,
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  let imageUrl = '';
  let text = '';

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
    } else if (part.text) {
      text += part.text;
    }
  }

  if (!imageUrl) {
    throw new Error("No image was generated. Please try again.");
  }

  return { imageUrl, text };
}
