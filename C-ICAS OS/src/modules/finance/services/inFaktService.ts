/**
 * Data: 2026-05-19
 * Opis: Serwis eksportu faktur do inFakt API v3.
 *       Konfiguracja (apiKey) czytana z Firestore integrations (providerId: 'infakt').
 */

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import type { SalesInvoice } from '../types/fiTypes';

// ---------------------------------------------------------------------------
// Typy
// ---------------------------------------------------------------------------

export interface InFaktConfig {
  apiKey: string;
}

export interface InFaktSyncResult {
  synced: number;
  errors: string[];
}

interface InFaktInvoicePayload {
  invoice: {
    number: string;
    invoice_date: string;
    sale_date: string;
    payment_date: string;
    client_company_name: string;
    client_tax_code?: string;
    client_street?: string;
    client_city?: string;
    client_post_code?: string;
    client_country?: string;
    invoice_items: Array<{
      name: string;
      unit: string;
      quantity: number;
      unit_net_price: number;
      tax_symbol: string;
    }>;
    payment_method: string;
    currency: string;
  };
}

// ---------------------------------------------------------------------------
// Konfiguracja z Firestore
// ---------------------------------------------------------------------------

export async function getInFaktConfig(tenantId: string): Promise<InFaktConfig> {
  const integrationsCol = collection(db, 'tenants', tenantId, 'integrations');
  const q = query(integrationsCol, where('providerId', '==', 'infakt'));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Brak konfiguracji inFakt. Skonfiguruj API Key w sekcji Integracje.');
  }

  const data = snap.docs[0].data() as { config?: InFaktConfig };
  if (!data.config?.apiKey) {
    throw new Error('Brak klucza API inFakt. Uzupełnij konfigurację w Integracjach.');
  }

  return data.config;
}

// ---------------------------------------------------------------------------
// Mapowanie faktury na format inFakt
// ---------------------------------------------------------------------------

function mapVatRate(rate: SalesInvoice['items'][number]['vatRate']): string {
  if (typeof rate === 'number') return String(rate);
  if (rate === 'zw') return 'zw';
  if (rate === 'np') return 'np';
  if (rate === 'oo') return 'oo';
  return '23';
}

function mapPaymentMethod(method: SalesInvoice['paymentMethod']): string {
  const map: Record<SalesInvoice['paymentMethod'], string> = {
    transfer: 'transfer',
    cash: 'cash',
    card: 'card',
    blik: 'card',
    instant_transfer: 'transfer',
    direct_debit: 'transfer',
  };
  return map[method] ?? 'transfer';
}

function buildInFaktPayload(invoice: SalesInvoice): InFaktInvoicePayload {
  return {
    invoice: {
      number: invoice.number,
      invoice_date: invoice.issueDate,
      sale_date: invoice.saleDate,
      payment_date: invoice.dueDate,
      client_company_name: invoice.buyer.name,
      client_tax_code: invoice.buyer.nip,
      client_street: invoice.buyer.address,
      client_city: invoice.buyer.city,
      client_post_code: invoice.buyer.postCode,
      client_country: invoice.buyer.country,
      invoice_items: invoice.items.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        unit_net_price: item.priceNetto,
        tax_symbol: mapVatRate(item.vatRate),
      })),
      payment_method: mapPaymentMethod(invoice.paymentMethod),
      currency: invoice.currency,
    },
  };
}

// ---------------------------------------------------------------------------
// Eksport do inFakt
// ---------------------------------------------------------------------------

export async function syncInvoicesToInFakt(
  tenantId: string,
  invoices: SalesInvoice[],
): Promise<InFaktSyncResult> {
  const config = await getInFaktConfig(tenantId);
  let synced = 0;
  const errors: string[] = [];

  for (const invoice of invoices) {
    if (!invoice.id) {
      errors.push(`Faktura ${invoice.number}: brak ID dokumentu.`);
      continue;
    }

    try {
      const payload = buildInFaktPayload(invoice);

      const res = await fetch('https://api.infakt.pl/v3/invoices.json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-inFakt-ApiKey': config.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        errors.push(`Faktura ${invoice.number}: inFakt API ${res.status} — ${text}`);
        continue;
      }

      // Oznacz w Firestore
      const invoiceRef = doc(db, 'tenants', tenantId, 'invoices', invoice.id);
      await updateDoc(invoiceRef, {
        'exportedTo.infakt': serverTimestamp(),
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
