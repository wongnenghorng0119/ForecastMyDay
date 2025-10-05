// src/utils/geminiConfig.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 直接硬编码 API Key
const API_KEY = "AIzaSyC6y0eYghOvG17XZKu94ppl5p4bAkJg0Bc";

export const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * 将音频文件转换为文字，并提取地点名称
 */
export async function transcribeAudio(audioBlob) {
  try {
    // 将 Blob 转换为 base64
    const base64Audio = await blobToBase64(audioBlob);
    
    // 使用之前的实验模型（你项目原本使用的）
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `Listen to this audio and extract ONLY the location/place name mentioned.

Rules:
- If the user mentions a city, country, or place name, return ONLY that location name
- Examples:
  * "I want to go to Paris" → return "Paris"
  * "What's the weather like in Tokyo Japan" → return "Tokyo Japan"
  * "Tell me about New York City" → return "New York City"
  * "I'm planning a trip to Kuala Lumpur Malaysia" → return "Kuala Lumpur Malaysia"
- Return ONLY the location name, nothing else
- If no location is mentioned, return the full transcript
- Do not add punctuation or extra words`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: audioBlob.type || "audio/webm",
          data: base64Audio.split(",")[1], // Remove data:audio/webm;base64, prefix
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    return text.trim();
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * 将 Blob 转换为 base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}