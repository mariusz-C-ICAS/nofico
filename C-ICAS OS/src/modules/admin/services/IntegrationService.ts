/**
 * IntegrationService.ts
 * Serwis zarządzający integracjami zewnętrznymi.
 */
import {
  collection, addDoc, setDoc, doc, serverTimestamp,
  query, where, getDocs, getDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export type ConfigurationType = 'automatic' | 'key_only' | 'url_and_key' | 'oauth2' | 'certificate' | 'dedicated';

export interface IntegrationProvider {
  id: string;
  name: string;
  category: 'government' | 'banking' | 'payment' | 'accounting' | 'ecommerce' | 'system' | 'benefits' | 'other';
  description: string;
  authType: 'api_key' | 'oauth2' | 'certificate' | 'rest_api';
  configurationType: ConfigurationType;
  configNote?: string;
  fixedApiUrl?: string;
  comingSoon?: boolean;
}

export const AVAILABLE_PROVIDERS: IntegrationProvider[] = [
  // Government — automatic (public APIs, truly no key required)
  { id: 'vies', name: 'VIES (KE)', category: 'government', description: 'Weryfikacja VAT-UE — publiczne SOAP API Komisji Europejskiej', authType: 'rest_api', configurationType: 'automatic', fixedApiUrl: 'https://ec.europa.eu/taxation_customs/vies/' },
  { id: 'white-list', name: 'Biała Lista Podatników (NIP)', category: 'government', description: 'Weryfikacja NIP i statusu VAT — publiczne REST API MF bez klucza', authType: 'rest_api', configurationType: 'automatic', fixedApiUrl: 'https://wl-api.mf.gov.pl/api' },
  { id: 'nip-mf', name: 'NIP API (MF) — fallback', category: 'government', description: 'Bezpośredni fallback NIP gdy Biała Lista nie odpowiada — ta sama infrastruktura MF', authType: 'rest_api', configurationType: 'automatic', fixedApiUrl: 'https://wl-api.mf.gov.pl/api/search/nip' },
  { id: 'e-krs', name: 'e-KRS (MS API)', category: 'government', description: 'Dane podmiotów KRS — oficjalne API Ministerstwa Sprawiedliwości bez klucza', authType: 'rest_api', configurationType: 'automatic', fixedApiUrl: 'https://api-krs.ms.gov.pl/api' },
  { id: 'ceidg', name: 'CEIDG (biznes.gov.pl)', category: 'government', description: 'Wyszukiwarka jednoosobowych działalności — publiczne API bez klucza', authType: 'rest_api', configurationType: 'automatic', fixedApiUrl: 'https://dane.biznes.gov.pl/api/ceidg/v2' },

  // Government — free key after registration (SOAP, każda org rejestruje własny klucz)
  { id: 'gus-regon', name: 'GUS REGON (BIR)', category: 'government', description: 'Baza Internetowa Regon — bezpłatny klucz po rejestracji', authType: 'api_key', configurationType: 'key_only', fixedApiUrl: 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc', configNote: 'Bezpłatny klucz: zaloguj się na regon.stat.gov.pl i skopiuj User_Key. API SOAP — każda organizacja rejestruje własny klucz.', comingSoon: true },

  // Government — commercial KRS provider (needs URL + key)
  { id: 'e-krs-pro', name: 'e-KRS (komercyjny)', category: 'government', description: 'Komercyjny dostawca danych KRS/REGON z SLA i rozszerzonymi danymi', authType: 'api_key', configurationType: 'url_and_key', configNote: 'Np. KRS API (krs-api.pl), Rejestr.io lub inny komercyjny provider — podaj adres i klucz', comingSoon: true },

  // Government — dedicated UI
  { id: 'ksef', name: 'KSeF MF', category: 'government', description: 'Krajowy System e-Faktur (test/prod)', authType: 'certificate', configurationType: 'dedicated' },
  { id: 'e-deklaracje', name: 'e-Deklaracje', category: 'government', description: 'Deklaracje PIT/CIT/VAT do MF', authType: 'certificate', configurationType: 'certificate', fixedApiUrl: 'https://e-deklaracje.mf.gov.pl/', configNote: 'Wymaga certyfikatu kwalifikowanego lub podpisu zaufanego', comingSoon: true },

  // Banking — URL + key (commercial PSD2 aggregators)
  { id: 'tink', name: 'Tink (AIS/PIS)', category: 'banking', description: 'Open Banking Aggregation (Visa)', authType: 'oauth2', configurationType: 'url_and_key', fixedApiUrl: 'https://api.tink.com', configNote: 'Rejestracja na tink.com — skopiuj Client ID i Secret', comingSoon: true },
  { id: 'nordigen', name: 'Nordigen (GoCardless)', category: 'banking', description: 'Open Banking — dane rachunków bankowych', authType: 'api_key', configurationType: 'url_and_key', fixedApiUrl: 'https://ob.nordigen.com/api/v2', configNote: 'Rejestracja na bankaccountdata.gocardless.com', comingSoon: true },

  // Payments — key only (fixed, known URL)
  { id: 'stripe', name: 'Stripe', category: 'payment', description: 'Płatności kartowe i subskrypcje', authType: 'api_key', configurationType: 'key_only', fixedApiUrl: 'https://api.stripe.com' },
  { id: 'payu', name: 'PayU', category: 'payment', description: 'Bramka płatnicza REST', authType: 'api_key', configurationType: 'key_only', fixedApiUrl: 'https://secure.payu.com', configNote: 'POS ID + MD5 Key z panelu PayU' },
  { id: 'blik', name: 'BLIK', category: 'payment', description: 'Płatności mobilne BLIK', authType: 'api_key', configurationType: 'key_only', configNote: 'Klucz od agenta rozliczeniowego (np. Polskie ePłatności)' },

  // Accounting — URL + key (self-hosted or SaaS instance)
  { id: 'optima', name: 'Comarch Optima', category: 'accounting', description: 'Eksport danych do Comarch Optima', authType: 'rest_api', configurationType: 'url_and_key', configNote: 'Adres lokalnego REST Bridge serwera Optima', comingSoon: true },
  { id: 'symfonia', name: 'Symfonia', category: 'accounting', description: 'Integracja z systemem FK Symfonia', authType: 'rest_api', configurationType: 'url_and_key', configNote: 'Adres serwera Symfonia API (lokalny lub SaaS)', comingSoon: true },
  { id: 'infakt', name: 'inFakt', category: 'accounting', description: 'Automatyczna księgowość i faktury', authType: 'api_key', configurationType: 'key_only', fixedApiUrl: 'https://api.infakt.pl', comingSoon: true },

  // E-commerce
  { id: 'shopify', name: 'Shopify', category: 'ecommerce', description: 'Sklep internetowy Shopify', authType: 'api_key', configurationType: 'url_and_key', configNote: 'Adres: https://twój-sklep.myshopify.com', comingSoon: true },
  { id: 'allegro', name: 'Allegro', category: 'ecommerce', description: 'Zarządzanie sprzedażą i zamówieniami', authType: 'oauth2', configurationType: 'oauth2', fixedApiUrl: 'https://api.allegro.pl', comingSoon: true },
  { id: 'amazon-sp-api', name: 'Amazon SP-API', category: 'ecommerce', description: 'Sprzedaż globalna Amazon', authType: 'oauth2', configurationType: 'oauth2', fixedApiUrl: 'https://sellingpartnerapi-eu.amazon.com', comingSoon: true },

  // Systems — dedicated or OAuth
  { id: 'calsyncpro', name: 'CalSyncPro', category: 'system', description: 'Sync MS Exchange / Google Cal → Kanban tasks', authType: 'api_key', configurationType: 'dedicated' },
  { id: 'google-workspace', name: 'Google Workspace', category: 'system', description: 'Admin SDK & Directory', authType: 'oauth2', configurationType: 'oauth2', fixedApiUrl: 'https://admin.googleapis.com', comingSoon: true },
  { id: 'slack', name: 'Slack Bot', category: 'system', description: 'Powiadomienia i interakcje', authType: 'api_key', configurationType: 'key_only', fixedApiUrl: 'https://slack.com/api', configNote: 'Bot Token z api.slack.com/apps', comingSoon: true },

  // HR/Benefits
  { id: 'multisport', name: 'Multisport', category: 'benefits', description: 'Zarządzanie kartami sportowymi (B2B)', authType: 'rest_api', configurationType: 'url_and_key', configNote: 'Adres API i klucz od Benefit Systems (umowa B2B)', comingSoon: true },
  { id: 'ppk-pzu', name: 'PPK (PZU)', category: 'benefits', description: 'Obsługa składek PPK', authType: 'certificate', configurationType: 'certificate', configNote: 'Certyfikat i dane dostępowe z portalu PZU dla pracodawcy', comingSoon: true },

  // Other — niesklasyfikowane / custom
  { id: 'twilio', name: 'Twilio SMS', category: 'other', description: 'Powiadomienia SMS i weryfikacja numerów', authType: 'api_key', configurationType: 'key_only', fixedApiUrl: 'https://api.twilio.com', configNote: 'Account SID + Auth Token z twilio.com/console' },
  { id: 'sendgrid', name: 'SendGrid', category: 'other', description: 'Transakcyjny email i marketing', authType: 'api_key', configurationType: 'key_only', fixedApiUrl: 'https://api.sendgrid.com', configNote: 'API Key z app.sendgrid.com/settings/api_keys' },
  { id: 'ms365', name: 'Microsoft 365', category: 'other', description: 'SSO, Teams, Calendar — OAuth2 Azure AD', authType: 'oauth2', configurationType: 'oauth2', fixedApiUrl: 'https://graph.microsoft.com', comingSoon: true },
  { id: 'custom', name: 'Własny endpoint (Custom)', category: 'other', description: 'Dowolny własny serwis REST — podaj adres i klucz', authType: 'api_key', configurationType: 'url_and_key', configNote: 'Własna integracja — możesz wpisać dowolny adres API i klucz autoryzacyjny' },
];

export class IntegrationService {
  static async getTenantIntegrations(tenantId: string) {
    const q = query(collection(db, 'integrations'), where('tenantId', '==', tenantId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async getHiddenIntegrations(tenantId: string): Promise<string[]> {
    const snap = await getDoc(doc(db, 'tenants', tenantId, 'settings', 'integrations'));
    return snap.exists() ? (snap.data().hiddenIds ?? []) : [];
  }

  static async setHiddenIntegrations(tenantId: string, hiddenIds: string[]): Promise<void> {
    await setDoc(doc(db, 'tenants', tenantId, 'settings', 'integrations'), { hiddenIds }, { merge: true });
  }

  static async getCustomUrls(tenantId: string): Promise<Record<string, string>> {
    const snap = await getDoc(doc(db, 'tenants', tenantId, 'settings', 'integrations'));
    return snap.exists() ? (snap.data().customUrls ?? {}) : {};
  }

  static async setCustomUrl(tenantId: string, providerId: string, url: string): Promise<void> {
    const snap = await getDoc(doc(db, 'tenants', tenantId, 'settings', 'integrations'));
    const current = snap.exists() ? (snap.data().customUrls ?? {}) : {};
    await setDoc(doc(db, 'tenants', tenantId, 'settings', 'integrations'), { customUrls: { ...current, [providerId]: url } }, { merge: true });
  }

  static async resetCustomUrl(tenantId: string, providerId: string): Promise<void> {
    const snap = await getDoc(doc(db, 'tenants', tenantId, 'settings', 'integrations'));
    const current = snap.exists() ? { ...(snap.data().customUrls ?? {}) } : {};
    delete current[providerId];
    await setDoc(doc(db, 'tenants', tenantId, 'settings', 'integrations'), { customUrls: current }, { merge: true });
  }

  static async connectIntegration(tenantId: string, providerId: string, name: string, category: string, config: any) {
    const q = query(collection(db, 'integrations'), where('tenantId', '==', tenantId), where('providerId', '==', providerId));
    const snap = await getDocs(q);
    const data = { tenantId, providerId, name, category, config, status: 'connected', lastSyncedAt: serverTimestamp(), createdAt: serverTimestamp() };
    if (!snap.empty) {
      const docId = snap.docs[0].id;
      await setDoc(doc(db, 'integrations', docId), { ...data, createdAt: snap.docs[0].data().createdAt });
      return docId;
    }
    const docRef = await addDoc(collection(db, 'integrations'), data);
    return docRef.id;
  }

  static async disconnectIntegration(integrationId: string) {
    await deleteDoc(doc(db, 'integrations', integrationId));
  }
}
