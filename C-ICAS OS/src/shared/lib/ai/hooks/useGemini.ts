import { useState, useCallback } from 'react';
import { generateText, streamText, type ChatMessage } from '../gemini';

export function useGemini() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (prompt: string, model?: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      return await generateText(prompt, model);
    } catch (err: any) {
      setError(err.message ?? 'Gemini error');
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  const askStream = useCallback(async function*(prompt: string): AsyncGenerator<string> {
    setLoading(true);
    setError(null);
    try {
      for await (const chunk of streamText(prompt)) {
        yield chunk;
      }
    } catch (err: any) {
      setError(err.message ?? 'Gemini stream error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { ask, askStream, loading, error };
}
