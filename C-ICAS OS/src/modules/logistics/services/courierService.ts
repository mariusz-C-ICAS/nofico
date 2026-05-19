/**
 * Data: 2026-05-19
 * Sciezka: src/modules/logistics/services/courierService.ts
 * Opis: Integracja DPD / DHL / GLS — tworzenie przesylek i tracking.
 *       Konfiguracja z Firestore (providerId: 'dpd' | 'dhl' | 'gls').
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// ── Typy wspolne ─────────────────────────────────────────────────────────────

export interface CourierAddress {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
  email?: string;
}

export interface CourierShipment {
  sender: CourierAddress;
  receiver: CourierAddress;
  weight: number;          // kg
  dimensions: { length: number; width: number; height: number }; // cm
  serviceType: string;
  reference?: string;
  declaredValue?: number;
}

export interface CourierShipmentResult {
  shipmentNumber: string;
  trackingNumber: string;
  labelUrl?: string;
  carrier: 'dpd' | 'dhl' | 'gls';
}

export interface CourierTrackingEvent {
  timestamp: string;
  status: string;
  description: string;
  location?: string;
}

export interface CourierTrackingResult {
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
  events: CourierTrackingEvent[];
}

// ── Config interfaces ─────────────────────────────────────────────────────────

export interface DpdConfig {
  login: string;
  password: string;
  masterFid: string;
  apiUrl?: string;
}

export interface DhlConfig {
  apiKey: string;
  accountNumber: string;
  apiUrl?: string;
}

export interface GlsConfig {
  username: string;
  password: string;
  contactId: string;
  apiUrl?: string;
}

// ── Helpers konfiguracji ─────────────────────────────────────────────────────

async function getCarrierConfig<T>(
  tenantId: string,
  providerId: 'dpd' | 'dhl' | 'gls',
): Promise<T> {
  const q = query(
    collection(db, 'integrations'),
    where('tenantId', '==', tenantId),
    where('providerId', '==', providerId),
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error(
      `Brak konfiguracji ${providerId.toUpperCase()}. Skonfiguruj integracje w sekcji Integracje.`,
    );
  }

  const data = snap.docs[0].data() as { config?: T };
  if (!data.config) {
    throw new Error(
      `Niepelna konfiguracja ${providerId.toUpperCase()}. Uzupelnij dane w Integracjach.`,
    );
  }

  return data.config;
}

export async function getDpdConfig(tenantId: string): Promise<DpdConfig> {
  return getCarrierConfig<DpdConfig>(tenantId, 'dpd');
}

export async function getDhlConfig(tenantId: string): Promise<DhlConfig> {
  return getCarrierConfig<DhlConfig>(tenantId, 'dhl');
}

export async function getGlsConfig(tenantId: string): Promise<GlsConfig> {
  return getCarrierConfig<GlsConfig>(tenantId, 'gls');
}

// ── DPD ─────────────────────────────────────────────────────────────────────

export async function createDpdShipment(
  config: DpdConfig,
  shipment: CourierShipment,
): Promise<CourierShipmentResult> {
  const baseUrl = config.apiUrl ?? 'https://dpdservices.dpd.com.pl/DPDPackageObjCommonService';

  const body = {
    openUMLFeeder: {
      DPDServicesParamsV1: {
        authData: { login: config.login, masterFid: config.masterFid, password: config.password },
        parcels: [{
          sizeX: shipment.dimensions.width,
          sizeY: shipment.dimensions.height,
          sizeZ: shipment.dimensions.length,
          weight: shipment.weight * 100, // gramy
          customerData1: shipment.reference ?? '',
        }],
        receiver: {
          name: shipment.receiver.name,
          addressType: 'B',
          email: shipment.receiver.email ?? '',
          phone: shipment.receiver.phone ?? '',
          address: shipment.receiver.street,
          city: shipment.receiver.city,
          postalCode: shipment.receiver.postalCode,
          countryCode: shipment.receiver.countryCode,
        },
        sender: {
          name: shipment.sender.name,
          address: shipment.sender.street,
          city: shipment.sender.city,
          postalCode: shipment.sender.postalCode,
          countryCode: shipment.sender.countryCode,
          fid: config.masterFid,
        },
        pkgNumsOnly: false,
        serviceCode: { code: shipment.serviceType },
      },
    },
  };

  const res = await fetch(`${baseUrl}/generatePackagesNumbersV1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DPD API ${res.status}: ${text}`);
  }

  const json = await res.json() as { Packages?: { Parcel?: { Waybill?: string } }[] };
  const waybill = json.Packages?.[0]?.Parcel?.Waybill ?? '';

  return { shipmentNumber: waybill, trackingNumber: waybill, carrier: 'dpd' };
}

// ── DHL ─────────────────────────────────────────────────────────────────────

export async function createDhlShipment(
  config: DhlConfig,
  shipment: CourierShipment,
): Promise<CourierShipmentResult> {
  const baseUrl = config.apiUrl ?? 'https://api-eu.dhl.com/shipments';

  const body = {
    plannedShippingDateAndTime: new Date().toISOString(),
    pickup: { isRequested: false },
    productCode: shipment.serviceType,
    accounts: [{ typeCode: 'shipper', number: config.accountNumber }],
    packages: [{
      weight: shipment.weight,
      dimensions: {
        length: shipment.dimensions.length,
        width: shipment.dimensions.width,
        height: shipment.dimensions.height,
      },
    }],
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          addressLine1: shipment.sender.street,
          cityName: shipment.sender.city,
          postalCode: shipment.sender.postalCode,
          countryCode: shipment.sender.countryCode,
        },
        contactInformation: {
          fullName: shipment.sender.name,
          phone: shipment.sender.phone ?? '+48000000000',
          email: shipment.sender.email ?? '',
        },
      },
      receiverDetails: {
        postalAddress: {
          addressLine1: shipment.receiver.street,
          cityName: shipment.receiver.city,
          postalCode: shipment.receiver.postalCode,
          countryCode: shipment.receiver.countryCode,
        },
        contactInformation: {
          fullName: shipment.receiver.name,
          phone: shipment.receiver.phone ?? '+48000000000',
          email: shipment.receiver.email ?? '',
        },
      },
    },
    content: { description: shipment.reference ?? 'Shipment', incoterm: 'DAP' },
  };

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'DHL-API-Key': config.apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DHL API ${res.status}: ${text}`);
  }

  const json = await res.json() as { shipmentTrackingNumber?: string; documents?: { url?: string }[] };
  return {
    shipmentNumber: json.shipmentTrackingNumber ?? '',
    trackingNumber: json.shipmentTrackingNumber ?? '',
    labelUrl: json.documents?.[0]?.url,
    carrier: 'dhl',
  };
}

// ── GLS ─────────────────────────────────────────────────────────────────────

export async function createGlsShipment(
  config: GlsConfig,
  shipment: CourierShipment,
): Promise<CourierShipmentResult> {
  const baseUrl = config.apiUrl ?? 'https://shipit-api.gls-group.eu';

  const body = {
    Shipment: {
      ShippingDate: new Date().toISOString().slice(0, 10),
      Product: shipment.serviceType,
      Consignee: {
        Name1: shipment.receiver.name,
        ContactName: shipment.receiver.name,
        Street1: shipment.receiver.street,
        CountryCode: shipment.receiver.countryCode,
        ZIPCode: shipment.receiver.postalCode,
        City: shipment.receiver.city,
        Phone: shipment.receiver.phone ?? '',
        Email: shipment.receiver.email ?? '',
      },
      Shipper: {
        ContactID: config.contactId,
        AlternativeShipperAddress: {
          Name1: shipment.sender.name,
          Street1: shipment.sender.street,
          CountryCode: shipment.sender.countryCode,
          ZIPCode: shipment.sender.postalCode,
          City: shipment.sender.city,
        },
      },
      Parcels: [{
        Weight: shipment.weight,
      }],
    },
  };

  const credentials = btoa(`${config.username}:${config.password}`);

  const res = await fetch(`${baseUrl}/backend/rs/shipments`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GLS ShipIT API ${res.status}: ${text}`);
  }

  const json = await res.json() as { CreatedShipment?: { TrackID?: string; PrintData?: { Label?: string } } };
  const trackId = json.CreatedShipment?.TrackID ?? '';

  return {
    shipmentNumber: trackId,
    trackingNumber: trackId,
    labelUrl: json.CreatedShipment?.PrintData?.Label,
    carrier: 'gls',
  };
}

// ── Tracking (unified) ───────────────────────────────────────────────────────

export async function trackShipment(
  carrier: 'dpd' | 'dhl' | 'gls',
  trackingNumber: string,
  config: DpdConfig | DhlConfig | GlsConfig,
): Promise<CourierTrackingResult> {
  switch (carrier) {
    case 'dpd':
      return trackDpd(trackingNumber, config as DpdConfig);
    case 'dhl':
      return trackDhl(trackingNumber, config as DhlConfig);
    case 'gls':
      return trackGls(trackingNumber, config as GlsConfig);
  }
}

async function trackDpd(
  trackingNumber: string,
  config: DpdConfig,
): Promise<CourierTrackingResult> {
  const baseUrl = config.apiUrl ?? 'https://dpdservices.dpd.com.pl/DPDTrackingService';
  const res = await fetch(`${baseUrl}/getEventsForWaybillV1?waybill=${encodeURIComponent(trackingNumber)}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${btoa(`${config.login}:${config.password}`)}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DPD Tracking ${res.status}: ${text}`);
  }

  const json = await res.json() as { events?: { timestamp: string; description: string; code: string }[] };
  const events = (json.events ?? []).map(e => ({
    timestamp: e.timestamp,
    status: e.code,
    description: e.description,
  }));

  return { trackingNumber, status: events[0]?.status ?? 'UNKNOWN', events };
}

async function trackDhl(
  trackingNumber: string,
  config: DhlConfig,
): Promise<CourierTrackingResult> {
  const res = await fetch(
    `https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(trackingNumber)}`,
    { headers: { 'DHL-API-Key': config.apiKey, Accept: 'application/json' } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DHL Tracking ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    shipments?: Array<{
      status?: { status?: string; description?: string; timestamp?: string };
      events?: Array<{ timestamp: string; description: string; location?: { address?: { addressLocality?: string } } }>;
      estimatedTimeOfDelivery?: string;
    }>;
  };

  const shipment = json.shipments?.[0];
  const events = (shipment?.events ?? []).map(e => ({
    timestamp: e.timestamp,
    status: e.description,
    description: e.description,
    location: e.location?.address?.addressLocality,
  }));

  return {
    trackingNumber,
    status: shipment?.status?.status ?? 'UNKNOWN',
    estimatedDelivery: shipment?.estimatedTimeOfDelivery,
    events,
  };
}

async function trackGls(
  trackingNumber: string,
  config: GlsConfig,
): Promise<CourierTrackingResult> {
  const baseUrl = config.apiUrl ?? 'https://gls-group.eu';
  const res = await fetch(
    `${baseUrl}/api/track?match=${encodeURIComponent(trackingNumber)}&lang=pl`,
    { headers: { Accept: 'application/json' } },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GLS Tracking ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    tuStatus?: Array<{
      progressBar?: { statusInfo?: string };
      history?: Array<{ date: string; time: string; evtDscr: string; address?: { city?: string } }>;
      infos?: Array<{ type?: string; value?: string }>;
    }>;
  };

  const tu = json.tuStatus?.[0];
  const events = (tu?.history ?? []).map(h => ({
    timestamp: `${h.date}T${h.time}`,
    status: h.evtDscr,
    description: h.evtDscr,
    location: h.address?.city,
  }));

  const eta = tu?.infos?.find(i => i.type === 'ETD')?.value;

  return {
    trackingNumber,
    status: tu?.progressBar?.statusInfo ?? 'UNKNOWN',
    estimatedDelivery: eta,
    events,
  };
}
