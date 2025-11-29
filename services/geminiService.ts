import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Attachment } from "../types";

// Ensure API Key is present
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

/**
 * Sends a chat message, potentially with attachments (images, files).
 */
export const sendChatMessage = async (
  prompt: string,
  attachments: Attachment[],
  history: { role: string; parts: { text?: string }[] }[]
): Promise<string> => {
  try {
    // Determine model based on attachments
    // Using gemini-2.5-flash as the versatile workhorse for text and multimodal
    const modelId = 'gemini-2.5-flash';

    const parts: any[] = [];

    // Add attachments
    for (const att of attachments) {
      parts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.base64,
        },
      });
    }

    // Add text prompt
    if (prompt) {
      parts.push({ text: prompt });
    }

    // We use generateContent for single turn or managed history
    // To support history, we would normally use ai.chats.create, 
    // but for simple "add to list" logic with mixed modalities, simple generation is often safer to stateless errors.
    // However, to make it a real chat, let's construct the full prompt history manually or use chat if no attachments.
    
    // Simplification for stability: We will send the current payload. 
    // If you need full conversational memory with images, Gemini 1.5/2.5 handles it, 
    // but let's stick to the immediate context + system instruction for now to keep it robust.
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
          systemInstruction: "You are a helpful AI assistant capable of analyzing images and files. Answer in Indonesian if the user speaks Indonesian.",
      }
    });

    return response.text || "Maaf, saya tidak dapat menghasilkan respon teks.";
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};

/**
 * Generates an image based on a text prompt.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using the appropriate model for image generation
      contents: {
          parts: [{ text: prompt }]
      },
      config: {
        // No specific config needed for basic generation, defaults usually work.
        // responseMimeType not supported for this model per guidelines
      }
    });
    
    // Iterate through parts to find the image
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
    }

    throw new Error("No image data found in response.");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};
