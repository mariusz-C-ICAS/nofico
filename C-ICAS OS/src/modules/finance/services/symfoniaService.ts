/**
 * Data: 2026-05-19
 * Opis: Serwis eksportu faktur do Sage Symfonia FK REST API.
 *       Konfiguracja (apiUrl, apiKey) czytana z Firestore integrations (providerId: 'symfonia').
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

export interface SymfoniaConfig {
  apiUrl: string;
  apiKey: string;
}

export interface SymfoniaExportResult {
  exported: number;
  errors: string[];
}

/** Format wymiany dokumentów z Symfonia FK REST API */
interface SymfoniaDocumentPayload {
  documentType: 'FV' | 'FVZ';
  documentNumber: string;
  documentDate: string;
  saleDate: string;
  dueDate: string;
  currency: string;
  contractor: {
    name: string;
    nip: string | null;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentForm: string;
  positions: Array<{
    name: string;
    unit: string;
    quantity: number;
    netPrice: number;
    vatRate: string;
    netValue: number;
    vatValue: number;
    grossValue: number;
  }>;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
}

// ---------------------------------------------------------------------------
// Konfiguracja z Firestore
// ---------------------------------------------------------------------------

export async function getSymfoniaConfig(tenantId: string): Promise<SymfoniaConfig> {
  const integrationsCol = collection(db, 'tenants', tenantId, 'integrations');
  const q = query(integrationsCol, where('providerId', '==', 'symfonia'));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Brak konfiguracji Symfonia. Skonfiguruj URL i klucz API w sekcji Integracje.');
  }

  const data = snap.docs[0].data() as { config?: SymfoniaConfig };
  if (!data.config?.apiUrl || !data.config?.apiKey) {
    throw new Error('Niekompletna konfiguracja Symfonia (apiUrl lub apiKey). Uzupełnij w Integracjach.');
  }

  return data.config;
}

// ---------------------------------------------------------------------------
// Mapowanie faktury na format Symfonia
// ---------------------------------------------------------------------------

function mapVatRateSymfonia(rate: SalesInvoice['items'][number]['vatRate']): string {
  if (typeof rate === 'number') return `${rate}`;
  if (rate === 'zw') return 'ZW';
  if (rate === 'np') return 'NP';
  if (rate === 'oo') return 'OO';
  return '23';
}

function buildSymfoniaPayload(invoice: SalesInvoice): SymfoniaDocumentPayload {
  return {
    documentType: 'FV',
    documentNumber: invoice.number,
    documentDate: invoice.issueDate,
    saleDate: invoice.saleDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    contractor: {
      name: invoice.buyer.name,
      nip: invoice.buyer.nip ?? null,
      address: invoice.buyer.address,
      city: invoice.buyer.city,
      postalCode: invoice.buyer.postCode,
      country: invoice.buyer.country,
    },
    paymentForm: invoice.paymentMethod,
    positions: invoice.items.map((item) => ({
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      netPrice: item.priceNetto,
      vatRate: mapVatRateSymfonia(item.vatRate),
      netValue: item.totalNetto,
      vatValue: item.totalVat,
      grossValue: item.totalBrutto,
    })),
    netTotal: invoice.totalNetto,
    vatTotal: invoice.totalVat,
    grossTotal: invoice.totalBrutto,
  };
}

// ---------------------------------------------------------------------------
// Eksport do Symfonia
// ---------------------------------------------------------------------------

export async function exportInvoicesToSymfonia(
  tenantId: string,
  invoices: SalesInvoice[],
): Promise<SymfoniaExportResult> {
  const config = await getSymfoniaConfig(tenantId);
  let exported = 0;
  const errors: string[] = [];

  for (const invoice of invoices) {
    if (!invoice.id) {
      errors.push(`Faktura ${invoice.number}: brak ID dokumentu.`);
      continue;
    }

    try {
      const payload = buildSymfoniaPayload(invoice);

      const res = await fetch(`${config.apiUrl}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': config.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        errors.push(`Faktura ${invoice.number}: Symfonia API ${res.status} — ${text}`);
        continue;
      }

      const invoiceRef = doc(db, 'tenants', tenantId, 'invoices', invoice.id);
      await updateDoc(invoiceRef, {
        'exportedTo.symfonia': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      exported++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Faktura ${invoice.number}: ${msg}`);
    }
  }

  return { exported, errors };
}
