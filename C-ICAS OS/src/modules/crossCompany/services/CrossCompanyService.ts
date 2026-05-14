/**
 * CrossCompanyService.ts
 * Serwis do obsługi operacji międzyfirmowych, audytów wielu tenantów i generowania dokumentacji TP.
 */
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { GoogleGenAI } from "@google/genai";

export interface CrossTenantTx {
  id?: string;
  sourceTenantId: string;
  targetTenantId: string;
  amount: number;
  currency: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'executed';
  relatedInvoiceId?: string;
  createdAt: any;
}

export class CrossCompanyService {
  /**
   * Pobiera transakcje intercompany dla danego tenanta (jako źródło lub cel).
   */
  static async getIntercompanyTransactions(tenantId: string) {
    const q1 = query(collection(db, 'crossTenantTransactions'), where('sourceTenantId', '==', tenantId));
    const q2 = query(collection(db, 'crossTenantTransactions'), where('targetTenantId', '==', tenantId));
    
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    
    const txs: CrossTenantTx[] = [];
    snap1.forEach(doc => txs.push({ id: doc.id, ...doc.data() } as CrossTenantTx));
    snap2.forEach(doc => txs.push({ id: doc.id, ...doc.data() } as CrossTenantTx));
    
    return txs.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
  }

  /**
   * Generuje dokumentację cen transferowych przy użyciu AI.
   * CC-IMP-05
   */
  static async generateTPDocumentation(tenantId: string, period: string, transactions: any[]) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Jesteś ekspertem podatkowym i biegłym rewidentem. Wygeneruj profesjonalną dokumentację cen transferowych (Transfer Pricing) dla firmy o ID ${tenantId} za okres ${period}.
    Dane transakcyjne: ${JSON.stringify(transactions)}.
    Dokument powinien zawierać:
    1. Opis analizy porównawczej.
    2. Uzasadnienie rynkowości cen.
    3. Analizę funkcji, aktywów i ryzyk.
    Format: Markdown.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });

    const content = response.text || "Błąd generowania dokumentacji.";

    const docRef = await addDoc(collection(db, 'tpDocuments'), {
      tenantId,
      title: `Dokumentacja TP ${period}`,
      period,
      content,
      status: 'draft',
      version: 1,
      createdAt: serverTimestamp()
    });

    return { id: docRef.id, content };
  }

  /**
   * Pobiera profile wielu tenantów dla Global Dashboard.
   * CC-IMP-01
   */
  static async getGlobalTenantInsights(tenantIds: string[]) {
    const insights = await Promise.all(tenantIds.map(async (id) => {
      const tDoc = await getDoc(doc(db, 'tenants', id));
      return { id, ...(tDoc.data() || {}) };
    }));
    return insights;
  }

  /**
   * Wysyła e-mail przy użyciu tokena OAuth danego tenanta.
   * CC-IMP-03
   * (W prawdziwym systemie wywołuje Cloud Function)
   */
  static async sendEmailViaTenantOAuth(tenantId: string, to: string, subject: string, body: string) {
    console.log(`[CloudFunction] Sending email for tenant ${tenantId} via OAuth...`);
    // Tu nastąpiłoby wywołanie API/SDK z tokenem pobranym z Vault
    return { success: true, messageId: 'msg_' + Math.random().toString(36).substr(2, 9) };
  }
}
