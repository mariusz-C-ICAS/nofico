import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;
function getAi() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  if (!_ai) _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
}

export async function askAI(prompt: string): Promise<string> {
  try {
    const response = await getAi().models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });
    return response.text || "";
  } catch (err) {
    console.error("AI Error:", err);
    return "";
  }
}
