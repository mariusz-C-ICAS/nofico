import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function askAI(prompt: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });
    return response.text || "";
  } catch (err) {
    console.error("AI Error:", err);
    return "";
  }
}
