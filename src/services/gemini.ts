import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export type GeminiModel = 'gemini-3-pro-image-preview' | 'gemini-3.1-flash-image-preview';

export interface GenerationParams {
  apiKey: string;
  model: GeminiModel;
  prompt: string;
  images: string[]; // base64 strings
}

export async function generateFourView(params: GenerationParams): Promise<{ imageUrl: string; text?: string }> {
  // Use the injected API key for paid models
  const apiKey = params.apiKey;
  const ai = new GoogleGenAI({ apiKey });

  const parts = [
    {
      text: `Generate a professional 2x2 four-view character turnaround sheet. It prepares for the future 3D modeling.
    
    CRITICAL: The FIRST attached image is the PRIMARY character reference.
    You MUST strictly follow the character design, outfit, and facial features from the first image.
    Any subsequent images are provided as additional details, style references, or texture inspiration.

    CRITICAL LAYOUT REQUIREMENTS (2x2 Grid):
    - Top-Left quadrant: FRONT view (character facing directly at the camera).
    - Top-Right quadrant: BACK view (character facing directly away from the camera).
    - Bottom-Left quadrant: LEFT SIDE view (character's body facing to the left).
    - Bottom-Right quadrant: RIGHT SIDE view (character's body facing to the right).
    
    CRITICAL STYLE REQUIREMENTS:
    - The background MUST be pure solid white (#FFFFFF).
    - Do not include any environment, shadows on the floor, gradients, or background elements.
    - Ensure the left and right side views are distinct and facing opposite directions.
    - Maintain perfectly consistent character design, proportions, and colors across all four views.
    
    User prompt: ${params.prompt}`
    },
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
