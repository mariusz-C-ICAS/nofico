/**
 * IntegrationService.ts
 * Serwis zarządzający integracjami zewnętrznymi.
 * INT-01 do INT-36
 */
import { 
  collection, 
  addDoc, 
  setDoc,
  doc,
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export interface IntegrationProvider {
  id: string;
  name: string;
  category: 'government' | 'banking' | 'payment' | 'accounting' | 'ecommerce' | 'system' | 'benefits';
  description: string;
  authType: 'api_key' | 'oauth2' | 'certificate' | 'rest_api';
}

export const AVAILABLE_PROVIDERS: IntegrationProvider[] = [
  // Government
  { id: 'ksef', name: 'KSeF MF', category: 'government', description: 'Krajowy System e-Faktur (test/prod)', authType: 'certificate' },
  { id: 'e-deklaracje', name: 'e-Deklaracje', category: 'government', description: 'Deklaracje PIT/CIT/VAT do MF', authType: 'certificate' },
  { id: 'e-krs', name: 'e-KRS', category: 'government', description: 'Wyszukiwarka podmiotów w KRS', authType: 'api_key' },
  { id: 'gus-regon', name: 'GUS REGON (BIR)', category: 'government', description: 'Baza Internetowa Regon', authType: 'api_key' },
  { id: 'vies', name: 'VIES (KE)', category: 'government', description: 'Weryfikacja VAT-UE', authType: 'rest_api' },
  { id: 'white-list', name: 'Biała Lista Podatników', category: 'government', description: 'Wykaz podatników VAT MF', authType: 'api_key' },
  
  // Banking
  { id: 'tink', name: 'Tink (AIS/PIS)', category: 'banking', description: 'Open Banking Aggregation', authType: 'oauth2' },
  { id: 'nordigen', name: 'Nordigen (Gocardless)', category: 'banking', description: 'Backup Bank Account Information', authType: 'api_key' },
  
  // Payments
  { id: 'stripe', name: 'Stripe', category: 'payment', description: 'Płatności kartowe i subskrypcje', authType: 'api_key' },
  { id: 'payu', name: 'PayU', category: 'payment', description: 'Bramka płatnicza REST', authType: 'api_key' },
  { id: 'blik', name: 'BLIK', category: 'payment', description: 'Płatności mobilne BLIK', authType: 'api_key' },
  
  // Accounting
  { id: 'optima', name: 'Comarch Optima', category: 'accounting', description: 'Eksport danych do księgowości', authType: 'rest_api' },
  { id: 'symfonia', name: 'Symfonia', category: 'accounting', description: 'Integracja z systemem FK', authType: 'rest_api' },
  { id: 'infakt', name: 'inFakt', category: 'accounting', description: 'Automatyczna księgowość i faktury', authType: 'api_key' },
  
  // Ecommerce
  { id: 'allegro', name: 'Allegro', category: 'ecommerce', description: 'Zarządzanie sprzedażą i zamówieniami', authType: 'oauth2' },
  { id: 'amazon-sp-api', name: 'Amazon SP-API', category: 'ecommerce', description: 'Sprzedaż globalna Amazon', authType: 'oauth2' },
  { id: 'shopify', name: 'Shopify', category: 'ecommerce', description: 'Sklep internetowy Shopify', authType: 'api_key' },
  
  // Systems
  { id: 'calsyncpro', name: 'CalSyncPro', category: 'system', description: 'Sync MS Exchange / Google Cal → Kanban tasks', authType: 'api_key' },
  { id: 'google-workspace', name: 'Google Workspace', category: 'system', description: 'Admin SDK & Directory', authType: 'oauth2' },
  { id: 'slack', name: 'Slack Bot', category: 'system', description: 'Powiadomienia i interakcje', authType: 'api_key' },
  
  // HR/Benefits
  { id: 'multisport', name: 'Multisport', category: 'benefits', description: 'Zarządzanie kartami sportowymi', authType: 'rest_api' },
  { id: 'ppk-pzu', name: 'PPK (PZU)', category: 'benefits', description: 'Obsługa składek PPK', authType: 'certificate' }
];

export class IntegrationService {
  /**
   * Pobiera listę aktywnych integracji dla tenanta.
   */
  static async getTenantIntegrations(tenantId: string) {
    const q = query(collection(db, 'integrations'), where('tenantId', '==', tenantId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Dodaje lub aktualizuje integrację.
   */
  static async connectIntegration(tenantId: string, providerId: string, name: string, category: string, config: any) {
    // Sprawdzamy czy już istnieje
    const q = query(
      collection(db, 'integrations'), 
      where('tenantId', '==', tenantId),
      where('providerId', '==', providerId)
    );
    const snap = await getDocs(q);
    
    const data = {
      tenantId,
      providerId,
      name,
      category,
      config,
      status: 'pending',
      lastSyncedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    if (!snap.empty) {
      const docId = snap.docs[0].id;
      await setDoc(doc(db, 'integrations', docId), {
        ...data,
        status: 'connected',
        createdAt: snap.docs[0].data().createdAt
      });
      return docId;
    } else {
      const docRef = await addDoc(collection(db, 'integrations'), {
        ...data,
        status: 'connected'
      });
      return docRef.id;
    }
  }

  /**
   * Usuwa integrację.
   */
  static async disconnectIntegration(integrationId: string) {
    await deleteDoc(doc(db, 'integrations', integrationId));
  }
}
