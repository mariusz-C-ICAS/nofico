/**
 * Data: 2026-05-19
 * Autor: Agent AI
 * Opis: Serwis integracji Shopify Admin API → CRM (customers) + FI (invoices/draft) + Logistyka.
 *       Odczytuje apiUrl i apiKey z Firestore (integrations gdzie providerId === 'shopify').
 *       Zabezpiecza przed duplikatami po shopifyOrderId.
 */

import {
  collection,
  doc,
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
// Typy Shopify
// ---------------------------------------------------------------------------

export interface ShopifyLineItem {
  title: string;
  quantity: number;
  price: string;
}

export interface ShopifyOrder {
  id: number;
  email: string;
  customer?: {
    first_name: string;
    last_name: string;
    company?: string;
  };
  billing_address: {
    address1: string;
    city: string;
    zip: string;
    country: string;
  };
  line_items: ShopifyLineItem[];
  subtotal_price: string;
  total_tax: string;
  total_price: string;
  financial_status: 'paid' | 'pending' | 'refunded';
  fulfillment_status: 'fulfilled' | null;
}

export interface ShopifyConfig {
  apiUrl: string;
  apiKey: string;
}

export interface ShopifyImportResult {
  orderId: string;
  customerId?: string;
  invoiceId?: string;
  shipmentId?: string;
  skipped?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Odczyt konfiguracji Shopify z Firestore
// ---------------------------------------------------------------------------

export async function getShopifyConfig(tenantId: string): Promise<ShopifyConfig> {
  const integrationsCol = collection(db, 'tenants', tenantId, 'integrations');
  const q = query(integrationsCol, where('providerId', '==', 'shopify'));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Brak konfiguracji Shopify. Skonfiguruj integrację w sekcji Ustawienia → Integracje.');
  }

  const data = snap.docs[0].data() as { config?: ShopifyConfig };
  if (!data.config?.apiUrl || !data.config?.apiKey) {
    throw new Error('Niekompletna konfiguracja Shopify. Podaj URL sklepu i klucz API.');
  }

  return data.config;
}

// ---------------------------------------------------------------------------
// Pobieranie zamówień z Shopify Admin API
// ---------------------------------------------------------------------------

export async function fetchOrders(
  shopUrl: string,
  apiKey: string,
  status?: string,
  limit = 50,
): Promise<ShopifyOrder[]> {
  const base = shopUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set('status', status);

  const res = await fetch(`${base}/admin/api/2024-01/orders.json?${params.toString()}`, {
    headers: {
      'X-Shopify-Access-Token': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  const json = await res.json() as { orders?: ShopifyOrder[] };
  return json.orders ?? [];
}

// ---------------------------------------------------------------------------
// Deduplikacja
// ---------------------------------------------------------------------------

async function isAlreadyImported(tenantId: string, shopifyOrderId: string): Promise<boolean> {
  const q = query(
    collection(db, 'tenants', tenantId, 'shopifyImports'),
    where('shopifyOrderId', '==', shopifyOrderId),
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

async function markAsImported(
  tenantId: string,
  shopifyOrderId: string,
  customerId: string | undefined,
  invoiceId: string | undefined,
  shipmentId: string | undefined,
): Promise<void> {
  await addDoc(collection(db, 'tenants', tenantId, 'shopifyImports'), {
    shopifyOrderId,
    customerId: customerId ?? null,
    invoiceId: invoiceId ?? null,
    shipmentId: shipmentId ?? null,
    importedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Import zamówienia → CRM
// ---------------------------------------------------------------------------

export async function importOrderToCRM(
  tenantId: string,
  order: ShopifyOrder,
): Promise<string> {
  const email = order.email?.toLowerCase().trim();
  const customerName = order.customer?.company?.trim()
    || [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ')
    || email
    || 'Nieznany kupujący';

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
    customerType: order.customer?.company ? 'business' : 'individual',
    name: customerName,
    email: email ?? null,
    phone: null,
    city: order.billing_address?.city ?? null,
    address: order.billing_address?.address1 ?? null,
    zipCode: order.billing_address?.zip ?? null,
    status: 'active',
    tags: ['shopify'],
    leadScore: 0,
    serviceEventCount: 0,
    source: 'shopify',
    currency: 'PLN',
    totalRevenue: parseFloat(order.total_price) || 0,
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
  order: ShopifyOrder,
  customerId: string,
): Promise<string> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const due = new Date(now);
  due.setDate(due.getDate() + 14);
  const dueDate = due.toISOString().split('T')[0];

  const buyerName = order.customer?.company?.trim()
    || [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ')
    || order.email
    || 'Kupujący Shopify';

  const buyer: InvoiceParty = {
    name: buyerName,
    email: order.email ?? '',
    address: order.billing_address?.address1 ?? '',
    city: order.billing_address?.city ?? '',
    postCode: order.billing_address?.zip ?? '',
    country: order.billing_address?.country ?? 'PL',
  };

  const items: InvoiceItem[] = order.line_items.map((li, idx) => {
    const priceNetto = parseFloat(li.price) / 1.23;
    const qty = li.quantity || 1;
    const totalNetto = Math.round(priceNetto * qty * 100) / 100;
    const totalVat = Math.round(totalNetto * 0.23 * 100) / 100;
    return {
      id: `shopify-${order.id}-${idx}`,
      name: li.title,
      quantity: qty,
      unit: 'szt.',
      priceNetto: Math.round(priceNetto * 100) / 100,
      vatRate: 23,
      totalNetto,
      totalVat,
      totalBrutto: Math.round((totalNetto + totalVat) * 100) / 100,
    };
  });

  const invoiceId = await createInvoice(tenantId, {
    number: `SHOPIFY-${String(order.id).slice(0, 8).toUpperCase()}`,
    series: 'SHOPIFY',
    type: 'standard',
    issueDate: today,
    saleDate: today,
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
    currency: 'PLN',
    paymentMethod: 'transfer',
    isMpp: false,
    paidAmount: 0,
    remainingAmount: 0,
    status: 'draft',
    ksefStatus: 'not_sent',
    createdBy: 'shopify-import',
    aiTags: ['shopify', order.financial_status, `crmCustomerId:${customerId}`],
    accountantNotes: `Import Shopify. Zamówienie ID: ${order.id}. Status płatności: ${order.financial_status}.`,
  });

  return invoiceId;
}

// ---------------------------------------------------------------------------
// Import zamówienia → Logistyka
// ---------------------------------------------------------------------------

export async function importOrderToLogistics(
  tenantId: string,
  order: ShopifyOrder,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'logistic_shipments', tenantId, 'items'),
    {
      shopifyOrderId: String(order.id),
      recipientEmail: order.email ?? null,
      recipientName: order.customer
        ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(' ')
        : null,
      address: {
        street: order.billing_address?.address1 ?? null,
        city: order.billing_address?.city ?? null,
        zip: order.billing_address?.zip ?? null,
        country: order.billing_address?.country ?? null,
      },
      products: order.line_items.map(li => ({
        name: li.title,
        quantity: li.quantity,
        price: li.price,
      })),
      totalValue: parseFloat(order.total_price) || 0,
      fulfillmentStatus: order.fulfillment_status ?? 'pending',
      source: 'shopify',
      createdAt: serverTimestamp(),
    },
  );

  return ref.id;
}

// ---------------------------------------------------------------------------
// Orchestrator: importOrders
// ---------------------------------------------------------------------------

export async function importOrders(
  tenantId: string,
  orderIds?: string[],
): Promise<ShopifyImportResult[]> {
  const config = await getShopifyConfig(tenantId);
  const allOrders = await fetchOrders(config.apiUrl, config.apiKey, undefined, 100);

  const orders = orderIds
    ? allOrders.filter(o => orderIds.includes(String(o.id)))
    : allOrders;

  const results: ShopifyImportResult[] = [];

  for (const order of orders) {
    const orderId = String(order.id);
    const alreadyDone = await isAlreadyImported(tenantId, orderId);
    if (alreadyDone) {
      results.push({ orderId, skipped: true });
      continue;
    }

    try {
      const customerId = await importOrderToCRM(tenantId, order);
      const invoiceId = await importOrderToFI(tenantId, order, customerId);
      const shipmentId = await importOrderToLogistics(tenantId, order);
      await markAsImported(tenantId, orderId, customerId, invoiceId, shipmentId);
      results.push({ orderId, customerId, invoiceId, shipmentId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[shopifyService] Błąd importu zamówienia ${order.id}:`, err);
      results.push({ orderId, error: msg });
    }
  }

  return results;
}
