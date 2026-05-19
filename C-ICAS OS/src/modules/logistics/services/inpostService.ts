/**
 * Data: 2026-05-19
 * Sciezka: src/modules/logistics/services/inpostService.ts
 * Opis: Integracja InPost API v1 — paczkomaty, shipment, tracking, label.
 *       Konfiguracja z Firestore (providerId: 'inpost').
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// ── Typy ────────────────────────────────────────────────────────────────────

export interface InPostConfig {
  apiKey: string;
  organizationId?: string;
}

export interface InPostShipment {
  receiver: { name: string; email: string; phone: string };
  parcel: { template: 'small' | 'medium' | 'large' };
  deliveryMethod: 'parcel_locker_standard' | 'courier';
  targetMachineId?: string;
}

export interface InPostLocker {
  name: string;
  type: string;
  status: string;
  address: {
    street: string;
    building_number: string;
    city: string;
    post_code: string;
  };
  location: { latitude: number; longitude: number };
}

export interface InPostShipmentResult {
  id: string;
  tracking_number: string;
  status: string;
  price: { gross_amount: string; currency: string } | null;
}

export interface InPostTrackingEvent {
  status: string;
  occurred_at: string;
  description: string;
}

export interface InPostTrackingResult {
  tracking_number: string;
  status: string;
  events: InPostTrackingEvent[];
}

// ── Konfiguracja ─────────────────────────────────────────────────────────────

export async function getInPostConfig(tenantId: string): Promise<InPostConfig> {
  const q = query(
    collection(db, 'integrations'),
    where('tenantId', '==', tenantId),
    where('providerId', '==', 'inpost'),
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Brak konfiguracji InPost. Skonfiguruj integrację w sekcji Integracje.');
  }

  const data = snap.docs[0].data() as { config?: InPostConfig };
  if (!data.config?.apiKey) {
    throw new Error('Brak klucza API InPost. Uzupelnij konfiguracje w Integracjach.');
  }

  return data.config;
}

// ── Paczkomaty ────────────────────────────────────────────────────────────────

export async function findNearbyLockers(
  lat: number,
  lng: number,
  limit = 10,
): Promise<InPostLocker[]> {
  const params = new URLSearchParams({
    relative_point: `${lat},${lng}`,
    max_distance: '5000',
    type: 'parcel_locker',
    per_page: String(limit),
  });

  const res = await fetch(
    `https://api.inpost.pl/v1/points?${params.toString()}`,
    { headers: { Accept: 'application/json' } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`InPost Points API ${res.status}: ${text}`);
  }

  const json = await res.json() as { items: InPostLocker[] };
  return json.items ?? [];
}

// ── Tworzenie przesylki ───────────────────────────────────────────────────────

export async function createShipment(
  tenantId: string,
  shipment: InPostShipment,
): Promise<InPostShipmentResult> {
  const config = await getInPostConfig(tenantId);

  const body: Record<string, unknown> = {
    receiver: {
      name: shipment.receiver.name,
      email: shipment.receiver.email,
      phone: shipment.receiver.phone,
    },
    parcels: [{ template: shipment.parcel.template }],
    service: shipment.deliveryMethod,
    ...(shipment.targetMachineId ? { custom_attributes: { target_point: shipment.targetMachineId } } : {}),
  };

  const res = await fetch('https://api.inpost.pl/v1/shipments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`InPost Shipments API ${res.status}: ${text}`);
  }

  return res.json() as Promise<InPostShipmentResult>;
}

// ── Tracking ─────────────────────────────────────────────────────────────────

export async function trackShipment(
  trackingNumber: string,
  apiKey: string,
): Promise<InPostTrackingResult> {
  const res = await fetch(
    `https://api.inpost.pl/v1/tracking/${encodeURIComponent(trackingNumber)}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`InPost Tracking API ${res.status}: ${text}`);
  }

  return res.json() as Promise<InPostTrackingResult>;
}

// ── Etykieta ─────────────────────────────────────────────────────────────────

export async function getLabel(
  shipmentId: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch(
    `https://api.inpost.pl/v1/shipments/${encodeURIComponent(shipmentId)}/label`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/pdf',
      },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`InPost Label API ${res.status}: ${text}`);
  }

  // Zwraca URL do PDF jako blob URL lub lokalizuje Location header
  const location = res.headers.get('Location');
  if (location) return location;

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
