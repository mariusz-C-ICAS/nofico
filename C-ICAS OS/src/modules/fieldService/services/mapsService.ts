/**
 * Data: 2026-05-19
 * Sciezka: src/modules/fieldService/services/mapsService.ts
 * Opis: Google Maps / HERE — trasy, geocoding, optymalizacja, ETA.
 *       Konfiguracja z Firestore (providerId: 'google-maps').
 */

import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

// ── Typy ────────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapsConfig {
  apiKey: string;
  provider?: 'google' | 'here';
}

export interface RouteStep {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  instructions: string;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
  steps: RouteStep[];
}

export interface GeocodedAddress {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface EtaResult {
  destination: LatLng;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
}

export interface OptimizedRoute {
  orderedWaypoints: LatLng[];
  orderedIndices: number[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  mapsUrl: string;
}

// ── Konfiguracja ─────────────────────────────────────────────────────────────

export async function getMapsConfig(tenantId: string): Promise<MapsConfig> {
  const q = query(
    collection(db, 'integrations'),
    where('tenantId', '==', tenantId),
    where('providerId', '==', 'google-maps'),
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Brak konfiguracji Google Maps. Skonfiguruj integracje w sekcji Integracje.');
  }

  const data = snap.docs[0].data() as { config?: MapsConfig };
  if (!data.config?.apiKey) {
    throw new Error('Brak klucza API Google Maps. Uzupelnij konfiguracje w Integracjach.');
  }

  return data.config;
}

// ── Trasa A→B ────────────────────────────────────────────────────────────────

export async function getRoute(
  origin: LatLng,
  destination: LatLng,
  apiKey: string,
): Promise<RouteResult> {
  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: apiKey,
    language: 'pl',
    mode: 'driving',
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`Google Directions API ${res.status}`);
  }

  const json = await res.json() as {
    status: string;
    routes?: Array<{
      legs?: Array<{
        distance: { text: string; value: number };
        duration: { text: string; value: number };
        steps: Array<{
          distance: { text: string; value: number };
          duration: { text: string; value: number };
          html_instructions: string;
        }>;
      }>;
      overview_polyline?: { points: string };
    }>;
    error_message?: string;
  };

  if (json.status !== 'OK') {
    throw new Error(`Google Directions: ${json.status} — ${json.error_message ?? ''}`);
  }

  const leg = json.routes![0]!.legs![0]!;

  return {
    distanceMeters: leg.distance.value,
    durationSeconds: leg.duration.value,
    polyline: json.routes![0]?.overview_polyline?.points,
    steps: leg.steps.map(s => ({
      distance: s.distance,
      duration: s.duration,
      instructions: s.html_instructions.replace(/<[^>]+>/g, ''),
    })),
  };
}

// ── Optymalizacja trasy (TSP approximation via Google Directions waypoints) ──

export async function optimizeRoute(
  waypoints: LatLng[],
  apiKey: string,
): Promise<OptimizedRoute> {
  if (waypoints.length < 2) {
    throw new Error('Optymalizacja wymaga co najmniej 2 punktow.');
  }

  const origin = waypoints[0]!;
  const destination = waypoints[waypoints.length - 1]!;
  const middle = waypoints.slice(1, -1);

  const waypointStr = middle
    .map(w => `${w.lat},${w.lng}`)
    .join('|');

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    key: apiKey,
    language: 'pl',
    mode: 'driving',
    optimize: 'true',
  });

  if (waypointStr) {
    params.set('waypoints', `optimize:true|${waypointStr}`);
  }

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`Google Directions API (optimize) ${res.status}`);
  }

  const json = await res.json() as {
    status: string;
    routes?: Array<{
      waypoint_order?: number[];
      legs?: Array<{
        distance: { value: number };
        duration: { value: number };
      }>;
    }>;
    error_message?: string;
  };

  if (json.status !== 'OK') {
    throw new Error(`Google Directions (optimize): ${json.status} — ${json.error_message ?? ''}`);
  }

  const route = json.routes![0]!;
  const waypointOrder: number[] = route.waypoint_order ?? middle.map((_, i) => i);

  // Rekonstruuj kolejnosc: origin + middle wg waypointOrder + destination
  const orderedMiddle = waypointOrder.map(i => middle[i]!);
  const orderedWaypoints = [origin, ...orderedMiddle, destination];
  const orderedIndices = [0, ...waypointOrder.map(i => i + 1), waypoints.length - 1];

  const totalDistanceMeters = (route.legs ?? []).reduce((sum, l) => sum + l.distance.value, 0);
  const totalDurationSeconds = (route.legs ?? []).reduce((sum, l) => sum + l.duration.value, 0);

  const mapsUrl = buildMapsUrl(orderedWaypoints);

  return { orderedWaypoints, orderedIndices, totalDistanceMeters, totalDurationSeconds, mapsUrl };
}

function buildMapsUrl(waypoints: LatLng[]): string {
  if (waypoints.length === 0) return 'https://maps.google.com/';
  const origin = `${waypoints[0]!.lat},${waypoints[0]!.lng}`;
  const dest = `${waypoints[waypoints.length - 1]!.lat},${waypoints[waypoints.length - 1]!.lng}`;
  const middle = waypoints.slice(1, -1).map(w => `${w.lat},${w.lng}`).join('|');
  const params = new URLSearchParams({ saddr: origin, daddr: dest });
  if (middle) params.set('waypoints', middle);
  return `https://maps.google.com/maps?${params.toString()}`;
}

// ── Geocoding ────────────────────────────────────────────────────────────────

export async function geocodeAddress(
  address: string,
  apiKey: string,
): Promise<GeocodedAddress> {
  const params = new URLSearchParams({ address, key: apiKey, language: 'pl' });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`Google Geocode API ${res.status}`);
  }

  const json = await res.json() as {
    status: string;
    results?: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      place_id: string;
    }>;
    error_message?: string;
  };

  if (json.status !== 'OK' || !json.results?.length) {
    throw new Error(`Geocoding: ${json.status} — ${json.error_message ?? 'Brak wynikow'}`);
  }

  const result = json.results[0]!;
  return {
    address: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    placeId: result.place_id,
  };
}

// ── Batch ETA ────────────────────────────────────────────────────────────────

export async function getEtaToLocation(
  origin: LatLng,
  destinations: LatLng[],
  apiKey: string,
): Promise<EtaResult[]> {
  if (destinations.length === 0) return [];

  const originsStr = `${origin.lat},${origin.lng}`;
  const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');

  const params = new URLSearchParams({
    origins: originsStr,
    destinations: destinationsStr,
    key: apiKey,
    language: 'pl',
    mode: 'driving',
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
  );

  if (!res.ok) {
    throw new Error(`Google Distance Matrix API ${res.status}`);
  }

  const json = await res.json() as {
    status: string;
    rows?: Array<{
      elements?: Array<{
        status: string;
        duration?: { value: number; text: string };
        distance?: { value: number; text: string };
      }>;
    }>;
    error_message?: string;
  };

  if (json.status !== 'OK') {
    throw new Error(`Distance Matrix: ${json.status} — ${json.error_message ?? ''}`);
  }

  const elements = json.rows?.[0]?.elements ?? [];

  return destinations.map((dest, i) => {
    const el = elements[i];
    return {
      destination: dest,
      durationSeconds: el?.duration?.value ?? 0,
      durationText: el?.duration?.text ?? 'nieznany',
      distanceMeters: el?.distance?.value ?? 0,
      distanceText: el?.distance?.text ?? 'nieznany',
    };
  });
}
