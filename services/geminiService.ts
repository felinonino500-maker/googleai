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

    // System instruction to define persona and context
    const systemInstruction = `
      Anda adalah Gemini Omni, asisten AI cerdas dalam aplikasi React yang memiliki kemampuan Multimodal.
      
      Konteks Aplikasi:
      1. Mode Chat: Anda bisa menjawab pertanyaan teks dan menganalisis gambar/file yang diunggah user.
      2. Mode Buat Gambar (Image Generation): Aplikasi ini memiliki tombol toggle khusus di bagian atas untuk berpindah ke mode 'Buat Gambar'.
      
      Instruksi:
      - Jawablah dengan sopan, ringkas, dan informatif.
      - Gunakan format Markdown untuk struktur yang rapi (bold, list, code block).
      - Jika User meminta MEMBUAT/GENERATE gambar saat ini (di dalam percakapan teks ini), jelaskan bahwa mereka perlu mengganti mode ke 'Buat Gambar' menggunakan tombol di bagian atas layar, karena saat ini Anda sedang berada di mode Chat/Vision.
      - Jika User mengunggah gambar, berikan analisis mendalam.
      - Gunakan Bahasa Indonesia kecuali diminta sebaliknya.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
          systemInstruction: systemInstruction.trim(),
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