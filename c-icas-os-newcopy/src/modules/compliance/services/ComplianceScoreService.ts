import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { handleFirestoreError, OperationType } from '../../../shared/lib/firestoreUtils';

export interface ComplianceScoreResult {
  score: number;
  openIncidents: number;
  completedAudits: number;
  documentsCount: number;
  historicalId?: string;
  calculatedAt?: any;
}

export const ComplianceScoreService = {
  async calculateScore(tenantId: string): Promise<ComplianceScoreResult> {
    if (!tenantId) return { score: 0, openIncidents: 0, completedAudits: 0, documentsCount: 0 };
    
    try {
      // 1. Sprawdzenie otwartych incydentów (auditLogs oznaczonych jako alert lub z severity)
      // W naszej strukturze nie mamy jawnych incydentów, używamy auditLogs
      const logsQ = query(collection(db, 'auditLogs'), where('tenantId', '==', tenantId));
      const logsSnap = await getDocs(logsQ);
      let openIncidents = 0;
      logsSnap.forEach(doc => {
        const d = doc.data();
        if (d.type === 'security.sensitive' || d.type === 'permission.denied') openIncidents++;
      });
      
      // 2. Dokumenty (formularze, szablony)
      const formsQ = query(collection(db, 'auditFormTemplates'), where('tenantId', '==', tenantId));
      const formsSnap = await getDocs(formsQ);
      const docsCount = formsSnap.size;
      
      const tpQ = query(collection(db, 'tpDocuments'), where('tenantId', '==', tenantId));
      const tpSnap = await getDocs(tpQ);
      
      const sigQ = query(collection(db, 'documents'), where('tenantId', '==', tenantId));
      const sigSnap = await getDocs(sigQ);
      const sigCount = sigSnap.size;
      
      const documentsCount = docsCount + tpSnap.size + sigCount;
      
      // 3. Algorytm
      let score = 100;
      
      // Kary za incydenty (np. -5 za każdy)
      score -= (openIncidents * 5);
      
      // Bonusy lub brak kary za dokumentację (np. minimum 5 dokumentów oczekiwane)
      if (documentsCount < 5) {
        score -= (5 - documentsCount) * 2;
      } else {
        score += Math.min(documentsCount, 10);
      }
      
      if (score < 0) score = 0;
      if (score > 100) score = 100;
      
      return { 
        score: Math.round(score * 10) / 10, 
        openIncidents, 
        completedAudits: formsSnap.size, // placeholder
        documentsCount
      };
      
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'complianceCalc');
      return { score: 100, openIncidents: 0, completedAudits: 0, documentsCount: 0 };
    }
  },
  
  async calculateAndSaveScore(tenantId: string, userId: string): Promise<ComplianceScoreResult> {
    const result = await this.calculateScore(tenantId);
    
    // Zapisz do bazy jako snapshot historyczny
    try {
      const docRef = await addDoc(collection(db, 'complianceScoreHistory'), {
        tenantId,
        score: result.score,
        factors: {
          openIncidents: result.openIncidents,
          completedAudits: result.completedAudits,
          documentsCount: result.documentsCount
        },
        calculatedAt: serverTimestamp(),
        calculatedBy: userId
      });
      result.historicalId = docRef.id;
      result.calculatedAt = new Date().toISOString();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'complianceScoreHistory');
    }
    
    return result;
  }
};
