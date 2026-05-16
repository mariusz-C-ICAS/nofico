import type { MarketplaceProvider } from '../types';

const FUNCTIONS_BASE =
  (import.meta as any).env?.VITE_FUNCTIONS_URL ?? 'https://europe-west1-cicas-os.cloudfunctions.net';

export interface MarketplaceOrder {
  externalId: string;
  provider: MarketplaceProvider;
  items: { sku: string; quantity: number; unitPrice: number }[];
  buyerEmail?: string;
  createdAt: string;
}

export interface SyncResult {
  provider: MarketplaceProvider;
  synced: number;
  errors: number;
  lastSyncAt: string;
}

export async function syncMarketplace(
  tenantId: string,
  provider: MarketplaceProvider,
  idToken: string
): Promise<SyncResult> {
  const res = await fetch(`${FUNCTIONS_BASE}/syncMarketplace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ tenantId, provider }),
  });
  if (!res.ok) throw new Error(`Marketplace sync failed: ${res.status}`);
  return res.json();
}

export async function getMarketplaceOrders(
  tenantId: string,
  provider: MarketplaceProvider,
  idToken: string,
  since?: string
): Promise<MarketplaceOrder[]> {
  const params = new URLSearchParams({ tenantId, provider });
  if (since) params.append('since', since);
  const res = await fetch(`${FUNCTIONS_BASE}/getMarketplaceOrders?${params}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Get marketplace orders failed: ${res.status}`);
  return res.json();
}

export async function publishProduct(
  tenantId: string,
  productId: string,
  provider: MarketplaceProvider,
  idToken: string
): Promise<{ externalListingId: string }> {
  const res = await fetch(`${FUNCTIONS_BASE}/publishMarketplaceProduct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ tenantId, productId, provider }),
  });
  if (!res.ok) throw new Error(`Publish to marketplace failed: ${res.status}`);
  return res.json();
}
