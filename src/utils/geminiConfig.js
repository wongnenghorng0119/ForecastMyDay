// src/utils/geminiConfig.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// 直接硬编码 API Key
const API_KEY = "AIzaSyCOlY2ZVZ8KWug5BOmwdWleVEYOZBzKh0g";

export const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * 将音频文件转换为文字
 */
export async function transcribeAudio(audioBlob) {
  try {
    // 将 Blob 转换为 base64
    const base64Audio = await blobToBase64(audioBlob);
    
    // 使用之前的实验模型（你项目原本使用的）
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `The audio is in English. Transcribe it verbatim in English.
Do not translate, do not summarize, and do not add any extra words or punctuation beyond what is spoken.
Return only the raw transcript text.`;

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