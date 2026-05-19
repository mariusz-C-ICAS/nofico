/**
 * Data: 2026-05-19
 * Autor: Agent AI
 * Opis: Serwis integracji Amazon SP-API → CRM (customers) + FI (invoices/draft).
 *       Odczytuje OAuth LWA access token z Firestore (integrations gdzie providerId === 'amazon-sp-api').
 *       Zabezpiecza przed duplikatami po AmazonOrderId.
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { createInvoice } from '../../finance/services/invoiceService';
import type { InvoiceItem, InvoiceParty } from '../../finance/types/fiTypes';

// ---------------------------------------------------------------------------
// Typy Amazon SP-API
// ---------------------------------------------------------------------------

export interface AmazonOrder {
  AmazonOrderId: string;
  BuyerInfo?: {
    BuyerEmail: string;
    BuyerName?: string;
  };
  OrderTotal?: {
    Amount: string;
    CurrencyCode: string;
  };
  OrderStatus: string;
  PurchaseDate: string;
}

export interface AmazonConfig {
  accessToken: string;
  marketplaceId?: string;
}

export interface AmazonImportResult {
  orderId: string;
  customerId?: string;
  invoiceId?: string;
  skipped?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Odczyt konfiguracji Amazon z Firestore
// ---------------------------------------------------------------------------

export async function getAmazonConfig(tenantId: string): Promise<AmazonConfig> {
  const integrationsCol = collection(db, 'tenants', tenantId, 'integrations');
  const q = query(integrationsCol, where('providerId', '==', 'amazon-sp-api'));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Brak konfiguracji Amazon SP-API. Skonfiguruj integrację w sekcji Ustawienia → Integracje.');
  }

  const data = snap.docs[0].data() as { config?: AmazonConfig };
  if (!data.config?.accessToken) {
    throw new Error('Brak tokenu Amazon LWA. Zaloguj się przez OAuth w Integracjach.');
  }

  return data.config;
}

// ---------------------------------------------------------------------------
// Pobieranie zamówień z Amazon SP-API
// ---------------------------------------------------------------------------

export async function fetchOrders(
  accessToken: string,
  marketplaceId = 'A1PA6795UKMFR9',
  createdAfter?: string,
): Promise<AmazonOrder[]> {
  const params = new URLSearchParams({
    MarketplaceIds: marketplaceId,
    CreatedAfter: createdAfter ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  const res = await fetch(
    `https://sellingpartnerapi-eu.amazon.com/orders/v0/orders?${params.toString()}`,
    {
      headers: {
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amazon SP-API ${res.status}: ${text}`);
  }

  const json = await res.json() as { payload?: { Orders?: AmazonOrder[] } };
  return json.payload?.Orders ?? [];
}

// ---------------------------------------------------------------------------
// Deduplikacja
// ---------------------------------------------------------------------------

async function isAlreadyImported(tenantId: string, amazonOrderId: string): Promise<boolean> {
  const q = query(
    collection(db, 'tenants', tenantId, 'amazonImports'),
    where('amazonOrderId', '==', amazonOrderId),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

async function markAsImported(
  tenantId: string,
  amazonOrderId: string,
  customerId: string | undefined,
  invoiceId: string | undefined,
): Promise<void> {
  await addDoc(collection(db, 'tenants', tenantId, 'amazonImports'), {
    amazonOrderId,
    customerId: customerId ?? null,
    invoiceId: invoiceId ?? null,
    importedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Import zamówienia → CRM
// ---------------------------------------------------------------------------

export async function importOrderToCRM(
  tenantId: string,
  order: AmazonOrder,
): Promise<string> {
  const email = order.BuyerInfo?.BuyerEmail?.toLowerCase().trim();
  const name = order.BuyerInfo?.BuyerName?.trim() || email || 'Kupujący Amazon';

  if (email) {
    const existingQ = query(
      collection(db, 'customers'),
      where('tenantId', '==', tenantId),
      where('email', '==', email),
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      return existingSnap.docs[0].id;
    }
  }

  const ref = await addDoc(collection(db, 'customers'), {
    tenantId,
    customerType: 'individual',
    name,
    email: email ?? null,
    phone: null,
    city: null,
    address: null,
    zipCode: null,
    status: 'active',
    tags: ['amazon'],
    leadScore: 0,
    serviceEventCount: 0,
    source: 'amazon',
    currency: order.OrderTotal?.CurrencyCode ?? 'EUR',
    totalRevenue: parseFloat(order.OrderTotal?.Amount ?? '0') || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

// ---------------------------------------------------------------------------
// Import zamówienia → FI (draft faktury)
// ---------------------------------------------------------------------------

export async function importOrderToFI(
  tenantId: string,
  order: AmazonOrder,
  customerId: string,
): Promise<string> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const due = new Date(now);
  due.setDate(due.getDate() + 14);
  const dueDate = due.toISOString().split('T')[0];

  const buyerName = order.BuyerInfo?.BuyerName?.trim()
    || order.BuyerInfo?.BuyerEmail
    || 'Kupujący Amazon';

  const currency = (order.OrderTotal?.CurrencyCode ?? 'EUR') as 'PLN';

  const buyer: InvoiceParty = {
    name: buyerName,
    email: order.BuyerInfo?.BuyerEmail ?? '',
    address: '',
    city: '',
    postCode: '',
    country: 'DE',
  };

  const totalAmount = parseFloat(order.OrderTotal?.Amount ?? '0');
  const priceNetto = totalAmount / 1.23;
  const totalVat = Math.round(priceNetto * 0.23 * 100) / 100;

  const items: InvoiceItem[] = [
    {
      id: `amazon-${order.AmazonOrderId}`,
      name: `Zamówienie Amazon ${order.AmazonOrderId}`,
      quantity: 1,
      unit: 'szt.',
      priceNetto: Math.round(priceNetto * 100) / 100,
      vatRate: 23,
      totalNetto: Math.round(priceNetto * 100) / 100,
      totalVat,
      totalBrutto: totalAmount,
    },
  ];

  const invoiceId = await createInvoice(tenantId, {
    number: `AMAZON-${order.AmazonOrderId.slice(0, 10).toUpperCase()}`,
    series: 'AMAZON',
    type: 'standard',
    issueDate: today,
    saleDate: order.PurchaseDate?.split('T')[0] ?? today,
    dueDate,
    seller: {
      name: '',
      address: '',
      city: '',
      postCode: '',
      country: 'PL',
    },
    buyer,
    items,
    currency,
    paymentMethod: 'transfer',
    isMpp: false,
    paidAmount: 0,
    remainingAmount: 0,
    status: 'draft',
    ksefStatus: 'not_sent',
    createdBy: 'amazon-import',
    aiTags: ['amazon', order.OrderStatus, `crmCustomerId:${customerId}`],
    accountantNotes: `Import Amazon SP-API. Zamówienie: ${order.AmazonOrderId}. Status: ${order.OrderStatus}.`,
  });

  return invoiceId;
}

// ---------------------------------------------------------------------------
// Orchestrator: importOrders
// ---------------------------------------------------------------------------

export async function importOrders(
  tenantId: string,
): Promise<AmazonImportResult[]> {
  const config = await getAmazonConfig(tenantId);
  const allOrders = await fetchOrders(config.accessToken, config.marketplaceId);

  const results: AmazonImportResult[] = [];

  for (const order of allOrders) {
    const orderId = order.AmazonOrderId;
    const alreadyDone = await isAlreadyImported(tenantId, orderId);
    if (alreadyDone) {
      results.push({ orderId, skipped: true });
      continue;
    }

    try {
      const customerId = await importOrderToCRM(tenantId, order);
      const invoiceId = await importOrderToFI(tenantId, order, customerId);
      await markAsImported(tenantId, orderId, customerId, invoiceId);
      results.push({ orderId, customerId, invoiceId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[amazonService] Błąd importu zamówienia ${orderId}:`, err);
      results.push({ orderId, error: msg });
    }
  }

  return results;
}
