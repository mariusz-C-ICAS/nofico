/**
 * AiCopilotService.ts
 * Serwis obsługujący AI Copilota z integracją Gemini API oraz Function Calling.
 * CC-IMP-01, CC-IMP-02, CC-IMP-05
 */
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// Definicje narzędzi dla modelu (Function Calling)
const querySQLTool: FunctionDeclaration = {
  name: "querySQL",
  description: "Wykonuje zapytanie do bazy danych SQL w celu pobrania surowych danych finansowych lub operacyjnych.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Zapytanie SQL (PostgreSQL/BigQuery compliant)." }
    },
    required: ["query"]
  }
};

const forecastCashFlowTool: FunctionDeclaration = {
  name: "forecastCashFlow",
  description: "Generuje prognozę przepływów pieniężnych na podstawie historycznych danych z Vault i KPiR.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      months: { type: Type.NUMBER, description: "Liczba miesięcy do przodu (domyślnie 3)." }
    },
    required: ["months"]
  }
};

const searchDocsTool: FunctionDeclaration = {
  name: "searchDocs",
  description: "Przeszukuje bazę wiedzy RAG (ustawy PIT, CIT, VAT, KSH) oraz repozytorium DMS.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      term: { type: Type.STRING, description: "Fraza kluczowa lub pytanie prawne." }
    },
    required: ["term"]
  }
};

export class AiCopilotService {
  private static _ai: GoogleGenAI | null = null;

  private static getAi(): GoogleGenAI {
    const key = (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY)
      || (typeof (import.meta as any)?.env !== 'undefined' ? (import.meta as any).env.VITE_GEMINI_API_KEY : undefined);
    if (!key) throw new Error('GEMINI_API_KEY nie jest skonfigurowany');
    if (!this._ai) this._ai = new GoogleGenAI({ apiKey: key });
    return this._ai;
  }

  static isConfigured(): boolean {
    try { this.getAi(); return true; } catch { return false; }
  }

  /**
   * Główna funkcja czatu AI Copilota.
   * AI-IMP-01
   */
  static async chat(userId: string, tenantId: string, conversationId: string, message: string, history: any[] = []) {
    const model = "gemini-2.0-flash";

    let ai: GoogleGenAI;
    try {
      ai = this.getAi();
    } catch {
      return { text: 'AI Copilot nie jest dostępny — klucz API nie jest skonfigurowany.', functionCalls: [] };
    }

    const systemInstruction = `Jesteś AI Copilotem dla CEO/CFO/HR w systemie ERP AI Architekt.
    Masz dostęp do narzędzi: querySQL, forecastCashFlow, searchDocs.
    Działasz zgodnie z EU AI Act - każda Twoja akcja jest logowana.
    Zawsze odpowiadaj w języku polskim, merytorycznie i profesjonalnie.
    Twoim celem jest wspieranie decyzji biznesowych poprzez analizę danych twardych i przepisów.`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          ...history,
          { role: "user", parts: [{ text: message }] }
        ],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [querySQLTool, forecastCashFlowTool, searchDocsTool] }],
        }
      });

      const responseText = response.text || "Przepraszam, wystąpił problem z przetworzeniem odpowiedzi.";
      const toolsUsed = response.functionCalls?.map(fc => fc.name) || [];

      await addDoc(collection(db, `aiConversations/${conversationId}/auditLogs`), {
        conversationId,
        userId,
        prompt: message,
        response: responseText,
        toolsUsed,
        tokensUsed: 0,
        timestamp: serverTimestamp()
      });

      return response;
    } catch (error) {
      console.error("AI Copilot Chat Error:", error);
      throw error;
    }
  }

  /**
   * Tworzy nową konwersację.
   */
  static async createConversation(userId: string, tenantId: string, title: string = "Nowa Analiza AI") {
    const docRef = await addDoc(collection(db, 'aiConversations'), {
      userId,
      tenantId,
      title,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  /**
   * Pobiera historię audytową rozmów dla celów compliance.
   */
  static async getAuditHistory(conversationId: string) {
    const q = query(
      collection(db, `aiConversations/${conversationId}/auditLogs`),
      orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
