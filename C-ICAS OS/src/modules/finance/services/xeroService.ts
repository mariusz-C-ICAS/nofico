/**
 * Data: 2026-05-19
 * Opis: Serwis eksportu faktur do Xero API v2.0.
 *       Token OAuth2 i xeroTenantId czytane z Firestore integrations (providerId: 'xero').
 */

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { SalesInvoice } from '../types/fiTypes';

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------

export interface XeroConfig {
  accessToken: string;
  xeroTenantId: string;
}

export interface XeroSyncResult {
  synced: number;
  errors: string[];
}

/** Xero Invoice Type — kompatybilny z Xero API v2 */
interface XeroInvoicePayload {
  Type: 'ACCREC';
  InvoiceNumber: string;
  DateString: string;
  DueDateString: string;
  CurrencyCode: string;
  Status: 'AUTHORISED' | 'DRAFT';
  Contact: {
    Name: string;
    TaxNumber?: string;
    EmailAddress?: string;
  };
  LineItems: Array<{
    Description: string;
    UnitAmount: number;
    Quantity: number;
    TaxType: string;
    AccountCode: string;
  }>;
}

interface XeroInvoicesRequest {
  Invoices: XeroInvoicePayload[];
}

// ---------------------------------------------------------------------------
// Konfiguracja z Firestore
// ---------------------------------------------------------------------------

export async function getXeroConfig(tenantId: string): Promise<XeroConfig> {
  const integrationsCol = collection(db, 'tenants', tenantId, 'integrations');
  const q = query(integrationsCol, where('providerId', '==', 'xero'));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Brak konfiguracji Xero. Zaloguj się przez OAuth w sekcji Integracje.');
  }

  const data = snap.docs[0].data() as { config?: XeroConfig };
  if (!data.config?.accessToken || !data.config?.xeroTenantId) {
    throw new Error('Niekompletna konfiguracja Xero (token lub xeroTenantId). Ponów autoryzację OAuth w Integracjach.');
  }

  return data.config;
}

// ---------------------------------------------------------------------------
// Mapowanie faktury na format Xero
// ---------------------------------------------------------------------------

function mapVatRateXero(rate: SalesInvoice['items'][number]['vatRate']): string {
  // Xero tax types — PL: OUTPUT23, OUTPUT8, OUTPUT5, OUTPUT0, EXEMPTOUTPUT
  if (typeof rate === 'number') {
    if (rate === 23) return 'OUTPUT23';
    if (rate === 8) return 'OUTPUT8';
    if (rate === 5) return 'OUTPUT5';
    if (rate === 0) return 'OUTPUT0';
  }
  return 'EXEMPTOUTPUT';
}

function buildXeroInvoice(invoice: SalesInvoice): XeroInvoicePayload {
  return {
    Type: 'ACCREC',
    InvoiceNumber: invoice.number,
    DateString: invoice.issueDate,
    DueDateString: invoice.dueDate,
    CurrencyCode: invoice.currency,
    Status: invoice.status === 'draft' ? 'DRAFT' : 'AUTHORISED',
    Contact: {
      Name: invoice.buyer.name,
      TaxNumber: invoice.buyer.nip,
      EmailAddress: invoice.buyer.email,
    },
    LineItems: invoice.items.map((item) => ({
      Description: item.name,
      UnitAmount: item.priceNetto,
      Quantity: item.quantity,
      TaxType: mapVatRateXero(item.vatRate),
      AccountCode: '200', // domyślne konto sprzedaży w Xero
    })),
  };
}

// ---------------------------------------------------------------------------
// Eksport do Xero (batch — do 50 faktur na request)
// ---------------------------------------------------------------------------

const XERO_BATCH_SIZE = 50;

export async function syncInvoicesToXero(
  tenantId: string,
  invoices: SalesInvoice[],
): Promise<XeroSyncResult> {
  const config = await getXeroConfig(tenantId);
  let synced = 0;
  const errors: string[] = [];

  const validInvoices = invoices.filter((inv) => {
    if (!inv.id) {
      errors.push(`Faktura ${inv.number}: brak ID dokumentu.`);
      return false;
    }
    return true;
  });

  // Xero zaleca batch do 50 elementów
  for (let i = 0; i < validInvoices.length; i += XERO_BATCH_SIZE) {
    const batch = validInvoices.slice(i, i + XERO_BATCH_SIZE);
    const xeroInvoices = batch.map(buildXeroInvoice);
    const body: XeroInvoicesRequest = { Invoices: xeroInvoices };

    try {
      const res = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.accessToken}`,
          'Xero-Tenant-Id': config.xeroTenantId,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        const numbers = batch.map((inv) => inv.number).join(', ');
        errors.push(`Batch [${numbers}]: Xero API ${res.status} — ${text}`);
        continue;
      }

      // Oznacz wszystkie z batcha jako wyeksportowane
      await Promise.all(
        batch.map((invoice) => {
          const invoiceRef = doc(db, 'tenants', tenantId, 'invoices', invoice.id!);
          return updateDoc(invoiceRef, {
            'exportedTo.xero': serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }),
      );

      synced += batch.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const numbers = batch.map((inv) => inv.number).join(', ');
      errors.push(`Batch [${numbers}]: ${msg}`);
    }
  }

  return { synced, errors };
}
