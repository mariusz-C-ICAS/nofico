/**
 * Data: 2026-05-19
 * Opis: Serwis eksportu faktur do Comarch Optima REST Bridge.
 *       Konfiguracja (apiUrl, apiKey) czytana z Firestore integrations (providerId: 'optima').
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

export interface OptimaConfig {
  apiUrl: string;
  apiKey: string;
}

export interface OptimaExportResult {
  synced: number;
  errors: string[];
}

/** Format zgodny z Optima REST Bridge — dokumenty handlowe */
interface OptimaInvoicePayload {
  DocumentType: 'FSA' | 'FS';
  DocumentNumber: string;
  IssueDate: string;
  SaleDate: string;
  PaymentDate: string;
  Currency: string;
  CustomerName: string;
  CustomerTaxId: string | null;
  CustomerAddress: string;
  CustomerCity: string;
  CustomerPostCode: string;
  CustomerCountry: string;
  PaymentMethod: string;
  Elements: Array<{
    Name: string;
    Unit: string;
    Quantity: number;
    PriceNet: number;
    VatRate: string;
    TotalNet: number;
    TotalVat: number;
    TotalGross: number;
  }>;
  TotalNet: number;
  TotalVat: number;
  TotalGross: number;
}

// ---------------------------------------------------------------------------
// Konfiguracja z Firestore
// ---------------------------------------------------------------------------

export async function getOptimaConfig(tenantId: string): Promise<OptimaConfig> {
  const integrationsCol = collection(db, 'tenants', tenantId, 'integrations');
  const q = query(integrationsCol, where('providerId', '==', 'optima'));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Brak konfiguracji Optima. Skonfiguruj URL i klucz API w sekcji Integracje.');
  }

  const data = snap.docs[0].data() as { config?: OptimaConfig };
  if (!data.config?.apiUrl || !data.config?.apiKey) {
    throw new Error('Niekompletna konfiguracja Optima (apiUrl lub apiKey). Uzupełnij w Integracjach.');
  }

  return data.config;
}

// ---------------------------------------------------------------------------
// Mapowanie faktury na format Optima REST Bridge
// ---------------------------------------------------------------------------

function mapVatRateOptima(rate: SalesInvoice['items'][number]['vatRate']): string {
  if (typeof rate === 'number') return `${rate}%`;
  if (rate === 'zw') return 'ZW';
  if (rate === 'np') return 'NP';
  if (rate === 'oo') return 'OO';
  return '23%';
}

function buildOptimaPayload(invoice: SalesInvoice): OptimaInvoicePayload {
  return {
    DocumentType: invoice.type === 'proforma' ? 'FSA' : 'FS',
    DocumentNumber: invoice.number,
    IssueDate: invoice.issueDate,
    SaleDate: invoice.saleDate,
    PaymentDate: invoice.dueDate,
    Currency: invoice.currency,
    CustomerName: invoice.buyer.name,
    CustomerTaxId: invoice.buyer.nip ?? null,
    CustomerAddress: invoice.buyer.address,
    CustomerCity: invoice.buyer.city,
    CustomerPostCode: invoice.buyer.postCode,
    CustomerCountry: invoice.buyer.country,
    PaymentMethod: invoice.paymentMethod,
    Elements: invoice.items.map((item) => ({
      Name: item.name,
      Unit: item.unit,
      Quantity: item.quantity,
      PriceNet: item.priceNetto,
      VatRate: mapVatRateOptima(item.vatRate),
      TotalNet: item.totalNetto,
      TotalVat: item.totalVat,
      TotalGross: item.totalBrutto,
    })),
    TotalNet: invoice.totalNetto,
    TotalVat: invoice.totalVat,
    TotalGross: invoice.totalBrutto,
  };
}

// ---------------------------------------------------------------------------
// Eksport do Optima
// ---------------------------------------------------------------------------

export async function exportInvoicesToOptima(
  tenantId: string,
  invoices: SalesInvoice[],
): Promise<OptimaExportResult> {
  const config = await getOptimaConfig(tenantId);
  const basicAuth = btoa(`api:${config.apiKey}`);
  let synced = 0;
  const errors: string[] = [];

  for (const invoice of invoices) {
    if (!invoice.id) {
      errors.push(`Faktura ${invoice.number}: brak ID dokumentu.`);
      continue;
    }

    try {
      const payload = buildOptimaPayload(invoice);

      const res = await fetch(`${config.apiUrl}/invoices/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        errors.push(`Faktura ${invoice.number}: Optima API ${res.status} — ${text}`);
        continue;
      }

      const invoiceRef = doc(db, 'tenants', tenantId, 'invoices', invoice.id);
      await updateDoc(invoiceRef, {
        'exportedTo.optima': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Faktura ${invoice.number}: ${msg}`);
    }
  }

  return { synced, errors };
}
