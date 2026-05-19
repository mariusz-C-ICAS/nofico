/**
 * Data: 2026-05-19
 * Sciezka: src/modules/logistics/services/pocztaPolskaService.ts
 * Opis: Integracja Poczta Polska USS API — tracking i tworzenie przesylek.
 *       Konfiguracja z Firestore (providerId: 'poczta-polska').
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// ── Typy ────────────────────────────────────────────────────────────────────

export interface PocztaConfig {
  apiKey: string;
  customerId?: string;
  apiUrl?: string;
}

export interface PocztaAddress {
  name: string;
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  countryCode?: string;
  phone?: string;
  email?: string;
}

export interface PocztaShipment {
  sender: PocztaAddress;
  receiver: PocztaAddress;
  weight: number;         // gramy
  serviceType: string;    // np. 'EKP' (Ekonomiczna), 'KPR' (Priorytet), 'POBRANIE'
  cashOnDelivery?: number;
  reference?: string;
}

export interface PocztaShipmentResult {
  trackingNumber: string;
  label: string;           // URL lub base64 PDF
  estimatedDelivery?: string;
}

export interface PocztaTrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

export interface PocztaTrackingResult {
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
  events: PocztaTrackingEvent[];
}

// ── Konfiguracja ─────────────────────────────────────────────────────────────

export async function getPocztaConfig(tenantId: string): Promise<PocztaConfig> {
  const q = query(
    collection(db, 'integrations'),
    where('tenantId', '==', tenantId),
    where('providerId', '==', 'poczta-polska'),
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(
      'Brak konfiguracji Poczty Polskiej. Skonfiguruj integracje w sekcji Integracje.',
    );
  }

  const data = snap.docs[0].data() as { config?: PocztaConfig };
  if (!data.config?.apiKey) {
    throw new Error('Brak klucza API Poczty Polskiej. Uzupelnij konfiguracje w Integracjach.');
  }

  return data.config;
}

// ── Tracking ─────────────────────────────────────────────────────────────────

export async function trackShipment(
  trackingNumber: string,
  apiKey: string,
  apiUrl?: string,
): Promise<PocztaTrackingResult> {
  const base = apiUrl ?? 'https://uss.poczta-polska.pl/tracking-management/v1';
  const url = `${base}/shipments/${encodeURIComponent(trackingNumber)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Poczta Polska Tracking API ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    trackingNumber?: string;
    status?: string;
    estimatedDeliveryDate?: string;
    events?: Array<{
      eventDate?: string;
      statusDescription?: string;
      statusCode?: string;
      postOffice?: string;
    }>;
  };

  const events: PocztaTrackingEvent[] = (json.events ?? []).map(e => ({
    timestamp: e.eventDate ?? '',
    status: e.statusCode ?? '',
    description: e.statusDescription ?? '',
    location: e.postOffice,
  }));

  return {
    trackingNumber: json.trackingNumber ?? trackingNumber,
    status: json.status ?? (events[0]?.status ?? 'UNKNOWN'),
    estimatedDelivery: json.estimatedDeliveryDate,
    events,
  };
}

// ── Tworzenie przesylki ───────────────────────────────────────────────────────

export async function createShipment(
  config: PocztaConfig,
  shipment: PocztaShipment,
): Promise<PocztaShipmentResult> {
  const base = config.apiUrl ?? 'https://uss.poczta-polska.pl/shipment-management/v1';

  const body: Record<string, unknown> = {
    service: shipment.serviceType,
    weight: shipment.weight,
    receiver: {
      name: shipment.receiver.name,
      address: {
        street: shipment.receiver.street,
        houseNumber: shipment.receiver.houseNumber,
        city: shipment.receiver.city,
        postalCode: shipment.receiver.postalCode,
        countryCode: shipment.receiver.countryCode ?? 'PL',
      },
      phone: shipment.receiver.phone ?? '',
      email: shipment.receiver.email ?? '',
    },
    sender: {
      name: shipment.sender.name,
      customerId: config.customerId ?? '',
      address: {
        street: shipment.sender.street,
        houseNumber: shipment.sender.houseNumber,
        city: shipment.sender.city,
        postalCode: shipment.sender.postalCode,
        countryCode: shipment.sender.countryCode ?? 'PL',
      },
      phone: shipment.sender.phone ?? '',
      email: shipment.sender.email ?? '',
    },
    ...(shipment.cashOnDelivery ? { cashOnDelivery: shipment.cashOnDelivery } : {}),
    ...(shipment.reference ? { reference: shipment.reference } : {}),
  };

  const res = await fetch(`${base}/shipments`, {
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
    throw new Error(`Poczta Polska Shipment API ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    trackingNumber?: string;
    label?: string;
    labelUrl?: string;
    estimatedDeliveryDate?: string;
  };

  return {
    trackingNumber: json.trackingNumber ?? '',
    label: json.labelUrl ?? json.label ?? '',
    estimatedDelivery: json.estimatedDeliveryDate,
  };
}
